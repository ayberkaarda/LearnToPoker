import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Card2D from '../cards/Card2D.jsx';
import { reviewHand } from '../engine/coach.js';
import { useGameStore, PHASE, handText, playerName, formatParams, canStartNextHand } from '../store/gameStore.js';
import './HandSummary.css';

export default function HandSummary() {
  const { t } = useTranslation('play');
  const game = useGameStore((s) => s.game);
  const open = useGameStore((s) => s.summaryOpen);
  const close = useGameStore((s) => s.closeSummary);
  const newHand = useGameStore((s) => s.newHand);
  const rebuy = useGameStore((s) => s.rebuy);
  const openSetup = useGameStore((s) => s.openSetup);

  const notes = useMemo(() => (game?.phase === PHASE.COMPLETE ? reviewHand(game, 0) : []), [game]);
  if (!open || !game || game.phase !== PHASE.COMPLETE || !game.result) return null;

  const r = game.result;
  const shown = Object.entries(r.hands).map(([idx, h]) => ({ idx: Number(idx), h }));
  shown.sort((a, b) => b.h.score - a.h.score);
  const busted = game.players[0].stack <= 0;
  const canContinue = canStartNextHand(game);

  return (
    <div className="hsum" role="dialog" aria-modal="false" aria-labelledby="hsum-title">
      <motion.div className="hsum__card" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3 }}>
        <header className="hsum__head">
          <span className="hsum__eyebrow">{t('summary.handN', { n: game.handNumber })}</span>
          <h2 id="hsum-title" className="hsum__title">
            {t('summary.title')}
          </h2>
          <button type="button" className="hsum__x" onClick={close} aria-label={t('summary.close')}>
            {'✕'}
          </button>
        </header>

        <ul className="hsum__winners">
          {r.winners.map((w) => {
            const desc = r.hands[w.playerIdx]?.description;
            return (
              <li key={w.playerIdx} className={`hsum__winner${w.playerIdx === 0 ? ' is-me' : ''}`}>
                <span className="hsum__trophy" aria-hidden="true">
                  {'★'}
                </span>
                <div>
                  <strong>{t('summary.winner', { name: playerName(t, game, w.playerIdx) })}</strong>
                  <span className="hsum__amount">{t('summary.amount', { amount: w.amount })}</span>
                  <div className="hsum__desc">{desc ? handText(t, desc) : t('summary.uncontested')}</div>
                </div>
              </li>
            );
          })}
        </ul>

        {game.board.length > 0 && (
          <div className="hsum__block">
            <span className="hsum__label">{t('summary.board')}</span>
            <div className="hsum__cards">
              {game.board.map((c) => (
                <Card2D key={c.id} card={c} faceUp size="sm" />
              ))}
            </div>
          </div>
        )}

        {shown.length > 0 && (
          <div className="hsum__block">
            <span className="hsum__label">{t('summary.shown')}</span>
            <ul className="hsum__shown">
              {shown.map(({ idx, h }) => {
                const won = r.winners.some((w) => w.playerIdx === idx);
                return (
                  <li key={idx} className={`hsum__row${won ? ' is-won' : ''}`}>
                    <span className="hsum__who">{playerName(t, game, idx)}</span>
                    <span className="hsum__cards">
                      {game.players[idx].cards.map((c) => (
                        <Card2D key={c.id} card={c} faceUp size="sm" />
                      ))}
                    </span>
                    <span className="hsum__what">{handText(t, h.description)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {notes.length > 0 && (
          <div className="hsum__block">
            <span className="hsum__label">{t('summary.notes')}</span>
            <ul className="hsum__notes">
              {notes.map((n, i) => (
                <li key={i}>{t(n.key, formatParams(t, game, n.params))}</li>
              ))}
            </ul>
          </div>
        )}

        <footer className="hsum__foot">
          <button type="button" className="btn btn--ghost btn--sm" onClick={close}>
            {t('summary.close')}
          </button>
          {busted ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={rebuy}>
              {t('summary.rebuy')}
            </button>
          ) : canContinue ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={newHand}>
              {t('summary.newHand')}
            </button>
          ) : (
            <button type="button" className="btn btn--primary btn--sm" onClick={openSetup}>
              {t('bar.newGame')}
            </button>
          )}
        </footer>
      </motion.div>
    </div>
  );
}
