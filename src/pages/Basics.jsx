import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/index.js';
import tr from '../i18n/tr/basics.json';
import en from '../i18n/en/basics.json';
import Section from '../components/Section.jsx';
import Quiz from '../components/Quiz.jsx';
import HandRankLadder from '../components/HandRankLadder.jsx';
import Card2D from '../cards/Card2D.jsx';
import FlipCard from '../cards/FlipCard.jsx';
import './Basics.css';
import PageCurtain from '../components/PageCurtain.jsx';

if (!i18n.hasResourceBundle('tr', 'basics')) i18n.addResourceBundle('tr', 'basics', tr);
if (!i18n.hasResourceBundle('en', 'basics')) i18n.addResourceBundle('en', 'basics', en);

const suits = ['s', 'h', 'd', 'c'];
const seats = [[180, 32], [315, 82], [315, 190], [180, 240], [45, 190], [45, 82]];
const board = ['Ah', '7c', '2d', 'Ks', '9h'];
const boardCounts = [0, 3, 4, 5, 5];

function ActionScene({ item, pot, play, reduced }) {
  const [replay, setReplay] = useState(0);
  const moving = !['check', 'fold'].includes(item.key);
  return (
    <article className="basics-action panel">
      <div className={`basics-action-scene basics-action-scene--${item.key}`} aria-hidden="true">
        <span className="basics-mini-pot">{pot}</span>
        {item.key === 'fold' ? (
          <motion.div key={replay} className="basics-fold-cards" initial={{ x: 0, opacity: 1 }} animate={{ x: reduced ? 0 : 22, opacity: 0.5 }} transition={{ duration: reduced ? 0 : 1 }}>
            <Card2D card="As" faceUp={false} size="sm" /><Card2D card="Kh" faceUp={false} size="sm" />
          </motion.div>
        ) : (
          <motion.div key={replay} className="basics-chip-stack" initial={{ x: 0, y: 0, scale: 1 }} animate={{ x: moving && !reduced ? 82 : 0, y: moving && !reduced ? -8 : 0, scale: item.key === 'check' && !reduced ? [1, 1.15, 1] : 1 }} transition={{ duration: reduced ? 0 : 0.8 }}>
            {Array.from({ length: item.key === 'allin' ? 5 : item.key === 'raise' ? 3 : 1 }, (_, index) => <span className="basics-chip" key={index} style={{ bottom: index * 5 }} />)}
          </motion.div>
        )}
        <span className="basics-scene-caption">{item.scene}</span>
      </div>
      <div className="basics-action-heading"><h3 className="h3">{item.name}</h3><button type="button" className="basics-replay" onClick={() => setReplay(value => value + 1)} aria-label={`${item.name}: ${play}`}>↻</button></div>
      <p className="basics-action-meaning">{item.meaning}</p>
      <p className="basics-action-when">{item.when}</p>
    </article>
  );
}

