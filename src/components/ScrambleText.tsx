import { useEffect, useRef } from 'react'
import { runScramble } from '../lib/scramble.ts'

interface ScrambleTextProps {
  text: string
  className?: string
  /**
   * Play on mount (default). Off when something else decides the moment,
   * e.g. a scroll-driven card that calls runScramble as it turns visible.
   */
  auto?: boolean
}

/**
 * Text that churns through code glyphs and resolves into itself. The
 * churning node is aria-hidden and the real text is read from a visually
 * hidden twin, so screen readers (and the film's aria-live copy column)
 * only ever get the true string.
 */
export function ScrambleText({ text, className, auto = true }: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (auto && ref.current !== null) runScramble(ref.current)
  }, [auto, text])
  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true" data-scramble-text={text}>
        {text}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  )
}
