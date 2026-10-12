import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageToggle from './LanguageToggle.jsx';
import './AgeGate.css';

export const GATE_STORAGE_KEY = 'ltp-gate';

export function readGateAccepted() {
  try {
    return localStorage.getItem(GATE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function storeGateAccepted() {
  try {
    localStorage.setItem(GATE_STORAGE_KEY, '1');
  } catch {
    /* storage unavailable: the notice shows again next visit */
  }
}

/** Full-screen responsible-gambling notice. The page behind it stays blurred and inert until accepted. */
export default function AgeGate({ onAccept }) {
  const { t } = useTranslation('common');
  const acceptRef = useRef(null);

  useEffect(() => {
    acceptRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const leave = () => {
    window.location.href = 'https://www.google.com/';
  };

  return (
    <div className="agegate" role="dialog" aria-modal="true" aria-labelledby="agegate-title" aria-describedby="agegate-body">
      <div className="agegate__panel">
        <LanguageToggle className="agegate__lang" />
        <span className="agegate__suit" aria-hidden="true">♠</span>
        <h1 id="agegate-title" className="agegate__title">{t('gate.title')}</h1>
        <p className="agegate__lead">{t('gate.lead')}</p>
        <p id="agegate-body" className="agegate__body">{t('gate.body')}</p>
        <p className="agegate__age">{t('gate.age')}</p>
        <div className="agegate__actions">
          <button ref={acceptRef} type="button" className="btn btn--primary" onClick={onAccept}>
            {t('gate.accept')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={leave}>
            {t('gate.leave')}
          </button>
        </div>
      </div>
    </div>
  );
}
