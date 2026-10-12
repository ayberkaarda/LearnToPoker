import { useTranslation } from 'react-i18next';
import './LanguageToggle.css';

const LANGS = ['tr', 'en'];

export default function LanguageToggle({ className = '' }) {
  const { t, i18n } = useTranslation('common');
  const current = (i18n.resolvedLanguage || i18n.language || 'tr').slice(0, 2);
  return (
    <div className={`langtoggle ${className}`.trim()} role="group" aria-label={t('lang.label')}>
      <span
        className="langtoggle__thumb"
        aria-hidden="true"
        style={{ transform: `translateX(${current === 'en' ? 100 : 0}%)` }}
      />
      {LANGS.map((lng) => (
        <button
          key={lng}
          type="button"
          lang={lng}
          className={`langtoggle__btn ${current === lng ? 'is-active' : ''}`}
          aria-pressed={current === lng}
          title={t(`lang.${lng}`)}
          onClick={() => current !== lng && i18n.changeLanguage(lng)}
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
