// Hand-built sample hands for the StepPlayer. One visual state per walkthrough step;
// the step titles/texts live in variants.json (walkthrough.steps) and must have the same count.
//
// Step shape:
// { board: ['As',...], players: [{ name, cards, faceUp:[bool], stack, bet, folded, highlight,
//   highlightCards?:[idx], hole?:[bool] (private stud cards), act?: actsKey }],
//   pot, dealerIdx, actorIdx, actionLabelKey?, discards?: ['7c' | '??'], boardHighlight?: [idx] }

function P(name, cards, o = {}) {
  return {
    name,
    cards,
    faceUp: o.faceUp || cards.map(() => !!o.up),
    hole: o.hole,
    stack: o.stack ?? 100,
    bet: o.bet || 0,
    folded: !!o.folded,
    highlight: !!o.hl,
    highlightCards: o.hc,
    act: o.act,
  };
}

function S(o) {
  return {
    board: o.board || [],
    players: o.players,
    pot: o.pot || 0,
    dealerIdx: o.dealerIdx ?? 0,
    actorIdx: o.actorIdx ?? null,
    actionLabelKey: o.label,
    discards: o.discards,
    boardHighlight: o.bh,
  };
}

// Stud helper: the first two cards and the seventh are private (face down to opponents).
const isStudHole = (i) => i < 2 || i === 6;
function SP(name, cards, hero, o = {}) {
  return P(name, cards, {
    ...o,
    hole: cards.map((_, i) => isStudHole(i)),
    faceUp: o.faceUp || cards.map((_, i) => (hero ? true : !isStudHole(i))),
  });
}
const allUp = (cards) => cards.map(() => true);

/* ------------------------------------------------------------------ Hold'em */
const holdem = (() => {
  const A = ['Ah', 'Kh'];
  const B = ['7c', '2d'];
  const C = ['Qs', 'Qd'];
  const flop = ['Kd', '7h', '2h'];
  const river = [...flop, '9s', '5h'];
  return [
    S({ label: 'blinds', players: [P('Ada', []), P('Bora', [], { stack: 99, bet: 1, act: 'sb' }), P('Cem', [], { stack: 98, bet: 2, act: 'bb' })] }),
    S({ label: 'deal', players: [P('Ada', A, { up: true }), P('Bora', B, { stack: 99, bet: 1 }), P('Cem', C, { stack: 98, bet: 2 })] }),
    S({ label: 'preflop', actorIdx: 0, pot: 1, players: [P('Ada', A, { up: true, stack: 94, bet: 6, act: 'raise' }), P('Bora', B, { stack: 99, folded: true, act: 'fold' }), P('Cem', C, { stack: 94, bet: 6, act: 'call' })] }),
    S({ label: 'flop', pot: 13, board: flop, bh: [0, 1, 2], players: [P('Ada', A, { up: true, stack: 94, hc: [0, 1] }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C, { stack: 94 })] }),
    S({ label: 'flop', actorIdx: 0, pot: 13, board: flop, players: [P('Ada', A, { up: true, stack: 86, bet: 8, act: 'bet' }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C, { stack: 86, bet: 8, act: 'call' })] }),
    S({ label: 'turn', pot: 29, board: [...flop, '9s'], players: [P('Ada', A, { up: true, stack: 86, act: 'check' }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C, { stack: 86, act: 'check' })] }),
    S({ label: 'river', pot: 29, board: river, bh: [1, 2, 4], players: [P('Ada', A, { up: true, stack: 86, hc: [0, 1] }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C, { stack: 86 })] }),
    S({ label: 'river', actorIdx: 0, pot: 29, board: river, players: [P('Ada', A, { up: true, stack: 46, bet: 40, act: 'raise' }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C, { stack: 46, bet: 40, act: 'call' })] }),
    S({ label: 'showdown', pot: 109, board: river, bh: [1, 2, 4], players: [P('Ada', A, { up: true, stack: 46, hl: true, hc: [0, 1] }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C, { up: true, stack: 46 })] }),
    S({ label: 'win', board: river, bh: [1, 2, 4], players: [P('Ada', A, { up: true, stack: 155, hl: true, hc: [0, 1] }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C, { up: true, stack: 46 })] }),
  ];
})();

