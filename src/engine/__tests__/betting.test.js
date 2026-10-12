import { describe, it, expect } from 'vitest';
import { newRound, legalActions, applyAction, computePots, LIMIT } from '../betting.js';

function mk(stacks) {
  return stacks.map((stack, id) => ({ id, stack, bet: 0, totalBet: 0, folded: false, allIn: false, sittingOut: false }));
}

describe('legalActions', () => {
  it('no-limit: bet min is big blind, max is stack', () => {
    const players = mk([100, 100, 100]);
    const b = newRound({ firstIdx: 0, minRaise: 10, betSize: 10 });
    const la = legalActions(players, b, LIMIT.NO_LIMIT);
    expect(la.check).toBe(true);
    expect(la.fold).toBe(false);
    expect(la.raise).toEqual({ min: 10, max: 100, fixed: false, isBet: true });
  });

  it('no-limit: min raise = last raise size', () => {
    const players = mk([500, 500]);
    let b = newRound({ firstIdx: 0, minRaise: 10, betSize: 10 });
    ({ betting: b } = applyAction(players, b, LIMIT.NO_LIMIT, { type: 'bet', amount: 30 }));
    const la = legalActions(players, b, LIMIT.NO_LIMIT);
    expect(la.toCall).toBe(30);
    expect(la.raise.min).toBe(60);
    ({ betting: b } = applyAction(players, b, LIMIT.NO_LIMIT, { type: 'raise', amount: 100 }));
    const la2 = legalActions(players, b, LIMIT.NO_LIMIT);
    expect(la2.raise.min).toBe(170);
  });

  it('pot-limit: max raise equals pot after call', () => {
    const players = mk([1000, 1000]);
    players[0].totalBet = 5; players[0].bet = 5;
    players[1].totalBet = 10; players[1].bet = 10;
    const b = newRound({ firstIdx: 0, currentBet: 10, minRaise: 10, betSize: 10 });
    const la = legalActions(players, b, LIMIT.POT_LIMIT);
    // pot = 15, to call 5 → pot after call 20 → raise-to = 10 + 20 = 30
    expect(la.raise.max).toBe(30);
    expect(la.raise.min).toBe(20);
  });

  it('fixed-limit: raises are exact and capped at 4', () => {
    const players = mk([1000, 1000]);
    let b = newRound({ firstIdx: 0, minRaise: 10, betSize: 10 });
    ({ betting: b } = applyAction(players, b, LIMIT.FIXED_LIMIT, { type: 'bet' }));
    expect(b.currentBet).toBe(10);
    ({ betting: b } = applyAction(players, b, LIMIT.FIXED_LIMIT, { type: 'raise' }));
    expect(b.currentBet).toBe(20);
    ({ betting: b } = applyAction(players, b, LIMIT.FIXED_LIMIT, { type: 'raise' }));
    ({ betting: b } = applyAction(players, b, LIMIT.FIXED_LIMIT, { type: 'raise' }));
    expect(b.currentBet).toBe(40);
    const la = legalActions(players, b, LIMIT.FIXED_LIMIT);
    expect(la.raise).toBeNull();
    expect(la.call.amount).toBe(10);
  });

  it('round completes when everyone matched', () => {
    const players = mk([100, 100, 100]);
    let b = newRound({ firstIdx: 0, minRaise: 10, betSize: 10 });
    ({ betting: b } = applyAction(players, b, LIMIT.NO_LIMIT, { type: 'check' }));
    ({ betting: b } = applyAction(players, b, LIMIT.NO_LIMIT, { type: 'bet', amount: 20 }));
    ({ betting: b } = applyAction(players, b, LIMIT.NO_LIMIT, { type: 'fold' }));
    expect(b.complete).toBe(false);
    expect(b.toAct).toBe(0);
    ({ betting: b } = applyAction(players, b, LIMIT.NO_LIMIT, { type: 'call' }));
    expect(b.complete).toBe(true);
    expect(players[0].stack).toBe(80);
  });

  it('short all-in does not reopen betting for the raiser', () => {
    const players = mk([100, 25, 100]);
    let b = newRound({ firstIdx: 0, minRaise: 10, betSize: 10 });
    ({ betting: b } = applyAction(players, b, LIMIT.NO_LIMIT, { type: 'bet', amount: 20 }));
    ({ betting: b } = applyAction(players, b, LIMIT.NO_LIMIT, { type: 'allin' }));
    expect(players[1].allIn).toBe(true);
    expect(b.currentBet).toBe(25);
    ({ betting: b } = applyAction(players, b, LIMIT.NO_LIMIT, { type: 'call' }));
    // player 0 must still call the extra 5
    expect(b.toAct).toBe(0);
    const la = legalActions(players, b, LIMIT.NO_LIMIT);
    expect(la.toCall).toBe(5);
    ({ betting: b } = applyAction(players, b, LIMIT.NO_LIMIT, { type: 'call' }));
    expect(b.complete).toBe(true);
  });
});

describe('computePots', () => {
  it('builds main and side pots', () => {
    const players = mk([0, 0, 0]);
    players[0].totalBet = 50; players[0].allIn = true;
    players[1].totalBet = 200;
    players[2].totalBet = 200;
    const pots = computePots(players);
    expect(pots).toEqual([
      { amount: 150, eligible: [0, 1, 2] },
      { amount: 300, eligible: [1, 2] },
    ]);
  });
  it('folded players contribute but are not eligible', () => {
    const players = mk([0, 0, 0]);
    players[0].totalBet = 30; players[0].folded = true;
    players[1].totalBet = 100;
    players[2].totalBet = 100;
    const pots = computePots(players);
    expect(pots).toEqual([{ amount: 230, eligible: [1, 2] }]);
  });
});
