import { LIMIT } from '../betting.js';

export default {
  id: 'holdem',
  type: 'community',
  limit: LIMIT.NO_LIMIT,
  holeCards: 2,
  blinds: { sb: 5, bb: 10 },
  ante: 0,
  maxPlayers: 9,
  showdown: 'bestOf',
  streets: [
    { name: 'preflop', deal: { hole: 2 }, firstToAct: 'afterBlinds' },
    { name: 'flop', deal: { community: 3 }, firstToAct: 'afterDealer' },
    { name: 'turn', deal: { community: 1 }, firstToAct: 'afterDealer' },
    { name: 'river', deal: { community: 1 }, firstToAct: 'afterDealer' },
  ],
};
