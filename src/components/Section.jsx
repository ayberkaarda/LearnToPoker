import { motion, useReducedMotion } from 'framer-motion';
import './Section.css';

const EASE = [0.16, 1, 0.3, 1];

/**
 * Page section with an optional eyebrow / title / lead header and a one-time
 * scroll reveal: the title rises out of a mask, the rest follows.
 */
export default function Section({ eyebrow, title, lead, id, className = '', children, align = 'start', as = 'section' }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.section;
  const hasHead = eyebrow || title || lead;
  const head = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.09 } },
  };
  const fade = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.8, ease: EASE } },
  };
  const rise = {
    hidden: reduce ? { y: '0%' } : { y: '105%' },
    show: { y: '0%', transition: { duration: reduce ? 0 : 1.05, ease: EASE } },
  };
  const body = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 36 },
    show: { opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.9, ease: EASE, delay: reduce ? 0 : 0.15 } },
  };
  return (
    <Tag id={id} className={`section ${className}`.trim()} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.08 }}>
      <div className="container">
        {hasHead && (
          <motion.header className={`section-head section-head--${align}`} variants={head}>
            {eyebrow && (
              <motion.span className="eyebrow" variants={fade}>
                {eyebrow}
              </motion.span>
            )}
            {title && (
              <span className="section-head__mask">
                <motion.h2 className="h2 section-head__title" variants={rise}>
                  {title}
                </motion.h2>
              </span>
            )}
            {lead && (
              <motion.p className="lead section-head__lead" variants={fade}>
                {lead}
              </motion.p>
            )}
          </motion.header>
        )}
        <motion.div className="section-body" variants={body}>
          {children}
        </motion.div>
      </div>
    </Tag>
  );
}
