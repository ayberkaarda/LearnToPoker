import { motion, useReducedMotion } from 'framer-motion';
import './Section.css';

/**
 * Page section with an optional eyebrow / title / lead header and a one-time
 * scroll reveal.
 */
export default function Section({ eyebrow, title, lead, id, className = '', children, align = 'start', as = 'section' }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.section;
  const hidden = reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 };
  const hasHead = eyebrow || title || lead;
  return (
    <Tag
      id={id}
      className={`section ${className}`.trim()}
      initial={hidden}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="container">
        {hasHead && (
          <header className={`section-head section-head--${align}`}>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {title && <h2 className="h2 section-head__title">{title}</h2>}
            {lead && <p className="lead section-head__lead">{lead}</p>}
          </header>
        )}
        {children}
      </div>
    </Tag>
  );
}
