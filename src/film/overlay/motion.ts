import type { Variants } from 'motion/react'

/**
 * Chapter entrance grammar for the film overlay. One chapter container
 * staggers its children in reading order (label, claim, support, figure),
 * so hierarchy lands in sequence; exits are a fast fade so the next act is
 * never kept waiting. Variants propagate by name (hidden / show / exit).
 */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

export const CHAPTER: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.02 } },
  exit: { opacity: 0, transition: { duration: 0.16, ease: 'easeOut' } },
}

export const ITEM: Variants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: EASE_OUT_EXPO },
  },
  exit: {},
}

export const WORDS: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
  exit: {},
}

export const WORD: Variants = {
  hidden: { y: '108%' },
  show: { y: '0%', transition: { duration: 0.75, ease: EASE_OUT_EXPO } },
  exit: {},
}
