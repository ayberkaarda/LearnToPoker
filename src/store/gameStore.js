import { create } from 'zustand';
import { createGame, step, act, startHand, PHASE, potSize } from '../engine/game.js';
import { botDecide, PERSONALITIES } from '../engine/bots.js';
import { PLAYABLE_IDS } from '../engine/variants/index.js';

export { PHASE, PLAYABLE_IDS };

export const BOT_ROSTER = [
  { name: 'Ayşe', personality: 'tight' },
  { name: 'Mert', personality: 'loose' },
  { name: 'Zeynep', personality: 'balanced' },
  { name: 'Can', personality: 'maniac' },
  { name: 'Elif', personality: 'tight' },
];

export const HUMAN_NAME = 'You';
export const FEED_MAX = 40;
export const AUTO_BOT_MS = 800;
export const AUTO_DEAL_MS = 600;

const ALIASES = {
  holdem: 'holdem',
  texasholdem: 'holdem',
  texas: 'holdem',
  nlhe: 'holdem',
  omaha: 'omaha',
  plo: 'omaha',
  potlimitomaha: 'omaha',
  fivecarddraw: 'fiveCardDraw',
  draw: 'fiveCardDraw',
  '5carddraw': 'fiveCardDraw',
  sevencardstud: 'sevenCardStud',
  stud: 'sevenCardStud',
  '7cardstud': 'sevenCardStud',
};

/** Map a URL param to a playable variant id. Returns null when not playable. */
export function resolveVariant(param) {
  if (!param) return 'holdem';
  if (PLAYABLE_IDS.includes(param)) return param;
  const k = String(param).toLowerCase().replace(/[^a-z0-9]/g, '');
  return ALIASES[k] || null;
}

export function buildPlayers(numBots) {
  const n = Math.max(2, Math.min(5, numBots));
  return [
    { name: HUMAN_NAME, isHuman: true, personality: PERSONALITIES.balanced },
    ...BOT_ROSTER.slice(0, n).map((b) => ({ name: b.name, isHuman: false, personality: PERSONALITIES[b.personality], style: b.personality })),
  ];
}

export function personalityOf(idx) {
  return idx === 0 ? null : BOT_ROSTER[idx - 1]?.personality ?? null;
}

export function isHumanTurn(game) {
  return !!(game?.awaiting && game.players[game.awaiting.playerIdx]?.isHuman);
}

export function isBotTurn(game) {
  return !!(game?.awaiting && !game.players[game.awaiting.playerIdx]?.isHuman);
}

/** The pot that has already been collected (excludes bets still in front of players). */
export function collectedPot(game) {
  if (!game) return 0;
  return potSize(game) - game.players.reduce((s, p) => s + p.bet, 0);
}

/** Describe what changed between two states as feed items (engine log entries + plain notes). */
export function diffFeed(prev, next) {
  const items = [];
  const sameHand = prev && prev.handNumber === next.handNumber;
  const fresh = sameHand ? next.log.slice(prev.log.length) : next.log;
  for (const e of fresh) items.push({ kind: 'log', hand: next.handNumber, entry: e });
  if (!prev) return items;

  const street = next.variant.streets[next.streetIdx]?.name ?? null;
  const prevStreet = prev.variant.streets[prev.streetIdx]?.name ?? null;
  if (prev.phase === PHASE.BETTING && prev.betting?.complete && sameHand) {
    if (next.phase === PHASE.DEAL) items.push(note('roundEnd', { street: prevStreet }));
    else if (next.phase === PHASE.DRAW) items.push(note('drawStarts', {}));
    else if (next.phase === PHASE.SHOWDOWN) {
      const alive = next.players.filter((p) => !p.folded && !p.sittingOut).length;
      items.push(note(alive <= 1 ? 'allFolded' : 'toShowdown', {}));
    }
  }
  if (next.phase === PHASE.BETTING && (prev.phase !== PHASE.BETTING || !sameHand)) {
    if (next.awaiting) items.push(note('bettingStarts', { street, playerIdx: next.awaiting.playerIdx }));
    else items.push(note('noBetting', { street }));
  }
  return items;

  function note(key, params) {
    return { kind: 'note', hand: next.handNumber, entry: { type: key, ...params } };
  }
}

let feedSeq = 0;

function withFeed(feed, items) {
  if (!items.length) return feed;
  const stamped = items.map((it) => ({ ...it, id: ++feedSeq }));
  return [...stamped.reverse(), ...feed].slice(0, FEED_MAX);
}

