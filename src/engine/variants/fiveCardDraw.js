import { LIMIT } from '../betting.js';

export default {
  id: 'fiveCardDraw',
  type: 'draw',
  limit: LIMIT.FIXED_LIMIT,
  holeCards: 5,
  blinds: { sb: 5, bb: 10 },
  bets: { small: 10, big: 20 },
  ante: 0,
  maxPlayers: 6,
  showdown: 'bestOf',
  streets: [
    { name: 'predraw', deal: { hole: 5 }, firstToAct: 'afterBlinds', betSize: 'small' },
    { name: 'postdraw', draw: true, firstToAct: 'afterDealer', betSize: 'big' },
  ],
};
