import { create } from 'zustand';

/**
 * Site-wide motion preference.
 * 'auto' follows the operating system's prefers-reduced-motion setting,
 * 'on' forces full motion and 'off' forces reduced motion.
 */
export const MOTION_MODES = ['auto', 'on', 'off'];
export const MOTION_STORAGE_KEY = 'ltp-motion';
const QUERY = '(prefers-reduced-motion: reduce)';

const mql = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null;

function readStored() {
  try {
    const v = localStorage.getItem(MOTION_STORAGE_KEY);
    return MOTION_MODES.includes(v) ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function resolveReduce(mode, osReduce) {
  if (mode === 'on') return false;
  if (mode === 'off') return true;
  return !!osReduce;
}

export const useMotionStore = create((set, get) => ({
  mode: readStored(),
  osReduce: mql ? mql.matches : false,
  setMode: (mode) => MOTION_MODES.includes(mode) && set({ mode }),
  cycle: () => {
    const { mode } = get();
    set({ mode: MOTION_MODES[(MOTION_MODES.indexOf(mode) + 1) % MOTION_MODES.length] });
  },
}));

if (mql) {
  const onChange = () => useMotionStore.setState({ osReduce: mql.matches });
  if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange);
  else if (typeof mql.addListener === 'function') mql.addListener(onChange);
}

function applyToDocument({ mode, osReduce }) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.motion = resolveReduce(mode, osReduce) ? 'reduce' : 'full';
}

applyToDocument(useMotionStore.getState());
useMotionStore.subscribe((state, prev) => {
  applyToDocument(state);
  if (state.mode !== prev.mode) {
    try {
      localStorage.setItem(MOTION_STORAGE_KEY, state.mode);
    } catch {
      /* storage unavailable */
    }
  }
});

/** Current effective value for code outside React (render loops, timers). */
export function isReducedMotion() {
  const { mode, osReduce } = useMotionStore.getState();
  return resolveReduce(mode, osReduce);
}

/** True when animations should be reduced. */
export function useReducedMotion() {
  return useMotionStore((s) => resolveReduce(s.mode, s.osReduce));
}

/** The stored mode plus the effective state, for the settings toggle. */
export function useMotionPreference() {
  const mode = useMotionStore((s) => s.mode);
  const cycle = useMotionStore((s) => s.cycle);
  const setMode = useMotionStore((s) => s.setMode);
  const reduce = useReducedMotion();
  return { mode, reduce, cycle, setMode };
}