export default function Basics() {
  const { t } = useTranslation('basics');
  const reduced = useReducedMotion();
  const pageRef = useRef(null);
  const [current, setCurrent] = useState(0);
  const [faceUp, setFaceUp] = useState(true);
  const [dealer, setDealer] = useState(0);
  const [street, setStreet] = useState(0);
  const sections = t('sections', { returnObjects: true });
  const steps = t('flow.steps', { returnObjects: true });
  const questions = t('quiz', { returnObjects: true });

  useEffect(() => {
    const root = pageRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    const elements = Array.from(root.querySelectorAll('[id]')).filter(element => sections.some(section => section.id === element.id));
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
      if (visible[0]) setCurrent(sections.findIndex(section => section.id === visible[0].target.id));
    }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [t]);

  const reveal = { initial: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 12 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.15 }, transition: { duration: reduced ? 0 : 0.35 } };
  const sectionProps = key => ({ eyebrow: t(`${key}.eyebrow`), title: t(`${key}.title`), lead: t(`${key}.lead`) });
  const buttonPoint = seats[dealer];
  return (
    <motion.div ref={pageRef} className="page basics-page" initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.35 }}>
      <PageCurtain />
      <Section id="intro" className="basics-hero" {...sectionProps('hero')}>
        <div className="basics-hero__aces" aria-hidden="true">{suits.map((suit, index) => <FlipCard key={suit} card={`A${suit}`} size="lg" delay={0.35 + index * 0.12} className={`basics-hero__ace basics-hero__ace--${index}`} />)}</div>
        <motion.div className="basics-progress-panel" {...reveal}>
          <p className="basics-progress-label">{t('hero.progress', { current: current + 1, total: sections.length })} <span>{sections[current].label}</span></p>
          <div className="basics-progress" role="progressbar" aria-label={t('hero.title')} aria-valuemin={1} aria-valuemax={sections.length} aria-valuenow={current + 1} aria-valuetext={sections[current].label}><motion.span animate={{ width: `${((current + 1) / sections.length) * 100}%` }} transition={{ duration: reduced ? 0 : 0.3 }} /></div>
          <nav className="basics-section-nav" aria-label={t('hero.nav')}>
            {sections.map((section, index) => <a href={`#${section.id}`} key={section.id} aria-current={current === index ? 'step' : undefined} onClick={() => setCurrent(index)}><span>{String(index + 1).padStart(2, '0')}</span>{section.label}</a>)}
          </nav>
        </motion.div>
      </Section>

      <Section id="deck" className="basics-section" {...sectionProps('deck')}>
        <motion.div className="basics-suits" {...reveal}>
          {suits.map((suit, index) => <div className="basics-suit panel" key={suit}><motion.div animate={{ rotateY: faceUp ? 0 : 180 }} transition={{ duration: reduced ? 0 : 0.3 }}><Card2D card={`A${suit}`} faceUp={faceUp} size="md" /></motion.div><span>{t('deck.suits', { returnObjects: true })[index]}</span></div>)}
        </motion.div>
        <div className="basics-deck-controls"><p>{t('deck.ranks')}</p><button className="btn btn--ghost btn--sm" type="button" onClick={() => setFaceUp(value => !value)}>{t(faceUp ? 'deck.reset' : 'deck.reveal')}</button></div>
        <p className="basics-note">{t('deck.ace')}</p>
      </Section>

      <Section id="hands" className="basics-section" {...sectionProps('ladder')}><motion.div {...reveal}><HandRankLadder /></motion.div></Section>

      <Section id="actions" className="basics-section" {...sectionProps('actions')}>
        <motion.div className="basics-actions" {...reveal}>{t('actions.items', { returnObjects: true }).map(item => <ActionScene key={item.key} item={item} pot={t('actions.pot')} play={t('actions.play')} reduced={reduced} />)}</motion.div>
      </Section>

      <Section id="blinds" className="basics-section" {...sectionProps('blinds')}>
        <motion.div className="basics-table-layout" {...reveal}>
          <div className="basics-table-panel panel">
            <svg className="basics-table" viewBox="0 0 360 275" role="img" aria-label={`${t('blinds.dealer')}: ${t('blinds.seat', { number: dealer + 1 })}; ${t('blinds.small')}: ${t('blinds.seat', { number: (dealer + 1) % 6 + 1 })}; ${t('blinds.big')}: ${t('blinds.seat', { number: (dealer + 2) % 6 + 1 })}`}>
              <ellipse cx="180" cy="136" rx="128" ry="79" className="basics-table-felt" />
              <text x="180" y="133" textAnchor="middle" className="basics-table-pot">{t('actions.pot')}</text><text x="180" y="154" textAnchor="middle" className="basics-table-value">15</text>
              {seats.map(([x, y], index) => <g key={index}><circle cx={x} cy={y} r="25" className={`basics-table-seat${index === dealer ? ' basics-table-seat--dealer' : ''}`} /><text x={x} y={y + 5} textAnchor="middle" className="basics-table-label">{index === (dealer + 1) % 6 ? 'SB' : index === (dealer + 2) % 6 ? 'BB' : index + 1}</text></g>)}
              <motion.circle r="12" className="basics-table-button" initial={false} animate={{ cx: buttonPoint[0] + 22, cy: buttonPoint[1] + 16 }} transition={{ duration: reduced ? 0 : 0.55 }} />
              <motion.text textAnchor="middle" className="basics-table-button-label" initial={false} animate={{ x: buttonPoint[0] + 22, y: buttonPoint[1] + 20 }} transition={{ duration: reduced ? 0 : 0.55 }}>D</motion.text>
            </svg>
            <div className="basics-table-legend"><span>D · {t('blinds.dealer')}</span><span>SB · {t('blinds.small')}</span><span>BB · {t('blinds.big')}</span></div>
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => setDealer(value => (value + 1) % 6)}>{t('blinds.rotate')}</button>
            <p className="basics-table-status" aria-live="polite">{t('blinds.dealer')}: {t('blinds.seat', { number: dealer + 1 })}</p>
          </div>
          <div className="basics-table-notes">{t('blinds.notes', { returnObjects: true }).map((note, index) => <p key={index}><span className="basics-note-number">0{index + 1}</span>{note}</p>)}<p className="basics-note">{t('blinds.potExample')}</p></div>
        </motion.div>
      </Section>

      <Section id="flow" className="basics-section" {...sectionProps('flow')}>
        <motion.div className="basics-flow panel" {...reveal}>
          <ol className="basics-timeline">{steps.map((step, index) => <li key={step.name}><button type="button" onClick={() => setStreet(index)} aria-current={street === index ? 'step' : undefined} className={index <= street ? 'basics-timeline-reached' : ''}><span>{index + 1}</span>{step.name}</button></li>)}</ol>
          <div className="basics-card-table">
            <div><p className="basics-card-label">{t('flow.hole')}</p><div className="basics-card-row"><Card2D card="As" faceUp size="sm" /><Card2D card="Kd" faceUp size="sm" /></div></div>
            <div><p className="basics-card-label">{t('flow.board')}</p><div className="basics-card-row">{board.map((card, index) => <motion.div key={card} animate={{ y: !reduced && index < boardCounts[street] ? -5 : 0 }} transition={{ duration: reduced ? 0 : 0.25 }}><Card2D card={card} faceUp={index < boardCounts[street]} size="sm" /></motion.div>)}</div></div>
          </div>
          <div className="basics-flow-description" aria-live="polite"><h3 className="h3">{steps[street].name}</h3><p>{steps[street].text}</p></div>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setStreet(value => value === steps.length - 1 ? 0 : value + 1)}>{t(street === steps.length - 1 ? 'flow.restart' : 'flow.next')}</button>
        </motion.div>
      </Section>

      <Section id="position" className="basics-section" {...sectionProps('position')}>
        <motion.div className="basics-positions" {...reveal}>{t('position.items', { returnObjects: true }).map((item, index) => <article className="basics-position panel" key={index}><motion.div className="basics-position-dots" aria-hidden="true" initial={{ opacity: reduced ? 1 : 0.3 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : index * 0.12 }}>{[0, 1, 2].map(dot => <span key={dot} className={dot <= index ? 'basics-position-dot--active' : ''} />)}</motion.div><h3 className="h3">{item.name}</h3><p>{item.text}</p></article>)}</motion.div>
        <p className="basics-note">{t('position.note')}</p>
      </Section>

      <Section id="quiz" className="basics-section" {...sectionProps('quizSection')}><motion.div {...reveal}><Quiz key={i18n.resolvedLanguage || i18n.language} questions={questions} /></motion.div></Section>

      <Section id="next" className="basics-next" {...sectionProps('next')}><motion.div className="basics-cta" {...reveal}><Link to="/variants" className="btn btn--ghost">{t('next.variants')}</Link><Link to="/play/holdem" className="btn btn--primary">{t('next.play')} <span aria-hidden="true">→</span></Link></motion.div></Section>
    </motion.div>
  );
}
