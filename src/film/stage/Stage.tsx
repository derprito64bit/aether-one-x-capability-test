import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { MotionValue } from 'motion/react'
import * as THREE from 'three'
import { studioWeight } from '../backdrop/scenes.ts'
import { sampleFilm } from '../sample.ts'
import { computeFilmStates } from '../states.ts'

/** Floor plane height (world). */
const FLOOR_Y = -0.42
/** Spot source height above the subject (world metres). */
const SPOT_RISE = 0.95
/** Spot cone radius where it meets the floor. */
const SPOT_FOOT = 0.2

/** Paints a small canvas once and wraps it as a texture. */
function paintTexture(
  w: number,
  h: number,
  draw: (c: CanvasRenderingContext2D, w: number, h: number) => void,
  colour = true,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const c = canvas.getContext('2d')
  if (c !== null) draw(c, w, h)
  const texture = new THREE.CanvasTexture(canvas)
  // Alpha maps are data, not colour.
  texture.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace
  return texture
}

/** Radial gradient stops, centre outwards. */
function radial(stops: ReadonlyArray<[number, string]>) {
  return (c: CanvasRenderingContext2D, w: number, h: number): void => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) / 2)
    for (const [at, color] of stops) g.addColorStop(at, color)
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
  }
}

const SPOT_VERTEX = /* glsl */ `
uniform float uHeight;
varying vec3 vNormalV;
varying vec3 vViewV;
varying vec3 vWorld;
varying float vH;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mv = viewMatrix * world;
  vViewV = normalize(-mv.xyz);
  vNormalV = normalize(normalMatrix * normal);
  vH = position.y / uHeight + 0.5;
  gl_Position = projectionMatrix * mv;
}
`

