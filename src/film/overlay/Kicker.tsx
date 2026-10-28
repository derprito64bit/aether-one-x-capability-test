import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { ITEM } from './motion.ts'

/** Topic label opening each chapter, in the one accent. */
export function Kicker({ children }: { children: ReactNode }) {
  return (
    <motion.p className="kicker text-(--color-aether-strong)" variants={ITEM}>
      {children}
    </motion.p>
  )
}
