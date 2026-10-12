// Coach: explains the situation to the human player. Returns i18n keys + params, no text.
import { estimateEquity, currentHandInfo, drawAdvice } from './equity.js';
import { describeHand } from './evaluator.js';
import { totalPot } from './betting.js';

/**
 * Advice for the human at state.awaiting (kind 'bet' or 'draw').
 * Returns { equity, potOdds, handKey, handParams, suggestion: {type, amount?}, reasons: [{key, params}], discard? }
 */
export function coachAdvice(state, heroIdx, samples = 300) {
  const aw = state.awaiting;
  const hero = state.players[heroIdx];
  const { equity, opponents } = estimateEquity(state, heroIdx, samples, 777 + state.handNumber);
  const made = currentHandInfo(state, heroIdx);
  const handDesc = made ? describeHand(made) : null;
  const pot = totalPot(state.players);
  const reasons = [];

  if (aw?.kind === 'draw') {
    const discard = drawAdvice(hero.cards);
    reasons.push({ key: discard.length === 0 ? 'coach.drawKeepAll' : 'coach.drawDiscard', params: { n: discard.length } });
    return { equity, opponents, potOdds: 0, handKey: handDesc?.key, handParams: handDesc?.params, suggestion: { type: 'draw', discard }, reasons, discard };
  }

  const actions = aw?.actions;
  const toCall = actions?.toCall ?? 0;
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;
  const fair = 1 / (opponents + 1);
  let suggestion;

  reasons.push({ key: 'coach.equity', params: { pct: Math.round(equity * 100), opponents, fair: Math.round(fair * 100) } });
  if (handDesc) reasons.push({ key: 'coach.youHold', params: { hand: handDesc } });

  if (!actions) return { equity, opponents, potOdds, handKey: handDesc?.key, handParams: handDesc?.params, suggestion: null, reasons };

  if (actions.check) {
    if (equity > fair + 0.2 && actions.raise) {
      suggestion = { type: 'bet', amount: sizeBet(actions, pot, state) };
      reasons.push({ key: 'coach.betForValue', params: {} });
    } else {
      suggestion = { type: 'check' };
      reasons.push({ key: 'coach.checkFree', params: {} });
    }
  } else {
    reasons.push({ key: 'coach.potOdds', params: { toCall, pot, pct: Math.round(potOdds * 100) } });
    if (equity < potOdds - 0.03) {
      suggestion = { type: 'fold' };
      reasons.push({ key: 'coach.foldBadOdds', params: {} });
    } else if (equity > fair + 0.25 && actions.raise) {
      suggestion = { type: 'raise', amount: sizeBet(actions, pot, state) };
      reasons.push({ key: 'coach.raiseStrong', params: {} });
    } else {
      suggestion = { type: 'call' };
      reasons.push({ key: 'coach.callOk', params: {} });
    }
  }
  return { equity, opponents, potOdds, handKey: handDesc?.key, handParams: handDesc?.params, suggestion, reasons };
}

function sizeBet(actions, pot, state) {
  const r = actions.raise;
  if (r.fixed) return r.min;
  const target = Math.round((pot * 0.66 + state.betting.currentBet) / 5) * 5;
  return Math.max(r.min, Math.min(r.max, target));
}

/** Post-hand review of the human's decisions. Returns list of {key, params}. */
export function reviewHand(state, heroIdx) {
  const notes = [];
  const res = state.result;
  if (!res) return notes;
  const won = res.winners.find((w) => w.playerIdx === heroIdx);
  const hero = state.players[heroIdx];
  if (won) notes.push({ key: 'review.won', params: { amount: won.amount } });
  else if (hero.folded) notes.push({ key: 'review.folded', params: {} });
  else notes.push({ key: 'review.lost', params: {} });
  if (!res.uncontested) {
    const best = Object.entries(res.hands).sort((a, b) => b[1].score - a[1].score)[0];
    if (best) notes.push({ key: 'review.bestHand', params: { name: state.players[Number(best[0])].name, hand: best[1].description } });
  } else {
    notes.push({ key: 'review.uncontested', params: { name: state.players[res.winners[0].playerIdx].name } });
  }
  const mine = state.log.filter((l) => l.type === 'action' && l.playerIdx === heroIdx);
  const aggressive = mine.filter((l) => l.action === 'bet' || l.action === 'raise').length;
  const calls = mine.filter((l) => l.action === 'call').length;
  if (calls > 2 && aggressive === 0) notes.push({ key: 'review.passive', params: {} });
  return notes;
}