/* ------------------------------------------------------------------ Omaha */
const omaha = (() => {
  const A = ['As', 'Kh', 'Qd', 'Jc'];
  const B = ['9s', '8s', '6h', '6d'];
  const C = ['Tc', 'Th', '4d', '3c'];
  const flop = ['Ks', '7s', '2s'];
  const turn = [...flop, 'Ts'];
  const river = [...turn, '4h'];
  return [
    S({ label: 'blinds', players: [P('Ada', [], { stack: 200 }), P('Bora', [], { stack: 199, bet: 1, act: 'sb' }), P('Cem', [], { stack: 198, bet: 2, act: 'bb' })] }),
    S({ label: 'deal', players: [P('Ada', A, { up: true, stack: 200 }), P('Bora', B, { stack: 199, bet: 1 }), P('Cem', C, { stack: 198, bet: 2 })] }),
    S({ label: 'preflop', actorIdx: 0, players: [P('Ada', A, { up: true, stack: 194, bet: 6, act: 'raise' }), P('Bora', B, { stack: 194, bet: 6, act: 'call' }), P('Cem', C, { stack: 194, bet: 6, act: 'call' })] }),
    S({ label: 'flop', pot: 18, board: flop, bh: [0, 1, 2], players: [P('Ada', A, { up: true, stack: 194, hc: [0] }), P('Bora', B, { stack: 194 }), P('Cem', C, { stack: 194 })] }),
    S({ label: 'flop', actorIdx: 0, pot: 18, board: flop, players: [P('Ada', A, { up: true, stack: 182, bet: 12, act: 'bet' }), P('Bora', B, { stack: 182, bet: 12, act: 'call' }), P('Cem', C, { stack: 182, bet: 12, act: 'call' })] }),
    S({ label: 'turn', pot: 54, board: turn, bh: [0, 3], players: [P('Ada', A, { up: true, stack: 182, hc: [0, 2, 3] }), P('Bora', B, { stack: 182 }), P('Cem', C, { stack: 182 })] }),
    S({ label: 'turn', actorIdx: 1, pot: 54, board: turn, players: [P('Ada', A, { up: true, stack: 182, folded: true, act: 'fold' }), P('Bora', B, { stack: 142, bet: 40, act: 'bet' }), P('Cem', C, { stack: 142, bet: 40, act: 'call' })] }),
    S({ label: 'river', actorIdx: 1, pot: 134, board: river, players: [P('Ada', A, { up: true, stack: 182, folded: true }), P('Bora', B, { stack: 92, bet: 50, act: 'bet' }), P('Cem', C, { stack: 92, bet: 50, act: 'call' })] }),
    S({ label: 'showdown', pot: 234, board: river, bh: [0, 1, 3], players: [P('Ada', A, { up: true, stack: 182, folded: true }), P('Bora', B, { up: true, stack: 92, hl: true, hc: [0, 1] }), P('Cem', C, { up: true, stack: 92, hc: [0, 1] })] }),
    S({ label: 'win', board: river, bh: [0, 1, 3], players: [P('Ada', A, { up: true, stack: 182, folded: true, hc: [0] }), P('Bora', B, { up: true, stack: 326, hl: true, hc: [0, 1] }), P('Cem', C, { up: true, stack: 92 })] }),
  ];
})();

