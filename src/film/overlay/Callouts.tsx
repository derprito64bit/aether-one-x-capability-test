import { useEffect, useRef } from 'react'
import type { MotionValue } from 'motion/react'
import * as THREE from 'three'
import { runScramble } from '../../lib/scramble.ts'
import { TEARDOWN_COPY } from '../chapters.ts'
import { cursorAt } from '../teardown/layers.ts'
import {
  BRIDGE_STALE_MS,
  calloutBridge,
  calloutReveal,
  overlayCursor,
  resolveColumn,
  showcaseBridge,
  type ColumnLabel,
  type ShowcaseAnchor,
} from './callouts.ts'

/** Every callout of every layer, flattened once; labels render statically. */
const ITEMS = TEARDOWN_COPY.flatMap((copy, layer) =>
  copy.callouts.map((callout, k) => ({ ...callout, layer, k })),
)
const BY_LAYER: number[][] = TEARDOWN_COPY.map((_, layer) =>
  ITEMS.flatMap((item, i) => (item.layer === layer ? [i] : [])),
)

/**
 * Leader end height inside a label: the middle of its title line, below
 * the 2px top padding of the label's backdrop.
 */
const TITLE_MID = 11
/** Title middle inside an over-the-part chip (its 4px top padding). */
const CHIP_MID = 13
const OVERVIEW_MID = 7
/** Clearance between the part's projected box and a label column. */
const CLEAR = 28

interface Placed extends ColumnLabel {
  i: number
  ax: number
  ay: number
  side: 'left' | 'right'
  reveal: number
}

/**
 * Teardown showcase callouts (one part at a time). While a layer holds
 * alone at its hero pose, its sub-components are named in two label
 * columns either side of it: each label staggers in after the one before,
 * its leader draws out from a hotspot on the part, and all of them leave
 * with the part. During the open-sandwich overview every layer is named
 * instead. Anchors come from showcaseBridge (the 3D side writes them every
 * frame); zero React state per frame, transforms written straight to the
 * DOM.
 */
