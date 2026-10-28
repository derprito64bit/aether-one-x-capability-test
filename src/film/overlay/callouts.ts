import * as THREE from 'three'

/**
 * Teardown showcase callouts. Labels live in HTML, anchored to world
 * points the 3D side publishes and projected per frame; leader lines draw
 * in one SVG layer. Text never renders in WebGL.
 *
 * Shared bridge: written inside the Canvas, read by the HTML overlay.
 */
export const calloutBridge: { camera: THREE.Camera | null } = { camera: null }

/**
 * The director's damped teardown cursor (the one the layers move on) and
 * when it last wrote it (ms). Mutated in place, never replaced.
 */
export const cursorBridge: { cursor: number; stamp: number } = {
  cursor: 0,
  stamp: Number.NEGATIVE_INFINITY,
}

/** One showcase anchor: a named point on the 3D model, in world space. */
export interface ShowcaseAnchor {
  /** Copy key, e.g. 'battery.bms' (see TEARDOWN_COPY callouts) or a layer id. */
  key: string
  x: number
  y: number
  z: number
  /** False when the point is not presentable (hidden, behind, not built). */
  on: boolean
}

/**
 * Fallback slots (viewport fractions) for when the overlay has not measured
 * yet, e.g. in unit tests: right of a 1440px-wide copy column between two
 * label columns, or the top half of a phone above its copy card.
 */
export const DEFAULT_SLOT_LANDSCAPE = { x0: 0.48, x1: 0.74, y0: 0.1, y1: 0.88 }
export const DEFAULT_SLOT_PORTRAIT = { x0: 0.06, x1: 0.94, y0: 0.09, y1: 0.5 }

/** Pre-allocated slots: the 3D side writes in place every frame, never allocates. */
export const SHOWCASE_PART_SLOTS = 8

const anchorSlot = (): ShowcaseAnchor => ({ key: '', x: 0, y: 0, z: 0, on: false })

/**
 * Teardown showcase bridge (one part at a time). Written every frame by the
 * 3D side (FilmDirector / Internals), read by the overlay (Callouts,
 * FilmOverlay) through calloutBridge.camera:
 * - `layer`: the layer being presented (0..9, physical stack order), or -1.
 * - `focus`: 0..1, how fully that layer is presented; 1 while it holds at
 *   its hero pose beside the open stack. Copy and callouts key off this so
 *   they agree with the 3D exactly (it follows the damped cursor).
 * - `overview`: 0..1, the open-sandwich hold where every layer is labelled.
 * - `parts`: the presented layer's sub-component anchors, keyed by the
 *   callout keys in TEARDOWN_COPY.
 * - `layers`: one anchor per layer (key = layer id) for the overview labels.
 * - `bounds`: world AABB of the presented layer at its current pose, so
 *   the label columns clear the part instead of covering it.
 * - `slot` (written by the overlay, read by the 3D side): the free
 *   rectangle the presented part must fit inside, as viewport fractions
 *   (x left to right, y top to bottom), clear of the copy, the label
 *   columns and the act rail. Changes on resize only, so framing stays a
 *   pure function of progress and layout. `set` is false until measured.
 */
export const showcaseBridge: {
  layer: number
  focus: number
  overview: number
  parts: ShowcaseAnchor[]
  layers: ShowcaseAnchor[]
  slot: { x0: number; x1: number; y0: number; y1: number; set: boolean }
  bounds: {
    minX: number
    minY: number
    minZ: number
    maxX: number
    maxY: number
    maxZ: number
    on: boolean
  }
  /** performance.now() of the last write; stale (>250 ms) means not running. */
  stamp: number
} = {
  layer: -1,
  focus: 0,
  overview: 0,
  parts: Array.from({ length: SHOWCASE_PART_SLOTS }, anchorSlot),
  layers: Array.from({ length: 10 }, anchorSlot),
  slot: { ...DEFAULT_SLOT_LANDSCAPE, set: false },
  bounds: { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0, on: false },
  stamp: 0,
}

/**
 * The teardown cursor the overlay labels by: the director's damped cursor
 * while the film canvas is running, else the raw progress cursor (static
 * fallback, canvas not yet mounted). Copy, callouts and motion then agree.
 */
export function overlayCursor(rawCursor: number, nowMs: number): number {
  return nowMs - cursorBridge.stamp < 250 ? cursorBridge.cursor : rawCursor
}

/** One label in a callout column: its top edge and height, in pixels. */
export interface ColumnLabel {
  y: number
  h: number
}

/**
 * Stacks one column of labels without overlap. Each label keeps its own
 * height (its anchor's) where it can; overlaps push down by `gap`, and a
 * run that overflows `max` is pushed back up from the bottom. Sorts and
 * writes `y` in place. Pure, tested in callouts.test.ts.
 */
export function resolveColumn(labels: ColumnLabel[], min: number, max: number, gap: number): void {
  labels.sort((a, b) => a.y - b.y)
  let floor = min
  for (const label of labels) {
    label.y = Math.max(label.y, floor)
    floor = label.y + label.h + gap
  }
  let ceiling = max
  for (let i = labels.length - 1; i >= 0; i--) {
    const label = labels[i]
    if (label === undefined) continue
    if (label.y + label.h > ceiling) label.y = Math.max(min, ceiling - label.h)
    ceiling = label.y - gap
  }
}

/**
 * Callout stagger: the k-th label of a held layer arrives a beat after
 * the one before it, then all leave with the part. `d` is the layer
 * cursor fraction (0..1), `focus` the bridge's presentation strength.
 */
export function calloutReveal(d: number, k: number, focus: number): number {
  const start = 0.24 + 0.07 * k
  return focus * Math.min(1, Math.max(0, (d - start) / 0.08))
}
