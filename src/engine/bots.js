// Heuristic bots: Monte Carlo equity + pot odds + personality.
import { estimateEquity, drawAdvice } from './equity.js';
import { createRng } from './deck.js';
import { totalPot, winnablePot } from './betting.js';

export const PERSONALITIES = {
  tight: { aggression: 0.35, looseness: 0.25 },
  balanced: { aggression: 0.5, looseness: 0.5 },
  loose: { aggression: 0.6, looseness: 0.8 },
  maniac: { aggression: 0.9, looseness: 0.9 },
};

/**
 * Pot odds for a call: the chips actually paid (a short stack only pays what it has) divided by
 * the pot that player can win after calling (side pots above their stack are excluded).
 */
export function callPotOdds(state, idx, actions) {
  const callAmt = actions?.call?.amount ?? 0;
  if (callAmt <= 0) return { callAmt: 0, pot: totalPot(state.players), potOdds: 0 };
  const after = winnablePot(state.players, idx, callAmt);
  return { callAmt, pot: after - callAmt, potOdds: callAmt / after };
}

/** Make sure an action is one that `actions` (legalActions output) allows; otherwise fall back to call/check/fold. */
export function legalize(action, actions) {
  const t = action.type;
  const ok =
    (t === 'fold' && actions.fold) ||
    (t === 'check' && actions.check) ||
    (t === 'call' && actions.call) ||
    ((t === 'bet' || t === 'raise' || t === 'allin') && actions.raise);
  if (ok) return action;
  const extra = action.equity !== undefined ? { equity: action.equity } : {};
  if (actions.check) return { type: 'check', ...extra };
  if (actions.call) return { type: 'call', ...extra };
  return { type: 'fold', ...extra };
}

/** Decide an action for the bot at state.awaiting. Returns { type, amount? , equity } */
export function botDecide(state, opts = {}) {
  const aw = state.awaiting;
  if (!aw) return null;
  const idx = aw.playerIdx;
  const p = state.players[idx];
  const rng = createRng((state.seed ^ (state.handNumber * 131 + state.log.length * 17 + idx * 7)) >>> 0);
  const samples = opts.samples ?? 160;

  if (aw.kind === 'draw') {
    const max = aw.maxDiscard ?? 5;
    return { type: 'draw', discard: drawAdvice(p.cards).slice(0, max) };
  }
  return legalize(decideBet(state, aw, idx, p, rng, samples), aw.actions);
}

function decideBet(state, aw, idx, p, rng, samples) {
  const { equity } = estimateEquity(state, idx, samples, state.handNumber * 1000 + state.log.length);
  const actions = aw.actions;
  const pot = totalPot(state.players);
  const pers = p.personality;
  const nOpp = state.players.filter((q, i) => i !== idx && !q.folded && !q.sittingOut).length;
  // Equity needed to break even on a call
  const { callAmt, pot: winPot, potOdds } = callPotOdds(state, idx, actions);
  // Adjust "strong" threshold for number of opponents
  const strong = 0.5 + 0.08 * (nOpp - 1);
  const noise = (rng() - 0.5) * 0.08;
  const eq = equity + noise;

  const raiseSize = (a) => {
    const r = a.raise;
    if (r.fixed) return r.min;
    const target = pot * (0.5 + pers.aggression * 0.5) + state.betting.currentBet;
    return Math.max(r.min, Math.min(r.max, Math.round(target / 5) * 5));
  };

  if (actions.bringIn) {
    // stud bring-in: complete with a strong start, otherwise post the minimum
    if (actions.raise && eq > strong && rng() < 0.4 + pers.aggression * 0.5) return { type: 'bet', amount: actions.raise.min, equity };
    return { type: 'call', equity };
  }

  if (actions.check) {
    const betProb = eq > strong ? 0.6 + pers.aggression * 0.4 : eq > 0.35 ? pers.aggression * 0.35 : pers.aggression * 0.08;
    if (actions.raise && rng() < betProb) return { type: 'bet', amount: raiseSize(actions), equity };
    return { type: 'check', equity };
  }

  // facing a bet
  const margin = eq - potOdds;
  const cheap = callAmt <= winPot * 0.15;
  if (margin < -0.05 - pers.looseness * 0.12 && !(cheap && rng() < pers.looseness * 0.4)) {
    return { type: 'fold', equity };
  }
  if (actions.raise && eq > strong + 0.1 && rng() < 0.35 + pers.aggression * 0.5) {
    return { type: 'raise', amount: raiseSize(actions), equity };
  }
  if (actions.raise && eq > 0.3 && rng() < pers.aggression * 0.12) {
    return { type: 'raise', amount: raiseSize(actions), equity }; // occasional bluff-raise
  }
  return { type: 'call', equity };
}
