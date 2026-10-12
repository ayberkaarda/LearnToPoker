import { Link, Navigate, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/index.js';
import tr from '../i18n/tr/variants.json';
import en from '../i18n/en/variants.json';
import Section from '../components/Section.jsx';
import StepPlayer from '../components/StepPlayer.jsx';
import Quiz from '../components/Quiz.jsx';
import { FAMILY_ICONS, SIMILAR_PLAYABLE, getVariantMeta } from '../content/variants.js';
import { getWalkthrough } from '../content/walkthroughs.js';
import './VariantDetail.css';
import PageCurtain from '../components/PageCurtain.jsx';

if (!i18n.hasResourceBundle('tr', 'variants')) {
  i18n.addResourceBundle('tr', 'variants', tr);
  i18n.addResourceBundle('en', 'variants', en);
}

const asArray = (x) => (Array.isArray(x) ? x : []);

export default function VariantDetail() {
  const { id } = useParams();
  const { t, i18n: inst } = useTranslation('variants');
  const reduce = useReducedMotion();
  const meta = getVariantMeta(id);

  if (!meta) return <Navigate to="/variants" replace />;

  const v = t(`variants.${meta.id}`, { returnObjects: true }) || {};
  const rules = asArray(v.rules);
  const differences = asArray(v.differences);
  const tips = asArray(v.tips);
  const quiz = asArray(v.quiz);
  const walkthrough = v.walkthrough || {};
  const steps = getWalkthrough(meta.id);
  const texts = asArray(walkthrough.steps);
  const similarId = meta.playable ? null : SIMILAR_PLAYABLE[meta.id];
  const similarName = similarId ? t(`variants.${similarId}.name`) : '';
  const lang = inst.resolvedLanguage || inst.language;

  const isRed = ['♦', '♥', '◇'].includes(meta.icon);
  const metaItems = [
    { label: t('meta.family'), value: `${FAMILY_ICONS[meta.family]} ${t(`families.${meta.family}`)}` },
    { label: t('meta.holeCards'), value: meta.holeCards == null ? t('meta.varies') : meta.holeCards },
    {
      label: t('meta.communityCards'),
      value: meta.communityCards == null ? t('meta.varies') : meta.communityCards === 0 ? t('meta.none') : meta.communityCards,
    },
    { label: t('meta.limit'), value: t(`limits.${meta.limit}`) },
    { label: t('difficulty.label'), value: t(`difficulty.${meta.difficulty}`), pips: meta.difficulty },
  ];

  const item = (i) => ({
    initial: { opacity: 0, y: reduce ? 0 : 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.4 },
    transition: { duration: 0.45, delay: reduce ? 0 : Math.min(i, 8) * 0.05 },
  });

  return (
    <motion.div
      className="page vdetail"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <PageCurtain />
      <header className="vdetail-hero">
        <div className="container vdetail-hero__inner">
          <Link to="/variants" className="vdetail-hero__back">
            <span aria-hidden="true">←</span> {t('detail.back')}
          </Link>
          <div className="vdetail-hero__main">
            <motion.span
              className={`vdetail-hero__icon ${isRed ? 'is-red' : ''}`}
              aria-hidden="true"
              initial={{ rotate: reduce ? 0 : -8, scale: reduce ? 1 : 0.85, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {meta.icon}
            </motion.span>
            <div className="vdetail-hero__text">
              <span className="eyebrow">{t(`families.${meta.family}`)}</span>
              <h1 className="h1 vdetail-hero__title">{v.name}</h1>
              <p className="vdetail-hero__tagline">{v.tagline}</p>
            </div>
          </div>
          <p className="lead vdetail-hero__summary">{v.summary}</p>
          <dl className="vdetail-meta">
            {metaItems.map((m) => (
              <div key={m.label} className="vdetail-meta__item">
                <dt>{m.label}</dt>
                <dd>
                  {m.value}
                  {m.pips && (
                    <span className="vdetail-meta__pips" aria-hidden="true">
                      {[1, 2, 3].map((n) => (
                        <span key={n} className={n <= m.pips ? 'is-on' : ''} />
                      ))}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <div className="vdetail-hero__actions">
            {meta.playable ? (
              <Link to={`/play/${meta.id}`} className="btn btn--primary">
                {t('detail.playCta', { name: v.name })} <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <span className="badge">{t('detail.ctaSimilarTitle')}</span>
            )}
            <a href="#walkthrough" className="btn btn--ghost">
              {t('detail.walkthroughEyebrow')}
            </a>
          </div>
        </div>
      </header>

      <Section className="vdetail-section" eyebrow={t('detail.rulesEyebrow')} title={t('detail.rulesTitle')}>
        <ol className="vdetail-rules" role="list">
          {rules.map((r, i) => (
            <motion.li key={i} className="vdetail-rules__item" {...item(i)}>
              <span className="vdetail-rules__num" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{r}</span>
            </motion.li>
          ))}
        </ol>
      </Section>

      <Section
        className="vdetail-section vdetail-section--alt"
        eyebrow={t('detail.differencesEyebrow')}
        title={t('detail.differencesTitle')}
      >
        <ul className="vdetail-diffs" role="list">
          {differences.map((d, i) => (
            <motion.li key={i} className="vdetail-diffs__item panel" {...item(i)}>
              <span className="vdetail-diffs__mark" aria-hidden="true">
                ≠
              </span>
              <span>{d}</span>
            </motion.li>
          ))}
        </ul>
      </Section>

      <Section
        id="walkthrough"
        className="vdetail-section"
        eyebrow={t('detail.walkthroughEyebrow')}
        title={walkthrough.title}
        lead={t('detail.walkthroughLead')}
      >
        <StepPlayer key={meta.id} steps={steps} texts={texts} />
      </Section>

      <Section className="vdetail-section vdetail-section--alt" eyebrow={t('detail.tipsEyebrow')} title={t('detail.tipsTitle')}>
        <div className="grid-3">
          {tips.map((tip, i) => (
            <motion.div key={i} className="panel vdetail-tip" {...item(i)}>
              <span className="vdetail-tip__num" aria-hidden="true">
                {['♠', '♥', '♦', '♣'][i % 4]}
              </span>
              <p>{tip}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section className="vdetail-section" eyebrow={t('detail.quizEyebrow')} title={t('detail.quizTitle')} lead={t('detail.quizLead')}>
        <Quiz key={`${meta.id}-${lang}`} questions={quiz} />
      </Section>

      <Section className="vdetail-section vdetail-cta-section">
        <div className="vdetail-cta panel">
          {meta.playable ? (
            <>
              <div>
                <h2 className="h3">{t('detail.ctaPlayTitle')}</h2>
                <p className="vdetail-cta__lead">{t('detail.ctaPlayLead')}</p>
              </div>
              <Link to={`/play/${meta.id}`} className="btn btn--primary">
                {t('detail.playCta', { name: v.name })} <span aria-hidden="true">→</span>
              </Link>
            </>
          ) : (
            <>
              <div>
                <h2 className="h3">{t('detail.ctaSimilarTitle')}</h2>
                <p className="vdetail-cta__lead">
                  {t('detail.ctaSimilarLead')} <Link to={`/variants/${similarId}`}>{similarName}</Link>
                </p>
              </div>
              <Link to={`/play/${similarId}`} className="btn btn--primary">
                {t('detail.similarCta', { name: similarName })} <span aria-hidden="true">→</span>
              </Link>
            </>
          )}
        </div>
      </Section>
    </motion.div>
  );
}
