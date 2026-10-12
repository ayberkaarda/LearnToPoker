import { motion } from 'framer-motion';
import { useReducedMotion } from '../motion/useMotionPreference.js';
import Card2D from './Card2D.jsx';
import './FlipCard.css';

const EASE = [0.16, 1, 0.3, 1];

/** A Card2D that turns face up when `shown` becomes true (3D flip, with a small lift). */
export default function FlipCard({ card, shown = true, delay = 0, size = 'sm', className = '' }) {
  const reduce = useReducedMotion();
  const up = shown || reduce;
  return (
    <span className={`flipcard ${className}`.trim()}>
      <motion.span
        className="flipcard__inner"
        initial={reduce ? false : { rotateY: 180, y: -10 }}
        animate={up ? { rotateY: 0, y: 0 } : { rotateY: 180, y: -10 }}
        transition={{ duration: reduce ? 0 : 0.8, ease: EASE, delay: reduce ? 0 : delay }}
      >
        <span className="flipcard__face">
          <Card2D card={card} faceUp size={size} />
        </span>
        <span className="flipcard__back" aria-hidden="true">
          <Card2D card={card} faceUp={false} size={size} />
        </span>
      </motion.span>
    </span>
  );
}
