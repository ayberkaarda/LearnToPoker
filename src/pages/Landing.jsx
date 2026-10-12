import { Component, Fragment, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useReducedMotion } from '../motion/useMotionPreference.js';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/index.js';
import tr from '../i18n/tr/landing.json';
import en from '../i18n/en/landing.json';
import Section from '../components/Section.jsx';
import PageCurtain from '../components/PageCurtain.jsx';
import Card2D from '../cards/Card2D.jsx';
import FlipCard from '../cards/FlipCard.jsx';
import './Landing.css';

if (!i18n.hasResourceBundle('tr', 'landing')) {
  i18n.addResourceBundle('tr', 'landing', tr);
  i18n.addResourceBundle('en', 'landing', en);
}

const HeroScene = lazy(() => import('../three/HeroScene.jsx'));

const EASE = [0.16, 1, 0.3, 1];

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

const FALLBACK_CARDS = ['Th', 'Jh', 'Qh', 'Kh', 'Ah'];
const ROMAN = ['I', 'II', 'III'];
const IDEA_SUITS = ['♠', '♥', '♦'];

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

function useMedia(query) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** CSS fan used when WebGL is unavailable. */
function CssFan() {
  return (
    <div className="landing-fan" aria-hidden="true">
      {FALLBACK_CARDS.map((c, i) => (
        <div key={c} className="landing-fan__card" style={{ '--i': i - 2 }}>
          <Card2D card={c} faceUp size="lg" />
        </div>
      ))}
    </div>
  );
}

