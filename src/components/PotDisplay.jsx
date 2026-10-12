import { useTranslation } from 'react-i18next';
import Card2D from '../cards/Card2D.jsx';
import { potSize } from '../engine/game.js';
import { PHASE } from '../store/gameStore.js';
import './PotDisplay.css';

export default function PotDisplay({ game, showBoard = false }) {
  const { t } = useTranslation('play');
  if (!game) return null;
  const street = game.variant.streets[game.streetIdx]?.name;
  const complete = game.phase === PHASE.COMPLETE;
  const pot = complete ? game.result?.pots.reduce((s, p) => s + p.amount, 0) ?? 0 : potSize(game);
  return (
    <div className="potd" aria-live="polite">
      <div className="potd__row">
        <span className="potd__street">{complete ? t('phases.complete') : street ? t(`streets.${street}`) : t(`phases.${game.phase}`)}</span>
        <span className="potd__pot">
          <span className="potd__chip" aria-hidden="true" />
          {t('table.potAmount', { amount: pot.toLocaleString() })}
        </span>
      </div>
      {showBoard && game.board.length > 0 && (
        <div className="potd__board" aria-label={t('table.board')}>
          {game.board.map((c) => (
            <Card2D key={c.id} card={c} faceUp size="md" />
          ))}
        </div>
      )}
    </div>
  );
}
