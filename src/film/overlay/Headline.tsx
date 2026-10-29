import { motion } from 'motion/react'
import { WORD, WORDS } from './motion.ts'

/**
 * One-line editorial headline per chapter. Words rise out of a line mask in
 * sequence; the full sentence stays a single string for assistive tech.
 * The mask carries descender room so g/y/p never clip mid-rise.
 */
export function Headline({ text }: { text: string }) {
  const words = text.split(' ')
  return (
    <motion.h2
      className="display-lg mt-3 text-[1.75rem] md:mt-4 md:text-[clamp(2.25rem,3.9vw,3.75rem)]"
      variants={WORDS}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          <span key={`${word}-${i}`}>
            <span className="-mb-[0.16em] inline-block overflow-hidden pb-[0.16em] align-top">
              <motion.span className="inline-block" variants={WORD}>
                {word}
              </motion.span>
            </span>
            {i < words.length - 1 ? ' ' : null}
          </span>
        ))}
      </span>
    </motion.h2>
  )
}
