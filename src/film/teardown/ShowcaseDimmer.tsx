import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import type * as THREE from 'three'
import type { FilmRefs } from '../FilmDirector.tsx'
import { PART_LAYER } from './layers.ts'
import { LayerDimmer, type DimRoot } from './dimmer.ts'

/** Alpha slot for the shield lids (they fade as the stack opens). */
export const LID_SLOT = 10

/** Rescan cadence (frames) for meshes mounted after the first bind. */
const RESCAN = 30
/** Root pool: 4 shell groups plus every registered part (~45). */
const POOL = 96

/**
 * Mounts the per-layer dimmer over the film device: shell groups (the
 * camera bump nests in the rear panel group and dims with it) and every
 * registered internals part. Runs at priority 0, after the director (-1)
 * and Internals (-0.5) have written this frame's material state. The
 * rescan reuses a pooled root list: no per-frame allocation.
 */
export function ShowcaseDimmer({ refs }: { refs: FilmRefs }) {
  const dimmer = useMemo(() => new LayerDimmer(), [])
  // Root collection is built once: the rescan reuses the pooled list and
  // these closures, so the frame loop allocates nothing.
  const scan = useMemo(() => {
    const s = {
      roots: Array.from({ length: POOL }, (): DimRoot => ({
        object: null as unknown as THREE.Object3D,
        slot: 0,
      })),
      count: 0,
      tick: 0,
    }
    const push = (object: THREE.Object3D | null, slot: number): void => {
      if (object === null || s.count >= POOL) return
      const r = s.roots[s.count++] as DimRoot
      r.object = object
      r.slot = slot
    }
    // Registered part groups sit at most three levels under the root.
    const visit = (o: THREE.Object3D, depth: number): void => {
      const id = o.userData.partId as unknown
      if (typeof id === 'string') {
        push(o, id === 'shield-lid' ? LID_SLOT : (PART_LAYER[id] ?? 5))
        return
      }
      if (depth > 4) return
      for (let i = 0; i < o.children.length; i++) visit(o.children[i] as THREE.Object3D, depth + 1)
    }
    const collect = (): void => {
      s.count = 0
      push(refs.glass.current, 0)
      push(refs.display.current, 1)
      push(refs.frame.current, 2)
      push(refs.back.current, 9)
      const internals = refs.internals.current
      if (internals !== null) visit(internals, 0)
    }
    return { s, collect }
  }, [refs])
  useEffect(() => () => dimmer.dispose(), [dimmer])

  useFrame(() => {
    const s = scan.s
    if (s.tick % RESCAN === 0) {
      scan.collect()
      dimmer.bind(s.roots, s.count)
    }
    s.tick += 1
    dimmer.sync(refs.internalsControl.current.layerAlpha)
  })
  return null
}
