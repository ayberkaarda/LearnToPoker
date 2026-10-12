import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../motion/useMotionPreference.js';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/index.js';
import tr from '../i18n/tr/variants.json';
import en from '../i18n/en/variants.json';
import Card2D from '../cards/Card2D.jsx';
import './Quiz.css';

if (!i18n.hasResourceBundle('tr', 'variants')) {
  i18n.addResourceBundle('tr', 'variants', tr);
  i18n.addResourceBundle('en', 'variants', en);
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function HandCards({ hand }) {
  const cards = String(hand || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!cards.length) return null;
  return (
    <span className="quiz__hand" aria-hidden="true">
      {cards.map((c, i) => (
        <Card2D key={`${c}-${i}`} card={c} size="sm" className="quiz__card" />
      ))}
    </span>
  );
}

/**
 * Multiple-choice quiz. One question at a time, instant feedback, score at the end.
 * questions: [{ q, options: string[], answer: number, explain: string, hands?: string[] }]
 */
export default function Quiz({ questions = [] }) {
  const { t } = useTranslation('variants');
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const list = Array.isArray(questions) ? questions : [];
  const total = list.length;

  if (!total) {
    return <div className="quiz panel"><p className="quiz__empty">{t('quizUi.empty')}</p></div>;
  }

  const current = Math.min(idx, total - 1);
  const q = list[current];
  const answered = picked !== null;
  const isCorrect = answered && picked === q.answer;
  const isLast = current === total - 1;
  const hasHands = Array.isArray(q.hands) && q.hands.some(Boolean);

  const choose = (i) => {
    if (answered) return;
    setPicked(i);
    if (i === q.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (isLast) {
      setDone(true);
      return;
    }
    setIdx(current + 1);
    setPicked(null);
  };

  const restart = () => {
    setIdx(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  const slide = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 } };

  if (done) {
    const ratio = score / total;
    const msg = ratio === 1 ? 'perfect' : ratio >= 0.6 ? 'good' : 'low';
    const circ = 2 * Math.PI * 52;
    return (
      <motion.div className="quiz panel quiz--result" {...slide} transition={{ duration: 0.35 }}>
        <div className="quiz__ring" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" className="quiz__ring-track" />
            <motion.circle
              cx="60"
              cy="60"
              r="52"
              className="quiz__ring-value"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: circ * (1 - ratio) }}
              transition={{ duration: reduce ? 0 : 1, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <span className="quiz__ring-label">
            {score}/{total}
          </span>
        </div>
        <div className="quiz__result-text">
          <h3 className="h3">{t('quizUi.resultTitle')}</h3>
          <p className="quiz__score" role="status">{t('quizUi.score', { score, total })}</p>
          <p className="quiz__result-msg">{t(`quizUi.${msg}`)}</p>
          <button type="button" className="btn btn--primary btn--sm" onClick={restart}>
            {t('quizUi.restart')}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="quiz panel">
      <div className="quiz__top">
        <span className="quiz__progress-label">{t('quizUi.progress', { current: current + 1, total })}</span>
        <span className="quiz__progress" aria-hidden="true">
          <motion.span
            className="quiz__progress-bar"
            initial={false}
            animate={{ width: `${((current + (answered ? 1 : 0)) / total) * 100}%` }}
            transition={{ duration: reduce ? 0 : 0.4 }}
          />
        </span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={current} className="quiz__body" {...slide} transition={{ duration: 0.3 }}>
          <p className="quiz__question">{q.q}</p>
          <div className={`quiz__options ${hasHands ? 'quiz__options--hands' : ''}`} role="group" aria-label={q.q}>
            {q.options.map((opt, i) => {
              const state = !answered ? '' : i === q.answer ? 'is-correct' : i === picked ? 'is-wrong' : 'is-muted';
              return (
                <button
                  key={i}
                  type="button"
                  className={`quiz__option ${state}`}
                  onClick={() => choose(i)}
                  disabled={answered}
                  aria-pressed={picked === i}
                >
                  <span className="quiz__letter" aria-hidden="true">{LETTERS[i]}</span>
                  <span className="quiz__option-main">
                    <span className="quiz__option-text">{opt}</span>
                    {hasHands && q.hands[i] && <HandCards hand={q.hands[i]} />}
                  </span>
                  {answered && i === q.answer && <span className="quiz__mark" aria-hidden="true">✓</span>}
                  {answered && i === picked && i !== q.answer && <span className="quiz__mark" aria-hidden="true">✕</span>}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {answered && (
              <motion.div
                className={`quiz__feedback ${isCorrect ? 'is-correct' : 'is-wrong'}`}
                initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                role="status"
                aria-live="polite"
              >
                <strong className="quiz__verdict">{isCorrect ? t('quizUi.correct') : t('quizUi.wrong')}</strong>
                {q.explain && <p className="quiz__explain">{q.explain}</p>}
                <button type="button" className="btn btn--primary btn--sm quiz__next" onClick={next}>
                  {isLast ? t('quizUi.finish') : t('quizUi.next')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