/* ------------------------------------------------------------------ Omaha Hi-Lo */
const omahaHiLo = (() => {
  const A = ['Ah', '2d', '3c', 'Kd'];
  const B = ['Ks', 'Kh', 'Qs', 'Jh'];
  const C = ['9c', '9d', '8h', '7h'];
  const flop = ['Kc', '7d', '4s'];
  const turn = [...flop, '5h'];
  const river = [...turn, 'Qd'];
  return [
    S({ label: 'blinds', players: [P('Ada', []), P('Bora', [], { stack: 99, bet: 1, act: 'sb' }), P('Cem', [], { stack: 98, bet: 2, act: 'bb' })] }),
    S({ label: 'deal', players: [P('Ada', A, { up: true, hc: [0, 1] }), P('Bora', B, { stack: 99, bet: 1 }), P('Cem', C, { stack: 98, bet: 2 })] }),
    S({ label: 'preflop', actorIdx: 0, players: [P('Ada', A, { up: true, stack: 96, bet: 4, act: 'raise' }), P('Bora', B, { stack: 96, bet: 4, act: 'call' }), P('Cem', C, { stack: 96, bet: 4, act: 'call' })] }),
    S({ label: 'flop', pot: 12, board: flop, bh: [1, 2], players: [P('Ada', A, { up: true, stack: 96, hc: [0, 1] }), P('Bora', B, { stack: 96 }), P('Cem', C, { stack: 96 })] }),
    S({ label: 'flop', actorIdx: 1, pot: 12, board: flop, players: [P('Ada', A, { up: true, stack: 94, bet: 2, act: 'call' }), P('Bora', B, { stack: 94, bet: 2, act: 'bet' }), P('Cem', C, { stack: 96, folded: true, act: 'fold' })] }),
    S({ label: 'turn', pot: 16, board: turn, bh: [1, 2, 3], players: [P('Ada', A, { up: true, stack: 94, hc: [0, 1] }), P('Bora', B, { stack: 94 }), P('Cem', C, { stack: 96, folded: true })] }),
    S({ label: 'turn', actorIdx: 0, pot: 16, board: turn, players: [P('Ada', A, { up: true, stack: 86, bet: 8, act: 'raise' }), P('Bora', B, { stack: 86, bet: 8, act: 'call' }), P('Cem', C, { stack: 96, folded: true })] }),
    S({ label: 'river', actorIdx: 1, pot: 32, board: river, players: [P('Ada', A, { up: true, stack: 82, bet: 4, act: 'call' }), P('Bora', B, { stack: 82, bet: 4, act: 'bet' }), P('Cem', C, { stack: 96, folded: true })] }),
    S({ label: 'showdown', pot: 40, board: river, bh: [0, 1, 2, 3, 4], players: [P('Ada', A, { up: true, stack: 82, hl: true, hc: [0, 1] }), P('Bora', B, { up: true, stack: 82, hl: true, hc: [0, 1] }), P('Cem', C, { stack: 96, folded: true })] }),
    S({ label: 'split', board: river, players: [P('Ada', A, { up: true, stack: 102, hl: true, hc: [0, 1] }), P('Bora', B, { up: true, stack: 102, hl: true, hc: [0, 1] }), P('Cem', C, { stack: 96, folded: true })] }),
  ];
})();

/* ------------------------------------------------------------------ Seven Card Stud */
const sevenCardStud = (() => {
  const A = ['Ah', 'Ad', '9c', 'Kd', '9h', '2s', '3c'];
  const B = ['Qc', 'Jc', '2d', '5h'];
  const C = ['Ks', 'Kc', 'Th', '7d', 'Tc', '3d', 'Qh'];
  const a = (n, o) => SP('Ada', A.slice(0, n), true, o);
  const b = (n, o) => SP('Bora', B.slice(0, n), false, o);
  const c = (n, o) => SP('Cem', C.slice(0, n), false, o);
  const d = 2;
  return [
    S({ label: 'ante', pot: 3, dealerIdx: d, players: [P('Ada', [], { stack: 99, act: 'ante' }), P('Bora', [], { stack: 99, act: 'ante' }), P('Cem', [], { stack: 99, act: 'ante' })] }),
    S({ label: 'thirdStreet', pot: 3, dealerIdx: d, players: [a(3, { stack: 99, hc: [0, 1] }), b(3, { stack: 99 }), c(3, { stack: 99 })] }),
    S({ label: 'bringIn', pot: 3, dealerIdx: d, actorIdx: 1, players: [a(3, { stack: 99 }), b(3, { stack: 97, bet: 2, act: 'bringIn', hc: [2] }), c(3, { stack: 99 })] }),
    S({ label: 'thirdStreet', pot: 3, dealerIdx: d, actorIdx: 2, players: [a(3, { stack: 95, bet: 4, act: 'call' }), b(3, { stack: 95, bet: 4, act: 'call' }), c(3, { stack: 95, bet: 4, act: 'complete' })] }),
    S({ label: 'fourthStreet', pot: 15, dealerIdx: d, actorIdx: 0, players: [a(4, { stack: 91, bet: 4, act: 'bet', hc: [2, 3] }), b(4, { stack: 95, folded: true, act: 'fold' }), c(4, { stack: 91, bet: 4, act: 'call' })] }),
    S({ label: 'fifthStreet', pot: 23, dealerIdx: d, actorIdx: 2, players: [a(5, { stack: 83, bet: 8, act: 'call' }), b(4, { stack: 95, folded: true }), c(5, { stack: 83, bet: 8, act: 'bet', hc: [2, 4] })] }),
    S({ label: 'sixthStreet', pot: 39, dealerIdx: d, actorIdx: 2, players: [a(6, { stack: 83, act: 'check' }), b(4, { stack: 95, folded: true }), c(6, { stack: 83, act: 'check' })] }),
    S({ label: 'seventhStreet', pot: 39, dealerIdx: d, actorIdx: 2, players: [a(7, { stack: 75, bet: 8, act: 'call', hc: [0, 1, 2, 4] }), b(4, { stack: 95, folded: true }), c(7, { stack: 75, bet: 8, act: 'bet' })] }),
    S({ label: 'showdown', pot: 55, dealerIdx: d, players: [a(7, { stack: 75, hl: true, hc: [0, 1, 2, 4, 3] }), b(4, { stack: 95, folded: true }), SP('Cem', C, false, { stack: 75, faceUp: allUp(C), hc: [0, 1, 2, 4, 6] })] }),
    S({ label: 'win', dealerIdx: d, players: [a(7, { stack: 130, hl: true, hc: [0, 1, 2, 4, 3] }), b(4, { stack: 95, folded: true }), SP('Cem', C, false, { stack: 75, faceUp: allUp(C) })] }),
  ];
})();

