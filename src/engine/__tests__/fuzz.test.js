// Randomized hands: random legal actions, 2-6 players, short and deep stacks mixed.
import { describe, it, expect } from 'vitest';
import { createGame, startHand, step, act, PHASE } from '../game.js';
import { canAct } from '../betting.js';
import { createRng } from '../deck.js';
import { PLAYABLE_IDS } from '../variants/index.js';

const HANDS = 200;

function randomAction(aw, p, rng) {
  if (aw.kind === 'draw') {
    const ids = p.cards.map((c) => c.id).filter(() => rng() < 0.5);
    return { type: 'draw', discard: ids.slice(0, aw.maxDiscard) };
  }
  const a = aw.actions;
  const opts = [];
  if (a.fold) opts.push({ type: 'fold' });
  if (a.check) opts.push({ type: 'check' }, { type: 'check' });
  if (a.call) opts.push({ type: 'call' }, { type: 'call' });
  if (a.raise) {
    const amt = a.raise.min + Math.floor(rng() * (a.raise.max - a.raise.min + 1));
    opts.push({ type: a.raise.isBet ? 'bet' : 'raise', amount: amt });
  }
  if (a.raise || a.call) opts.push({ type: 'allin' });
  if (a.bringIn) opts.push({ type: 'bringIn' }, { type: 'complete' });
  return opts[Math.floor(rng() * opts.length)];
}

function checkInvariants(s, chips) {
  const inPlay = s.players.reduce((a, p) => a + p.stack + p.totalBet, 0);
  expect(inPlay).toBe(chips);
  for (const p of s.players) expect(p.stack).toBeGreaterThanOrEqual(0);
  const ids = [...s.players.flatMap((p) => p.cards), ...s.board].map((c) => c && c.id);
  expect(ids.every(Boolean)).toBe(true);
  expect(new Set(ids).size).toBe(ids.length);
  if (s.awaiting) {
    const p = s.players[s.awaiting.playerIdx];
    expect(p.folded).toBe(false);
    expect(p.sittingOut).toBe(false);
    if (s.awaiting.kind === 'bet') {
      expect(canAct(p)).toBe(true);
      expect(p.stack).toBeGreaterThan(0);
      const r = s.awaiting.actions.raise;
      if (r) {
        expect(r.min).toBeLessThanOrEqual(r.max);
        expect(r.max).toBeLessThanOrEqual(p.bet + p.stack);
        expect(r.max).toBeGreaterThan(s.betting.currentBet);
      }
    } else {
      expect(s.awaiting.maxDiscard).toBeGreaterThanOrEqual(0);
    }
  }
}

describe('fuzz: random legal actions', () => {
  for (const id of PLAYABLE_IDS) {
    it(`${id}: ${HANDS} hands keep chips, stacks and turns valid`, () => {
      const rng = createRng(1000 + id.length * 97);
      let s = null;
      let chips = 0;
      let played = 0;
      while (played < HANDS) {
        if (!s || s.players.filter((p) => p.stack > 0).length < 2) {
          const n = 2 + Math.floor(rng() * 5);
          const players = Array.from({ length: n }, (_, i) => ({ name: 'P' + i, stack: 5 + Math.floor(rng() * 400) }));
          s = createGame({ variantId: id, players, seed: Math.floor(rng() * 1e9) });
          chips = s.players.reduce((a, p) => a + p.stack, 0);
        } else {
          s = startHand(s);
        }
        let guard = 0;
        while (s.phase !== PHASE.COMPLETE) {
          expect(guard++).toBeLessThan(400);
          s = s.awaiting ? act(s, randomAction(s.awaiting, s.players[s.awaiting.playerIdx], rng)) : step(s);
          checkInvariants(s, chips);
        }
        expect(s.result).toBeTruthy();
        expect(s.players.reduce((a, p) => a + p.stack, 0)).toBe(chips);
        const paid = s.result.winners.reduce((a, w) => a + w.amount, 0);
        expect(paid).toBe(s.result.pots.reduce((a, p) => a + p.amount, 0));
        played++;
      }
    });
  }
});
