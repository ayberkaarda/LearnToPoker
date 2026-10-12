import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import LanguageToggle from './LanguageToggle.jsx';
import './Nav.css';

export const NAV_LINKS = [
  { to: '/', key: 'home', end: true },
  { to: '/basics', key: 'basics' },
  { to: '/variants', key: 'variants' },
  { to: '/play', key: 'play' },
  { to: '/glossary', key: 'glossary' },
];

export function Logo({ className = '' }) {
  return (
    <span className={`nav-logo ${className}`.trim()}>
      <span className="nav-logo__mark" aria-hidden="true">♠</span>
      <span className="nav-logo__word">
        Learn<span className="nav-logo__to">To</span>Poker
      </span>
    </span>
  );
}

export default function Nav() {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onResize = () => window.innerWidth >= 900 && setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const linkClass = ({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`;
  const drawerLinkClass = ({ isActive }) => `nav-drawer__link ${isActive ? 'is-active' : ''}`;

  return (
    <header className={`nav ${scrolled ? 'nav--scrolled' : ''} ${open ? 'nav--open' : ''}`}>
      <a className="nav-skip" href="#main">{t('nav.skip')}</a>
      <div className="container nav-inner">
        <Link to="/" className="nav-brand" aria-label="LearnToPoker">
          <Logo />
        </Link>

        <nav className="nav-links" aria-label={t('nav.menu')}>
          {NAV_LINKS.map((l) => (
            <NavLink key={l.key} to={l.to} end={l.end} className={linkClass}>
              {t(`nav.${l.key}`)}
            </NavLink>
          ))}
        </nav>

        <div className="nav-actions">
          <LanguageToggle />
          <button
            type="button"
            className="nav-burger"
            aria-expanded={open}
            aria-controls="nav-drawer"
            aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="nav-burger__line" />
            <span className="nav-burger__line" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="nav-drawer"
            className="nav-drawer"
            aria-label={t('nav.menu')}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="container nav-drawer__list">
              {NAV_LINKS.map((l, i) => (
                <motion.div
                  key={l.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i + 0.05, duration: 0.3 }}
                >
                  <NavLink to={l.to} end={l.end} className={drawerLinkClass}>
                    <span className="nav-drawer__index">{String(i + 1).padStart(2, '0')}</span>
                    {t(`nav.${l.key}`)}
                  </NavLink>
                </motion.div>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