/* ------------------------------------------------------------------ Razz */
const razz = (() => {
  const A = ['As', '3d', '5c', '2h', 'Kc', '7s', '8d'];
  const B = ['4c', '6d', 'Qs'];
  const C = ['2c', '4h', '6s', '3s', '8c', '8h', 'Td'];
  const a = (n, o) => SP('Ada', A.slice(0, n), true, o);
  const b = (n, o) => SP('Bora', B.slice(0, n), false, o);
  const c = (n, o) => SP('Cem', C.slice(0, n), false, o);
  const d = 2;
  return [
    S({ label: 'ante', pot: 3, dealerIdx: d, players: [P('Ada', [], { stack: 99, act: 'ante' }), P('Bora', [], { stack: 99, act: 'ante' }), P('Cem', [], { stack: 99, act: 'ante' })] }),
    S({ label: 'thirdStreet', pot: 3, dealerIdx: d, players: [a(3, { stack: 99, hc: [0, 1, 2] }), b(3, { stack: 99 }), c(3, { stack: 99 })] }),
    S({ label: 'bringIn', pot: 3, dealerIdx: d, actorIdx: 1, players: [a(3, { stack: 99 }), b(3, { stack: 97, bet: 2, act: 'bringIn', hc: [2] }), c(3, { stack: 99 })] }),
    S({ label: 'thirdStreet', pot: 5, dealerIdx: d, actorIdx: 2, players: [a(3, { stack: 95, bet: 4, act: 'call' }), b(3, { stack: 97, folded: true, act: 'fold' }), c(3, { stack: 95, bet: 4, act: 'complete' })] }),
    S({ label: 'fourthStreet', pot: 13, dealerIdx: d, actorIdx: 0, players: [a(4, { stack: 91, bet: 4, act: 'bet', hc: [2, 3] }), b(3, { stack: 97, folded: true }), c(4, { stack: 91, bet: 4, act: 'call' })] }),
    S({ label: 'fifthStreet', pot: 21, dealerIdx: d, actorIdx: 2, players: [a(5, { stack: 83, bet: 8, act: 'call', hc: [4] }), b(3, { stack: 97, folded: true }), c(5, { stack: 83, bet: 8, act: 'bet' })] }),
    S({ label: 'sixthStreet', pot: 37, dealerIdx: d, actorIdx: 0, players: [a(6, { stack: 75, bet: 8, act: 'bet', hc: [0, 1, 2, 3, 5] }), b(3, { stack: 97, folded: true }), c(6, { stack: 75, bet: 8, act: 'call', hc: [4, 5] })] }),
    S({ label: 'seventhStreet', pot: 53, dealerIdx: d, actorIdx: 0, players: [a(7, { stack: 67, bet: 8, act: 'bet', hc: [0, 1, 2, 3, 5] }), b(3, { stack: 97, folded: true }), c(7, { stack: 67, bet: 8, act: 'call' })] }),
    S({ label: 'showdown', pot: 69, dealerIdx: d, players: [a(7, { stack: 67, hl: true, hc: [0, 1, 2, 3, 5] }), b(3, { stack: 97, folded: true }), SP('Cem', C, false, { stack: 67, faceUp: allUp(C), hc: [0, 1, 2, 3, 4] })] }),
  ];
})();

