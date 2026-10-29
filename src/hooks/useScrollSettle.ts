import { useEffect, useRef } from 'react'
import type { MotionValue } from 'motion/react'
import { animateScrollTo } from '../lib/settle.ts'

/** Where a settle goes: a window scrollY, and optionally how long to take. */
export interface SettleTarget {
  y: number
  ms?: number
}

/** Quiet time after the last scroll change before a settle is considered. */
const IDLE_MS = 180
/**
 * A scroll change counts as the reader's when it lands this soon after
 * their input (a scripted jump never does). Judged when the change
 * arrives, not when the idle timer fires, so a slow device that takes a
 * while to come to rest still gets its settle.
 */
const INPUT_WINDOW_MS = 1500

/**
 * Finishes a scroll for the reader: when `value` (a scroll-driven motion
 * value) comes to rest after a real input gesture, `decide(dir, moved)`
 * may return where to ease to (dir: the gesture's direction; moved: how
 * far it went, in the value's units). Never while a
 * finger rests on the glass, never after a scripted jump (deep link, rail,
 * test), never under reduced motion; any new input cancels at once. No
 * scroll listeners: it rides the motion value (film invariant 2).
 */
export function useScrollSettle(
  value: MotionValue<number>,
  decide: (dir: number, moved: number) => SettleTarget | null,
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
    let fromInput = false
    // The first scroll change after an input is the reader's, however late
    // a busy main thread delivers it.
    let pending = false
    // Where the current gesture began (null between gestures).
    let gestureFrom: number | null = null
    let cancelAnim: (() => void) | null = null
    const cancel = (): void => {
      window.clearTimeout(idle)
      cancelAnim?.()
      cancelAnim = null
      settling = false
    }
    const settle = (): void => {
      if (touching || !fromInput) return
      const moved = gestureFrom === null ? 0 : Math.abs(last - gestureFrom)
      gestureFrom = null
      const to = decideRef.current(dir, moved)
      if (to === null) return
      settling = true
      cancelAnim = animateScrollTo(
        to.y,
        () => {
          settling = false
          cancelAnim = null
        },
        to.ms,
      )
    }
    const onInput = (): void => {
      lastInput = performance.now()
      pending = true
      cancel()
    }
    // A press (rail, link, scrollbar, Play) stops a running settle but is
    // not scroll input, so it never starts one.
    const onPress = (): void => cancel()
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
      if (settling) {
        // Track the settle's own motion too: direction is always measured
        // from where the page really was, never from before the settle.
        last = v
        return
      }
      fromInput = pending || performance.now() - lastInput < INPUT_WINDOW_MS
      pending = false
      if (fromInput && gestureFrom === null) gestureFrom = last
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
    window.addEventListener('pointerdown', onPress, { passive: true })
    return () => {
      cancel()
      unsubscribe()
      window.removeEventListener('wheel', onInput)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onInput)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      window.removeEventListener('keydown', onInput)
      window.removeEventListener('pointerdown', onPress)
    }
  }, [value, enabled])
}
