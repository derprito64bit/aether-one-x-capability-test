import { motion } from 'motion/react'
import { ScrambleText } from '../../components/ScrambleText.tsx'
import { ITEM } from './motion.ts'

/** Topic label opening each chapter, in the one accent; decodes on entry. */
export function Kicker({ children }: { children: string }) {
  return (
    <motion.p className="kicker text-(--color-aether-strong)" variants={ITEM}>
      <ScrambleText text={children} />
    </motion.p>
  )
}