/** One loop tick: a bot decision when a bot is awaited, otherwise one engine step. Pure. */
export function advanceGame(game, opts = {}) {
  if (!game || game.phase === PHASE.COMPLETE) return game;
  if (game.awaiting) {
    if (isHumanTurn(game)) return game;
    const d = botDecide(game, opts);
    return act(game, d);
  }
  return step(game);
}

export function canStartNextHand(game) {
  if (!game) return false;
  return game.players.filter((p) => p.stack > 0).length >= 2 && game.players[0].stack > 0;
}

export const useGameStore = create((set, get) => ({
  config: { variantId: 'holdem', numBots: 3, startingStack: 1000, mode: 'step' },
  game: null,
  feed: [],
  setupOpen: true,
  coachOn: true,
  summaryOpen: false,
  advice: null,
  adviceKey: null,
  drawSelection: [],
  seed: null,

  setConfig: (partial) => set((s) => ({ config: { ...s.config, ...partial } })),
  setMode: (mode) => set((s) => ({ config: { ...s.config, mode } })),
  openSetup: () => set({ setupOpen: true }),
  closeSetup: () => set((s) => ({ setupOpen: !s.game })),
  toggleCoach: () => set((s) => ({ coachOn: !s.coachOn })),
  closeSummary: () => set({ summaryOpen: false }),
  openSummary: () => set({ summaryOpen: true }),
  setAdvice: (adviceKey, advice) => set({ adviceKey, advice }),

  startGame: (partial) => {
    const config = { ...get().config, ...(partial || {}) };
    const seed = (Date.now() % 2147483647) >>> 0;
    const base = createGame({ variantId: config.variantId, players: buildPlayers(config.numBots), startingStack: config.startingStack, seed });
    const game = step(base); // hand #1 starts right away
    set({ config, game, seed, feed: withFeed([], diffFeed(null, game)), setupOpen: false, summaryOpen: false, advice: null, adviceKey: null, drawSelection: [] });
  },

  _commit: (next) => {
    const prev = get().game;
    if (next === prev) return;
    const items = diffFeed(prev, next);
    const patch = { game: next, feed: withFeed(get().feed, items) };
    if (next.phase === PHASE.COMPLETE && prev.phase !== PHASE.COMPLETE) patch.summaryOpen = true;
    if (!(next.awaiting?.kind === 'draw' && isHumanTurn(next))) patch.drawSelection = [];
    set(patch);
  },

  advance: () => {
    if (get().setupOpen) return;
    const g = get().game;
    if (!g) return;
    get()._commit(advanceGame(g));
  },

  humanAct: (action) => {
    if (get().setupOpen) return;
    const g = get().game;
    if (!isHumanTurn(g)) return;
    get()._commit(act(g, action));
  },

  toggleDiscard: (cardId) => {
    if (get().setupOpen) return;
    const g = get().game;
    if (!isHumanTurn(g) || g.awaiting.kind !== 'draw') return;
    const sel = get().drawSelection;
    if (sel.includes(cardId)) set({ drawSelection: sel.filter((c) => c !== cardId) });
    else if (sel.length < g.awaiting.maxDiscard) set({ drawSelection: [...sel, cardId] });
  },

  submitDraw: () => {
    if (get().setupOpen) return;
    const { game, drawSelection } = get();
    if (!isHumanTurn(game) || game.awaiting.kind !== 'draw') return;
    get()._commit(act(game, { type: 'draw', discard: drawSelection }));
  },

  newHand: () => {
    if (get().setupOpen) return;
    const g = get().game;
    if (!g || g.phase !== PHASE.COMPLETE || !canStartNextHand(g)) return;
    get()._commit(startHand(g));
    set({ summaryOpen: false, advice: null, adviceKey: null });
  },

  rebuy: () => {
    if (get().setupOpen) return;
    const g = get().game;
    if (!g || g.players[0].stack > 0) return;
    const next = structuredClone(g);
    next.players[0].stack = get().config.startingStack;
    set({ game: next });
  },
}));

// ---------- text helpers (pure; pass i18next `t` bound to the play namespace) ----------

