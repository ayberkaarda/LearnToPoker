import { useTranslation } from 'react-i18next';
import Card2D from '../cards/Card2D.jsx';
import { useGameStore, isHumanTurn, handText, formatParams } from '../store/gameStore.js';
import './CoachPanel.css';

function suggestionText(t, s) {
  if (!s) return '';
  if (s.type === 'draw') return t('coachUi.suggest.draw', { n: s.discard?.length ?? 0 });
  return t(`coachUi.suggest.${s.type}`, { amount: s.amount });
}

export default function CoachPanel() {
  const { t } = useTranslation('play');
  const game = useGameStore((s) => s.game);
  const coachOn = useGameStore((s) => s.coachOn);
  const toggleCoach = useGameStore((s) => s.toggleCoach);
  const advice = useGameStore((s) => s.advice);
  const adviceKey = useGameStore((s) => s.adviceKey);

  const human = isHumanTurn(game);
  const currentKey = game ? `${game.handNumber}:${game.log.length}:${game.awaiting?.kind}` : null;
  const fresh = human && advice && adviceKey === currentKey;
  const me = game?.players[0];

  return (
    <section className={`coach${fresh ? ' coach--live' : ''}`} aria-live="polite">
      <header className="coach__head">
        <h2 className="coach__title">{t('coachUi.title')}</h2>
        <button type="button" className={`coach__toggle${coachOn ? ' is-on' : ''}`} onClick={toggleCoach} aria-pressed={coachOn}>
          <span className="coach__knob" aria-hidden="true" />
          {coachOn ? t('toolbar.coachOn') : t('toolbar.coachOff')}
        </button>
      </header>

      {!coachOn && <p className="coach__muted">{t('coachUi.off')}</p>}
      {coachOn && !human && <p className="coach__muted">{t('coachUi.waiting')}</p>}
      {coachOn && human && !fresh && (
        <p className="coach__muted coach__thinking">
          <span className="coach__spinner" aria-hidden="true" />
          {t('coachUi.thinking')}
        </p>
      )}

      {coachOn && fresh && (
        <div className="coach__body">
          <div className="coach__suggest">
            <span className="coach__label">{t('coachUi.suggestion')}</span>
            <strong className="coach__pick">{suggestionText(t, advice.suggestion)}</strong>
          </div>

          <div className="coach__meter">
            <div className="coach__meter-row">
              <span>{t('coachUi.equity')}</span>
              <strong>{Math.round(advice.equity * 100)}%</strong>
            </div>
            <div className="coach__bar" role="img" aria-label={`${Math.round(advice.equity * 100)}%`}>
              <span className="coach__fill" style={{ width: `${Math.max(2, Math.round(advice.equity * 100))}%` }} />
              {advice.potOdds > 0 && <span className="coach__mark" style={{ left: `${Math.round(advice.potOdds * 100)}%` }} title={t('coachUi.potOdds')} />}
            </div>
            {advice.potOdds > 0 && (
              <div className="coach__meter-row coach__meter-row--sub">
                <span>
                  <span className="coach__mark-key" aria-hidden="true" /> {t('coachUi.potOdds')}
                </span>
                <strong>{Math.round(advice.potOdds * 100)}%</strong>
              </div>
            )}
            <p className="coach__help">{advice.potOdds > 0 ? t('coachUi.potOddsHelp') : t('coachUi.equityHelp')}</p>
          </div>

          <div className="coach__hand">
            <span className="coach__label">{t('coachUi.madeHand')}</span>
            <div className="coach__cards">
              {me.cards.map((c) => (
                <Card2D key={c.id} card={c} faceUp size="sm" />
              ))}
            </div>
            <p className="coach__handname">{advice.handKey ? handText(t, { key: advice.handKey, params: advice.handParams }) : t('coachUi.noHandYet')}</p>
          </div>

          <div className="coach__why">
            <span className="coach__label">{t('coachUi.why')}</span>
            <ul>
              {advice.reasons
                .filter((r) => r.key !== 'coach.youHold')
                .map((r, i) => (
                  <li key={i}>{t(r.key, formatParams(t, game, r.params))}</li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
