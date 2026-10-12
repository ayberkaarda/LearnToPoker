import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { parseCard } from '../engine/deck.js';
import {
  CARD_W,
  CARD_H,
  CARD_R,
  COLORS,
  SUIT_PATHS,
  BACK,
  backLattice,
  faceLayout,
  normalizeCard,
  rankLabel,
} from './cardLayout.js';
import './Card2D.css';

export { parseCard };

const RANK_KEY = { 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

/** Human readable card name, e.g. "Maça As" / "Ace of Spades". */
export function cardLabel(card, t) {
  const c = normalizeCard(card);
  if (!c) return '';
  const rk = RANK_KEY[c.rank] || String(c.rank);
  if (typeof t !== 'function') return `${rankLabel(c.rank)}${c.suit}`;
  const rank = t(`common:ranks.${rk}`);
  const suit = t(`common:suits.${c.suit}`);
  return t('common:cardName', { rank, suit });
}

const FONT = {
  display: "'Bodoni Moda', Didot, Georgia, serif",
  body: "'Hanken Grotesk', system-ui, sans-serif",
};

function renderItem(it, i) {
  switch (it.k) {
    case 'suit': {
      const sc = it.s / 100;
      const rot = it.flip ? ' rotate(180)' : '';
      return (
        <path
          key={i}
          d={SUIT_PATHS[it.suit]}
          fill={it.color}
          transform={`translate(${it.x} ${it.y})${rot} scale(${sc}) translate(-50 -50)`}
        />
      );
    }
    case 'text':
      return (
        <text
          key={i}
          x={it.x}
          y={it.y}
          fill={it.color}
          fontFamily={FONT[it.font] || FONT.display}
          fontSize={it.size}
          fontWeight={it.weight}
          textAnchor={it.anchor === 'start' ? 'start' : 'middle'}
          letterSpacing={it.spacing || 0}
        >
          {it.text}
        </text>
      );
    case 'rect':
      return (
        <rect
          key={i}
          x={it.x}
          y={it.y}
          width={it.w}
          height={it.h}
          rx={it.r}
          fill={it.fill}
          stroke={it.stroke}
          strokeWidth={it.sw}
        />
      );
    case 'group':
      return (
        <g key={i} transform={`rotate(180 ${CARD_W / 2} ${CARD_H / 2})`}>
          {it.items.map(renderItem)}
        </g>
      );
    default:
      return null;
  }
}

function CardFace({ card, variant }) {
  return (
    <>
      <rect
        x="0.75"
        y="0.75"
        width={CARD_W - 1.5}
        height={CARD_H - 1.5}
        rx={CARD_R}
        fill={COLORS.face}
        stroke={COLORS.faceEdge}
        strokeWidth="1.5"
      />
      {faceLayout(card, variant).map(renderItem)}
    </>
  );
}

function CardBack() {
  const { field, frame, medallion: m } = BACK;
  return (
    <>
      <rect x="0.75" y="0.75" width={CARD_W - 1.5} height={CARD_H - 1.5} rx={CARD_R} fill={COLORS.backOuter} stroke={COLORS.faceEdge} strokeWidth="1.5" />
      <rect x={field.x} y={field.y} width={field.w} height={field.h} rx={field.r} fill={COLORS.back} />
      <path d={backLattice()} fill="none" stroke={COLORS.gold} strokeOpacity="0.5" strokeWidth="1.3" />
      <rect x={frame.x} y={frame.y} width={frame.w} height={frame.h} rx={frame.r} fill="none" stroke={COLORS.goldLight} strokeWidth="2.5" />
      <circle cx={m.cx} cy={m.cy} r={m.r} fill={COLORS.backDeep} stroke={COLORS.goldLight} strokeWidth="2.5" />
      <circle cx={m.cx} cy={m.cy} r={m.r - 6} fill="none" stroke={COLORS.gold} strokeWidth="1" />
      <path
        d={SUIT_PATHS.s}
        fill={COLORS.goldLight}
        transform={`translate(${m.cx} ${m.cy}) scale(0.36) translate(-50 -50)`}
      />
    </>
  );
}

const SIZES = { sm: 'sm', md: 'md', lg: 'lg' };

function Card2D({ card, faceUp = true, size = 'md', className = '', style, title }) {
  const { t } = useTranslation('common');
  const c = normalizeCard(card);
  const showFace = faceUp && !!c;
  const sz = SIZES[size] || 'md';
  const label = showFace ? cardLabel(c, t) : t('cardBack');
  return (
    <svg
      className={`card2d card2d--${sz} ${showFace ? 'card2d--face' : 'card2d--back'} ${className}`.trim()}
      viewBox={`0 0 ${CARD_W} ${CARD_H}`}
      role="img"
      aria-label={title || label}
      style={style}
    >
      {showFace ? <CardFace card={c} variant={sz === 'sm' ? 'mini' : 'full'} /> : <CardBack />}
    </svg>
  );
}

export default memo(Card2D);
