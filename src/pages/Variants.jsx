import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../motion/useMotionPreference.js';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/index.js';
import tr from '../i18n/tr/variants.json';
import en from '../i18n/en/variants.json';
import Section from '../components/Section.jsx';
import VariantCard from '../components/VariantCard.jsx';
import { VARIANTS } from '../content/variants.js';
import './Variants.css';
import PageCurtain from '../components/PageCurtain.jsx';

if (!i18n.hasResourceBundle('tr', 'variants')) {
  i18n.addResourceBundle('tr', 'variants', tr);
  i18n.addResourceBundle('en', 'variants', en);
}

const FILTERS = [
  { id: 'all', test: () => true },
  { id: 'playable', test: (v) => v.playable },
  { id: 'community', test: (v) => v.family === 'community' },
  { id: 'stud', test: (v) => v.family === 'stud' },
  { id: 'draw', test: (v) => v.family === 'draw' },
];

export default function Variants() {
  const { t } = useTranslation('variants');
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState('all');
  const active = FILTERS.find((f) => f.id === filter) || FILTERS[0];
  const list = VARIANTS.filter(active.test);

  return (
    <motion.div
      className="page variants-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <PageCurtain />
      <header className="variants-hero">
        <div className="container">
          <div className="variants-hero__suits" aria-hidden="true">
            <span>♠</span>
            <span className="is-red">♥</span>
            <span className="is-red">♦</span>
            <span>♣</span>
          </div>
          <span className="eyebrow">{t('listEyebrow')}</span>
          <h1 className="h1 variants-hero__title">{t('listTitle')}</h1>
          <p className="lead">{t('listLead')}</p>
        </div>
      </header>

      <Section className="variants-list">
        <div className="variants-filters" role="toolbar" aria-label={t('filterLabel')}>
          {FILTERS.map((f) => {
            const count = VARIANTS.filter(f.test).length;
            const on = f.id === filter;
            return (
              <button
                key={f.id}
                type="button"
                className={`variants-chip ${on ? 'is-active' : ''}`}
                aria-pressed={on}
                onClick={() => setFilter(f.id)}
              >
                {on && !reduce && (
                  <motion.span layoutId="variants-chip-bg" className="variants-chip__bg" transition={{ duration: 0.3 }} />
                )}
                <span className="variants-chip__text">{t(`filters.${f.id}`)}</span>
                <span className="variants-chip__count">{count}</span>
              </button>
            );
          })}
        </div>

        <motion.ul className="variants-grid" role="list" layout={!reduce}>
          <AnimatePresence initial={false} mode="popLayout">
            {list.map((v, i) => (
              <motion.li
                key={v.id}
                layout={!reduce}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.96, y: reduce ? 0 : 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
                transition={{ duration: 0.3, delay: reduce ? 0 : Math.min(i, 8) * 0.03 }}
                className="variants-grid__item"
              >
                <VariantCard meta={v} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
        {list.length === 0 && <p className="variants-empty">{t('emptyFilter')}</p>}
      </Section>
    </motion.div>
  );
}