/* ------------------------------------------------------------------ Five Card Draw */
const fiveCardDraw = (() => {
  const A0 = ['Js', 'Jd', '8c', '4h', '2s'];
  const B0 = ['Kh', 'Qh', '9h', '3h', '7c'];
  const C0 = ['6c', '6d', '6h', 'As', 'Td'];
  const A1 = ['Js', 'Jd', 'Jh', '9d', '3c'];
  const B1 = ['Kh', 'Qh', '9h', '3h', '5s'];
  const C1 = ['6c', '6d', '6h', '2c', '9s'];
  const muck = ['??', '??', '??', '8c', '4h', '2s'];
  return [
    S({ label: 'blinds', players: [P('Ada', []), P('Bora', [], { stack: 99, bet: 1, act: 'sb' }), P('Cem', [], { stack: 98, bet: 2, act: 'bb' })] }),
    S({ label: 'deal', players: [P('Ada', A0, { up: true }), P('Bora', B0, { stack: 99, bet: 1 }), P('Cem', C0, { stack: 98, bet: 2 })] }),
    S({ label: 'firstBet', actorIdx: 0, players: [P('Ada', A0, { up: true, stack: 96, bet: 4, act: 'raise' }), P('Bora', B0, { stack: 96, bet: 4, act: 'call' }), P('Cem', C0, { stack: 96, bet: 4, act: 'call' })] }),
    S({ label: 'draw', pot: 12, players: [P('Ada', A0, { up: true, stack: 96, hc: [0, 1] }), P('Bora', B0, { stack: 96 }), P('Cem', C0, { stack: 96 })] }),
    S({ label: 'discard', pot: 12, discards: muck, players: [P('Ada', A0.slice(0, 2), { up: true, stack: 96, act: 'draw3' }), P('Bora', B0.slice(0, 4), { stack: 96, act: 'draw1' }), P('Cem', C0.slice(0, 3), { stack: 96, act: 'draw2' })] }),
    S({ label: 'draw', pot: 12, discards: muck, players: [P('Ada', A1, { up: true, stack: 96, hc: [0, 1, 2] }), P('Bora', B1, { stack: 96 }), P('Cem', C1, { stack: 96 })] }),
    S({ label: 'secondBet', actorIdx: 0, pot: 12, players: [P('Ada', A1, { up: true, stack: 88, bet: 8, act: 'raise' }), P('Bora', B1, { stack: 96, folded: true, act: 'fold' }), P('Cem', C1, { stack: 88, bet: 8, act: 'call' })] }),
    S({ label: 'showdown', pot: 28, players: [P('Ada', A1, { up: true, stack: 88, hl: true, hc: [0, 1, 2] }), P('Bora', B1, { stack: 96, folded: true }), P('Cem', C1, { up: true, stack: 88, hc: [0, 1, 2] })] }),
    S({ label: 'win', players: [P('Ada', A1, { up: true, stack: 116, hl: true, hc: [0, 1, 2] }), P('Bora', B1, { stack: 96, folded: true }), P('Cem', C1, { up: true, stack: 88 })] }),
  ];
})();

/* ------------------------------------------------------------------ 2-7 Triple Draw */
const deuceToSevenTripleDraw = (() => {
  const A0 = ['2d', '4c', '7h', 'Kd', 'Ks'];
  const A1 = ['2d', '4c', '7h', '3s', 'Ac'];
  const A2 = ['2d', '4c', '7h', '3s', '9h'];
  const A3 = ['2d', '4c', '7h', '3s', '6c'];
  const B = ['9s', '9d', 'Tc', 'Qc', '2c'];
  const C0 = ['3h', '5d', '6s', '8c', 'Jh'];
  const C1 = ['3h', '5d', '6s', '8c', '4d'];
  return [
    S({ label: 'blinds', players: [P('Ada', []), P('Bora', [], { stack: 99, bet: 1, act: 'sb' }), P('Cem', [], { stack: 98, bet: 2, act: 'bb' })] }),
    S({ label: 'deal', players: [P('Ada', A0, { up: true, hc: [0, 1, 2] }), P('Bora', B, { stack: 99, bet: 1 }), P('Cem', C0, { stack: 98, bet: 2 })] }),
    S({ label: 'firstBet', actorIdx: 0, pot: 1, players: [P('Ada', A0, { up: true, stack: 96, bet: 4, act: 'raise' }), P('Bora', B, { stack: 99, folded: true, act: 'fold' }), P('Cem', C0, { stack: 96, bet: 4, act: 'call' })] }),
    S({ label: 'draw1', pot: 9, discards: ['??', 'Kd', 'Ks'], players: [P('Ada', A1, { up: true, stack: 96, act: 'draw2', hc: [4] }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C1, { stack: 96, act: 'draw1' })] }),
    S({ label: 'secondBet', actorIdx: 2, pot: 9, players: [P('Ada', A1, { up: true, stack: 94, bet: 2, act: 'call' }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C1, { stack: 94, bet: 2, act: 'bet' })] }),
    S({ label: 'draw2', pot: 13, discards: ['Ac'], players: [P('Ada', A2, { up: true, stack: 94, act: 'draw1', hc: [4] }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C1, { stack: 94, act: 'pat' })] }),
    S({ label: 'thirdBet', actorIdx: 2, pot: 13, players: [P('Ada', A2, { up: true, stack: 90, bet: 4, act: 'call' }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C1, { stack: 90, bet: 4, act: 'bet' })] }),
    S({ label: 'draw3', pot: 21, discards: ['9h'], players: [P('Ada', A3, { up: true, stack: 90, act: 'draw1', hc: [0, 1, 2, 3, 4] }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C1, { stack: 90, act: 'pat' })] }),
    S({ label: 'fourthBet', actorIdx: 0, pot: 21, players: [P('Ada', A3, { up: true, stack: 82, bet: 8, act: 'raise' }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C1, { stack: 82, bet: 8, act: 'call' })] }),
    S({ label: 'showdown', pot: 37, players: [P('Ada', A3, { up: true, stack: 82, hl: true, hc: [0, 1, 2, 3, 4] }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C1, { up: true, stack: 82 })] }),
  ];
})();

