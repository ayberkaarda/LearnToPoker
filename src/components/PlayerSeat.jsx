import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import Card2D from '../cards/Card2D.jsx';
import { personalityOf } from '../store/gameStore.js';
import './PlayerSeat.css';

function PlayerSeat({ player, idx, isTurn, isDealer, isSb, isBb, won, cards, showCards = false, style, compact = false }) {
  const { t } = useTranslation('play');
  const pers = personalityOf(idx);
  const la = player.lastAction;
  const status = player.sittingOut ? t('seat.sittingOut') : player.folded ? t('seat.folded') : player.allIn ? t('seat.allIn') : null;
  const name = player.isHuman ? t('seat.you') : player.name;
  const cls = [
    'seat',
    player.isHuman && 'seat--human',
    isTurn && 'seat--turn',
    player.folded && 'seat--folded',
    won && 'seat--won',
    compact && 'seat--compact',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} style={style} aria-label={`${name}, ${t('seat.chips', { amount: player.stack })}`}>
      {showCards && cards?.length > 0 && (
        <div className={`seat__cards seat__cards--n${Math.min(cards.length, 7)}`}>
          {cards.map((c) => (
            <Card2D key={c.id} card={c} faceUp={c.faceUp} size={player.isHuman ? 'md' : 'sm'} />
          ))}
        </div>
      )}
      <div className="seat__plate">
        <div className="seat__avatar" aria-hidden="true">
          {name.slice(0, 1)}
          {isDealer && <span className="seat__dealer" title={t('seat.dealer')}>D</span>}
        </div>
        <div className="seat__info">
          <div className="seat__name">
            {name}
            {pers && <span className="seat__pers">{t(`personalities.${pers}`)}</span>}
          </div>
          <div className="seat__stack">{player.stack.toLocaleString()}</div>
        </div>
      </div>
      <div className="seat__tags">
        {isSb && <span className="seat__tag">SB</span>}
        {isBb && <span className="seat__tag">BB</span>}
        {status && <span className="seat__tag seat__tag--status">{status}</span>}
        {!status && la && la.type !== 'draw' && (
          <span className={`seat__tag seat__tag--act seat__tag--${la.type}`}>
            {t(`actions.${la.type}`)}
            {la.amount > 0 ? ` ${la.raiseTo ?? la.amount}` : ''}
          </span>
        )}
        {la?.type === 'draw' && <span className="seat__tag seat__tag--act">{t('actions.draw')} {la.amount}</span>}
        {won > 0 && <span className="seat__tag seat__tag--won">{t('seat.winner', { amount: won })}</span>}
        {showCards && player.bet > 0 && <span className="seat__tag seat__tag--bet">{t('seat.bet', { amount: player.bet })}</span>}
      </div>
      {isTurn && <span className="sr-only">{t('seat.turn')}</span>}
    </div>
  );
}

export default memo(PlayerSeat);
