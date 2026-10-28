import { useEffect, useRef, useState } from 'react'
import { DISPLAY } from '../../data/product.ts'
import { Reveal } from '../ui/Reveal.tsx'

/** Seconds for the marker to cross the track once. */
const SWEEP_S = 1.6
/** Ghost lifetime: how long a past frame stays visible. */
const GHOST_S = 0.32
const PRESETS = [1, 24, 60, 120, 144] as const
/** Token values (aether-strong, ink): canvas cannot read Tailwind utilities. */
const ACCENT = '26, 79, 184'
const INK = '28, 27, 25'

interface Ghost {
  x: number
  at: number
}

/**
 * Interactive 1-to-144 Hz demo. A marker sweeps the track continuously but
 * is only drawn when the simulated panel refreshes, leaving a fading ghost
 * per frame: far-apart jumps at 1 Hz, a continuous streak at 144 Hz. The
 * loop paints a canvas directly (never React state per frame), pauses off
 * screen, and under reduced motion draws one static strip of frame
 * positions for the chosen rate instead.
 */
export function DisplayDemo() {
  const [hz, setHz] = useState(120)
  const hzRef = useRef(hz)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  /** Static repaint (reduced motion only); a no-op while the loop runs. */
  const repaintRef = useRef<() => void>(() => {})

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d') ?? null
    if (canvas === null || ctx === null) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ghosts: Ghost[] = []
    let size = { w: 0, h: 0 }
    let raf = 0
    let visible = true
    let lastFrame = -1
    const t0 = performance.now()

    const resize = (): void => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const box = canvas.getBoundingClientRect()
      size = { w: box.width, h: box.height }
      canvas.width = Math.round(box.width * dpr)
      canvas.height = Math.round(box.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const track = (): { x0: number; x1: number; y: number } => ({
      x0: 28,
      x1: size.w - 28,
      y: size.h / 2,
    })

    const drawBase = (): void => {
      const { x0, x1, y } = track()
      ctx.clearRect(0, 0, size.w, size.h)
      ctx.strokeStyle = `rgba(${INK}, 0.14)`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x0, y)
      ctx.lineTo(x1, y)
      ctx.stroke()
    }

    const dot = (x: number, r: number, color: string): void => {
      const { y } = track()
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    const drawStatic = (): void => {
      drawBase()
      const { x0, x1 } = track()
      // A quarter-second of frames at this rate: spacing is the message.
      const frames = Math.max(1, Math.round(hzRef.current * 0.25))
      const step = (x1 - x0) / Math.max(frames, 1)
      for (let i = 0; i <= frames; i++) dot(x0 + i * step, 5, `rgba(${ACCENT}, 0.85)`)
    }

    const tick = (now: number): void => {
      raf = requestAnimationFrame(tick)
      if (!visible) return
      const t = (now - t0) / 1000
      const period = 1 / hzRef.current
      const frame = Math.floor(t / period)
      const { x0, x1 } = track()
      if (frame !== lastFrame) {
        lastFrame = frame
        const shown = ((frame * period) / SWEEP_S) % 1
        ghosts.push({ x: x0 + shown * (x1 - x0), at: t })
        if (ghosts.length > 160) ghosts.splice(0, ghosts.length - 160)
      }
      drawBase()
      for (let i = 0; i < ghosts.length - 1; i++) {
        const g = ghosts[i]!
        const age = t - g.at
        if (age > GHOST_S) continue
        const a = 0.42 * (1 - age / GHOST_S)
        dot(g.x, 6, `rgba(${ACCENT}, ${a.toFixed(3)})`)
      }
      const head = ghosts[ghosts.length - 1]
      if (head !== undefined) dot(head.x, 9, `rgb(${ACCENT})`)
    }

    resize()
    const ro = new ResizeObserver(() => {
      resize()
      if (reduced) drawStatic()
    })
    ro.observe(canvas)
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) visible = e.isIntersecting
    })
    io.observe(canvas)
    if (reduced) {
      repaintRef.current = drawStatic
      drawStatic()
    } else raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      repaintRef.current = () => {}
    }
  }, [])

  // The loop reads the rate through a ref; reduced motion repaints the strip.
  useEffect(() => {
    hzRef.current = hz
    repaintRef.current()
  }, [hz])

  const frameMs = 1000 / hz
  return (
    <section aria-labelledby="refresh-heading" className="page pt-24">
      <Reveal>
        <h2 id="refresh-heading" className="display-lg">
          {DISPLAY.refreshMin} to {DISPLAY.refreshMax} Hz.
        </h2>
        <p className="lede mt-4">
          The marker only moves when the panel refreshes. Drag the rate down and watch it jump; push
          it up and it glides. The panel drops to {DISPLAY.refreshMin} Hz on a still screen to save
          power.
        </p>
      </Reveal>
      <div className="panel mt-10 p-5 md:p-8">
        <div data-testid="hz-rail" className="h-32 w-full rounded-2xl bg-(--color-raise) md:h-40">
          <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full" />
        </div>
        <div className="mt-6 grid items-end gap-6 md:grid-cols-[auto_1fr]">
          <p className="flex items-baseline gap-3" data-testid="hz-readout" aria-live="polite">
            <span className="spec-num text-6xl md:text-7xl">{hz}</span>
            <span className="spec-unit">Hz · {frameMs.toFixed(1)} ms per frame</span>
          </p>
          <div className="md:pl-8">
            <label htmlFor="hz-slider" className="text-sm font-medium">
              Refresh rate
            </label>
            <input
              id="hz-slider"
              type="range"
              min={DISPLAY.refreshMin}
              max={DISPLAY.refreshMax}
              value={hz}
              onChange={(e) => setHz(Number.parseInt(e.target.value, 10))}
              aria-valuetext={`${hz} hertz`}
              className="mt-3 block w-full accent-[#1a4fb8]"
            />
            <div role="group" aria-label="Preset rates" className="mt-4 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={hz === p}
                  onClick={() => setHz(p)}
                  className="min-h-10 rounded-full px-4 font-mono text-xs shadow-[0_0_0_1px_var(--color-border-hairline)] transition-colors hover:bg-(--color-raise) aria-pressed:bg-(--color-ink) aria-pressed:text-(--color-ink-inverse) aria-pressed:shadow-none"
                >
                  {p} Hz
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