const RANK_KEY = { 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export function rankName(t, r) {
  return t(`common:ranks.${RANK_KEY[r] || String(r)}`);
}

/** `{key, params}` from describeHand → "Pair — Kings" style text. */
export function handText(t, desc) {
  if (!desc?.key) return '';
  const name = t(`common:hands.${desc.key}`);
  const p = {};
  for (const [k, v] of Object.entries(desc.params || {})) p[k] = typeof v === 'number' ? rankName(t, v) : v;
  return t(`handFmt.${desc.key}`, { name, ...p });
}

export function playerName(t, game, idx) {
  const p = game?.players[idx];
  if (!p) return '';
  return p.isHuman ? t('you') : p.name;
}

/** Turn engine params into display-ready strings (hand objects, player names). */
export function formatParams(t, game, params = {}) {
  const out = {};
  for (const [k, v] of Object.entries(params)) {
    if (v && typeof v === 'object' && 'key' in v) out[k] = handText(t, v);
    else if (k === 'name' && game && v === game.players[0]?.name && game.players[0].isHuman) out[k] = t('you');
    else out[k] = v;
  }
  return out;
}

function cardsText(t, ids) {
  return ids
    .map((id) => {
      const r = id.slice(0, -1);
      const s = id.slice(-1);
      const rank = { T: 10, J: 11, Q: 12, K: 13, A: 14 }[r] || Number(r);
      return t('common:cardName', { rank: rankName(t, rank), suit: t(`common:suits.${s}`) });
    })
    .join(', ');
}

/** "X got back N uncalled chips" lines for `result.refunds` ([{playerIdx, amount}]), if any. */
export function refundTexts(t, game, result) {
  const list = Array.isArray(result?.refunds) ? result.refunds : [];
  return list.filter((r) => r && r.amount > 0).map((r) => t('refundLog', { name: playerName(t, game, r.playerIdx), amount: r.amount }));
}

/** Plain-language sentence for one feed item. */
export function explainFeedItem(t, game, item) {
  const e = item.entry;
  const name = (idx) => playerName(t, game, idx);
  const street = (s) => (s ? t(`streets.${s}`) : '');
  if (item.kind === 'note') {
    return t(`log.notes.${e.type}`, { street: street(e.street), name: e.playerIdx != null ? name(e.playerIdx) : '' });
  }
  switch (e.type) {
    case 'handStart':
      return t('log.handStart', { n: e.hand, name: name(e.dealerIdx) });
    case 'ante':
      return t('log.ante', { name: name(e.playerIdx), amount: e.amount });
    case 'blind':
      return t(`log.${e.kind}`, { name: name(e.playerIdx), amount: e.amount });
    case 'bringIn':
      return t('log.bringIn', { name: name(e.playerIdx), amount: e.amount });
    case 'dealHole':
      return t('log.dealHole', { count: e.count });
    case 'dealCommunity':
      return t('log.dealCommunity', { street: street(e.street), cards: cardsText(t, e.cards) });
    case 'dealStud': {
      const up = e.faceUp.filter(Boolean).length;
      return t('log.dealStud', { street: street(e.street), up, down: e.faceUp.length - up });
    }
    case 'action': {
      const key = ['fold', 'check', 'call', 'bet', 'raise', 'allin'].includes(e.action) ? e.action : 'call';
      return t(`log.action.${key}`, { name: name(e.playerIdx), amount: e.amount, to: e.raiseTo ?? e.amount, pot: e.pot });
    }
    case 'draw':
      return e.count === 0 ? t('log.drawNone', { name: name(e.playerIdx) }) : t('log.draw', { name: name(e.playerIdx), count: e.count });
    case 'showdown': {
      const r = e.result;
      // Refunds come either as separate 'refund' log entries or only on the result.
      const refundLines = game?.log?.some((x) => x.type === 'refund') ? [] : refundTexts(t, game, r);
      if (r.uncontested) {
        const w = r.winners[0];
        return [t('log.uncontested', { name: name(w.playerIdx), amount: w.amount }), ...refundLines].join(' ');
      }
      const lines = r.winners.map((w) =>
        t('log.showdown', { name: name(w.playerIdx), amount: w.amount, hand: handText(t, r.hands[w.playerIdx]?.description) })
      );
      if (r.pots.some((p) => p.winners.length > 1)) {
        const split = r.pots.find((p) => p.winners.length > 1);
        lines.push(t('log.showdownSplit', { names: split.winners.map(name).join(', ') }));
      }
      return [...lines, ...refundLines].join(' ');
    }
    case 'refund':
      return t('refundLog', { name: name(e.playerIdx), amount: e.amount });
    default:
      return '';
  }
}
