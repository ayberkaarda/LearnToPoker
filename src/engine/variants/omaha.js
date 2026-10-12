import { LIMIT } from '../betting.js';

export default {
  id: 'omaha',
  type: 'community',
  limit: LIMIT.POT_LIMIT,
  holeCards: 4,
  blinds: { sb: 5, bb: 10 },
  ante: 0,
  maxPlayers: 9,
  showdown: 'omaha',
  streets: [
    { name: 'preflop', deal: { hole: 4 }, firstToAct: 'afterBlinds' },
    { name: 'flop', deal: { community: 3 }, firstToAct: 'afterDealer' },
    { name: 'turn', deal: { community: 1 }, firstToAct: 'afterDealer' },
    { name: 'river', deal: { community: 1 }, firstToAct: 'afterDealer' },
  ],
};
