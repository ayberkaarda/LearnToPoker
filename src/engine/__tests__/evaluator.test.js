import { describe, it, expect } from 'vitest';
import { parseCards } from '../deck.js';
import { evaluate5, bestOf, bestOmaha, CATEGORY, evaluateLowA5, evaluateLow27, evaluateBadugi, bestLowA5 } from '../evaluator.js';

const h = (s) => evaluate5(parseCards(s));

describe('evaluate5 categories', () => {
  it('detects every category', () => {
    expect(h('As Ks Qs Js Ts').category).toBe(CATEGORY.ROYAL_FLUSH);
    expect(h('9s 8s 7s 6s 5s').category).toBe(CATEGORY.STRAIGHT_FLUSH);
    expect(h('As 2s 3s 4s 5s').category).toBe(CATEGORY.STRAIGHT_FLUSH);
    expect(h('Ks Kh Kd Kc 2s').category).toBe(CATEGORY.FOUR_OF_A_KIND);
    expect(h('Ks Kh Kd 2c 2s').category).toBe(CATEGORY.FULL_HOUSE);
    expect(h('Ks 9s 7s 4s 2s').category).toBe(CATEGORY.FLUSH);
    expect(h('9s 8h 7d 6c 5s').category).toBe(CATEGORY.STRAIGHT);
    expect(h('Ah 2d 3s 4c 5s').category).toBe(CATEGORY.STRAIGHT);
    expect(h('Ks Kh Kd 7c 2s').category).toBe(CATEGORY.THREE_OF_A_KIND);
    expect(h('Ks Kh 7d 7c 2s').category).toBe(CATEGORY.TWO_PAIR);
    expect(h('Ks Kh 9d 7c 2s').category).toBe(CATEGORY.PAIR);
    expect(h('Ks Qh 9d 7c 2s').category).toBe(CATEGORY.HIGH_CARD);
  });

  it('does not treat K-A-2-3-4 as a straight', () => {
    expect(h('Kh Ad 2s 3c 4s').category).toBe(CATEGORY.HIGH_CARD);
  });

  it('orders categories', () => {
    const order = ['Ks Qh 9d 7c 2s', 'Ks Kh 9d 7c 2s', 'Ks Kh 7d 7c 2s', 'Ks Kh Kd 7c 2s', '9s 8h 7d 6c 5s', 'Ks 9s 7s 4s 2s', 'Ks Kh Kd 2c 2s', 'Ks Kh Kd Kc 2s', '9s 8s 7s 6s 5s', 'As Ks Qs Js Ts'];
    for (let i = 1; i < order.length; i++) expect(h(order[i]).score).toBeGreaterThan(h(order[i - 1]).score);
  });

  it('kickers break ties', () => {
    expect(h('As Ah 9d 7c 2s').score).toBeGreaterThan(h('Ad Ac 8d 7h 2c').score);
    expect(h('As Ah 9d 7c 2s').score).toBe(h('Ad Ac 9h 7h 2c').score);
    expect(h('Ks Kh 7d 7c 9s').score).toBeGreaterThan(h('Ks Kh 7d 7c 8s').score);
    expect(h('Ah Kd 9s 7c 2s').score).toBeGreaterThan(h('Ah Qd 9s 7c 2s').score);
    expect(h('6s 5h 4d 3c 2s').score).toBeGreaterThan(h('Ah 2d 3s 4c 5s').score);
    expect(h('Qs Qh Qd 2c 2s').score).toBeGreaterThan(h('Js Jh Jd Ac As').score);
  });
});

describe('bestOf', () => {
  it('finds best 5 of 7', () => {
    const e = bestOf(parseCards('As Ks 2d 3c Qs Js Ts'));
    expect(e.category).toBe(CATEGORY.ROYAL_FLUSH);
    const e2 = bestOf(parseCards('9h 9d 2c 2s 9s Kd 2h'));
    expect(e2.category).toBe(CATEGORY.FULL_HOUSE);
    expect(e2.tiebreak[0]).toBe(9);
  });
});

describe('bestOmaha', () => {
  it('must use exactly two hole cards', () => {
    // Board has four spades; hero holds only one spade → no flush
    const hole = parseCards('As 2d 3c 4h');
    const board = parseCards('Ks Qs Js 9s 2h');
    const e = bestOmaha(hole, board);
    expect(e.category).not.toBe(CATEGORY.FLUSH);
    // with two spades it is a flush
    const hole2 = parseCards('As 5s 3c 4h');
    expect(bestOmaha(hole2, board).category).toBe(CATEGORY.FLUSH);
  });
  it('cannot play the board (needs 2 hole cards)', () => {
    const hole = parseCards('2d 3c 4h 7c');
    const board = parseCards('As Ks Qs Js Ts');
    const e = bestOmaha(hole, board);
    expect(e.category).toBeLessThan(CATEGORY.ROYAL_FLUSH);
  });
});

describe('low evaluators', () => {
  it('A-5 low: wheel is the nuts, 8-low qualifies', () => {
    const wheel = evaluateLowA5(parseCards('Ah 2d 3s 4c 5s'));
    const eight = evaluateLowA5(parseCards('8h 7d 3s 2c As'));
    const nine = evaluateLowA5(parseCards('9h 7d 3s 2c As'));
    expect(wheel.score).toBeLessThan(eight.score);
    expect(eight.qualifies8).toBe(true);
    expect(nine.qualifies8).toBe(false);
    const paired = evaluateLowA5(parseCards('2h 2d 3s 4c 5s'));
    expect(paired.score).toBeGreaterThan(nine.score);
  });
  it('best A-5 low from 7', () => {
    const e = bestLowA5(parseCards('Ah 2d 3s 4c 5s Kd Kh'));
    expect(e.ranks).toEqual([5, 4, 3, 2, 1]);
  });
  it('2-7 low: 7-5-4-3-2 beats straights/flushes and aces are high', () => {
    const nuts = evaluateLow27(parseCards('7h 5d 4s 3c 2s'));
    const straight = evaluateLow27(parseCards('6h 5d 4s 3c 2s'));
    const aceLow = evaluateLow27(parseCards('Ah 5d 4s 3c 2s'));
    expect(nuts.score).toBeLessThan(straight.score);
    expect(nuts.score).toBeLessThan(aceLow.score);
  });
  it('badugi: four suits and ranks', () => {
    const four = evaluateBadugi(parseCards('As 2d 3c 4h'));
    const three = evaluateBadugi(parseCards('As 2d 3c 4c'));
    expect(four.size).toBe(4);
    expect(three.size).toBe(3);
    expect(four.score).toBeLessThan(three.score);
  });
});
