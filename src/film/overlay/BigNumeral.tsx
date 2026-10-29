import { motion } from 'motion/react'
import { ScrambleText } from '../../components/ScrambleText.tsx'
import type { ChapterNumeral } from '../chapters.ts'
import { ITEM } from './motion.ts'

/**
 * Big code-set numeral that decodes on chapter entry. `quiet` keeps it
 * for assistive tech only: acts whose room already projects the figure
 * behind the phone (see backdrop/Backdrop.tsx) do not show it twice.
 */
export function BigNumeral({
  numeral,
  quiet = false,
}: {
  numeral: ChapterNumeral
  /** true: assistive tech only; 'desktop': shown on phones only. */
  quiet?: boolean | 'desktop'
}) {
  if (quiet === true) {
    return (
      <p className="sr-only">
        {numeral.value} {numeral.unit}
      </p>
    )
  }
  return (
    <motion.p
      className={`mt-7 flex items-end gap-3 ${quiet === 'desktop' ? 'md:sr-only' : ''}`}
      variants={ITEM}
    >
      <ScrambleText className="spec-num spec-num--stat spec-num--code" text={numeral.value} />
      <span className="spec-unit pb-[0.6em]">{numeral.unit}</span>
    </motion.p>
  )
}
