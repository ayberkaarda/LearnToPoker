import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import trCommon from './tr/common.json';
import enCommon from './en/common.json';

export const LANGS = ['tr', 'en'];
const STORAGE_KEY = 'ltp-lang';

const saved = (() => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return LANGS.includes(v) ? v : null;
  } catch {
    return null;
  }
})();

i18n.use(initReactI18next).init({
  resources: {
    tr: { common: trCommon },
    en: { common: enCommon },
  },
  lng: saved || 'tr',
  fallbackLng: 'en',
  supportedLngs: LANGS,
  defaultNS: 'common',
  ns: ['common'],
  interpolation: { escapeValue: false },
  returnObjects: true,
  react: { bindI18nStore: 'added' },
});

function syncHtmlLang(lng) {
  if (typeof document !== 'undefined') document.documentElement.lang = lng;
}

i18n.on('languageChanged', (lng) => {
  syncHtmlLang(lng);
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* storage unavailable */
  }
});
syncHtmlLang(i18n.language);

export default i18n;
