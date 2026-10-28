import { useEffect, useRef } from 'react'
import type { MotionValue } from 'motion/react'
import { animateScrollTo } from '../lib/settle.ts'

/** Quiet time after the last scroll change before a settle is considered. */
const IDLE_MS = 180
/** A settle only follows real input this recent (never a scripted jump). */
const INPUT_WINDOW_MS = 1500

/**
 * Finishes a scroll for the reader: when `value` (a scroll-driven motion
 * value) comes to rest after real input, `decide(dir)` may return a window
 * scrollY to ease to (dir is the last direction of travel). Never while a
 * finger rests on the glass, never after a scripted jump (deep link, rail,
 * test), never under reduced motion; any new input cancels at once. No
 * scroll listeners: it rides the motion value (film invariant 2).
 */
export function useScrollSettle(
  value: MotionValue<number>,
  decide: (dir: number) => number | null,
  enabled: boolean,
): void {
  const decideRef = useRef(decide)
  decideRef.current = decide
  useEffect(() => {
    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let lastInput = Number.NEGATIVE_INFINITY
    let last = value.get()
    let dir = 0
    let idle = 0
    let touching = false
    let settling = false
    let cancelAnim: (() => void) | null = null
    const cancel = (): void => {
      window.clearTimeout(idle)
      cancelAnim?.()
      cancelAnim = null
      settling = false
    }
    const settle = (): void => {
      if (touching || performance.now() - lastInput > INPUT_WINDOW_MS) return
      const to = decideRef.current(dir)
      if (to === null) return
      settling = true
      cancelAnim = animateScrollTo(to, () => {
        settling = false
        cancelAnim = null
      })
    }
    const onInput = (): void => {
      lastInput = performance.now()
      cancel()
    }
    const onTouchStart = (): void => {
      touching = true
      onInput()
    }
    const onTouchEnd = (): void => {
      touching = false
      lastInput = performance.now()
      window.clearTimeout(idle)
      idle = window.setTimeout(settle, IDLE_MS)
    }
    const unsubscribe = value.on('change', (v) => {
      if (settling) return
      if (v !== last) dir = v > last ? 1 : -1
      last = v
      window.clearTimeout(idle)
      idle = window.setTimeout(settle, IDLE_MS)
    })
    window.addEventListener('wheel', onInput, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onInput, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onInput)
    return () => {
      cancel()
      unsubscribe()
      window.removeEventListener('wheel', onInput)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onInput)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      window.removeEventListener('keydown', onInput)
    }
  }, [value, enabled])
}
