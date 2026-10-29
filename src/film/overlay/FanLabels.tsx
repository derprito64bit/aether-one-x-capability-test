import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { FINISHES } from '../../data/product.ts'
import { runScramble } from '../../lib/scramble.ts'
import { BRIDGE_STALE_MS, calloutBridge, fanBridge } from './callouts.ts'

/**
 * Finish names over the fan (final act): each fanned phone is labelled
 * just above its top edge with its swatch and name, decoding in as the fan
 * opens. Anchors come from fanBridge (the 3D writes them every frame);
 * transforms are written straight to the DOM, no React state per frame.
 */
export function FanLabels() {
  const labelRefs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    let raf = 0
    const v = new THREE.Vector3()
    const sizes = FINISHES.map(() => ({ w: 0, h: 0 }))
    const decoded = new Set<number>()
    const measure = (): void => {
      labelRefs.current.forEach((el, i) => {
        const size = sizes[i]
        if (el === null || el === undefined || size === undefined) return
        size.w = el.offsetWidth
        size.h = el.offsetHeight
      })
    }
    measure()
    void document.fonts?.ready.then(measure)
    window.addEventListener('resize', measure)
    const tick = (): void => {
      raf = requestAnimationFrame(tick)
      const camera = calloutBridge.camera
      const live =
        camera !== null &&
        fanBridge.stamp > 0 &&
        performance.now() - fanBridge.stamp < BRIDGE_STALE_MS
      // Names arrive over the last stretch of the fan opening.
      const reveal = live ? Math.min(1, Math.max(0, (fanBridge.open - 0.55) / 0.35)) : 0
      const host = labelRefs.current[0]?.parentElement
      const w = host?.clientWidth ?? window.innerWidth
      const h = host?.clientHeight ?? window.innerHeight
      fanBridge.anchors.forEach((a, i) => {
        const el = labelRefs.current[i]
        const size = sizes[i]
        if (el === null || el === undefined || size === undefined) return
        if (camera === null || reveal <= 0.001 || !a.on) {
          el.style.opacity = '0'
          el.style.visibility = 'hidden'
          if (reveal <= 0.001) decoded.delete(i)
          return
        }
        v.set(a.x, a.y, a.z).project(camera)
        if (v.z > 1) return
        const x = ((v.x + 1) / 2) * w
        const y = ((1 - v.y) / 2) * h
        // A short stagger across the fan, left to right.
        const own = Math.min(1, Math.max(0, reveal * 1.6 - i * 0.1))
        el.style.visibility = 'visible'
        el.style.opacity = own.toFixed(3)
        el.style.transform = `translate(${(x - size.w / 2).toFixed(1)}px, ${(y - size.h - 6 + (1 - own) * 6).toFixed(1)}px)`
        if (own > 0.05 && !decoded.has(i)) {
          decoded.add(i)
          runScramble(el, 520)
        }
      })
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
  }, [])

  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
      data-testid="fan-labels"
    >
      {FINISHES.map((finish, i) => (
        <div
          key={finish.id}
          ref={(el) => {
            labelRefs.current[i] = el
          }}
          data-testid={`fan-label-${finish.id}`}
          className="absolute top-0 left-0 flex items-center gap-1.5 rounded-full bg-[rgb(var(--veil-rgb)/0.72)] px-2 py-1 font-mono text-[10px] tracking-[0.12em] whitespace-nowrap text-(--color-ink) uppercase md:text-[11px]"
          style={{ opacity: 0, visibility: 'hidden' }}
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_0_1px_rgb(255_255_255/0.25)]"
            style={{ background: finish.swatch }}
          />
          <span data-scramble-text={finish.name}>{finish.name}</span>
        </div>
      ))}
    </div>
  )
}
