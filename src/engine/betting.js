// Betting round logic. Pure functions over { players, betting, limit }.
// A player: { stack, bet (this round), totalBet (this hand), folded, allIn }
// betting: { currentBet, minRaise, toAct, raises, raiseCap, betSize, acted: number[] , lastAggressor }

export const LIMIT = { NO_LIMIT: 'no-limit', POT_LIMIT: 'pot-limit', FIXED_LIMIT: 'fixed-limit' };

export function canAct(p) {
  return !p.folded && !p.allIn && !p.sittingOut;
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

export function commit(p, amount) {
  const amt = Math.min(amount, p.stack);
  p.stack -= amt;
  p.bet += amt;
  p.totalBet += amt;
  if (p.stack === 0) p.allIn = true;
  return amt;
}

/** Start a new betting round. firstIdx = seat index that should act first (will be adjusted if cannot act). */
export function newRound({ firstIdx, currentBet = 0, minRaise, betSize, raiseCap = 4, lastAggressor = -1, acted = [] }) {
  return {
    currentBet,
    minRaise,
    betSize,
    raiseCap,
    raises: 0,
    toAct: firstIdx,
    acted: acted.slice(),
    lastAggressor,
    complete: false,
  };
}

export function playersWhoCanAct(players) {
  return players.filter(canAct).length;
}

/**
 * Legal actions for player idx.
 * Returns { fold, check, call: {amount}|null, raise: {min, max, fixed}|null, allInAmount }
 * `raise.min/max` are "raise to" totals for this round.
 */
export function legalActions(players, betting, limit) {
  const idx = betting.toAct;
  const p = players[idx];
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

  const pot = totalPot(players);
  let min;
  let max;
  if (limit === LIMIT.FIXED_LIMIT) {
    if (betting.raises >= betting.raiseCap) return res;
    // bring-in situation: completing to the full bet size
    min = betting.currentBet < betting.betSize ? betting.betSize : betting.currentBet + betting.betSize;
    max = min;
  } else {
    const base = betting.currentBet === 0 ? betting.minRaise : betting.currentBet + betting.minRaise;
    min = base;
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

/**
 * Apply an action. Mutates players[] entries and returns new betting object.
 * action: { type: 'fold'|'check'|'call'|'raise'|'bet'|'allin', amount? (raise-to total) }
 */
export function applyAction(players, betting, limit, action) {
  const idx = betting.toAct;
  const p = players[idx];
  const legal = legalActions(players, betting, limit);
  const b = { ...betting, acted: betting.acted.slice() };
  let applied = { playerIdx: idx, type: action.type, amount: 0 };

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
      const total = p.bet + p.stack;
      if (total > b.currentBet && legal.raise) {
        return applyAction(players, betting, limit, { type: 'raise', amount: total });
      }
      applied.amount = commit(p, p.stack);
      applied.type = total > b.currentBet ? 'raise' : 'call';
      break;
    }
    case 'bet':
    case 'raise': {
      if (!legal.raise) throw new Error('cannot raise');
      let to = action.amount;
      if (legal.raise.fixed) to = legal.raise.min;
      to = Math.max(legal.raise.min, Math.min(legal.raise.max, to));
      const raiseSize = to - b.currentBet;
      const wasBringIn = limit === LIMIT.FIXED_LIMIT && b.currentBet < b.betSize && b.currentBet > 0;
      applied.amount = commit(p, to - p.bet);
      applied.type = b.currentBet === 0 ? 'bet' : 'raise';
      applied.raiseTo = to;
      const fullRaise = raiseSize >= b.minRaise || limit === LIMIT.FIXED_LIMIT;
      if (fullRaise) {
        if (limit !== LIMIT.FIXED_LIMIT) b.minRaise = raiseSize;
        if (limit === LIMIT.FIXED_LIMIT && !wasBringIn) b.raises += 1;
        b.acted = [idx];
        b.lastAggressor = idx;
      } else {
        b.acted.push(idx);
      }
      b.currentBet = to;
      break;
    }
    default:
      throw new Error('unknown action ' + action.type);
  }
  if (!b.acted.includes(idx)) b.acted.push(idx);

  // Determine completion
  const alive = players.filter(inHand);
  if (alive.length <= 1) {
    b.complete = true;
    b.toAct = -1;
    return { betting: b, applied };
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
  return { betting: b, applied };
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