const SPOT_FRAGMENT = /* glsl */ `
uniform float uOpacity;
uniform vec3 uColor;
varying vec3 vNormalV;
varying vec3 vViewV;
varying vec3 vWorld;
varying float vH;
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
void main() {
  // Volumetric read: brightest where the view passes through the most of
  // the cone (facing), gone at its silhouette edges.
  float facing = abs(dot(normalize(vNormalV), normalize(vViewV)));
  float core = pow(facing, 2.2);
  // Fade in below the source, out into the floor pool.
  float along = smoothstep(0.0, 0.22, vH) * (1.0 - smoothstep(0.82, 1.0, vH));
  float lift = mix(0.55, 1.0, vH);
  // Static dust: a fine, low-contrast grain fixed in world space (no
  // clock), sub-millimetre so it reads as haze, never as a pattern.
  float dust = 0.93 + 0.14 * hash(floor(vWorld * 1600.0));
  float a = uOpacity * core * along * lift * dust;
  gl_FragColor = vec4(uColor * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

/**
 * The stage, round 07: a dark studio with a spotlight (the owner's "dark
 * room with a spotlight on the phone"). It owns the background only in the
 * studio acts (arrival, teardown, final) and fades by studioWeight where
 * an HTML room takes over.
 *
 * - Room: a near-black gradient shell (#07080b at the edges, #12141a at
 *   eye level), BackSide so the orbit never leaves it, plus a soft lifted
 *   glow billboard behind the subject. No horizon.
 * - Spotlight: a soft volumetric cone from above (additive, facing-ratio
 *   faded at its edges, a static dust speckle), aimed at the subject
 *   wherever it moves, and a bright elliptical light pool on the floor
 *   under it with the dark contact shadow inside it.
 * - Floor: unlit, near-black, radially faded into the dark.
 *
 * Every material is transparent from birth (no recompiles), every texture
 * is painted once at mount and disposed at unmount, and the frame loop
 * only writes transforms and opacities (zero allocation). `target` is the
 * subject's world position, written by the director each frame.
 */
export function Stage({
  progress,
  target,
}: {
  progress: MotionValue<number>
  target: MutableRefObject<THREE.Vector3>
}) {
  const textures = useMemo(
    () => ({
      room: paintTexture(16, 256, (c, w, h) => {
        // Canvas row 0 is the sphere's crown (flipY).
        const g = c.createLinearGradient(0, 0, 0, h)
        g.addColorStop(0, '#07080b')
        g.addColorStop(0.36, '#0c0d12')
        g.addColorStop(0.5, '#12141a')
        g.addColorStop(0.62, '#0c0d11')
        g.addColorStop(1, '#07080b')
        c.fillStyle = g
        c.fillRect(0, 0, w, h)
      }),
      glow: paintTexture(
        128,
        128,
        radial([
          [0, 'rgba(34,38,48,0.85)'],
          [0.45, 'rgba(26,29,37,0.45)'],
          [1, 'rgba(18,20,26,0)'],
        ]),
      ),
      floorAlpha: paintTexture(
        128,
        128,
        radial([
          [0, '#ffffff'],
          [0.4, '#ffffff'],
          [1, '#000000'],
        ]),
        false,
      ),
      pool: paintTexture(
        128,
        128,
        radial([
          [0, 'rgba(255,255,255,1)'],
          [0.35, 'rgba(255,255,255,0.55)'],
          [0.7, 'rgba(255,255,255,0.14)'],
          [1, 'rgba(255,255,255,0)'],
        ]),
      ),
      shadow: paintTexture(
        128,
        128,
        radial([
          [0, 'rgba(0,0,0,0.85)'],
          [0.55, 'rgba(0,0,0,0.38)'],
          [1, 'rgba(0,0,0,0)'],
        ]),
      ),
    }),
    [],
  )
  useEffect(() => () => Object.values(textures).forEach((t) => t.dispose()), [textures])

  const spotMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uOpacity: { value: 0 },
          uColor: { value: new THREE.Color('#dfe7ff') },
          uHeight: { value: 1 },
        },
        vertexShader: SPOT_VERTEX,
        fragmentShader: SPOT_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )
  useEffect(() => () => spotMaterial.dispose(), [spotMaterial])
  // Unit cone, apex up: scaled per frame to reach from the source to the floor.
  const spotGeometry = useMemo(() => new THREE.CylinderGeometry(0.06, 1, 1, 64, 1, true), [])
  useEffect(() => () => spotGeometry.dispose(), [spotGeometry])

  const refs = useRef({
    sweep: null as THREE.Mesh | null,
    sweepMat: null as THREE.MeshBasicMaterial | null,
    glow: null as THREE.Mesh | null,
    glowMat: null as THREE.MeshBasicMaterial | null,
    floor: null as THREE.Mesh | null,
    floorMat: null as THREE.MeshBasicMaterial | null,
    spot: null as THREE.Mesh | null,
    pool: null as THREE.Mesh | null,
    poolMat: null as THREE.MeshBasicMaterial | null,
    shadow: null as THREE.Mesh | null,
    shadowMat: null as THREE.MeshBasicMaterial | null,
    toCam: new THREE.Vector3(),
  })

  useFrame((state) => {
    const r = refs.current
    const p = progress.get()
    const studio = studioWeight(p)
    const on = studio > 0.001
    const t = target.current
    if (r.sweepMat !== null) r.sweepMat.opacity = studio
    if (r.sweep !== null) r.sweep.visible = on
    if (r.floorMat !== null) r.floorMat.opacity = studio
    if (r.floor !== null) r.floor.visible = on
    // Lifted glow behind the subject, facing the camera.
    if (r.glow !== null && r.glowMat !== null) {
      r.glow.visible = on
      r.glowMat.opacity = studio
      r.toCam.copy(state.camera.position).sub(t).normalize()
      r.glow.position.copy(t).addScaledVector(r.toCam, -0.55)
      r.glow.quaternion.copy(state.camera.quaternion)
    }
    // Spotlight cone: from SPOT_RISE above the subject down to the floor.
    if (r.spot !== null) {
      const top = t.y + SPOT_RISE
      const height = Math.max(0.2, top - FLOOR_Y)
      r.spot.visible = on
      r.spot.position.set(t.x, (top + FLOOR_Y) / 2, t.z)
      r.spot.scale.set(SPOT_FOOT, height, SPOT_FOOT)
      spotMaterial.uniforms.uOpacity!.value = 0.17 * studio
    }
    // Floor light pool and, inside it, the contact shadow.
    const s = sampleFilm(p)
    const st = computeFilmStates(p)
    if (r.pool !== null && r.poolMat !== null) {
      r.pool.visible = on
      r.pool.position.set(t.x, FLOOR_Y + 0.0004, t.z)
      r.poolMat.opacity = 0.5 * studio
    }
    if (r.shadow !== null && r.shadowMat !== null) {
      const heightAboveFloor = t.y - FLOOR_Y
      const closeness = Math.min(1, Math.max(0, 1 - heightAboveFloor / 0.9))
      const span = 1.4 * s.scale * (1 + 0.35 * st.layDown)
      r.shadow.position.set(t.x, FLOOR_Y + 0.0008, t.z)
      r.shadow.scale.set(span, span, 1)
      r.shadowMat.opacity = 0.6 * closeness * studio
      r.shadow.visible = closeness * studio > 0.01
    }
  })

  const bind =
    <K extends keyof typeof refs.current>(key: K) =>
    (value: (typeof refs.current)[K]) => {
      refs.current[key] = value
    }

  return (
    <group name="stage">
      {/* Room: near-black gradient shell, BackSide so the orbit never leaves it. */}
      <mesh ref={bind('sweep')} scale={[6, 6, 6]} renderOrder={-5}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshBasicMaterial
          ref={bind('sweepMat')}
          map={textures.room}
          side={THREE.BackSide}
          depthWrite={false}
          transparent
        />
      </mesh>
      {/* Lifted glow behind the subject: the dark room's soft centre. */}
      <mesh ref={bind('glow')} scale={[1.6, 1.6, 1]} renderOrder={-4}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={bind('glowMat')}
          map={textures.glow}
          depthWrite={false}
          transparent
        />
      </mesh>
      {/* Floor: unlit near-black, radially faded into the dark. */}
      <mesh
        ref={bind('floor')}
        position={[0, FLOOR_Y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-3}
      >
        <circleGeometry args={[3, 64]} />
        <meshBasicMaterial
          ref={bind('floorMat')}
          alphaMap={textures.floorAlpha}
          transparent
          depthWrite={false}
          color="#0a0b0e"
        />
      </mesh>
      {/* Spot light pool on the floor (additive), elliptical. */}
      <mesh
        ref={bind('pool')}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[0.62, 0.46, 1]}
        renderOrder={-2}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={bind('poolMat')}
          map={textures.pool}
          color="#e6ecff"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0}
        />
      </mesh>
      {/* Contact shadow inside the pool: the device's weight made visible. */}
      <mesh ref={bind('shadow')} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={bind('shadowMat')}
          map={textures.shadow}
          transparent
          depthWrite={false}
          opacity={0}
        />
      </mesh>
      {/* Volumetric spotlight cone (drawn with the transparent pass). */}
      <mesh ref={bind('spot')} geometry={spotGeometry} material={spotMaterial} renderOrder={1} />
    </group>
  )
}
