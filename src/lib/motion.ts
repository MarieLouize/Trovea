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
  Reorder,
  useDragControls,
  domAnimation as motionFeatures,
} from 'framer-motion';

// ─── Spring Configs ────────────────────────────────────────────────────────

/** UI interactions — snappy, responsive */
export const SPRING_UI = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 36,
  mass: 0.8,
};

/** Snap interactions — tight, decisive */
export const SPRING_SNAP = {
  type: 'spring' as const,
  stiffness: 480,
  damping: 42,
  mass: 0.6,
};

/** Page-level entrances — softer, cinematic */
export const SPRING_PAGE = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 30,
  mass: 1,
};

// ─── Shared Variants ───────────────────────────────────────────────────────

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
};

export const slideUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: SPRING_PAGE },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.18 } },
};

export const stageRight = {
  initial: { opacity: 0, x: 32 },
  animate: { opacity: 1, x: 0, transition: SPRING_PAGE },
  exit:    { opacity: 0, x: -20, transition: { duration: 0.18 } },
};

export const stageLeft = {
  initial: { opacity: 0, x: -32 },
  animate: { opacity: 1, x: 0, transition: SPRING_PAGE },
  exit:    { opacity: 0, x: 20, transition: { duration: 0.18 } },
};

export const bottomSheet = {
  initial: { y: '100%' },
  animate: { y: 0, transition: SPRING_UI },
  exit:    { y: '100%', transition: { duration: 0.25, ease: [0.4, 0, 1, 1] } },
};

export const scalePop = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1, transition: SPRING_SNAP },
  exit:    { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

export const staggerChild = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: SPRING_PAGE },
};
