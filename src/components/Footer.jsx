import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo, NAV_LINKS } from './Nav.jsx';
import LanguageToggle from './LanguageToggle.jsx';
import './Footer.css';

const SUITS = [
  { s: '♠', red: false },
  { s: '♥', red: true },
  { s: '♦', red: true },
  { s: '♣', red: false },
];

export default function Footer() {
  const { t } = useTranslation('common');
  const year = new Date().getFullYear();
  const learn = NAV_LINKS.filter((l) => ['basics', 'variants', 'glossary'].includes(l.key));
  const practice = NAV_LINKS.filter((l) => ['home', 'play'].includes(l.key));

  return (
    <footer className="footer">
      <div className="footer-rule" aria-hidden="true">
        {SUITS.map((x) => (
          <span key={x.s} className={x.red ? 'footer-rule__suit is-red' : 'footer-rule__suit'}>
            {x.s}
          </span>
        ))}
      </div>
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link to="/" className="footer-brand__link" aria-label="LearnToPoker">
            <Logo />
          </Link>
          <p className="footer-tagline">{t('footer.tagline')}</p>
        </div>

        <nav className="footer-col" aria-label={t('footer.learn')}>
          <h3 className="footer-col__title">{t('footer.learn')}</h3>
          <ul className="footer-col__list" role="list">
            {learn.map((l) => (
              <li key={l.key}>
                <Link to={l.to} className="footer-link">{t(`nav.${l.key}`)}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="footer-col" aria-label={t('footer.practice')}>
          <h3 className="footer-col__title">{t('footer.practice')}</h3>
          <ul className="footer-col__list" role="list">
            {practice.map((l) => (
              <li key={l.key}>
                <Link to={l.to} className="footer-link">{t(`nav.${l.key}`)}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer-col">
          <h3 className="footer-col__title">{t('footer.language')}</h3>
          <LanguageToggle />
        </div>
      </div>

      <div className="container footer-bottom">
        <p className="footer-note">
          <span className="footer-note__badge">18+</span>
          {t('footer.disclaimer')} {t('footer.responsible')}
        </p>
        <p className="footer-copy">© {year} LearnToPoker. {t('footer.rights')}</p>
      </div>
    </footer>
  );
}
