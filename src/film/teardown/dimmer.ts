import type * as THREE from 'three'

/** A material that may carry the standard PBR fields the film animates. */
type Animated = THREE.Material & {
  color?: THREE.Color
  emissive?: THREE.Color
  emissiveIntensity?: number
  emissiveMap?: THREE.Texture | null
  map?: THREE.Texture | null
  roughness?: number
  metalness?: number
  envMapIntensity?: number
  clearcoat?: number
  anisotropy?: number
}

interface Pair {
  src: Animated
  dst: Animated
  slot: number
}

interface Bound {
  mesh: THREE.Mesh
  /** What the dimmer assigned; anything else means a re-render reset it. */
  assigned: THREE.Material | THREE.Material[]
  original: THREE.Material | THREE.Material[]
  slot: number
}

/** A subtree whose meshes dim together, and the alpha slot it reads. */
export interface DimRoot {
  object: THREE.Object3D
  slot: number
}

/**
 * Per-layer opacity for the teardown showcase (round 05): every layer but
 * the presented one dims to ~0.15. Layers share materials by name (the
 * internals' `dark` is on the board, the cell wrap, the coil leads...), so
 * one opacity per material cannot dim one layer alone. The dimmer gives
 * each (layer, material) pair its own clone, swaps it onto that layer's
 * meshes, and every frame copies the animated fields from the source
 * (written by the director, Internals, and PhoneModel as before) times
 * the layer's alpha. Clones share the source's shader program (same type
 * and parameters) and are transparent from birth like their sources, so
 * nothing recompiles mid-film. Dimmed clones stop writing depth so the
 * stack never hides the presented part. Zero allocation per frame.
 */
export class LayerDimmer {
  private readonly clones = new Map<THREE.Material, THREE.Material[]>()
  private readonly pairs: Pair[] = []
  private readonly bound: Bound[] = []
  private readonly seen = new WeakSet<THREE.Mesh>()

  private readonly tops = new Set<THREE.Object3D>()

  /**
   * Binds every not-yet-bound mesh under the roots (a nested root keeps its
   * own subtree). Allocates only for meshes it has not seen, so the film
   * can rescan on a cadence for late mounts.
   */
  bind(roots: readonly DimRoot[], count = roots.length): void {
    this.tops.clear()
    for (let i = 0; i < count; i++) this.tops.add((roots[i] as DimRoot).object)
    for (let i = 0; i < count; i++) {
      const root = roots[i] as DimRoot
      this.walk(root.object, root.object, root.slot)
    }
  }

  private walk(o: THREE.Object3D, top: THREE.Object3D, slot: number): void {
    if (o !== top && this.tops.has(o)) return
    const mesh = o as THREE.Mesh
    if (mesh.isMesh === true && !this.seen.has(mesh)) this.bindMesh(mesh, slot)
    const kids = o.children
    for (let i = 0; i < kids.length; i++) this.walk(kids[i] as THREE.Object3D, top, slot)
  }

  private cloneFor(src: THREE.Material, slot: number): THREE.Material {
    let perSlot = this.clones.get(src)
    if (perSlot === undefined) {
      perSlot = []
      this.clones.set(src, perSlot)
    }
    const existing = perSlot[slot]
    if (existing !== undefined) return existing
    const dst = src.clone()
    dst.name = `${src.name}#L${slot}`
    perSlot[slot] = dst
    this.pairs.push({ src: src as Animated, dst: dst as Animated, slot })
    return dst
  }

  private assign(mesh: THREE.Mesh, slot: number): THREE.Material | THREE.Material[] {
    const m = mesh.material
    const next = Array.isArray(m) ? m.map((x) => this.cloneFor(x, slot)) : this.cloneFor(m, slot)
    mesh.material = next
    return next
  }

  private bindMesh(mesh: THREE.Mesh, slot: number): void {
    this.seen.add(mesh)
    const original = mesh.material
    const assigned = this.assign(mesh, slot)
    this.bound.push({ mesh, assigned, original, slot })
  }

  /** Copies source state onto every clone, scaled by its slot's alpha. */
  sync(alpha: ArrayLike<number>): void {
    for (let i = 0; i < this.bound.length; i++) {
      const b = this.bound[i] as Bound
      if (b.mesh.material !== b.assigned) {
        // A re-render reassigned the source material: dim it again.
        b.original = b.mesh.material
        b.assigned = this.assign(b.mesh, b.slot)
      }
    }
    for (let i = 0; i < this.pairs.length; i++) {
      const { src, dst, slot } = this.pairs[i] as Pair
      const a = alpha[slot] ?? 1
      dst.visible = src.visible
      dst.opacity = src.opacity * a
      dst.depthWrite = a < 0.999 ? false : src.depthWrite
      if (src.color !== undefined) dst.color?.copy(src.color)
      if (src.emissive !== undefined) dst.emissive?.copy(src.emissive)
      if (src.emissiveIntensity !== undefined) dst.emissiveIntensity = src.emissiveIntensity
      if (src.roughness !== undefined) dst.roughness = src.roughness
      if (src.metalness !== undefined) dst.metalness = src.metalness
      if (src.envMapIntensity !== undefined) dst.envMapIntensity = src.envMapIntensity
      if (src.clearcoat !== undefined) dst.clearcoat = src.clearcoat
      if (src.anisotropy !== undefined) dst.anisotropy = src.anisotropy
      if (dst.emissiveMap !== src.emissiveMap || dst.map !== src.map) {
        dst.emissiveMap = src.emissiveMap ?? null
        dst.map = src.map ?? null
        dst.needsUpdate = true
      }
    }
  }

  /** Restores the source materials and disposes every clone. */
  dispose(): void {
    for (const b of this.bound) {
      if (b.mesh.material === b.assigned) b.mesh.material = b.original
    }
    for (const p of this.pairs) p.dst.dispose()
    this.bound.length = 0
    this.pairs.length = 0
    this.clones.clear()
  }
}
