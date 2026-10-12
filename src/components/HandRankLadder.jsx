import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '../motion/useMotionPreference.js';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/index.js';
import tr from '../i18n/tr/basics.json';
import en from '../i18n/en/basics.json';
import FlipCard from '../cards/FlipCard.jsx';
import './HandRankLadder.css';

if (!i18n.hasResourceBundle('tr', 'basics')) i18n.addResourceBundle('tr', 'basics', tr);
if (!i18n.hasResourceBundle('en', 'basics')) i18n.addResourceBundle('en', 'basics', en);

const examples = [
  ['As', 'Jd', '8c', '5h', '2s'], ['Ks', 'Kh', '9d', '6c', '3h'],
  ['Qs', 'Qh', '7d', '7c', '2s'], ['Js', 'Jh', 'Jd', '8c', '3s'],
  ['5s', '6h', '7d', '8c', '9s'], ['2h', '5h', '8h', 'Jh', 'Ah'],
  ['Qs', 'Qh', 'Qd', '7c', '7h'], ['9s', '9h', '9d', '9c', 'As'],
  ['5s', '6s', '7s', '8s', '9s'], ['Ts', 'Js', 'Qs', 'Ks', 'As'],
];

export default function HandRankLadder({ compact = false }) {
  const { t } = useTranslation('basics');
  const [open, setOpen] = useState(null);
  const prefix = useId();
  const reduced = useReducedMotion();
  const items = t('ladder.items', { returnObjects: true });
  return (
    <div className={`handrank-ladder${compact ? ' handrank-ladder--compact' : ''}`}>
      <ol className="handrank-ladder-list">
        {items.map((item, index) => {
          const expanded = open === index;
          const panelId = `${prefix}-hand-${index}`;
          return (
            <li key={index} className={`handrank-ladder-row${expanded ? ' handrank-ladder-row--open' : ''}`}>
              <button className="handrank-ladder-toggle" type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setOpen(expanded ? null : index)}>
                <span className="handrank-ladder-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="handrank-ladder-name">{item.name}</span>
                <span className="handrank-ladder-sign" aria-hidden="true">{expanded ? '−' : '+'}</span>
                <span className="sr-only">{t(expanded ? 'ladder.collapse' : 'ladder.expand')}</span>
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div id={panelId} className="handrank-ladder-detail" initial={{ height: reduced ? 'auto' : 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: reduced ? 'auto' : 0, opacity: 0 }} transition={{ duration: reduced ? 0 : 0.25 }}>
                    <div className="handrank-ladder-detail-inner">
                      <div className="handrank-ladder-cards" role="group" aria-label={t('ladder.cards')}>
                        {examples[index].map((card, cardIndex) => <FlipCard key={card} card={card} size="sm" delay={0.08 + cardIndex * 0.07} />)}
                      </div>
                      <p className="handrank-ladder-description">{item.description}</p>
                      <p className="handrank-ladder-rarity">{t('ladder.rarity')}: <strong>{item.rarity}</strong></p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
      <p className="handrank-ladder-note">{t('ladder.hint')}</p>
    </div>
  );
}
