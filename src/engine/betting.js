// Betting round logic. Pure functions over { players, betting, limit }.
// A player: { stack, bet (this round), totalBet (this hand), folded, allIn }
// betting: { currentBet, minRaise, toAct, raises, raiseCap, betSize, acted: number[], lastAggressor,
//            faced: {idx: bet level the player last responded to}, bringInIdx, bringInAmount }

export const LIMIT = { NO_LIMIT: 'no-limit', POT_LIMIT: 'pot-limit', FIXED_LIMIT: 'fixed-limit' };

export function canAct(p) {
  return !p.folded && !p.allIn && !p.sittingOut && p.stack > 0;
}

export function inHand(p) {
  return !p.folded && !p.sittingOut;
}

export function nextActor(players, fromIdx) {
  const n = players.length;
  for (let k = 1; k <= n; k++) {
    const i = (fromIdx + k) % n;
    if (canAct(players[i])) return i;
  }
  return -1;
}

export function totalPot(players) {
  return players.reduce((s, p) => s + p.totalBet, 0);
}

/**
 * Chips player idx can still win if they put `extra` more chips in: every contribution
 * is capped at the player's own total (side pots above that level belong to others).
 */
export function winnablePot(players, idx, extra = 0) {
  const cap = players[idx].totalBet + extra;
  return players.reduce((s, p, i) => s + (i === idx ? cap : Math.min(p.totalBet, cap)), 0);
}

export function commit(p, amount) {
  const amt = Math.max(0, Math.min(amount, p.stack));
  p.stack -= amt;
  p.bet += amt;
  p.totalBet += amt;
  if (p.stack === 0) p.allIn = true;
  return amt;
}

/** Start a new betting round. firstIdx = seat index that should act first (will be adjusted if cannot act). */
export function newRound({ firstIdx, currentBet = 0, minRaise, betSize, raiseCap = 4, lastAggressor = -1, acted = [], bringInIdx = -1, bringInAmount = 0 }) {
  return {
    currentBet,
    minRaise,
    betSize,
    raiseCap,
    raises: 0,
    toAct: firstIdx,
    acted: acted.slice(),
    faced: {},
    lastAggressor,
    bringInIdx,
    bringInAmount,
    complete: false,
  };
}

export function playersWhoCanAct(players) {
  return players.filter(canAct).length;
}

/** "Raise to" total that counts as a complete (full) raise in the current round. */
export function fullRaiseTarget(betting, limit) {
  if (limit === LIMIT.FIXED_LIMIT) {
    return betting.currentBet < betting.betSize ? betting.betSize : betting.currentBet + betting.betSize;
  }
  return betting.currentBet === 0 ? betting.minRaise : betting.currentBet + betting.minRaise;
}

/**
 * May player idx raise? A player who already acted this round may only re-raise when the
 * bet has grown by at least one full raise since they last acted (short all-ins do not reopen).
 */
function raiseReopened(betting, idx) {
  if (!betting.acted.includes(idx)) return true;
  const faced = betting.faced?.[idx] ?? 0;
  return betting.currentBet - faced >= betting.minRaise;
}

/**
 * Legal actions for player idx.
 * Returns { fold, check, call: {amount, full}|null, raise: {min, max, fixed, isBet}|null, toCall }.
 * `raise.min/max` are "raise to" totals for this round.
 * A pending stud bring-in decision adds `bringIn: {amount}` and `complete: {amount}|null`; the same
 * choice is also exposed as `call` (= bring-in) and `raise` (= complete) so generic controls keep working.
 */
