/**
 * Test-only harness: mounts real R3F device trees headless (stub renderer,
 * frameloop never) so tests measure the actual scene graph the app
 * renders, not a hand-copied mirror of it. Never imported by app code.
 */
import { createRoot, extend, useThree } from '@react-three/fiber'
import { act, createElement, type ReactNode } from 'react'
import * as THREE from 'three'

/** Canvas 2D stand-in: every call is a no-op so texture builders run. */
function stubContext2D(canvas: HTMLCanvasElement): unknown {
  return new Proxy(
    {},
    {
      get: (_target, key) => {
        if (key === 'canvas') return canvas
        if (key === 'measureText') return () => ({ width: 10 })
        if (key === 'getImageData' || key === 'createImageData') {
          return (_x: number, _y: number, w = 1, h = 1) => ({
            data: new Uint8ClampedArray(Math.max(1, w * h * 4)),
            width: w,
            height: h,
          })
        }
        if (typeof key === 'string' && key.startsWith('create')) {
          return () => ({ addColorStop: () => {} })
        }
        return () => {}
      },
      set: () => true,
    },
  )
}

function stubRenderer(): THREE.WebGLRenderer {
  const noop = (): void => {}
  return {
    render: noop,
    setSize: noop,
    setPixelRatio: noop,
    getPixelRatio: () => 1,
    setAnimationLoop: noop,
    dispose: noop,
    domElement: document.createElement('canvas'),
    shadowMap: { enabled: false, type: 0 },
    xr: {
      addEventListener: noop,
      removeEventListener: noop,
      isPresenting: false,
      enabled: false,
      setAnimationLoop: noop,
    },
    capabilities: {},
    info: {},
  } as unknown as THREE.WebGLRenderer
}

/** Mounts `node` in a headless R3F root and returns its scene. */
export async function mountScene(node: ReactNode): Promise<{
  scene: THREE.Scene
  unmount: () => Promise<void>
}> {
  const g = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  g.IS_REACT_ACT_ENVIRONMENT = true
  const proto = HTMLCanvasElement.prototype as unknown as {
    getContext: (this: HTMLCanvasElement, kind: string) => unknown
  }
  proto.getContext = function getContext(this: HTMLCanvasElement, kind: string) {
    return kind === '2d' ? stubContext2D(this) : null
  }
  // <Canvas> registers the THREE catalogue; a bare root must do it itself.
  extend(THREE as unknown as Parameters<typeof extend>[0])
  let scene: THREE.Scene | null = null
  const capture = (s: THREE.Scene): void => {
    scene = s
  }
  function Grab({ onScene }: { onScene: (s: THREE.Scene) => void }): null {
    onScene(useThree((state) => state.scene))
    return null
  }
  const root = createRoot(document.createElement('canvas'))
  await root.configure({
    gl: stubRenderer(),
    frameloop: 'never',
    size: { width: 100, height: 100, top: 0, left: 0 },
  })
  await act(async () => {
    root.render(createElement('group', null, createElement(Grab, { onScene: capture }), node))
  })
  if (scene === null) throw new Error('scene did not mount')
  const mounted = scene as THREE.Scene
  mounted.updateMatrixWorld(true)
  return {
    scene: mounted,
    unmount: async () => {
      await act(async () => {
        root.unmount()
      })
    },
  }
}

export interface MeshBox {
  mesh: THREE.Mesh
  material: string
  box: THREE.Box3
}

/**
 * World-space bounds for every visible mesh under `root`, instanced meshes
 * expanded per instance (one box per instance).
 */
export function meshBoxes(root: THREE.Object3D): MeshBox[] {
  root.updateMatrixWorld(true)
  const out: MeshBox[] = []
  const m = new THREE.Matrix4()
  const im = new THREE.Matrix4()
  const v = new THREE.Vector3()
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    let visible = true
    for (let o: THREE.Object3D | null = mesh; o !== null; o = o.parent) {
      if (!o.visible) visible = false
    }
    if (!visible) return
    const material = Array.isArray(mesh.material)
      ? mesh.material.map((x) => x.name).join('|')
      : mesh.material.name
    const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute | undefined
    if (pos === undefined) return
    const inst = mesh as THREE.InstancedMesh
    const count = inst.isInstancedMesh ? inst.count : 1
    for (let k = 0; k < count; k++) {
      m.copy(mesh.matrixWorld)
      if (inst.isInstancedMesh) {
        inst.getMatrixAt(k, im)
        m.multiply(im)
      }
      // Exact vertex bounds: a transformed local AABB overstates turned parts.
      const box = new THREE.Box3()
      for (let i = 0; i < pos.count; i++)
        box.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(m))
      out.push({ mesh, material, box })
    }
  })
  return out
}

/** Calls `fn` with every world-space vertex of `mesh`, per instance. */
export function forEachWorldVertex(mesh: THREE.Mesh, fn: (v: THREE.Vector3) => void): void {
  const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute | undefined
  if (pos === undefined) return
  const m = new THREE.Matrix4()
  const im = new THREE.Matrix4()
  const v = new THREE.Vector3()
  const inst = mesh as THREE.InstancedMesh
  const count = inst.isInstancedMesh ? inst.count : 1
  for (let k = 0; k < count; k++) {
    m.copy(mesh.matrixWorld)
    if (inst.isInstancedMesh) {
      inst.getMatrixAt(k, im)
      m.multiply(im)
    }
    for (let i = 0; i < pos.count; i++) fn(v.fromBufferAttribute(pos, i).applyMatrix4(m))
  }
}