function HeroVisual({ progress, active }) {
  const reduced = useReducedMotion();
  const wide = useMedia('(min-width: 900px)');
  const [webgl] = useState(() => typeof window !== 'undefined' && hasWebGL());
  const fallback = <CssFan />;
  return (
    <div className="landing-hero__visual" aria-hidden="true">
      {webgl ? (
        <SceneBoundary fallback={fallback}>
          <Suspense fallback={null}>
            <HeroScene reducedMotion={!!reduced} offsetX={wide ? 2.5 : 0} progress={progress} compact={!wide} active={active} />
          </Suspense>
        </SceneBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}

/** Headline that rises word by word out of a mask. */
function MaskedTitle({ text, className, delay = 0 }) {
  const reduce = useReducedMotion();
  const words = String(text).split(' ');
  return (
    <h1 className={className} aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={i}>
        <span className="landing-mask" aria-hidden="true">
          <motion.span
            className="landing-mask__word"
            initial={reduce ? false : { y: '110%', rotate: 4 }}
            animate={{ y: '0%', rotate: 0 }}
            transition={{ duration: 1.1, ease: EASE, delay: delay + i * 0.07 }}
          >
            {w}
          </motion.span>
        </span>
        {i < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </h1>
  );
}

function Hero() {
  const { t } = useTranslation('landing');
  const { t: tc } = useTranslation('common');
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { margin: '0px 0px 0px 0px' });
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const copyY = useTransform(scrollYProgress, [0, 0.7], [0, -140]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.45, 0.7], [1, 0.6, 0]);
  const glyphY = useTransform(scrollYProgress, [0, 1], [0, 260]);
  const glyphRotate = useTransform(scrollYProgress, [0, 1], [-8, 6]);
  const veil = useTransform(scrollYProgress, [0.35, 0.95], [0, 1]);
  const after = { initial: reduce ? false : { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 } };

  return (
    <header ref={ref} className={`landing-hero${reduce ? ' landing-hero--still' : ''}`}>
      <div className="landing-hero__stage">
        <div className="landing-hero__spot" aria-hidden="true" />
        <motion.div className="landing-hero__glyph" style={reduce ? undefined : { y: glyphY, rotate: glyphRotate }} aria-hidden="true">
          ♠
        </motion.div>
        <HeroVisual progress={scrollYProgress} active={inView} />
        <div className="landing-hero__shade" aria-hidden="true" />
        <div className="landing-hero__sweep" aria-hidden="true" />

        <div className="container landing-hero__inner">
          <motion.div className="landing-hero__copy" style={reduce ? undefined : { y: copyY, opacity: copyOpacity }}>
            <motion.p className="eyebrow" {...after} transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}>
              {t('hero.eyebrow')}
            </motion.p>
            <MaskedTitle text={t('hero.title')} className="h1 landing-hero__title" delay={0.25} />
            <motion.p className="lead landing-hero__lead" {...after} transition={{ duration: 0.9, ease: EASE, delay: 0.85 }}>
              {t('hero.lead')}
            </motion.p>
            <motion.div className="landing-hero__ctas" {...after} transition={{ duration: 0.9, ease: EASE, delay: 1 }}>
              <Link to="/basics" className="btn btn--primary">
                {tc('cta.startLearning')}
              </Link>
              <Link to="/play/holdem" className="btn btn--ghost">
                {tc('cta.playNow')}
              </Link>
            </motion.div>
            <motion.p className="landing-hero__note" {...after} transition={{ duration: 0.9, ease: EASE, delay: 1.15 }}>
              {t('hero.note')}
            </motion.p>
          </motion.div>
        </div>

        <span className="landing-hero__scroll" aria-hidden="true">
          {t('hero.scroll')}
        </span>
        <motion.div className="landing-hero__veil" style={reduce ? { opacity: 0 } : { opacity: veil }} aria-hidden="true" />
      </div>
    </header>
  );
}

function RankRow({ name, cards, index }) {
  const ref = useRef(null);
  const shown = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const top = index === HANDS.length - 1;
  return (
    <li ref={ref} className={`landing-rank${top ? ' landing-rank--top' : ''}${shown ? ' is-shown' : ''}`} style={{ '--strength': (index + 1) / HANDS.length }}>
      <span className="landing-rank__num">{index + 1}</span>
      <span className="landing-rank__hand">
        {cards.split(' ').map((c, i) => (
          <FlipCard key={c} card={c} shown={shown} delay={reduce ? 0 : 0.1 + i * 0.075} />
        ))}
      </span>
      <span className="landing-rank__name">{name}</span>
      <span className="landing-rank__meter" aria-hidden="true">
        <span />
      </span>
    </li>
  );
}

/** Pointer-tracked tilt + spotlight; pure transform/opacity work. */
function useTilt() {
  const reduce = useReducedMotion();
  const onPointerMove = (e) => {
    if (reduce || e.pointerType === 'touch') return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
    el.style.setProperty('--ry', `${(x - 0.5) * 8}deg`);
    el.style.setProperty('--rx', `${(0.5 - y) * 6}deg`);
  };
  const onPointerLeave = (e) => {
    const el = e.currentTarget;
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--rx', '0deg');
  };
  return { onPointerMove, onPointerLeave };
}

function VariantTile({ v, index }) {
  const reduce = useReducedMotion();
  const { t } = useTranslation('landing');
  const tilt = useTilt();
  const n = v.cards.length;
  return (
    <motion.div
      className={`landing-variant-wrap landing-variant-wrap--${index}`}
      initial={reduce ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, ease: EASE, delay: (index % 3) * 0.08 }}
    >
      <Link to={`/variants/${v.id}`} className="landing-variant" {...tilt}>
        <div className="landing-variant__felt" aria-hidden="true">
          <div className="landing-variant__cards">
            {v.cards.map((c, i) => (
              <span key={i} className="landing-variant__card" style={{ '--k': i - (n - 1) / 2 }}>
                <Card2D card={c === 'back' ? 'As' : c} faceUp={c !== 'back'} size={index === 0 ? 'lg' : 'sm'} />
              </span>
            ))}
          </div>
        </div>
        <div className="landing-variant__body">
          <div className="landing-variant__head">
            <h3 className="h3">{t(`variants.items.${v.id}.name`)}</h3>
            {v.playable && <span className="badge landing-variant__badge">{t('variants.playable')}</span>}
          </div>
          <p>{t(`variants.items.${v.id}.desc`)}</p>
          <span className="landing-variant__more">{t('variants.learn')}</span>
        </div>
        <span className="landing-variant__spot" aria-hidden="true" />
      </Link>
    </motion.div>
  );
}

