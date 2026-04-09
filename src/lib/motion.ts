/**
 * Trove'a — Centralised Motion Config
 * Import everything motion-related from here, never directly from 'framer-motion'.
 * This enables LazyMotion code-splitting and consistent variants across the app.
 *
 * Performance rules:
 *  - Never animate height, width, or padding directly
 *  - Use opacity + transform (translateY, translateX, scale) only
 *  - All shared variants live here — import them, don't redefine inline
 */

export {
  LazyMotion,
  m,
  AnimatePresence,
  useReducedMotion,
  useAnimation,
  useScroll,
  useTransform,
  useMotionValue,
  Reorder,
  useDragControls,
  domAnimation as motionFeatures,
} from 'framer-motion';

// ─── Spring Configs ────────────────────────────────────────────────────────

/** UI interactions — snappy, responsive but not aggressive */
export const SPRING_UI = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 35,
  mass: 1.2,
};

/** Snap interactions — tight, decisive, slightly more damped */
export const SPRING_SNAP = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 40,
  mass: 0.8,
};

/** Page-level entrances — softer, cinematic, more fluid */
export const SPRING_PAGE = {
  type: 'spring' as const,
  stiffness: 220,
  damping: 28,
  mass: 1,
};

// ─── Shared Variants ───────────────────────────────────────────────────────

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.22, ease: 'easeOut' } },
  exit:    { opacity: 0, transition: { duration: 0.18, ease: 'easeIn' } },
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { ...SPRING_PAGE, duration: 0.6 } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2, ease: 'easeIn' } },
};

export const stageRight = {
  initial: { opacity: 0, x: 28 },
  animate: { opacity: 1, x: 0, transition: SPRING_PAGE },
  exit:    { opacity: 0, x: -16, transition: { duration: 0.2, ease: 'easeIn' } },
};

export const stageLeft = {
  initial: { opacity: 0, x: -28 },
  animate: { opacity: 1, x: 0, transition: SPRING_PAGE },
  exit:    { opacity: 0, x: 16, transition: { duration: 0.2, ease: 'easeIn' } },
};

export const bottomSheet = {
  initial: { y: '100%' },
  animate: { y: 0, transition: SPRING_UI },
  exit:    { y: '100%', transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
};

export const scalePop = {
  initial: { opacity: 0, scale: 0.94 },
  animate: { opacity: 1, scale: 1, transition: SPRING_SNAP },
  exit:    { opacity: 0, scale: 0.96, transition: { duration: 0.18, ease: 'easeIn' } },
};

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.02,
    },
  },
};

export const staggerChild = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: SPRING_PAGE },
};
