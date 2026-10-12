import { Component, Suspense, lazy, useEffect } from 'react';
import { Link, Routes, Route, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { useReducedMotion } from './motion/useMotionPreference.js';
import Nav from './components/Nav.jsx';
import Footer from './components/Footer.jsx';
import Landing from './pages/Landing.jsx';

const Basics = lazy(() => import('./pages/Basics.jsx'));
const Variants = lazy(() => import('./pages/Variants.jsx'));
const VariantDetail = lazy(() => import('./pages/VariantDetail.jsx'));
const Play = lazy(() => import('./pages/Play.jsx'));
const Glossary = lazy(() => import('./pages/Glossary.jsx'));

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps) {
    // Clear a caught error when the route changes, without remounting the page transitions.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) this.setState({ hasError: false });
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function PageError() {
  const { t, i18n } = useTranslation('common');
  const english = i18n.language === 'en';
  return (
    <section className="container section" role="alert" style={{ textAlign: 'center' }}>
      <h1>{t('error.title', { defaultValue: english ? 'Something went wrong' : 'Bir şeyler ters gitti' })}</h1>
      <Link className="btn btn--primary" to="/">{t('error.home', { defaultValue: english ? 'Return home' : 'Ana sayfaya dön' })}</Link>
    </section>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function Loading() {
  return (
    <div className="page-loading" aria-busy="true">
      <span className="chip-spinner" />
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const { i18n } = useTranslation('common');
  useEffect(() => {
    document.title = i18n.language === 'en'
      ? 'LearnToPoker — Learn Poker from Scratch'
      : 'LearnToPoker — Sıfırdan Poker Öğren';
  }, [i18n.language]);
  const isPlay = location.pathname.startsWith('/play');
  const reduceMotion = useReducedMotion();
  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'never'}>
    <div className={`app ${isPlay ? 'app--play' : ''}`}>
      <ScrollToTop />
      <Nav />
      <main className="app__main" id="main">
        <ErrorBoundary resetKey={location.pathname} fallback={<PageError />}>
        <Suspense fallback={<Loading />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Landing />} />
              <Route path="/basics" element={<Basics />} />
              <Route path="/variants" element={<Variants />} />
              <Route path="/variants/:id" element={<VariantDetail />} />
              <Route path="/play/:variant" element={<Play />} />
              <Route path="/play" element={<Play />} />
              <Route path="/glossary" element={<Glossary />} />
              <Route path="*" element={<Landing />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
        </ErrorBoundary>
      </main>
      {!isPlay && <Footer />}
    </div>
    </MotionConfig>
  );
}