export function legalActions(players, betting, limit) {
  const idx = betting.toAct;
  const p = players[idx];
  const othersCanAct = players.some((q, i) => i !== idx && canAct(q));

  if (betting.bringInIdx === idx && idx !== -1 && betting.bringInIdx != null) {
    const amt = Math.min(betting.bringInAmount, p.stack);
    const res = {
      playerIdx: idx,
      fold: false,
      check: false,
      call: { amount: amt, full: amt === betting.bringInAmount },
      raise: null,
      toCall: betting.bringInAmount,
      bringIn: { amount: amt },
      complete: null,
    };
    if (p.stack > betting.bringInAmount && othersCanAct) {
      const to = Math.min(betting.betSize, p.stack);
      res.raise = { min: to, max: to, fixed: true, isBet: true };
      res.complete = { amount: to };
    }
    return res;
  }

  const toCall = Math.max(0, betting.currentBet - p.bet);
  const callAmount = Math.min(toCall, p.stack);
  const res = {
    playerIdx: idx,
    fold: toCall > 0,
    check: toCall === 0,
    call: toCall > 0 ? { amount: callAmount, full: callAmount === toCall } : null,
    raise: null,
    toCall,
  };
  const canRaise = p.stack > toCall;
  if (!canRaise) return res;
  // nobody left who could respond to a raise
  if (!othersCanAct) return res;
  // an incomplete (short all-in) raise does not reopen the betting for players who already acted
  if (!raiseReopened(betting, idx)) return res;

  const pot = totalPot(players);
  let min;
  let max;
  if (limit === LIMIT.FIXED_LIMIT) {
    if (betting.raises >= betting.raiseCap) return res;
    min = fullRaiseTarget(betting, limit);
    max = min;
  } else {
    min = fullRaiseTarget(betting, limit);
    if (limit === LIMIT.POT_LIMIT) {
      max = betting.currentBet + pot + toCall; // raise-to = current bet + (pot after call)
    } else {
      max = Infinity;
    }
  }
  const stackMax = p.bet + p.stack; // all-in total
  max = Math.min(max, stackMax);
  if (min > stackMax) min = stackMax; // short all-in raise allowed
  if (max <= betting.currentBet) return res;
  res.raise = { min, max, fixed: limit === LIMIT.FIXED_LIMIT, isBet: betting.currentBet === 0 };
  return res;
}

function finishAction(players, b, idx) {
  if (!b.acted.includes(idx)) b.acted.push(idx);
  b.faced[idx] = b.currentBet;
  const alive = players.filter(inHand);
  if (alive.length <= 1) {
    b.complete = true;
    b.toAct = -1;
    return;
  }
  const actors = players.map((pl, i) => [pl, i]).filter(([pl]) => canAct(pl));
  const everyoneDone = actors.every(([pl, i]) => pl.bet === b.currentBet && b.acted.includes(i));
  if (everyoneDone) {
    b.complete = true;
    b.toAct = -1;
  } else {
    b.toAct = nextActor(players, idx);
    if (b.toAct === -1) b.complete = true;
  }
}

function raiseTo(players, b, limit, legal, p, idx, applied, amount) {
  let to = Number.isFinite(amount) ? amount : legal.raise.min;
  if (legal.raise.fixed) to = legal.raise.min;
  to = Math.max(legal.raise.min, Math.min(legal.raise.max, to));
  const target = fullRaiseTarget(b, limit);
  const raiseSize = to - b.currentBet;
  applied.type = b.currentBet === 0 ? 'bet' : 'raise';
  applied.amount = commit(p, to - p.bet);
  applied.raiseTo = to;
  if (to >= target) {
    // complete raise: reopens the betting for everyone else
    if (limit !== LIMIT.FIXED_LIMIT) b.minRaise = raiseSize;
    if (limit === LIMIT.FIXED_LIMIT) b.raises += 1;
    b.acted = [idx];
    b.lastAggressor = idx;
  }
  b.currentBet = Math.max(b.currentBet, to);
  finishAction(players, b, idx);
  return { betting: b, applied };
}

/**
 * Apply an action. Mutates players[] entries and returns new betting object.
 * action: { type: 'fold'|'check'|'call'|'raise'|'bet'|'allin'|'bringIn'|'complete', amount? (raise-to total) }
 */
