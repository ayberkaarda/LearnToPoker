import { useTranslation } from 'react-i18next';
import { useMotionPreference } from '../motion/useMotionPreference.js';
import './MotionToggle.css';

/** Cycles the site motion setting: auto -> on -> off -> auto. Shows the effective state. */
export default function MotionToggle({ className = '' }) {
  const { t } = useTranslation('common');
  const { mode, reduce, cycle } = useMotionPreference();
  const effective = reduce ? t('motion.off') : t('motion.on');
  const label = mode === 'auto'
    ? `${t('motion.label')}: ${t('motion.auto')} (${effective})`
    : `${t('motion.label')}: ${effective}`;
  return (
    <button
      type="button"
      className={`motiontoggle ${reduce ? 'is-off' : 'is-on'} ${className}`.trim()}
      data-mode={mode}
      aria-label={label}
      title={label}
      onClick={cycle}
    >
      <span className="motiontoggle__icon" aria-hidden="true">✦</span>
      <span className="motiontoggle__text" aria-hidden="true">
        <span className="motiontoggle__state">{effective}</span>
        {mode === 'auto' && <span className="motiontoggle__auto">{t('motion.auto')}</span>}
      </span>
    </button>
  );
}
