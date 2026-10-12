import { motion } from 'framer-motion';
import { useReducedMotion } from '../motion/useMotionPreference.js';

const LIFT = [0.76, 0, 0.24, 1];

/** A lacquer panel that lifts off a page when it mounts after a route change. */
export default function PageCurtain() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <motion.div
      className="page-curtain"
      aria-hidden="true"
      initial={{ scaleY: 1 }}
      animate={{ scaleY: 0 }}
      transition={{ duration: 0.7, ease: LIFT, delay: 0.08 }}
    >
      <motion.span
        className="page-curtain__mark"
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 0, y: -24 }}
        transition={{ duration: 0.35, ease: LIFT }}
      >
        ♠
      </motion.span>
    </motion.div>
  );
}