export function applyAction(players, betting, limit, action) {
  const idx = betting.toAct;
  const p = players[idx];
  if (idx == null || idx < 0 || !p || !canAct(p)) throw new Error('no player to act');
  const legal = legalActions(players, betting, limit);
  const b = { ...betting, acted: betting.acted.slice(), faced: { ...(betting.faced || {}) } };
  const applied = { playerIdx: idx, type: action.type, amount: 0 };

  // Stud bring-in decision: post the bring-in, or complete to the full small bet.
  if (legal.bringIn) {
    const completing = ['bet', 'raise', 'complete', 'allin'].includes(action.type) && legal.raise;
    b.bringInIdx = -1;
    if (!completing) {
      applied.type = 'bringIn';
      applied.amount = commit(p, legal.bringIn.amount);
      b.currentBet = p.bet;
      b.acted = [idx];
      b.lastAggressor = idx;
      finishAction(players, b, idx);
      return { betting: b, applied };
    }
    return raiseTo(players, b, limit, legal, p, idx, applied, legal.raise.min);
  }

  switch (action.type) {
    case 'fold': {
      if (!legal.fold && legal.check) {
        // folding when check is free: treat as check for beginners' safety
        applied.type = 'check';
        break;
      }
      p.folded = true;
      break;
    }
    case 'check': {
      if (!legal.check) throw new Error('cannot check');
      break;
    }
    case 'call': {
      if (!legal.call) throw new Error('nothing to call');
      applied.amount = commit(p, legal.call.amount);
      break;
    }
    case 'allin': {
      // All-in only ever commits a legal amount: the largest legal raise, otherwise a call.
      const total = p.bet + p.stack;
      if (legal.raise && total > b.currentBet) {
        return raiseTo(players, b, limit, legal, p, idx, applied, total);
      }
      if (legal.call) {
        applied.type = 'call';
        applied.amount = commit(p, legal.call.amount);
      } else {
        applied.type = 'check';
      }
      break;
    }
    case 'bet':
    case 'raise':
    case 'complete': {
      if (!legal.raise) throw new Error('cannot raise');
      return raiseTo(players, b, limit, legal, p, idx, applied, action.amount);
    }
    case 'bringIn':
      throw new Error('no bring-in pending');
    default:
      throw new Error('unknown action ' + action.type);
  }
  finishAction(players, b, idx);
  return { betting: b, applied };
}

/**
 * Return the part of the largest contribution that nobody else matched to its owner
 * (an uncalled bet). Mutates players (stack/totalBet). Returns [{playerIdx, amount}].
 */
export function refundUncalled(players) {
  let top = -1;
  for (let i = 0; i < players.length; i++) {
    if (top === -1 || players[i].totalBet > players[top].totalBet) top = i;
  }
  if (top === -1) return [];
  const second = players.reduce((m, p, i) => (i === top ? m : Math.max(m, p.totalBet)), 0);
  const excess = players[top].totalBet - second;
  if (excess <= 0) return [];
  const p = players[top];
  p.totalBet -= excess;
  p.bet = Math.max(0, p.bet - excess);
  p.stack += excess;
  if (p.stack > 0) p.allIn = false;
  return [{ playerIdx: top, amount: excess }];
}

/** Collect each player's totalBet into main/side pots. Returns [{ amount, eligible: idx[] }]. */
export function computePots(players) {
  const contributions = players.map((p, i) => ({ i, amt: p.totalBet, inHand: inHand(p) }));
  const pots = [];
  let levels = [...new Set(contributions.filter((c) => c.amt > 0).map((c) => c.amt))].sort((a, b) => a - b);
  let prev = 0;
  for (const level of levels) {
    let amount = 0;
    const eligible = [];
    for (const c of contributions) {
      if (c.amt > prev) {
        amount += Math.min(c.amt, level) - prev;
        if (c.inHand && c.amt >= level) eligible.push(c.i);
      }
    }
    if (amount > 0) pots.push({ amount, eligible });
    prev = level;
  }
  // merge consecutive pots with identical eligibility
  const merged = [];
  for (const pot of pots) {
    const last = merged[merged.length - 1];
    if (last && last.eligible.length === pot.eligible.length && last.eligible.every((e, k) => e === pot.eligible[k])) {
      last.amount += pot.amount;
    } else merged.push({ amount: pot.amount, eligible: pot.eligible.slice() });
  }
  return merged;
}
