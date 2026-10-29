import { motion } from 'motion/react'
import { ScrambleText } from '../../components/ScrambleText.tsx'
import { ITEM } from './motion.ts'

/** Supporting specs as quiet code chips under the figure; they decode in. */
export function SpecLines({ lines }: { lines: string[] }) {
  return (
    <motion.ul className="mt-6 flex flex-wrap gap-2" aria-label="Specifications" variants={ITEM}>
      {lines.map((line) => (
        <li
          key={line}
          className="rounded-full bg-(--color-raise)/70 px-3 py-1.5 font-mono text-[11px] tracking-[0.06em] text-(--color-dim) uppercase shadow-[0_0_0_1px_var(--color-border-hairline)]"
        >
          <ScrambleText text={line} />
        </li>
      ))}
    </motion.ul>
  )
}
