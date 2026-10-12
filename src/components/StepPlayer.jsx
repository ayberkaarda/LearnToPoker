import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/index.js';
import tr from '../i18n/tr/variants.json';
import en from '../i18n/en/variants.json';
import Card2D from '../cards/Card2D.jsx';
import './StepPlayer.css';

if (!i18n.hasResourceBundle('tr', 'variants')) {
  i18n.addResourceBundle('tr', 'variants', tr);
  i18n.addResourceBundle('en', 'variants', en);
}

const AUTOPLAY_MS = 3500;

function TableCard({ card, faceUp, hl, priv, reduce, index }) {
  const hidden = card === '??';
  const showFace = faceUp && !hidden;
  return (
    <motion.span
      layout={!reduce}
      className={`sp-card ${hl ? 'is-hl' : ''} ${priv ? 'is-private' : ''}`}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -18, scale: 0.8 }}
      animate={{ opacity: 1, y: hl && !reduce ? -5 : 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.85 }}
      transition={{ duration: 0.35, delay: reduce ? 0 : index * 0.04, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.span
        key={showFace ? 'face' : 'back'}
        className="sp-card__inner"
        initial={reduce ? false : { rotateY: 90 }}
        animate={{ rotateY: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <Card2D card={hidden ? null : card} faceUp={showFace} size="sm" className="sp-card__svg" />
      </motion.span>
    </motion.span>
  );
}

function Seat({ player, idx, isDealer, isActor, position, t, reduce }) {
  const hl = new Set(player.highlightCards || []);
  return (
    <div
      className={[
        'sp-seat',
        `sp-seat--${position}`,
        player.folded ? 'is-folded' : '',
        player.highlight ? 'is-winner' : '',
        isActor ? 'is-actor' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="sp-seat__cards" data-n={Math.min(player.cards.length, 7)}>
        <AnimatePresence initial={false} mode="popLayout">
          {player.cards.map((c, i) => (
            <TableCard
              key={c === '??' ? `hidden-${i}` : c}
              card={c}
              faceUp={player.faceUp?.[i]}
              hl={hl.has(i)}
              priv={player.hole?.[i]}
              reduce={reduce}
              index={i}
            />
          ))}
        </AnimatePresence>
      </div>
      <div className="sp-seat__plate">
        {isDealer && (
          <span className="sp-dealer" title={t('stepPlayer.dealer')} aria-label={t('stepPlayer.dealer')}>
            D
          </span>
        )}
        <span className="sp-seat__name">{player.name}</span>
        <motion.span
          key={player.stack}
          className="sp-seat__stack"
          initial={reduce ? false : { opacity: 0.4, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          aria-label={`${t('stepPlayer.stack')}: ${player.stack}`}
        >
          {player.stack}
        </motion.span>
      </div>
      <div className="sp-seat__extras">
        <AnimatePresence initial={false}>
          {player.act && (
            <motion.span
              key={`${player.act}-${idx}`}
              className={`sp-act sp-act--${player.act}`}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {t(`acts.${player.act}`)}
            </motion.span>
          )}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {player.bet > 0 && (
            <motion.span
              key="bet"
              className="sp-bet"
              initial={{ opacity: 0, y: reduce ? 0 : position === 'bottom' ? 10 : -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: reduce ? 1 : 0.6 }}
              transition={{ duration: 0.3 }}
            >
              <span className="sp-chip" aria-hidden="true" />
              {player.bet}
            </motion.span>
          )}
        </AnimatePresence>
        {player.folded && !player.act && <span className="sp-folded">{t('stepPlayer.folded')}</span>}
      </div>
    </div>
  );
}

/**
 * Animated mini table that walks through a sample hand.
 * steps: visual states from src/content/walkthroughs.js
 * texts: [{ title, text }] with the same length
 */
export default function StepPlayer({ steps = [], texts = [], title }) {
  const { t } = useTranslation('variants');
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rootRef = useRef(null);
  const total = steps.length;
  const current = Math.min(idx, Math.max(total - 1, 0));
  const step = steps[current];
  const copy = texts[current] || {};
  const hasBoard = useMemo(() => steps.some((s) => s.board && s.board.length), [steps]);

  const go = useCallback(
    (n) => {
      setIdx(Math.max(0, Math.min(total - 1, n)));
    },
    [total],
  );
  const prev = useCallback(() => {
    setPlaying(false);
    go(current - 1);
  }, [current, go]);
  const next = useCallback(() => {
    setPlaying(false);
    go(current + 1);
  }, [current, go]);

  useEffect(() => {
    setIdx(0);
    setPlaying(false);
  }, [steps]);

  useEffect(() => {
    if (!playing) return undefined;
    if (current >= total - 1) {
      setPlaying(false);
      return undefined;
    }
    const id = setTimeout(() => setIdx((i) => Math.min(i + 1, total - 1)), AUTOPLAY_MS);
    return () => clearTimeout(id);
  }, [playing, current, total]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = (e.target && e.target.tagName) || '';
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || e.target?.isContentEditable) return;
      const el = rootRef.current;
      if (!el) return;
      // Only react when the player is at least partly on screen.
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next]);

  if (!step) return null;

  const players = step.players || [];
  const hero = players[0];
  const others = players.slice(1);
  const boardHl = new Set(step.boardHighlight || []);
  const boardSlots = hasBoard ? 5 : 0;
  const hasPrivate = steps.some((s) => s.players.some((p) => p.hole && p.hole.some(Boolean)));

  const togglePlay = () => {
    if (current >= total - 1) {
      setIdx(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };

  return (
    <div className="sp" ref={rootRef}>
      {title && <h3 className="h3 sp__title">{title}</h3>}

      <div className="sp__table" role="group" aria-label={t('stepPlayer.tableLabel')}>
        <div className="sp__felt" aria-hidden="true" />

        <div className="sp__row sp__row--top">
          {others.map((p, i) => (
            <Seat
              key={p.name}
              player={p}
              idx={i + 1}
              position="top"
              isDealer={step.dealerIdx === i + 1}
              isActor={step.actorIdx === i + 1}
              t={t}
              reduce={reduce}
            />
          ))}
        </div>

        <div className="sp__center">
          <AnimatePresence mode="wait" initial={false}>
            {step.actionLabelKey && (
              <motion.span
                key={step.actionLabelKey}
                className="sp__label"
                initial={{ opacity: 0, y: reduce ? 0 : -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {t(`actions.${step.actionLabelKey}`)}
              </motion.span>
            )}
          </AnimatePresence>

          {boardSlots > 0 && (
            <div className="sp__board">
              {Array.from({ length: boardSlots }).map((_, i) => {
                const c = step.board[i];
                return (
                  <span key={i} className="sp__slot">
                    <AnimatePresence initial={false}>
                      {c && <TableCard key={c} card={c} faceUp hl={boardHl.has(i)} reduce={reduce} index={0} />}
                    </AnimatePresence>
                  </span>
                );
              })}
            </div>
          )}

          <div className="sp__pot" aria-live="polite">
            <span className="sp-chip sp-chip--lg" aria-hidden="true" />
            <span className="sp__pot-label">{t('stepPlayer.pot')}</span>
            <motion.span
              key={step.pot}
              className="sp__pot-value"
              initial={reduce ? false : { scale: 1.25, color: '#f0cf7a' }}
              animate={{ scale: 1, color: '#f1e8d6' }}
              transition={{ duration: 0.4 }}
            >
              {step.pot}
            </motion.span>
          </div>

          <AnimatePresence initial={false}>
            {step.discards && step.discards.length > 0 && (
              <motion.div
                className="sp__discards"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span className="sp__discards-label">{t('stepPlayer.discards')}</span>
                <span className="sp__discards-cards">
                  {step.discards.map((c, i) => (
                    <Card2D
                      key={`${c}-${i}`}
                      card={c === '??' ? null : c}
                      faceUp={c !== '??'}
                      size="sm"
                      className="sp__discard-card"
                    />
                  ))}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="sp__row sp__row--bottom">
          {hero && (
            <Seat
              player={hero}
              idx={0}
              position="bottom"
              isDealer={step.dealerIdx === 0}
              isActor={step.actorIdx === 0}
              t={t}
              reduce={reduce}
            />
          )}
        </div>
      </div>

      {hasPrivate && <p className="sp__note">{t('stepPlayer.privateNote')}</p>}

      <div className="sp__panel">
        <div className="sp__text" aria-live="polite">
          <span className="sp__count">{t('stepPlayer.stepOf', { current: current + 1, total })}</span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current}
              initial={{ opacity: 0, y: reduce ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -6 }}
              transition={{ duration: 0.25 }}
            >
              <h4 className="sp__step-title">{copy.title}</h4>
              <p className="sp__step-text">{copy.text}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="sp__controls">
          <button type="button" className="sp__btn" onClick={prev} disabled={current === 0} aria-label={t('stepPlayer.prev')}>
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            className={`sp__btn sp__btn--play ${playing ? 'is-on' : ''}`}
            onClick={togglePlay}
            aria-pressed={playing}
            aria-label={playing ? t('stepPlayer.pause') : t('stepPlayer.play')}
          >
            <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
            <span className="sp__btn-text">{playing ? t('stepPlayer.pause') : t('stepPlayer.play')}</span>
          </button>
          <button
            type="button"
            className="sp__btn"
            onClick={next}
            disabled={current >= total - 1}
            aria-label={t('stepPlayer.next')}
          >
            <span aria-hidden="true">→</span>
          </button>
          {current > 0 && (
            <button
              type="button"
              className="sp__btn sp__btn--ghost"
              onClick={() => {
                setPlaying(false);
                go(0);
              }}
              aria-label={t('stepPlayer.restart')}
              title={t('stepPlayer.restart')}
            >
              <span aria-hidden="true">↺</span>
            </button>
          )}
        </div>

        <div className="sp__dots">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`sp__dot ${i === current ? 'is-active' : ''} ${i < current ? 'is-done' : ''}`}
              onClick={() => {
                setPlaying(false);
                go(i);
              }}
              aria-label={t('stepPlayer.goTo', { n: i + 1 })}
              aria-current={i === current ? 'step' : undefined}
            />
          ))}
        </div>
        {playing && !reduce && (
          <motion.span
            key={`bar-${current}`}
            className="sp__timer"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: AUTOPLAY_MS / 1000, ease: 'linear' }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
