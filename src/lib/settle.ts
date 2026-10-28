/**
 * Section settle: when a scroll comes to rest part-way between two
 * sections, finish the move for the reader. Pure decisions live here (and
 * are unit tested); the hooks that watch input and scroll call them.
 */

/** Gentle in and out, so a settle never starts or stops with a jolt. */
export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
}

/** Settle time from distance: ~0.6 s for a nudge, up to ~1.5 s. */
export function settleDuration(distancePx: number, viewportPx: number): number {
  const screens = Math.abs(distancePx) / Math.max(1, viewportPx)
  return Math.min(1500, 600 + 1100 * screens)
}

/**
 * Smoothly scrolls the window to `toY` with instant steps (the page's CSS
 * smooth behaviour would fight per-frame jumps). Returns a cancel, which
 * the caller fires on any new input.
 */
export function animateScrollTo(toY: number, onDone?: () => void): () => void {
  const fromY = window.scrollY
  const duration = settleDuration(toY - fromY, window.innerHeight)
  const t0 = performance.now()
  let raf = 0
  const frame = (now: number): void => {
    const t = Math.min(1, (now - t0) / duration)
    window.scrollTo({ top: fromY + (toY - fromY) * easeInOutCubic(t), behavior: 'instant' })
    if (t < 1) raf = requestAnimationFrame(frame)
    else onDone?.()
  }
  raf = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(raf)
}

/** One page section, in page coordinates. */
export interface SectionBox {
  top: number
  height: number
}

/**
 * Where a resting page should settle, or null. Looks at each boundary
 * between consecutive sections that sits inside the viewport:
 * - scrolling down, once the next section has climbed into the top 60%
 *   of the screen, it is brought fully in (its top to the viewport top);
 * - scrolling up, once the previous section shows in the bottom 60%, it
 *   is brought back: its end to the viewport bottom, or its top when it
 *   is shorter than a screen.
 * Boundaries outside those bands (reading the middle of a long section)
 * never move the page.
 */
export function pageSettleTarget(
  sections: readonly SectionBox[],
  scrollY: number,
  vh: number,
  dir: number,
): number | null {
  let best: number | null = null
  for (let i = 1; i < sections.length; i++) {
    const next = sections[i] as SectionBox
    const prev = sections[i - 1] as SectionBox
    const y = next.top - scrollY
    let target: number | null = null
    if (dir > 0 && y > vh * 0.03 && y < vh * 0.6) target = next.top
    if (dir < 0 && y > vh * 0.4 && y < vh * 0.97) {
      target = prev.height < vh ? prev.top : next.top - vh
    }
    if (target === null) continue
    if (best === null || Math.abs(target - scrollY) < Math.abs(best - scrollY)) best = target
  }
  return best === null || Math.abs(best - scrollY) < 2 ? null : best
}
