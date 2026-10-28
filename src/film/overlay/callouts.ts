import * as THREE from 'three'

/**
 * Exploded-diagram callouts (Prompt B section 6). Labels live in HTML,
 * anchored to part world positions and projected per frame; leader lines
 * draw in one SVG layer. Text never renders in WebGL.
 */
export interface CalloutDef {
  /** Matches an explode.ts part id. */
  partId: string
  title: string
  /** Every figure must already exist in src/data (tested). */
  body: string
  /** Lower hides first on collision. */
  priority: number
}

export interface CalloutLayout {
  partId: string
  /** Screen pixels. */
  x: number
  y: number
  /** Label offset side. */
  side: 'left' | 'right'
  visible: boolean
}

/** Shared bridge: written inside the Canvas, read by the HTML overlay. */
export const calloutBridge: {
  camera: THREE.Camera | null
  anchors: Record<string, THREE.Group[]>
  occluders: THREE.Object3D[]
  canvasWidth: number
  canvasHeight: number
} = { camera: null, anchors: {}, occluders: [], canvasWidth: 0, canvasHeight: 0 }

/**
 * Featured-layer anchor: world position published per frame by the
 * Internals driver that positions the part (overnight pointer fix). The
 * shared anchors map reads empty in dev (registration never lands), so
 * the feature pointer does not depend on it — this bridge carries plain
 * coordinates written from the driving closure, which is live by
 * construction. Zero allocation: mutated in place, never replaced.
 */
export const featureAnchorBridge: {
  x: number
  y: number
  z: number
  /** World half-extent of the featured part (largest box half-size). */
  radius: number
  /** World position of the stack centre, so the label can face away from it. */
  sx: number
  sy: number
  sz: number
  partId: string | null
  valid: boolean
  /** The director's damped teardown cursor, and when it last wrote it (ms). */
  cursor: number
  cursorStamp: number
} = {
  x: 0,
  y: 0,
  z: 0,
  radius: 0,
  sx: 0,
  sy: 0,
  sz: 0,
  partId: null,
  valid: false,
  cursor: 0,
  cursorStamp: Number.NEGATIVE_INFINITY,
}

/**
 * The teardown cursor the overlay labels by: the director's damped cursor
 * (the one the layers move on) while the film canvas is running, else the
 * raw progress cursor (static fallback, canvas not yet mounted). Copy,
 * pointer, and motion then agree; on the raw cursor the camera chip faded
 * in before the module moved and the copy changed while it still moved.
 */
export function overlayCursor(rawCursor: number, nowMs: number): number {
  return nowMs - featureAnchorBridge.cursorStamp < 250 ? featureAnchorBridge.cursor : rawCursor
}

const scratch = new THREE.Vector3()

/**
 * Projects anchors to screen pixels with culling: behind camera,
 * off-screen (40px margin), and screen-space collision (lower priority
 * hides). Pure given the inputs; occlusion is resolved by the caller with
 * a throttled raycast. Tested in callouts.test.ts.
 */
export function layoutCallouts(
  defs: CalloutDef[],
  worldPositions: Map<string, THREE.Vector3>,
  camera: THREE.Camera,
  width: number,
  height: number,
): CalloutLayout[] {
  const placed: CalloutLayout[] = []
  const ordered = [...defs].sort((a, b) => a.priority - b.priority)
  for (const def of ordered) {
    const world = worldPositions.get(def.partId)
    if (world === undefined) {
      placed.push({ partId: def.partId, x: 0, y: 0, side: 'right', visible: false })
      continue
    }
    scratch.copy(world).project(camera)
    const behind = scratch.z > 1 || scratch.z < -1
    const x = ((scratch.x + 1) / 2) * width
    const y = ((1 - scratch.y) / 2) * height
    let visible = !behind && x > 40 && x < width - 40 && y > 40 && y < height - 40
    if (visible) {
      for (const other of placed) {
        if (!other.visible) continue
        if (Math.abs(other.x - x) < 96 && Math.abs(other.y - y) < 44) {
          visible = false
          break
        }
      }
    }
    placed.push({ partId: def.partId, x, y, side: x > width / 2 ? 'left' : 'right', visible })
  }
  return placed
}
