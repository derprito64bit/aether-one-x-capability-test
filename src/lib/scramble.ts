/**
 * Code-style text reveal: glyphs churn, then resolve left to right into
 * the real text. `scrambleFrame` is pure (the same text, time and seed
 * always give the same frame) so it is unit tested; `runScramble` drives
 * it on real elements with one rAF loop and never touches React state.
 */
const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=<>/\\[]{}_'

/** Cheap integer hash: a stable pseudo-random glyph per (seed, char, tick). */
function hash(a: number, b: number, c: number): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}

/**
 * One frame of the reveal at t (0..1). Each character locks at its own
 * moment, left to right with a little jitter; until then it shows a glyph
 * that changes ~24 times a second. Spaces and punctuation that carry the
 * layout (space, '.', ',', ':') never churn, so the width never jumps.
 */
export function scrambleFrame(text: string, t: number, seed = 1): string {
  if (t >= 1) return text
  const n = text.length
  let out = ''
  const tick = Math.floor(t * 24)
  for (let i = 0; i < n; i++) {
    const ch = text[i] as string
    if (ch === ' ' || ch === '.' || ch === ',' || ch === ':') {
      out += ch
      continue
    }
    const lock = 0.18 + 0.72 * (n <= 1 ? 1 : i / (n - 1)) + ((hash(seed, i, 0) % 100) / 100) * 0.08
    if (t >= Math.min(0.98, lock)) out += ch
    else out += GLYPHS[hash(seed, i, tick) % GLYPHS.length]
  }
  return out
}

const running = new WeakMap<HTMLElement, number>()

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Plays the reveal on every `[data-scramble-text]` element inside `root`
 * (or on `root` itself). The visible text node is aria-hidden; the real
 * text sits beside it for assistive tech (see ScrambleText), so live
 * regions never announce the churn. Restarting mid-run is fine.
 */
export function runScramble(root: HTMLElement, durationMs = 720): void {
  const targets: HTMLElement[] = root.matches('[data-scramble-text]')
    ? [root]
    : Array.from(root.querySelectorAll<HTMLElement>('[data-scramble-text]'))
  const reduced = reducedMotion()
  targets.forEach((el, k) => {
    const text = el.dataset.scrambleText ?? ''
    const prev = running.get(el)
    if (prev !== undefined) cancelAnimationFrame(prev)
    if (reduced || text === '') {
      el.textContent = text
      return
    }
    const seed = (k + 1) * 31 + text.length
    // Longer strings take a little longer; a short stagger between targets.
    const span = durationMs * (0.75 + Math.min(0.6, text.length / 24))
    const start = performance.now() + k * 70
    const step = (now: number): void => {
      const t = Math.max(0, (now - start) / span)
      el.textContent = scrambleFrame(text, t, seed)
      if (t < 1) running.set(el, requestAnimationFrame(step))
      else running.delete(el)
    }
    running.set(el, requestAnimationFrame(step))
  })
}