/* ------------------------------------------------------------------ Short Deck */
const shortDeck = (() => {
  const A = ['Ah', '9c'];
  const B = ['Kd', 'Kc'];
  const C = ['Js', 'Ts'];
  const flop = ['6h', '7d', '8s'];
  const turn = [...flop, 'Ks'];
  const river = [...turn, '7s'];
  return [
    S({ label: 'ante', pot: 3, players: [P('Ada', [], { stack: 99, act: 'ante' }), P('Bora', [], { stack: 99, act: 'ante' }), P('Cem', [], { stack: 99, act: 'ante' })] }),
    S({ label: 'deal', pot: 3, players: [P('Ada', A, { up: true, stack: 99 }), P('Bora', B, { stack: 99 }), P('Cem', C, { stack: 99 })] }),
    S({ label: 'preflop', actorIdx: 1, pot: 3, players: [P('Ada', A, { up: true, stack: 93, bet: 6, act: 'call' }), P('Bora', B, { stack: 93, bet: 6, act: 'raise' }), P('Cem', C, { stack: 93, bet: 6, act: 'call' })] }),
    S({ label: 'flop', actorIdx: 0, pot: 21, board: flop, bh: [0, 1, 2], players: [P('Ada', A, { up: true, stack: 83, bet: 10, act: 'bet', hc: [0, 1] }), P('Bora', B, { stack: 83, bet: 10, act: 'call' }), P('Cem', C, { stack: 83, bet: 10, act: 'call' })] }),
    S({ label: 'turn', actorIdx: 1, pot: 51, board: turn, players: [P('Ada', A, { up: true, stack: 63, bet: 20, act: 'call' }), P('Bora', B, { stack: 63, bet: 20, act: 'bet' }), P('Cem', C, { stack: 63, bet: 20, act: 'call' })] }),
    S({ label: 'river', actorIdx: 2, pot: 111, board: river, players: [P('Ada', A, { up: true, stack: 63, folded: true, act: 'fold' }), P('Bora', B, { stack: 0, bet: 63, act: 'call' }), P('Cem', C, { stack: 0, bet: 63, act: 'allin' })] }),
    S({ label: 'showdown', pot: 237, board: river, bh: [1, 3, 4], players: [P('Ada', A, { up: true, stack: 63, folded: true }), P('Bora', B, { up: true, stack: 0, hc: [0, 1] }), P('Cem', C, { up: true, stack: 0 })] }),
    S({ label: 'showdown', pot: 237, board: river, bh: [2, 3, 4], players: [P('Ada', A, { up: true, stack: 63, folded: true }), P('Bora', B, { up: true, stack: 0 }), P('Cem', C, { up: true, stack: 0, hl: true, hc: [0, 1] })] }),
    S({ label: 'win', board: river, bh: [2, 3, 4], players: [P('Ada', A, { up: true, stack: 63, folded: true }), P('Bora', B, { up: true, stack: 0 }), P('Cem', C, { up: true, stack: 237, hl: true, hc: [0, 1] })] }),
  ];
})();

