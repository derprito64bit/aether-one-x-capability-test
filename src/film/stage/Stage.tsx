import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { MotionValue } from 'motion/react'
import * as THREE from 'three'
import { sampleFilm } from '../sample.ts'
import { computeFilmStates } from '../states.ts'
import { stageColors } from './stageColors.ts'

/**
 * The stage (Prompt D section 7, colour journey in section 8): the device
 * gets a place to be instead of floating in a void. An
 * orientation-independent room (gradient backdrop sphere with a horizon
 * value break, so it survives the film's full orbit), a matte floor, and a
 * soft contact pool. The backdrop repaints from the per-act stage colours
 * every frame from a 64x256 scratch canvas: cheap, continuous, and exactly
 * reversible on scrub.
 *
 * The contact pool is a baked radial-gradient plane, not a depth pass
 * (round 03 Part E): no drei, no per-frame render target. Its scale tracks
 * the device footprint (wider laid flat) and its opacity tracks height
 * above the floor, so grounding stays plausible through every act.
 *
 * Cost notes: one tiny canvas upload per frame, one floor draw, one
 * transparent quad. No real-time reflection yet (measured
 * separately per D 13.6).
 */
export function Stage({ progress }: { progress: MotionValue<number> }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 256
    const texture = new THREE.CanvasTexture(canvas)
    texture.mapping = THREE.EquirectangularReflectionMapping
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [])
  const ctx = useMemo(() => {
    const canvas = texture.image as HTMLCanvasElement
    return canvas.getContext('2d')
  }, [texture])
  const paint = useRef({ base: -1, top: -1 })
  const pool = useRef<THREE.Mesh>(null)
  const poolMat = useRef<THREE.MeshBasicMaterial>(null)
  const floorMat = useRef<THREE.MeshBasicMaterial>(null)
  // Floor tones derive from the act colour (scratch objects: zero allocation
  // per frame). The sweep and the floor share them so no seam can show.
  const tones = useMemo(
    () => ({
      floor: new THREE.Color(),
      deep: new THREE.Color(),
      warmGrey: new THREE.Color('#c2bbad'),
      shadow: new THREE.Color('#a59e90'),
    }),
    [],
  )

  // Radial alpha for the floor disc: opaque under the device, gone at the
  // rim, so the disc edge dissolves into the sweep instead of drawing a bowl.
  const floorAlpha = useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const c = canvas.getContext('2d')
    if (c !== null) {
      const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
      g.addColorStop(0, '#ffffff')
      g.addColorStop(0.45, '#ffffff')
      g.addColorStop(1, '#000000')
      c.fillStyle = g
      c.fillRect(0, 0, size, size)
    }
    return new THREE.CanvasTexture(canvas)
  }, [])
  useEffect(() => () => floorAlpha.dispose(), [floorAlpha])

  const poolTexture = useMemo(() => {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const c = canvas.getContext('2d')
    if (c !== null) {
      const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
      g.addColorStop(0, 'rgba(0,0,0,0.85)')
      g.addColorStop(0.55, 'rgba(0,0,0,0.38)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      c.fillStyle = g
      c.fillRect(0, 0, size, size)
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [])

  useEffect(() => () => texture.dispose(), [texture])
  useEffect(() => () => poolTexture.dispose(), [poolTexture])

  useFrame(() => {
    const p = progress.get()
    // Contact pool follows the device every frame: wider laid flat, fainter
    // aloft. It must run before the colour early-return below, or it
    // freezes while the stage colour rests and depends on scroll history.
    const mesh = pool.current
    const mat = poolMat.current
    if (mesh !== null && mat !== null) {
      const s = sampleFilm(p)
      const st = computeFilmStates(p)
      const heightAboveFloor = s.py + 0.42
      const closeness = Math.min(1, Math.max(0, 1 - heightAboveFloor / 0.9))
      const span = 1.4 * s.scale * (1 + 0.35 * st.layDown)
      mesh.position.set(s.px, -0.415, 0)
      mesh.scale.set(span, span, 1)
      mat.opacity = 0.55 * closeness
      mesh.visible = closeness > 0.01
    }
    if (ctx === null) return
    const { base, top } = stageColors(p)
    // Numeric compare: no strings built on frames where nothing changed.
    const baseHex = base.getHex()
    const topHex = top.getHex()
    const last = paint.current
    if (last.base === baseHex && last.top === topHex) return
    last.base = baseHex
    last.top = topHex
    const baseCss = `#${base.getHexString()}`
    const topCss = `#${top.getHexString()}`
    // Seamless studio sweep (site overhaul): crown -> act colour -> floor
    // tone, no hard horizon. The old value break at the equator plus a
    // brown underside read as a bowl rim behind the device. Depth now
    // comes from the floor falling a few steps darker into the distance.
    tones.floor.copy(base).lerp(tones.warmGrey, 0.32)
    tones.deep.copy(base).lerp(tones.shadow, 0.55)
    const floorCss = `#${tones.floor.getHexString()}`
    // Canvas row 0 is v=1 (flipY), the sphere's crown.
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, topCss)
    g.addColorStop(0.38, baseCss)
    g.addColorStop(0.53, floorCss)
    g.addColorStop(1, `#${tones.deep.getHexString()}`)
    ctx.fillStyle = g
    const fm = floorMat.current
    if (fm !== null) fm.color.copy(tones.floor)
    ctx.fillRect(0, 0, 64, 256)
    texture.needsUpdate = true
  })

  return (
    <group name="stage">
      {/* Room: gradient shell, BackSide so the orbit never leaves it. */}
      <mesh scale={[6, 6, 6]}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      {/* Floor: unlit sweep tone with a radial fade, a backdrop, not a
          subject. Unlit on purpose: a lit disc never matches the unlit
          room, and the mismatch is the seam. Grounding is the contact pool. */}
      <mesh position={[0, -0.42, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-2}>
        <circleGeometry args={[3, 64]} />
        <meshBasicMaterial
          ref={floorMat}
          alphaMap={floorAlpha}
          transparent
          depthWrite={false}
          color="#d4cec2"
        />
      </mesh>
      {/* Contact pool: broad occlusion, the device's weight made visible. */}
      {/* Transparent pass order: floor, then pool, then the (transparent-
          from-birth) device, so neither ground layer can sort over it. */}
      <mesh ref={pool} position={[0, -0.415, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={poolMat}
          map={poolTexture}
          transparent
          depthWrite={false}
          opacity={0.55}
        />
      </mesh>
    </group>
  )
}
