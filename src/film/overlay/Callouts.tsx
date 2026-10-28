import { useEffect, useRef } from 'react'
import type { MotionValue } from 'motion/react'
import * as THREE from 'three'
import { EXPLODE_PARTS, partProgress } from '../internals/explode.ts'
import { CALLOUTS, featuredCallout } from '../chapters.ts'
import { computeFilmStates } from '../states.ts'
import { cursorAt } from '../teardown/layers.ts'
import {
  calloutBridge,
  featureAnchorBridge,
  overlayCursor,
  layoutCallouts,
  type CalloutLayout,
} from './callouts.ts'

/** Solid label chip: legible over any part, any stage tone. */
const LABEL_CHIP =
  'absolute left-0 top-0 max-w-52 rounded-xl bg-(--color-raise)/92 px-3 py-2 shadow-[0_0_0_1px_var(--color-border-hairline),0_8px_20px_-10px_rgba(40,30,10,0.35)] backdrop-blur-sm'

const ENTRY_TRAVEL = 14
const FEATURE_TRAVEL = 10

/** Singleton world map for the one feature pointer: zero allocation. */
const featureWorlds = new Map<string, THREE.Vector3>()

/**
 * Exploded-diagram callouts (Prompt B section 6). One SVG leader layer,
 * one label pool, zero React state per frame: the rAF loop projects part
 * anchors and writes transforms directly. Runs only inside the exploded
 * diagram; parked otherwise.
 */