/* ------------------------------------------------------------------ Pineapple */
const pineapple = (() => {
  const A3 = ['Ah', 'Qh', '7c'];
  const B3 = ['9s', '9d', '4c'];
  const C3 = ['Kc', 'Jd', '5s'];
  const A = ['Ah', 'Qh'];
  const B = ['9s', '9d'];
  const flop = ['Qd', 'Th', '3h'];
  const turn = [...flop, '2c'];
  const river = [...turn, '8h'];
  return [
    S({ label: 'blinds', players: [P('Ada', []), P('Bora', [], { stack: 99, bet: 1, act: 'sb' }), P('Cem', [], { stack: 98, bet: 2, act: 'bb' })] }),
    S({ label: 'deal', players: [P('Ada', A3, { up: true }), P('Bora', B3, { stack: 99, bet: 1 }), P('Cem', C3, { stack: 98, bet: 2 })] }),
    S({ label: 'preflop', actorIdx: 0, pot: 2, players: [P('Ada', A3, { up: true, stack: 94, bet: 6, act: 'raise' }), P('Bora', B3, { stack: 94, bet: 6, act: 'call' }), P('Cem', C3, { stack: 98, folded: true, act: 'fold' })] }),
    S({ label: 'discard', pot: 14, discards: ['7c', '??'], players: [P('Ada', A, { up: true, stack: 94, hc: [0, 1] }), P('Bora', B, { stack: 94 }), P('Cem', C3, { stack: 98, folded: true })] }),
    S({ label: 'flop', actorIdx: 0, pot: 14, board: flop, bh: [0, 1, 2], players: [P('Ada', A, { up: true, stack: 86, bet: 8, act: 'bet', hc: [0, 1] }), P('Bora', B, { stack: 86, bet: 8, act: 'call' }), P('Cem', C3, { stack: 98, folded: true })] }),
    S({ label: 'turn', pot: 30, board: turn, players: [P('Ada', A, { up: true, stack: 86, act: 'check' }), P('Bora', B, { stack: 86, act: 'check' }), P('Cem', C3, { stack: 98, folded: true })] }),
    S({ label: 'river', actorIdx: 0, pot: 30, board: river, bh: [1, 2, 4], players: [P('Ada', A, { up: true, stack: 66, bet: 20, act: 'bet', hc: [0, 1] }), P('Bora', B, { stack: 66, bet: 20, act: 'call' }), P('Cem', C3, { stack: 98, folded: true })] }),
    S({ label: 'showdown', pot: 70, board: river, bh: [1, 2, 4], players: [P('Ada', A, { up: true, stack: 66, hl: true, hc: [0, 1] }), P('Bora', B, { up: true, stack: 66 }), P('Cem', C3, { stack: 98, folded: true })] }),
    S({ label: 'win', board: river, bh: [1, 2, 4], players: [P('Ada', A, { up: true, stack: 136, hl: true, hc: [0, 1] }), P('Bora', B, { up: true, stack: 66 }), P('Cem', C3, { stack: 98, folded: true })] }),
  ];
})();

/* ------------------------------------------------------------------ Badugi */
const badugi = (() => {
  const A0 = ['As', '3d', '5h', 'Kh'];
  const A1 = ['As', '3d', '5h', '8h'];
  const A2 = ['As', '3d', '5h', '2c'];
  const B = ['Kd', 'Qd', 'Jc', 'Tc'];
  const C0 = ['4c', '6d', '2h', 'Qs'];
  const C1 = ['4c', '6d', '2h', '9c'];
  const C2 = ['4c', '6d', '2h', '8s'];
  return [
    S({ label: 'blinds', players: [P('Ada', []), P('Bora', [], { stack: 99, bet: 1, act: 'sb' }), P('Cem', [], { stack: 98, bet: 2, act: 'bb' })] }),
    S({ label: 'deal', players: [P('Ada', A0, { up: true, hc: [0, 1, 2] }), P('Bora', B, { stack: 99, bet: 1 }), P('Cem', C0, { stack: 98, bet: 2 })] }),
    S({ label: 'firstBet', actorIdx: 0, pot: 1, players: [P('Ada', A0, { up: true, stack: 96, bet: 4, act: 'raise' }), P('Bora', B, { stack: 99, folded: true, act: 'fold' }), P('Cem', C0, { stack: 96, bet: 4, act: 'call' })] }),
    S({ label: 'draw1', pot: 9, discards: ['Kh', '??'], players: [P('Ada', A1, { up: true, stack: 96, act: 'draw1', hc: [2, 3] }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C1, { stack: 96, act: 'draw1' })] }),
    S({ label: 'secondBet', actorIdx: 0, pot: 9, players: [P('Ada', A1, { up: true, stack: 94, bet: 2, act: 'bet' }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C1, { stack: 94, bet: 2, act: 'call' })] }),
    S({ label: 'draw2', pot: 13, discards: ['8h', '??'], players: [P('Ada', A2, { up: true, stack: 94, act: 'draw1', hl: true, hc: [0, 1, 2, 3] }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C2, { stack: 94, act: 'draw1' })] }),
    S({ label: 'thirdBet', actorIdx: 0, pot: 13, players: [P('Ada', A2, { up: true, stack: 86, bet: 8, act: 'raise' }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C2, { stack: 86, bet: 8, act: 'call' })] }),
    S({ label: 'draw3', pot: 29, players: [P('Ada', A2, { up: true, stack: 86, act: 'pat' }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C2, { stack: 86, act: 'pat' })] }),
    S({ label: 'fourthBet', actorIdx: 0, pot: 29, players: [P('Ada', A2, { up: true, stack: 82, bet: 4, act: 'bet' }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C2, { stack: 82, bet: 4, act: 'call' })] }),
    S({ label: 'showdown', pot: 37, players: [P('Ada', A2, { up: true, stack: 82, hl: true, hc: [0, 1, 2, 3] }), P('Bora', B, { stack: 99, folded: true }), P('Cem', C2, { up: true, stack: 82, hc: [0, 1, 2, 3] })] }),
  ];
})();

