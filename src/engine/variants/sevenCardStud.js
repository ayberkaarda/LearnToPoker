import { LIMIT } from '../betting.js';

export default {
  id: 'sevenCardStud',
  type: 'stud',
  limit: LIMIT.FIXED_LIMIT,
  ante: 2,
  bringIn: 5,
  bets: { small: 10, big: 20 },
  maxPlayers: 7,
  showdown: 'bestOf',
  streets: [
    { name: 'third', deal: { stud: [false, false, true] }, firstToAct: 'bringIn', betSize: 'small' },
    { name: 'fourth', deal: { stud: [true] }, firstToAct: 'bestShowing', betSize: 'small' },
    { name: 'fifth', deal: { stud: [true] }, firstToAct: 'bestShowing', betSize: 'big' },
    { name: 'sixth', deal: { stud: [true] }, firstToAct: 'bestShowing', betSize: 'big' },
    { name: 'seventh', deal: { stud: [false] }, firstToAct: 'bestShowing', betSize: 'big' },
  ],
};