export function Callouts({ progress }: { progress: MotionValue<number> }) {
  const layerRef = useRef<HTMLDivElement>(null)
  const labelRefs = useRef<Array<HTMLDivElement | null>>([])
  const leaderRefs = useRef<Array<SVGPathElement | null>>([])
  const dotRefs = useRef<Array<SVGGElement | null>>([])
  const overviewRefs = useRef<Array<HTMLDivElement | null>>([])
  const overviewLeaderRefs = useRef<Array<SVGPathElement | null>>([])

  useEffect(() => {
    let raf = 0
    let frame = 0
    const v = new THREE.Vector3()
    const box = { x0: 0, x1: 0, y0: 0, y1: 0 }
    const rect = { w: 0, h: 0, safeLeft: 0, safeRight: 0 }
    const sizes = ITEMS.map(() => ({ w: 0, h: 0 }))
    const overviewSizes = TEARDOWN_COPY.map(() => ({ w: 0, h: 0, num: 0 }))
    const overviewMax = { full: 0, num: 0 }
    let overviewMode: 'full' | 'num' | '' = ''
    const placed: Placed[] = ITEMS.map((_, i) => ({
      i,
      y: 0,
      h: 0,
      ax: 0,
      ay: 0,
      side: 'right',
      reveal: 0,
    }))
    const left: Placed[] = []
    const right: Placed[] = []
    const columns = [left, right]
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const partAnchor = (key: string): ShowcaseAnchor | null => {
      const parts = showcaseBridge.parts
      for (let k = 0; k < parts.length; k++) {
        const a = parts[k] as ShowcaseAnchor
        if (a.on && a.key === key) return a
      }
      return null
    }
    const overviewPlaced: Placed[] = TEARDOWN_COPY.map((_, i) => ({
      i,
      y: 0,
      h: 0,
      ax: 0,
      ay: 0,
      side: 'left',
      reveal: 0,
    }))
    const overviewColumn: Placed[] = []
    let lastLayer = -1
    // Labels decode as they arrive: once per appearance, re-armed when gone.
    const decoded = new WeakSet<HTMLElement>()
    const decode = (label: HTMLElement, reveal: number): void => {
      if (reveal > 0.05 && !decoded.has(label)) {
        decoded.add(label)
        runScramble(label, 520)
      } else if (reveal <= 0.01) decoded.delete(label)
    }
    let overviewShown = false
    // 'aside': label columns either side of the part, title and detail.
    // 'over': compact title chips over the part, beside each hotspot, for
    // frames too narrow to give the part a real slot between two columns.
    let labelMode: 'aside' | 'over' = 'aside'

    const measure = (): void => {
      const el = layerRef.current?.parentElement
      if (el === null || el === undefined) return
      const root = layerRef.current
      if (root === null) return
      const host = el.getBoundingClientRect()
      const w = host.width
      const h = host.height
      rect.w = w
      rect.h = h
      // The copy column owns the left of the frame on desktop; labels stop
      // short of it. The act rail owns the far right. Layout boxes, not
      // client rects: the chapter's entrance transform must not leak in.
      const chapter = el.querySelector<HTMLElement>('[data-testid="film-chapter"]')
      const desktop = w >= 768
      rect.safeLeft =
        desktop && chapter !== null ? chapter.offsetLeft + chapter.offsetWidth + 28 : 12
      rect.safeRight = desktop ? w - 140 : w - 12
      const labelW = Math.round(Math.min(208, Math.max(160, w * 0.135)))
      const asideRoom = rect.safeRight - rect.safeLeft - 2 * (labelW + CLEAR)
      labelMode = desktop && asideRoom >= Math.max(300, w * 0.24) ? 'aside' : 'over'
      root.dataset.labels = labelMode
      root.style.setProperty('--label-w', `${labelW}px`)
      // Publish the free rectangle the presented part must fit inside; the
      // 3D side frames it there (resize only, so framing stays pure).
      const slot = showcaseBridge.slot
      if (labelMode === 'aside') {
        slot.x0 = (rect.safeLeft + labelW + CLEAR) / w
        slot.x1 = (rect.safeRight - labelW - CLEAR) / w
      } else {
        slot.x0 = desktop ? (rect.safeLeft + 16) / w : 0.05
        slot.x1 = desktop ? (rect.safeRight - 16) / w : 0.95
      }
      slot.y0 = (desktop ? 96 : 76) / h
      slot.y1 = desktop || chapter === null ? (h - 104) / h : (chapter.offsetTop - 12) / h
      slot.set = true
      // Copy is static, so sizes are measured on resize only (never per
      // frame: layout thrash in an overlay loop), after the mode is set.
      labelRefs.current.forEach((label, i) => {
        const size = sizes[i]
        if (label !== null && label !== undefined && size !== undefined) {
          size.w = label.offsetWidth
          size.h = label.offsetHeight
        }
      })
      // Overview labels measure at full width (names shown), whatever
      // mode is live, then the mode is restored.
      const live = el.dataset.overview
      el.dataset.overview = 'full'
      overviewMax.full = 0
      overviewMax.num = 0
      overviewRefs.current.forEach((label, i) => {
        const size = overviewSizes[i]
        if (label !== null && label !== undefined && size !== undefined) {
          size.w = label.offsetWidth
          size.h = label.offsetHeight
          size.num = (label.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0
          overviewMax.full = Math.max(overviewMax.full, size.w)
          overviewMax.num = Math.max(overviewMax.num, size.num)
        }
      })
      // Phones never have room for names beside the sandwich: numbered
      // markers there, with the numbered legend in the intro card.
      overviewMode = desktop ? (live === 'num' ? 'num' : 'full') : 'num'
      el.dataset.overview = overviewMode
    }
    measure()
    void document.fonts?.ready.then(measure)
    window.addEventListener('resize', measure)

    const hideItem = (i: number): void => {
      const label = labelRefs.current[i]
      if (label !== null && label !== undefined) {
        decoded.delete(label)
        label.style.opacity = '0'
        label.style.visibility = 'hidden'
      }
      leaderRefs.current[i]?.setAttribute('d', '')
      const dot = dotRefs.current[i]
      if (dot !== null && dot !== undefined) dot.style.opacity = '0'
    }
    const hideOverview = (): void => {
      if (!overviewShown) return
      overviewShown = false
      overviewRefs.current.forEach((label) => {
        if (label === null) return
        label.style.opacity = '0'
        label.style.visibility = 'hidden'
      })
      overviewLeaderRefs.current.forEach((path) => path?.setAttribute('d', ''))
    }
    const hideLayer = (layer: number): void => {
      for (const i of BY_LAYER[layer] ?? []) hideItem(i)
    }
    const project = (camera: THREE.Camera, x: number, y: number, z: number): boolean => {
      v.set(x, y, z).project(camera)
      return v.z <= 1 && v.z >= -1
    }

    const tick = (): void => {
      raf = requestAnimationFrame(tick)
      frame += 1
      // Re-measure the copy column once things have settled after mount.
      if (frame === 45) measure()
      const camera = calloutBridge.camera
      const now = performance.now()
      const live =
        showcaseBridge.stamp > 0 &&
        now - showcaseBridge.stamp < BRIDGE_STALE_MS &&
        camera !== null &&
        rect.w > 0
      const layer = live ? showcaseBridge.layer : -1
      if (layer !== lastLayer) {
        if (lastLayer >= 0) hideLayer(lastLayer)
        lastLayer = layer
      }
      if (!live || camera === null) {
        hideOverview()
        return
      }
      const reduced = reducedQuery.matches
      const desktop = rect.w >= 768
      const top = 84
      const bottom = desktop ? rect.h - 112 : rect.h * 0.56

      // --- One layer presented: its sub-components, two columns. ---
      const copy = TEARDOWN_COPY[layer]
      if (copy !== undefined && showcaseBridge.focus > 0.001) {
        const d = overlayCursor(cursorAt(progress.get()), now) - layer
        // Projected box of the presented part; labels clear it.
        const b = showcaseBridge.bounds
        box.x0 = Number.POSITIVE_INFINITY
        box.x1 = Number.NEGATIVE_INFINITY
        box.y0 = Number.POSITIVE_INFINITY
        box.y1 = Number.NEGATIVE_INFINITY
        if (b.on) {
          for (let corner = 0; corner < 8; corner++) {
            if (
              !project(
                camera,
                corner & 1 ? b.maxX : b.minX,
                corner & 2 ? b.maxY : b.minY,
                corner & 4 ? b.maxZ : b.minZ,
              )
            )
              continue
            const sx = ((v.x + 1) / 2) * rect.w
            const sy = ((1 - v.y) / 2) * rect.h
            box.x0 = Math.min(box.x0, sx)
            box.x1 = Math.max(box.x1, sx)
            box.y0 = Math.min(box.y0, sy)
            box.y1 = Math.max(box.y1, sy)
          }
        }
        left.length = 0
        right.length = 0
        let sumX = 0
        let count = 0
        for (const i of BY_LAYER[layer] ?? []) {
          const item = ITEMS[i]
          const slot = placed[i]
          if (item === undefined || slot === undefined) continue
          slot.reveal = 0
          const anchor = partAnchor(item.key)
          if (anchor === null || !project(camera, anchor.x, anchor.y, anchor.z)) continue
          slot.ax = ((v.x + 1) / 2) * rect.w
          slot.ay = ((1 - v.y) / 2) * rect.h
          if (slot.ax < 0 || slot.ax > rect.w || slot.ay < 0 || slot.ay > rect.h) continue
          slot.reveal = reduced
            ? Math.min(1, showcaseBridge.focus * 1.5)
            : calloutReveal(d, item.k, showcaseBridge.focus)
          sumX += slot.ax
          count += 1
        }
        // No box from the 3D side: fall back to the anchors' own spread.
        if (box.x1 < box.x0) {
          for (const i of BY_LAYER[layer] ?? []) {
            const slot = placed[i]
            if (slot === undefined || slot.reveal <= 0) continue
            box.x0 = Math.min(box.x0, slot.ax - 40)
            box.x1 = Math.max(box.x1, slot.ax + 40)
          }
        }
        const centre = count > 0 ? sumX / count : rect.w / 2
        const over = labelMode === 'over'
        const mid = over ? CHIP_MID : TITLE_MID
        for (const i of BY_LAYER[layer] ?? []) {
          const slot = placed[i]
          const size = sizes[i]
          if (slot === undefined || size === undefined) continue
          if (slot.reveal <= 0.001) {
            hideItem(i)
            continue
          }
          slot.h = size.h
          slot.y = slot.ay - mid
          // Each label takes its anchor's side of the part, unless that
          // column would run into the copy (left) or the rail (right).
          const fitsLeft = (over ? slot.ax - 18 : box.x0 - CLEAR) - size.w >= rect.safeLeft
          const fitsRight = (over ? slot.ax + 18 : box.x1 + CLEAR) + size.w <= rect.safeRight
          let side: 'left' | 'right' = slot.ax < centre ? 'left' : 'right'
          if (side === 'left' && !fitsLeft && fitsRight) side = 'right'
          if (side === 'right' && !fitsRight && fitsLeft) side = 'left'
          slot.side = side
          ;(side === 'left' ? left : right).push(slot)
        }
        resolveColumn(left, top, bottom, 12)
        resolveColumn(right, top, bottom, 12)
        for (const column of columns) {
          for (const slot of column) {
            const label = labelRefs.current[slot.i]
            const leader = leaderRefs.current[slot.i]
            const dot = dotRefs.current[slot.i]
            const size = sizes[slot.i]
            if (label === null || label === undefined || size === undefined) continue
            const travel = reduced ? 0 : (1 - slot.reveal) * 10
            const isLeft = slot.side === 'left'
            // Aside: the column edge clears the part. Over: the chip sits
            // just beside its own hotspot, kept inside the frame.
            const edge = over
              ? isLeft
                ? Math.max(rect.safeLeft + size.w, slot.ax - 18)
                : Math.min(rect.safeRight - size.w, slot.ax + 18)
              : isLeft
                ? Math.max(rect.safeLeft + size.w, box.x0 - CLEAR)
                : Math.min(rect.safeRight - size.w, box.x1 + CLEAR)
            const x = isLeft ? edge - size.w + travel : edge - travel
            label.style.visibility = 'visible'
            label.style.opacity = String(slot.reveal)
            decode(label, slot.reveal)
            label.style.transform = `translate(${x.toFixed(1)}px, ${slot.y.toFixed(1)}px)`
            label.dataset.side = slot.side
            const ly = slot.y + mid
            const end = isLeft ? edge + 6 : edge - 6
            const elbow = isLeft ? edge + 20 : edge - 20
            if (leader !== null && leader !== undefined) {
              leader.setAttribute(
                'd',
                `M ${slot.ax.toFixed(1)} ${slot.ay.toFixed(1)} L ${elbow.toFixed(1)} ${ly.toFixed(1)} L ${end.toFixed(1)} ${ly.toFixed(1)}`,
              )
              // The leader draws out from the hotspot toward its label.
              leader.style.strokeDashoffset = reduced ? '0' : String(1 - slot.reveal)
              leader.style.opacity = String(Math.min(1, slot.reveal * 1.4))
            }
            if (dot !== null && dot !== undefined) {
              dot.style.opacity = String(Math.min(1, slot.reveal * 2))
              dot.setAttribute(
                'transform',
                `translate(${slot.ax.toFixed(1)} ${slot.ay.toFixed(1)}) scale(${(0.6 + 0.4 * Math.min(1, slot.reveal * 2)).toFixed(3)})`,
              )
            }
          }
        }
      } else if (layer >= 0) {
        hideLayer(layer)
      }

      // --- Open-sandwich overview: every layer named down one column. ---
      const overview = showcaseBridge.overview
      if (overview <= 0.001) {
        hideOverview()
        return
      }
      overviewShown = true
      overviewColumn.length = 0
      let minX = Number.POSITIVE_INFINITY
      for (let i = 0; i < TEARDOWN_COPY.length; i++) {
        const anchor = showcaseBridge.layers[i]
        const slot = overviewPlaced[i]
        const size = overviewSizes[i]
        if (anchor === undefined || slot === undefined || size === undefined) continue
        slot.reveal = 0
        if (!anchor.on || !project(camera, anchor.x, anchor.y, anchor.z)) continue
        slot.ax = ((v.x + 1) / 2) * rect.w
        slot.ay = ((1 - v.y) / 2) * rect.h
        slot.reveal = reduced ? overview : Math.min(1, Math.max(0, (overview - i * 0.05) / 0.5))
        slot.h = size.h
        slot.y = slot.ay - OVERVIEW_MID
        minX = Math.min(minX, slot.ax)
        overviewColumn.push(slot)
      }
      resolveColumn(overviewColumn, top, bottom, 4)
      // Names beside the layers when the column clears the copy, else
      // numbered markers keyed to the legend in the intro card.
      if (desktop) {
        // 16px of hysteresis: no flicker while the sandwich is still opening.
        const room = minX - CLEAR - 8 - overviewMax.full - rect.safeLeft
        const mode = room >= (overviewMode === 'full' ? 0 : 16) ? 'full' : 'num'
        const host = layerRef.current?.parentElement
        if (mode !== overviewMode && host !== null && host !== undefined) {
          overviewMode = mode
          host.dataset.overview = mode
        }
      }
      const full = overviewMode === 'full'
      const edge = Math.max(
        rect.safeLeft + (full ? overviewMax.full : overviewMax.num),
        minX - CLEAR - 8,
      )
      for (let i = 0; i < TEARDOWN_COPY.length; i++) {
        const label = overviewRefs.current[i]
        const leader = overviewLeaderRefs.current[i]
        const slot = overviewPlaced[i]
        const size = overviewSizes[i]
        if (label === null || label === undefined || slot === undefined || size === undefined)
          continue
        if (slot.reveal <= 0.001) {
          label.style.opacity = '0'
          label.style.visibility = 'hidden'
          leader?.setAttribute('d', '')
          continue
        }
        const travel = reduced ? 0 : (1 - slot.reveal) * 8
        label.style.visibility = 'visible'
        label.style.opacity = String(slot.reveal)
        decode(label, slot.reveal)
        const width = full ? size.w : size.num
        label.style.transform = `translate(${(edge - width - travel).toFixed(1)}px, ${slot.y.toFixed(1)}px)`
        if (leader !== null && leader !== undefined) {
          const ly = slot.y + OVERVIEW_MID
          leader.setAttribute(
            'd',
            `M ${(edge + 6).toFixed(1)} ${ly.toFixed(1)} L ${(slot.ax - 4).toFixed(1)} ${slot.ay.toFixed(1)}`,
          )
          leader.style.opacity = String(slot.reveal * 0.7)
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
    <div
      ref={layerRef}
      className="group/callouts pointer-events-none absolute inset-0"
      data-testid="callouts"
      data-labels="aside"
    >
      <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        {ITEMS.map((item, i) => (
          <path
            key={item.key}
            ref={(el) => {
              leaderRefs.current[i] = el
            }}
            pathLength={1}
            strokeDasharray="1"
            stroke="currentColor"
            className="text-(--color-ink)/55"
            strokeWidth={1}
            fill="none"
          />
        ))}
        {TEARDOWN_COPY.map((copy, i) => (
          <path
            key={copy.key}
            ref={(el) => {
              overviewLeaderRefs.current[i] = el
            }}
            stroke="currentColor"
            className="text-(--color-ink)/40"
            strokeWidth={1}
            fill="none"
          />
        ))}
        {ITEMS.map((item, i) => (
          <g
            key={item.key}
            ref={(el) => {
              dotRefs.current[i] = el
            }}
            style={{ opacity: 0 }}
          >
            <circle r={9} className="fill-(--color-aether)/15" />
            <circle
              r={4}
              className="fill-(--color-aether) stroke-(--color-raise)"
              strokeWidth={1.5}
            />
          </g>
        ))}
      </svg>
      {ITEMS.map((item, i) => (
        <div
          key={item.key}
          ref={(el) => {
            labelRefs.current[i] = el
          }}
          data-testid={`showcase-callout-${item.key}`}
          className="group absolute top-0 left-0 w-max max-w-(--label-w) rounded-md bg-[rgb(var(--veil-rgb)/0.72)] px-1.5 py-0.5 group-data-[labels=over]/callouts:max-w-[10rem] group-data-[labels=over]/callouts:rounded-lg group-data-[labels=over]/callouts:bg-(--color-raise)/92 group-data-[labels=over]/callouts:px-2 group-data-[labels=over]/callouts:py-1 group-data-[labels=over]/callouts:shadow-[0_0_0_1px_var(--color-border-hairline),0_6px_16px_-8px_rgba(40,30,10,0.35)]"
          style={{
            opacity: 0,
            visibility: 'hidden',
            textShadow: '0 0 6px rgb(var(--veil-rgb)), 0 0 16px rgb(var(--veil-rgb))',
          }}
        >
          <p className="font-mono text-[11.5px] leading-[18px] font-medium tracking-[0.08em] text-(--color-ink) uppercase group-data-[side=left]:text-right group-data-[labels=over]/callouts:text-[10.5px]">
            <span aria-hidden="true" data-scramble-text={item.title}>
              {item.title}
            </span>
            <span className="sr-only">{item.title}</span>
          </p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-(--color-dim) group-data-[side=left]:text-right group-data-[labels=over]/callouts:hidden">
            {item.detail}
          </p>
        </div>
      ))}
      {TEARDOWN_COPY.map((copy, i) => (
        <div
          key={copy.key}
          ref={(el) => {
            overviewRefs.current[i] = el
          }}
          data-testid={`showcase-layer-${copy.key}`}
          className="absolute top-0 left-0 flex w-max items-baseline gap-2 font-mono text-[10px] leading-[14px] tracking-[0.08em] uppercase md:text-[11px]"
          style={{ opacity: 0, visibility: 'hidden', textShadow: '0 0 12px rgb(var(--veil-rgb))' }}
        >
          <span className="text-(--color-faint) group-data-[overview=num]/film:font-medium group-data-[overview=num]/film:text-(--color-ink)">
            {String(i + 1).padStart(2, '0')}
          </span>
          <span
            className="text-(--color-ink) group-data-[overview=num]/film:hidden"
            data-scramble-text={copy.name}
          >
            {copy.name}
          </span>
        </div>
      ))}
    </div>
  )
}