/* ------------------------------------------------------------------ HORSE */
const horse = [
  S({ label: 'rotation', players: [P('Ada', []), P('Bora', []), P('Cem', [])] }),
  S({ label: 'gameH', pot: 12, board: ['Jh', '8d', '3c'], bh: [0], players: [P('Ada', ['Js', 'Tc'], { up: true, stack: 96, hc: [0] }), P('Bora', ['9d', '9c'], { stack: 96 }), P('Cem', ['Kh', '4h'], { stack: 96 })] }),
  S({ label: 'gameO', pot: 12, board: ['Kc', '7d', '4s', '5h'], bh: [1, 2, 3], players: [P('Ada', ['Ah', '2d', '3c', 'Kd'], { up: true, stack: 96, hc: [0, 1] }), P('Bora', ['Ks', 'Kh', 'Qs', 'Jh'], { stack: 96 }), P('Cem', ['9c', '9d', '8h', '7h'], { stack: 96 })] }),
  S({ label: 'gameR', pot: 13, dealerIdx: 2, players: [SP('Ada', ['As', '3d', '5c', '2h'], true, { stack: 91, hc: [0, 1, 2, 3] }), SP('Bora', ['4c', '6d', 'Qs'], false, { stack: 97, folded: true }), SP('Cem', ['2c', '4h', '6s', '3s'], false, { stack: 91 })] }),
  S({ label: 'gameS', pot: 23, dealerIdx: 2, players: [SP('Ada', ['Ah', 'Ad', '9c', 'Kd', '9h'], true, { stack: 83, hc: [0, 1, 2, 4] }), SP('Bora', ['Qc', 'Jc', '2d', '5h'], false, { stack: 95, folded: true }), SP('Cem', ['Ks', 'Kc', 'Th', '7d', 'Tc'], false, { stack: 83 })] }),
  S({ label: 'gameE', pot: 40, dealerIdx: 2, players: [SP('Ada', ['Ac', '2s', '4d', '5s', '9d', '8s', '3h'], true, { stack: 80, hl: true, hc: [0, 1, 2, 3, 6] }), SP('Bora', ['Qd', 'Qh', 'Js', 'Jd', 'Qs', '6c', 'Tc'], false, { stack: 80, hl: true, faceUp: [true, true, true, true, true, true, true], hc: [0, 1, 2, 3, 4] }), SP('Cem', ['7c', 'Kh', '8d'], false, { stack: 96, folded: true })] }),
  S({ label: 'rotation', dealerIdx: 1, players: [P('Ada', []), P('Bora', []), P('Cem', [])] }),
  S({ label: 'gameH', dealerIdx: 1, players: [P('Ada', ['Qh', 'Qc'], { up: true }), P('Bora', ['8c', '7c']), P('Cem', ['As', '5d'])] }),
];

export const WALKTHROUGHS = {
  holdem,
  omaha,
  omahaHiLo,
  sevenCardStud,
  razz,
  fiveCardDraw,
  deuceToSevenTripleDraw,
  shortDeck,
  pineapple,
  badugi,
  horse,
};

export function getWalkthrough(id) {
  return WALKTHROUGHS[id] || [];
}
