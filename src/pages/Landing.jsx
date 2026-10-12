import { Component, Suspense, lazy, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/index.js';
import tr from '../i18n/tr/landing.json';
import en from '../i18n/en/landing.json';
import Section from '../components/Section.jsx';
import Card2D from '../cards/Card2D.jsx';
import './Landing.css';

if (!i18n.hasResourceBundle('tr', 'landing')) {
  i18n.addResourceBundle('tr', 'landing', tr);
  i18n.addResourceBundle('en', 'landing', en);
}

const HeroScene = lazy(() => import('../three/HeroScene.jsx'));

const HANDS = [
  ['highCard', 'As Jd 8c 5h 2s'],
  ['pair', 'Kh Kd 9s 6c 3d'],
  ['twoPair', 'Jh Jc 7d 7s 2c'],
  ['threeOfAKind', '8s 8h 8d Kc 4s'],
  ['straight', '9c 8d 7h 6s 5c'],
  ['flush', 'Ah Jh 8h 6h 3h'],
  ['fullHouse', 'Qs Qh Qd 5c 5s'],
  ['fourOfAKind', '9s 9h 9d 9c Ks'],
  ['straightFlush', '9d 8d 7d 6d 5d'],
  ['royalFlush', 'As Ks Qs Js Ts'],
];

const VARIANTS = [
  { id: 'holdem', playable: true, cards: ['Ah', 'Kd'] },
  { id: 'omaha', playable: true, cards: ['Qs', 'Qh', 'Jd', 'Tc'] },
  { id: 'sevenCardStud', playable: true, cards: ['7c', 'back', '7d'] },
  { id: 'fiveCardDraw', playable: true, cards: ['Js', 'Jh', '4c', '9d', '2s'] },
  { id: 'razz', playable: false, cards: ['Ac', '2d', '3h', '4s', '5c'] },
  { id: 'shortDeck', playable: false, cards: ['6s', '7s', '8s', '9s'] },
];

const FALLBACK_CARDS = ['As', 'Kh', 'Qd', 'Jc', 'Ts', 'back', 'back'];

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

class SceneBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {}
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function CssCards() {
  return (
    <div className="landing-hero__css-cards" aria-hidden="true">
      {FALLBACK_CARDS.map((c, i) => (
        <div key={i} className={`landing-float landing-float--${i}`}>
          <Card2D card={c === 'back' ? 'As' : c} faceUp={c !== 'back'} size="lg" />
        </div>
      ))}
    </div>
  );
}

const WIDE_QUERY = '(min-width: 900px)';

function useIsWide() {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(WIDE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

function HeroVisual() {
  const reduced = useReducedMotion();
  const wide = useIsWide();
  const [webgl] = useState(() => typeof window !== 'undefined' && hasWebGL());
  const fallback = <CssCards />;
  return (
    <div className="landing-hero__visual" aria-hidden="true">
      {webgl ? (
        <SceneBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <HeroScene reducedMotion={!!reduced} offsetX={wide ? 2.2 : 0} />
          </Suspense>
        </SceneBoundary>
      ) : (
        fallback
      )}
      <div className="landing-hero__overlay" />
    </div>
  );
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};
const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

function Hand({ cards }) {
  return (
    <div className="landing-hand">
      {cards.split(' ').map((c, i) => (
        <Card2D key={i} card={c} size="sm" className="landing-hand__card" />
      ))}
    </div>
  );
}

export default function Landing() {
  const { t } = useTranslation('landing');
  const { t: tc } = useTranslation('common');
  const panels = t('what.panels', { returnObjects: true });
  const steps = t('path.steps', { returnObjects: true });
  const stepLinks = ['/basics', '/variants', '/play/holdem'];
  const panelIcons = ['♠', '♥', '◎'];

  return (
    <motion.div
      className="page landing"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <header className="landing-hero">
        <HeroVisual />
        <div className="container landing-hero__inner">
          <motion.div className="landing-hero__copy" variants={stagger} initial="hidden" animate="show">
            <motion.p className="eyebrow" variants={rise}>{t('hero.eyebrow')}</motion.p>
            <motion.h1 className="h1 landing-hero__title" variants={rise}>{t('hero.title')}</motion.h1>
            <motion.p className="lead landing-hero__lead" variants={rise}>{t('hero.lead')}</motion.p>
            <motion.div className="landing-hero__ctas" variants={rise}>
              <Link to="/basics" className="btn btn--primary">{tc('cta.startLearning')}</Link>
              <Link to="/play/holdem" className="btn btn--ghost">{tc('cta.playNow')}</Link>
            </motion.div>
            <motion.p className="landing-hero__note" variants={rise}>{t('hero.note')}</motion.p>
          </motion.div>
        </div>
        <span className="landing-hero__scroll" aria-hidden="true">{t('hero.scroll')}</span>
      </header>

      <Section id="what" eyebrow={t('what.eyebrow')} title={t('what.title')} lead={t('what.lead')} className="landing-what">
        <motion.div
          className="grid-3 landing-what__grid"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {Array.isArray(panels) &&
            panels.map((p, i) => (
              <motion.article key={i} className="panel landing-what__panel" variants={rise}>
                <span className={`landing-what__icon${i === 1 ? ' is-red' : ''}`} aria-hidden="true">{panelIcons[i]}</span>
                <h3 className="h3">{p.title}</h3>
                <p>{p.text}</p>
              </motion.article>
            ))}
        </motion.div>
      </Section>

      <Section id="ranks" eyebrow={t('ranks.eyebrow')} title={t('ranks.title')} lead={t('ranks.lead')} className="landing-ranks">
        <div className="landing-ranks__scale" aria-hidden="true">
          <span>{t('ranks.weak')}</span>
          <span className="landing-ranks__bar" />
          <span>{t('ranks.strong')}</span>
        </div>
        <ol className="landing-ranks__strip">
          {HANDS.map(([key, cards], i) => (
            <li key={key} className="landing-ranks__item">
              <span className="landing-ranks__num">{i + 1}</span>
              <Hand cards={cards} />
              <span className="landing-ranks__name">{tc(`hands.${key}`)}</span>
            </li>
          ))}
        </ol>
        <Link to="/basics#hands" className="btn btn--ghost btn--sm landing-ranks__link">
          {t('ranks.link')} &rarr;
        </Link>
      </Section>

      <Section id="path" eyebrow={t('path.eyebrow')} title={t('path.title')} className="landing-path">
        <motion.ol
          className="landing-path__steps"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {Array.isArray(steps) &&
            steps.map((s, i) => (
              <motion.li key={i} className="landing-path__step" variants={rise}>
                <span className="landing-path__num">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="h3">{s.title}</h3>
                <p>{s.text}</p>
                <Link to={stepLinks[i]} className="landing-path__link">{s.link} &rarr;</Link>
              </motion.li>
            ))}
        </motion.ol>
      </Section>

      <Section id="variants" eyebrow={t('variants.eyebrow')} title={t('variants.title')} lead={t('variants.lead')} className="landing-variants">
        <div className="landing-variants__grid">
          {VARIANTS.map((v) => (
            <Link key={v.id} to={`/variants/${v.id}`} className="landing-variant">
              <div className="landing-variant__cards" aria-hidden="true">
                {v.cards.map((c, i) => (
                  <Card2D key={i} card={c === 'back' ? 'As' : c} faceUp={c !== 'back'} size="sm" className="landing-variant__card" />
                ))}
              </div>
              <div className="landing-variant__head">
                <h3 className="h3">{t(`variants.items.${v.id}.name`)}</h3>
                {v.playable && <span className="badge landing-variant__badge">{t('variants.playable')}</span>}
              </div>
              <p>{t(`variants.items.${v.id}.desc`)}</p>
              <span className="landing-variant__more">{t('variants.learn')} &rarr;</span>
            </Link>
          ))}
        </div>
        <div className="landing-variants__all">
          <Link to="/variants" className="btn btn--ghost btn--sm">{t('variants.all')} &rarr;</Link>
        </div>
      </Section>

      <section className="section landing-final">
        <div className="container">
          <motion.div
            className="landing-final__band"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <div className="landing-final__suits" aria-hidden="true">{'♠ ♥ ♦ ♣'}</div>
            <h2 className="h2">{t('final.title')}</h2>
            <p className="lead">{t('final.lead')}</p>
            <div className="landing-final__ctas">
              <Link to="/basics" className="btn btn--primary">{tc('cta.startLearning')}</Link>
              <Link to="/play/holdem" className="btn btn--ghost">{t('final.secondary')}</Link>
            </div>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}
