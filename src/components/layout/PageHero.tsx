import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

interface PageHeroProps {
  kicker: string
  title: string
  lede: string
  /** The route's live visual (3D study, die diagram, simulator). */
  children?: ReactNode
}

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Editorial split hero shared by the product pages: copy left, the page's
 * own visual right. One h1 per route. Copy enters in sequence once on load
 * (hierarchy: label, claim, support); reduced motion renders it settled.
 */
export function PageHero({ kicker, title, lede, children }: PageHeroProps) {
  const reduced = useReducedMotion()
  const enter = (i: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, ease: EASE, delay: 0.08 + i * 0.08 },
        }
  return (
    <section
      aria-label={`${title} introduction`}
      className="page grid items-center gap-8 pt-14 pb-6 md:pt-20 lg:grid-cols-[1fr_1.05fr] lg:gap-12"
    >
      <div className="max-w-xl">
        <motion.p className="kicker" {...enter(0)}>
          {kicker}
        </motion.p>
        <motion.h1 className="display-xl mt-5" {...enter(1)}>
          {title}
        </motion.h1>
        <motion.p className="lede mt-6" {...enter(2)}>
          {lede}
        </motion.p>
      </div>
      {children !== undefined ? (
        <motion.div
          className="relative"
          {...(reduced
            ? {}
            : {
                initial: { opacity: 0, scale: 0.97 },
                animate: { opacity: 1, scale: 1 },
                transition: { duration: 1, ease: EASE, delay: 0.2 },
              })}
        >
          {children}
        </motion.div>
      ) : null}
    </section>
  )
}
