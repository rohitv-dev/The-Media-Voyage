import type { Variants } from "motion/react";

/** Stagger wrapper for a page's top-level entrance animation. */
export function pageStaggerVariants(reduceMotion: boolean): Variants {
  if (reduceMotion) {
    return { hidden: {}, visible: {} };
  }

  return {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  };
}

/** Fade/rise entrance for a single element or stagger child. */
export function fadeUpVariants(reduceMotion: boolean): Variants {
  if (reduceMotion) {
    return {
      hidden: { opacity: 1, y: 0, scale: 1 },
      visible: { opacity: 1, y: 0, scale: 1 },
    };
  }

  return {
    hidden: { opacity: 0, y: 24, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.35, ease: "easeOut" },
    },
  };
}

/** Props for a fade/rise entrance on route-level content (no stagger). */
export function fadeUpEntranceProps(reduceMotion: boolean, distance = 8) {
  if (reduceMotion) {
    return {
      initial: false as const,
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0 },
    };
  }

  return {
    initial: { opacity: 0, y: distance },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2 },
  };
}

/** Props for a grid item that fades in and out while retaining normal stacking. */
export function gridItemMotionProps(reduceMotion: boolean) {
  if (reduceMotion) {
    return {
      layout: false as const,
      initial: false as const,
      animate: { opacity: 1 },
      exit: { opacity: 1 },
      transition: { duration: 0 },
    };
  }

  return {
    layout: true as const,
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2, layout: { duration: 0.25 } },
  };
}
