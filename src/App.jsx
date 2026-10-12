import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Nav from './components/Nav.jsx';
import Footer from './components/Footer.jsx';
import Landing from './pages/Landing.jsx';

const Basics = lazy(() => import('./pages/Basics.jsx'));
const Variants = lazy(() => import('./pages/Variants.jsx'));
const VariantDetail = lazy(() => import('./pages/VariantDetail.jsx'));
const Play = lazy(() => import('./pages/Play.jsx'));
const Glossary = lazy(() => import('./pages/Glossary.jsx'));

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
  const isPlay = location.pathname.startsWith('/play');
  return (
    <div className={`app ${isPlay ? 'app--play' : ''}`}>
      <ScrollToTop />
      <Nav />
      <main className="app__main" id="main">
        <Suspense fallback={<Loading />}>
          <AnimatePresence mode="wait" initial={false}>
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
      </main>
      {!isPlay && <Footer />}
    </div>
  );
}
