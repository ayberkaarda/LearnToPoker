import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../motion/useMotionPreference.js';
import { useTranslation } from 'react-i18next';
import { FAMILY_ICONS } from '../content/variants.js';
import './VariantCard.css';

function DifficultyPips({ level, label }) {
  return (
    <span className="vcard__pips" aria-label={label} title={label}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={`vcard__pip ${n <= level ? 'is-on' : ''}`} aria-hidden="true" />
      ))}
    </span>
  );
}

export default function VariantCard({ meta }) {
  const { t } = useTranslation('variants');
  const reduce = useReducedMotion();
  const v = t(`variants.${meta.id}`, { returnObjects: true }) || {};
  const diffLabel = `${t('difficulty.label')}: ${t(`difficulty.${meta.difficulty}`)}`;
  const isRed = ['♦', '♥', '◇'].includes(meta.icon);

  return (
    <motion.article
      className={`vcard vcard--${meta.family}`}
      whileHover={reduce ? undefined : { y: -4 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/variants/${meta.id}`} className="vcard__link">
        <div className="vcard__top">
          <span className={`vcard__icon ${isRed ? 'is-red' : ''}`} aria-hidden="true">
            {meta.icon}
          </span>
          <span className="vcard__family">
            <span aria-hidden="true">{FAMILY_ICONS[meta.family]}</span> {t(`families.${meta.family}`)}
          </span>
        </div>
        <h3 className="vcard__name">{v.name}</h3>
        <p className="vcard__tagline">{v.tagline}</p>
        <div className="vcard__badges">
          {meta.playable && <span className="badge vcard__badge--play">● {t('playableBadge')}</span>}
          <span className="vcard__chip">{t(`limits.${meta.limit}`)}</span>
          {meta.hiLo && meta.family !== 'mixed' && <span className="vcard__chip">{t('hiLoBadge')}</span>}
          <DifficultyPips level={meta.difficulty} label={diffLabel} />
        </div>
        <span className="vcard__more">
          {t('learnMore')} <span aria-hidden="true">→</span>
        </span>
      </Link>
    </motion.article>
  );
}