export function Callouts({ progress }: { progress: MotionValue<number> }) {
  const layerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const labelRefs = useRef<Array<HTMLDivElement | null>>([])
  const pathRefs = useRef<Array<SVGPathElement | null>>([])
  const featureLabelRef = useRef<HTMLDivElement | null>(null)
  const featurePathRef = useRef<SVGPathElement | null>(null)
  const scratch = useRef({
    world: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    ray: new THREE.Raycaster(),
  })
  const rect = useRef({ w: 0, h: 0 })
  const widths = useRef<number[]>([])
  const pool = useRef<THREE.Vector3[]>([])
  const featureVec = useRef(new THREE.Vector3())
  const featureEdge = useRef(new THREE.Vector3())

  useEffect(() => {
    let raf = 0
    let frame = 0
    const measure = (): void => {
      const el = layerRef.current?.parentElement
      if (el === null || el === undefined) return
      // Cached outside the frame loop; invalidated on resize only. Label
      // widths ride along because copy is static (never read offsetWidth
      // per frame: layout thrash in an overlay loop).
      const box = el.getBoundingClientRect()
      rect.current = { w: box.width, h: box.height }
      widths.current = labelRefs.current.map((label) => label?.offsetWidth ?? 0)
    }
    measure()
    window.addEventListener('resize', measure)

    const tick = (): void => {
      raf = requestAnimationFrame(tick)
      frame += 1
      const layer = layerRef.current
      const svg = svgRef.current
      if (layer === null || svg === null) return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const p = progress.get()
      const st = computeFilmStates(p)
      // During the teardown feature run the layer copy carries the story,
      // so the pool only brackets it: establishing stack and restack. Nine
      // simultaneous labels over a featured layer is clutter, not diagram.
      // The featured layer gets exactly one pointer of its own below.
      // Site overhaul: the pool is off for the whole teardown span. Its
      // opacity is only non-zero inside the teardown, and the old cursor
      // bounds left two ~15ms windows where half-faded chips flashed and
      // overlapped; the per-layer pointer carries the labelling instead.
      const cursor = overlayCursor(cursorAt(p), performance.now())
      const inFeatureRun = p >= 0.25 && p < 0.52
      const poolActive =
        st.calloutOpacity > 0.01 &&
        !inFeatureRun &&
        calloutBridge.camera !== null &&
        rect.current.w > 0
      const feature = inFeatureRun ? featuredCallout(cursor) : null
      const camera = calloutBridge.camera
      const layerVisible = (poolActive || feature !== null) && camera !== null && rect.current.w > 0
      layer.style.display = layerVisible ? 'block' : 'none'
      if (!layerVisible || camera === null) return
      const { w, h } = rect.current
      if (pool.current.length !== CALLOUTS.length) {
        pool.current = CALLOUTS.map(() => new THREE.Vector3())
      }
      const worlds = new Map<string, THREE.Vector3>()
      CALLOUTS.forEach((def, i) => {
        const groups = calloutBridge.anchors[def.partId]
        const first = groups?.[0]
        const slot = pool.current[i]
        if (first === undefined || slot === undefined) return
        first.getWorldPosition(slot)
        worlds.set(def.partId, slot)
      })
      const layouts = layoutCallouts(CALLOUTS, worlds, camera, w, h)

      // Occlusion: throttled raycast against the shell. A part hidden
      // behind nearer geometry loses its label (Prompt B section 6).
      // Ghosted shell (opacity under 0.5) does not occlude: the parts show
      // through it by design.
      const occluded = new Set<string>()
      if (frame % 4 === 0 && calloutBridge.occluders.length > 0) {
        const raycaster = scratch.current.ray
        for (const def of CALLOUTS) {
          const world = worlds.get(def.partId)
          if (world === undefined) continue
          scratch.current.dir.copy(world).sub(camera.position)
          const dist = scratch.current.dir.length()
          raycaster.set(camera.position, scratch.current.dir.normalize())
          const hits = raycaster.intersectObjects(calloutBridge.occluders, true)
          const first = hits[0]
          if (first === undefined) continue
          const material = (first.object as THREE.Mesh).material as
            THREE.Material | THREE.Material[]
          const opacity = Array.isArray(material)
            ? Math.min(...material.map((m) => m.opacity))
            : material.opacity
          if (first.distance < dist - 0.001 && opacity > 0.5) occluded.add(def.partId)
        }
      }

      const byId = new Map<string, CalloutLayout>()
      for (const layout of layouts) byId.set(layout.partId, layout)
      CALLOUTS.forEach((def, i) => {
        const label = labelRefs.current[i]
        const path = pathRefs.current[i]
        if (label === null || label === undefined || path === null || path === undefined) return
        const layout = byId.get(def.partId)
        const part = EXPLODE_PARTS.find((entry) => entry.id === def.partId)
        const entry = part === undefined ? 1 : partProgress(st.explodeXray, part.delay)
        // Pool labels render only outside the feature run: the layer owns
        // this container's visibility while featured, but that must not
        // leak the pool back on (overnight pointer fix).
        const show =
          poolActive && (layout?.visible ?? false) && !occluded.has(def.partId) && entry > 0.35
        const opacity = show
          ? st.calloutOpacity * (reduced ? 1 : Math.min(1, (entry - 0.35) / 0.3))
          : 0
        label.style.opacity = String(opacity)
        if (!show) {
          path.setAttribute('d', '')
          return
        }
        const lx = layout?.x ?? 0
        const ly = layout?.y ?? 0
        const side = layout?.side ?? 'right'
        // Entry rides the part's own progress: labels arrive as parts settle.
        const travel = reduced ? 0 : ENTRY_TRAVEL * (1 - Math.min(1, (entry - 0.35) / 0.4))
        const cachedWidth = widths.current[i] ?? 0
        const labelX = side === 'right' ? lx + 18 + travel : lx - 18 - travel - cachedWidth
        label.style.transform = `translate(${labelX.toFixed(1)}px, ${(ly - 14).toFixed(1)}px)`
        const anchorX = side === 'right' ? labelX : labelX + cachedWidth
        path.setAttribute(
          'd',
          `M ${lx.toFixed(1)} ${ly.toFixed(1)} L ${anchorX.toFixed(1)} ${(ly - 8).toFixed(1)}`,
        )
        path.style.opacity = String(opacity)
      })
      // Featured-layer pointer: exactly one leader naming the part while
      // the copy card tells its story (overnight watchability). Reuses the
      // projection + occlusion machinery; shell-only layers carry no
      // pointer (their plate fills the frame).
      const featureLabel = featureLabelRef.current
      const featurePath = featurePathRef.current
      if (featureLabel !== null && featurePath !== null) {
        // Anchor comes from the dedicated bridge (plain coordinates the
        // driving closure publishes), not the shared anchors map.
        const anchored =
          feature !== null &&
          featureAnchorBridge.valid &&
          featureAnchorBridge.partId === feature.partId
        featureWorlds.clear()
        if (anchored) {
          featureVec.current.set(
            featureAnchorBridge.x,
            featureAnchorBridge.y,
            featureAnchorBridge.z,
          )
          featureWorlds.set(feature.partId, featureVec.current)
        }
        const layout =
          feature !== null
            ? layoutCallouts(
                [{ partId: feature.partId, title: feature.title, body: '', priority: 1 }],
                featureWorlds,
                camera,
                w,
                h,
              )[0]
            : undefined
        const show = anchored && layout?.visible === true && !occluded.has(feature.partId)
        featureLabel.style.opacity = String(show && feature !== null ? feature.opacity : 0)
        if (!show || feature === null || layout === undefined) {
          featurePath.setAttribute('d', '')
        } else {
          if (featureLabel.dataset.part !== feature.partId) {
            featureLabel.dataset.part = feature.partId
            const title = featureLabel.querySelector('p')
            if (title !== null) title.textContent = feature.title
            // Fresh copy needs a fresh measure (one sync layout per layer).
            featureLabel.dataset.w = String(featureLabel.offsetWidth)
          }
          const lx = layout.x
          const ly = layout.y
          // Clear the part itself: offset by its projected half-extent
          // (measured along the camera's right axis), on the side away
          // from the stack centre. A fixed 18px offset from the centre put
          // the chip over a third of the camera module.
          featureEdge.current
            .setFromMatrixColumn(camera.matrixWorld, 0)
            .multiplyScalar(featureAnchorBridge.radius)
            .add(featureVec.current)
            .project(camera)
          const radiusPx = Math.abs(((featureEdge.current.x + 1) / 2) * w - lx)
          featureEdge.current
            .set(featureAnchorBridge.sx, featureAnchorBridge.sy, featureAnchorBridge.sz)
            .project(camera)
          const stackX = ((featureEdge.current.x + 1) / 2) * w
          const side = lx >= stackX ? 'right' : 'left'
          const travel = reduced ? 0 : FEATURE_TRAVEL * (1 - feature.opacity)
          const cachedWidth = Number(featureLabel.dataset.w ?? 0)
          const offset = radiusPx + 18 + travel
          const labelX = Math.min(
            w - cachedWidth - 8,
            Math.max(8, side === 'right' ? lx + offset : lx - offset - cachedWidth),
          )
          featureLabel.style.transform = `translate(${labelX.toFixed(1)}px, ${(ly - 14).toFixed(1)}px)`
          const anchorX = side === 'right' ? labelX : labelX + cachedWidth
          featurePath.setAttribute(
            'd',
            `M ${lx.toFixed(1)} ${ly.toFixed(1)} L ${anchorX.toFixed(1)} ${(ly - 8).toFixed(1)}`,
          )
          featurePath.style.opacity = String(feature.opacity)
        }
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
  }, [progress])

  return (
    <div ref={layerRef} className="pointer-events-none absolute inset-0" data-testid="callouts">
      <svg ref={svgRef} className="absolute inset-0 h-full w-full" aria-hidden="true">
        {CALLOUTS.map((def, i) => (
          <path
            key={def.partId}
            ref={(el) => {
              pathRefs.current[i] = el
            }}
            stroke="currentColor"
            className="text-(--color-dim)"
            strokeWidth={1}
            fill="none"
          />
        ))}
        <path
          ref={(el) => {
            featurePathRef.current = el
          }}
          stroke="currentColor"
          className="text-(--color-ink)"
          strokeWidth={1}
          fill="none"
        />
      </svg>
      {CALLOUTS.map((def, i) => (
        <div
          key={def.partId}
          ref={(el) => {
            labelRefs.current[i] = el
          }}
          className={LABEL_CHIP}
          data-testid={`callout-${def.partId}`}
        >
          <p className="text-[13px] font-medium leading-tight text-(--color-ink)">{def.title}</p>
          <p className="mt-1 font-mono text-[10.5px] leading-snug text-(--color-dim)">{def.body}</p>
        </div>
      ))}
      <div
        ref={(el) => {
          featureLabelRef.current = el
        }}
        className={LABEL_CHIP}
        data-testid="callout-featured"
      >
        <p className="text-[13px] font-medium leading-tight text-(--color-ink)">Featured part</p>
      </div>
    </div>
  )
}
