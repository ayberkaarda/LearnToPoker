import { describe, it, expect } from 'vitest';
import { createGame, step, act, runUntilInput, PHASE } from '../game.js';
import { botDecide } from '../bots.js';
import { coachAdvice } from '../coach.js';
import { PLAYABLE_IDS } from '../variants/index.js';

function players(n) {
  return Array.from({ length: n }, (_, i) => ({ name: 'P' + i, isHuman: false, personality: { aggression: 0.5, looseness: 0.6 } }));
}

function playHand(state) {
  let s = runUntilInput(state);
  let guard = 0;
  while (s.phase !== PHASE.COMPLETE && guard++ < 500) {
    if (s.awaiting) {
      const d = botDecide(s, { samples: 20 });
      s = act(s, d);
    }
    s = runUntilInput(s);
  }
  expect(guard).toBeLessThan(500);
  return s;
}

describe('full hands per variant', () => {
  for (const id of PLAYABLE_IDS) {
    it(`${id}: plays several hands and conserves chips`, () => {
      let s = createGame({ variantId: id, players: players(4), startingStack: 500, seed: 42 });
      const total = 2000;
      for (let h = 0; h < 6; h++) {
        s = playHand(s);
        expect(s.phase).toBe(PHASE.COMPLETE);
        expect(s.result).toBeTruthy();
        const sum = s.players.reduce((a, p) => a + p.stack, 0);
        expect(sum).toBe(total);
        expect(s.result.winners.length).toBeGreaterThan(0);
        if (s.players.filter((p) => p.stack > 0).length < 2) break;
      }
    });
  }
});

describe('holdem specifics', () => {
  it('posts blinds and deals 2 cards each, preflop action starts left of BB', () => {
    let s = createGame({ variantId: 'holdem', players: players(4), seed: 7 });
    s = runUntilInput(s);
    expect(s.phase).toBe(PHASE.BETTING);
    expect(s.players.every((p) => p.cards.length === 2)).toBe(true);
    expect(s.sbIdx).toBe((s.dealerIdx + 1) % 4);
    expect(s.bbIdx).toBe((s.dealerIdx + 2) % 4);
    expect(s.awaiting.playerIdx).toBe((s.dealerIdx + 3) % 4);
    expect(s.awaiting.actions.toCall).toBe(10);
  });

  it('everyone folding to BB ends the hand uncontested', () => {
    let s = createGame({ variantId: 'holdem', players: players(3), seed: 9 });
    s = runUntilInput(s);
    s = runUntilInput(act(s, { type: 'fold' }));
    s = runUntilInput(act(s, { type: 'fold' }));
    expect(s.phase).toBe(PHASE.COMPLETE);
    expect(s.result.uncontested).toBe(true);
    expect(s.result.winners[0].playerIdx).toBe(s.bbIdx);
    expect(s.players[s.bbIdx].stack).toBe(1005);
  });

  it('reaches showdown with 5 community cards when everyone checks', () => {
    let s = createGame({ variantId: 'holdem', players: players(3), seed: 11 });
    s = runUntilInput(s);
    let guard = 0;
    while (s.phase !== PHASE.COMPLETE && guard++ < 50) {
      const a = s.awaiting.actions;
      s = runUntilInput(act(s, { type: a.check ? 'check' : 'call' }));
    }
    expect(s.board.length).toBe(5);
    expect(s.result.uncontested).toBe(false);
    expect(Object.keys(s.result.hands).length).toBe(3);
  });

  it('coach returns a suggestion', () => {
    let s = createGame({ variantId: 'holdem', players: [{ name: 'Me', isHuman: true }, ...players(2)], seed: 5 });
    s = runUntilInput(s);
    while (s.awaiting.playerIdx !== 0) s = runUntilInput(act(s, { type: 'call' }));
    const adv = coachAdvice(s, 0, 50);
    expect(adv.suggestion).toBeTruthy();
    expect(adv.equity).toBeGreaterThan(0);
  });
});

describe('draw and stud specifics', () => {
  it('five-card draw: players get 5 cards and a draw phase happens', () => {
    let s = createGame({ variantId: 'fiveCardDraw', players: players(3), seed: 3 });
    s = runUntilInput(s);
    expect(s.players.every((p) => p.cards.length === 5)).toBe(true);
    let guard = 0;
    while (s.awaiting?.kind !== 'draw' && guard++ < 20) s = runUntilInput(act(s, { type: s.awaiting.actions.check ? 'check' : 'call' }));
    expect(s.awaiting.kind).toBe('draw');
    const p = s.players[s.awaiting.playerIdx];
    const before = p.cards.map((c) => c.id);
    s = act(s, { type: 'draw', discard: before.slice(0, 3) });
    const after = s.players[p.id].cards.map((c) => c.id);
    expect(after.length).toBe(5);
    expect(after.filter((id) => before.includes(id)).length).toBe(2);
  });

  it('seven-card stud: antes, bring-in by lowest up card, 7 cards at showdown', () => {
    let s = createGame({ variantId: 'sevenCardStud', players: players(3), seed: 21 });
    s = runUntilInput(s);
    expect(s.log.filter((l) => l.type === 'ante').length).toBe(3);
    const bi = s.log.find((l) => l.type === 'bringIn');
    expect(bi).toBeTruthy();
    const ups = s.players.map((p) => p.cards.find((c) => c.faceUp));
    const lowest = ups.reduce((m, c, i) => (c.rank < ups[m].rank ? i : m), 0);
    expect(bi.playerIdx).toBe(lowest);
    expect(s.players.every((p) => p.cards.length === 3)).toBe(true);
    let guard = 0;
    while (s.phase !== PHASE.COMPLETE && guard++ < 60) {
      const a = s.awaiting.actions;
      s = runUntilInput(act(s, { type: a.check ? 'check' : 'call' }));
    }
    expect(s.players.every((p) => p.cards.length === 7)).toBe(true);
    expect(s.players.every((p) => p.cards.filter((c) => c.faceUp).length === 7)).toBe(true);
  });
});