export default function Landing() {
  const { t } = useTranslation('landing');
  const { t: tc } = useTranslation('common');
  const reduce = useReducedMotion();
  const panels = t('what.panels', { returnObjects: true });
  const steps = t('path.steps', { returnObjects: true });
  const stepLinks = ['/basics', '/variants', '/play/holdem'];

  const item = (i) => ({
    initial: reduce ? false : { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.35 },
    transition: { duration: 0.9, ease: EASE, delay: i * 0.1 },
  });

  return (
    <motion.div
      className="page landing"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <PageCurtain />
      <Hero />

      <Section id="what" eyebrow={t('what.eyebrow')} title={t('what.title')} lead={t('what.lead')} className="landing-what">
        <ol className="landing-ideas" role="list">
          {Array.isArray(panels) &&
            panels.map((p, i) => (
              <motion.li key={i} className="landing-idea" {...item(i)}>
                <span className={`landing-idea__suit${i === 1 || i === 2 ? ' is-red' : ''}`} aria-hidden="true">
                  {IDEA_SUITS[i]}
                </span>
                <div>
                  <h3 className="h3">{p.title}</h3>
                  <p>{p.text}</p>
                </div>
              </motion.li>
            ))}
        </ol>
      </Section>

      <Section id="ranks" eyebrow={t('ranks.eyebrow')} title={t('ranks.title')} lead={t('ranks.leadList')} className="landing-ranks">
        <div className="landing-ranks__scale" aria-hidden="true">
          <span>{t('ranks.weak')}</span>
          <span className="landing-ranks__bar" />
          <span>{t('ranks.strong')}</span>
        </div>
        <ol className="landing-ranks__list">
          {HANDS.map(([key, cards], i) => (
            <RankRow key={key} name={tc(`hands.${key}`)} cards={cards} index={i} />
          ))}
        </ol>
        <Link to="/basics#hands" className="btn btn--ghost btn--sm landing-ranks__link">
          {t('ranks.link')}
        </Link>
      </Section>

      <Section id="path" eyebrow={t('path.eyebrow')} title={t('path.title')} className="landing-path">
        <ol className="landing-path__steps">
          {Array.isArray(steps) &&
            steps.map((s, i) => (
              <motion.li key={i} className="landing-path__step" {...item(i)}>
                <span className="landing-path__num" aria-hidden="true">
                  {ROMAN[i]}
                </span>
                <h3 className="h3">{s.title}</h3>
                <p>{s.text}</p>
                <Link to={stepLinks[i]} className="landing-path__link">
                  {s.link}
                </Link>
              </motion.li>
            ))}
        </ol>
      </Section>

      <Section id="variants" eyebrow={t('variants.eyebrow')} title={t('variants.title')} lead={t('variants.lead')} className="landing-variants">
        <div className="landing-variants__grid">
          {VARIANTS.map((v, i) => (
            <VariantTile key={v.id} v={v} index={i} />
          ))}
        </div>
        <div className="landing-variants__all">
          <Link to="/variants" className="btn btn--ghost btn--sm">
            {t('variants.all')}
          </Link>
        </div>
      </Section>

      <section className="section landing-final">
        <div className="container">
          <motion.div
            className="landing-final__band"
            initial={reduce ? false : { opacity: 0, y: 40, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1, ease: EASE }}
          >
            <div className="landing-final__inner">
              <span className="landing-final__chip" aria-hidden="true" />
              <h2 className="h2">{t('final.title')}</h2>
              <p className="lead">{t('final.lead')}</p>
              <div className="landing-final__ctas">
                <Link to="/basics" className="btn btn--primary">
                  {tc('cta.startLearning')}
                </Link>
                <Link to="/play/holdem" className="btn btn--ghost">
                  {t('final.secondary')}
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}
