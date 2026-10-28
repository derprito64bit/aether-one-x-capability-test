import { useEffect, useMemo, type MutableRefObject } from 'react'
import * as THREE from 'three'
import {
  CERAMIC_FACE_Z,
  COLLAR,
  FLASH_ARC,
  GLASS_SEAL,
  LENS_COLLAR,
  MEDALLION,
  MODULE,
  MODULE_MIC,
  OPTICS_PARTNER,
  PERISCOPE,
  TOF,
} from './phoneDimensions.ts'
import {
  createModuleBaseGeometry,
  createRearLatheGeometry,
  createRoundedRectGeometry,
  createRoundedRectRingGeometry,
} from './phoneGeometry.ts'
import type { PhoneMaterialSet } from './phoneMaterials.ts'
import type { FocusLensId } from './PhoneConfig.tsx'
import {
  createModuleGlassGeometry,
  lensElementCap,
  lensSpecs,
  lensTurretProfile,
  LENS_TUNNEL,
  moduleCenter,
  MODULE_RISE,
  periscopeLayout,
  riseZ,
  type LensSpec,
} from './cameraLayout.ts'

export interface OpticsControl {
  optics: number
  visible: boolean
}

/** Disposes owned geometries when their owner unmounts or rebuilds. */
function useDisposeGeometries(geometries: ReadonlyArray<THREE.BufferGeometry>): void {
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries])
}

interface CameraAssemblyProps {
  materials: PhoneMaterialSet
  lensRefs: MutableRefObject<Partial<Record<FocusLensId, THREE.Group>>>
  /** Low drops instanced knurl, the second baffle, and ToF internals (mobile LOD). */
  detail?: 'high' | 'low'
  /**
   * Film-only optical separation refs (`${lens}:${layer}` plus `knurl`).
   * Viewers omit it; layers rest at their assembled offsets.
   */
  separation?: MutableRefObject<Record<string, THREE.Group | null>>
}

/**
 * Circular camera module (Prompt A2). Centered machined assembly: lathe base
 * fillet, knurled outer collar, polished collar top carrying arc text,
 * riser, bead-blasted step, bore, seal, cover glass with micro-text, three
 * round lens turrets on a triangle, rectangular periscope, arc flash, ToF
 * pair, module mic, and an inlaid iris medallion. Rear faces -z, so every
 * flat face is turned to face -z (a default ring or circle faces +z, into
 * the phone, and is back-face culled from behind).
 *
 * Layering note: the cover glass is semi-transparent so the medallion and
 * the bore read through it dimmed, exactly like glass over hardware. The
 * ToF window, flash diffuser, mic, and periscope window are separate
 * windows sitting just proud of the glass, as on real modules.
 */
export function CameraAssembly({
  materials,
  lensRefs,
  detail = 'high',
  separation,
}: CameraAssemblyProps) {
  const specs = useMemo(() => lensSpecs(), [])
  const center = useMemo(() => moduleCenter(), [])
  const sep = useMemo(() => {
    const map = separation
    return (name: string) => (g: THREE.Group | null) => {
      if (map !== undefined) map.current[name] = g
    }
  }, [separation])
  const shell = useMemo(() => {
    const place = (geo: THREE.BufferGeometry): THREE.BufferGeometry =>
      geo.translate(center.x, center.y, CERAMIC_FACE_Z)
    const base = createModuleBaseGeometry(MODULE.outerR, MODULE.baseFillet)
    base.rotateX(-Math.PI / 2)
    // Riser: the outer collar's inner wall, down to the step. Bore: the
    // step's inner wall, down past the glass to the ceramic face. Both
    // face the axis (seen from inside the bowl).
    const riser = createRearLatheGeometry([
      [COLLAR.outer.rIn, MODULE_RISE.outer],
      [COLLAR.outer.rIn, MODULE_RISE.step],
    ])
    const bore = createRearLatheGeometry([
      [COLLAR.step.rIn, MODULE_RISE.step],
      [COLLAR.step.rIn, 0],
    ])
    return {
      base: place(base),
      riser: place(riser),
      bore: place(bore),
      glass: createModuleGlassGeometry(),
    }
  }, [center])
  const tofWindowGeometry = useMemo(
    () => createRoundedRectGeometry(TOF.window.w, TOF.window.h, TOF.window.r, 0.0002),
    [],
  )
  const owned = useMemo(
    () => [shell.base, shell.riser, shell.bore, shell.glass, tofWindowGeometry],
    [shell, tofWindowGeometry],
  )
  useDisposeGeometries(owned)
  const knurl = useMemo(() => {
    // One instanced wedge per tooth around the outer collar wall, above
    // the base fillet. Teeth break the silhouette at macro (0.18mm proud).
    const total = COLLAR.outer.knurlTeeth
    const wall = COLLAR.outer.rise - MODULE.baseFillet
    const geo = new THREE.BoxGeometry(COLLAR.outer.knurlDepth * 1.5, 0.00022, wall * 0.9)
    const mesh = new THREE.InstancedMesh(geo, materials.collarOuter, total)
    const m = new THREE.Matrix4()
    const e = new THREE.Euler()
    const q = new THREE.Quaternion()
    const v = new THREE.Vector3()
    const sc = new THREE.Vector3(1, 1, 1)
    const r = COLLAR.outer.rOut + COLLAR.outer.knurlDepth * 0.2
    const z = riseZ((MODULE.baseFillet + COLLAR.outer.rise) / 2)
    for (let k = 0; k < total; k++) {
      const a = (k / total) * Math.PI * 2
      e.set(0, 0, a)
      q.setFromEuler(e)
      v.set(center.x + Math.cos(a) * r, center.y + Math.sin(a) * r, z)
      m.compose(v, q, sc)
      mesh.setMatrixAt(k, m)
    }
    mesh.instanceMatrix.needsUpdate = true
    return mesh
  }, [materials, center])
  useEffect(() => () => knurl.geometry.dispose(), [knurl])
  const medallion = useMemo(
    () => buildMedallionGeometry(materials.medallion, materials.medallionRing),
    [materials],
  )
  useEffect(
    () => () =>
      medallion.traverse((child) => {
        if (child instanceof THREE.Mesh) child.geometry.dispose()
      }),
    [medallion],
  )

  const zOuter = riseZ(MODULE_RISE.outer)
  const zStep = riseZ(MODULE_RISE.step)
  const zGlass = riseZ(MODULE_RISE.glass)
  const tofAngle = (TOF.angleDeg * Math.PI) / 180
  const tofX = center.x + TOF.ringR * Math.cos(tofAngle)
  const tofY = center.y + TOF.ringR * Math.sin(tofAngle)
  const micAngle = (MODULE_MIC.angleDeg * Math.PI) / 180
  const micX = center.x + MODULE_MIC.ringR * Math.cos(micAngle)
  const micY = center.y + MODULE_MIC.ringR * Math.sin(micAngle)
  const flashStart = (FLASH_ARC.startDeg * Math.PI) / 180
  const flashSweep = (FLASH_ARC.sweepDeg * Math.PI) / 180
  const wallRise = COLLAR.outer.rise - MODULE.baseFillet

  return (
    <group>
      {/* Base fillet blending the collar into the rear panel */}
      <mesh geometry={shell.base} castShadow>
        <primitive object={materials.island} attach="material" />
      </mesh>
      {/* Outer collar wall above the fillet: instanced knurl at LOD0, mapped wall below */}
      <mesh
        position={[center.x, center.y, riseZ((MODULE.baseFillet + COLLAR.outer.rise) / 2)]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[COLLAR.outer.rOut, COLLAR.outer.rOut, wallRise, 96, 1, true]} />
        <primitive
          object={detail === 'high' ? materials.collarOuter : materials.knurlWall}
          attach="material"
        />
      </mesh>
      {/* Outer collar top face: polished, carries the partner arc text */}
      <mesh position={[center.x, center.y, zOuter]} rotation={[0, Math.PI, 0]}>
        <ringGeometry args={[COLLAR.outer.rIn, COLLAR.outer.rOut, 96]} />
        <primitive object={materials.collarTop} attach="material" />
      </mesh>
      {/* Riser down to the matte bead-blasted step, then the bore */}
      <mesh geometry={shell.riser}>
        <primitive object={materials.collarStep} attach="material" />
      </mesh>
      <mesh position={[center.x, center.y, zStep]} rotation={[0, Math.PI, 0]}>
        <ringGeometry args={[COLLAR.step.rIn, COLLAR.step.rOut, 96]} />
        <primitive object={materials.collarStep} attach="material" />
      </mesh>
      <mesh geometry={shell.bore}>
        <primitive object={materials.collarStep} attach="material" />
      </mesh>
      {/* Seal groove: dark gasket bead seated on the glass edge, in the
          module plane (a torus lies in XY by default; the old PI/2 turn
          stood it on edge as a 38mm hoop through the whole phone). */}
      <mesh position={[center.x, center.y, zGlass - GLASS_SEAL.depth / 2]}>
        <torusGeometry
          args={[
            (GLASS_SEAL.rOut + GLASS_SEAL.rIn) / 2,
            (GLASS_SEAL.rOut - GLASS_SEAL.rIn) / 2,
            8,
            96,
          ]}
        />
        <primitive object={materials.glassSeal} attach="material" />
      </mesh>
      {/* Cover glass: semi-transparent so hardware reads through it dimmed */}
      <group ref={sep('module:cover')}>
        <mesh
          geometry={shell.glass}
          position={[center.x, center.y, zGlass]}
          rotation={[0, Math.PI, 0]}
        >
          <primitive object={materials.moduleGlass} attach="material" />
        </mesh>
      </group>
      {detail === 'high' ? <primitive object={knurl} /> : null}
      {specs.map((spec) => (
        <LensAssembly
          key={spec.key}
          spec={spec}
          zGlass={zGlass}
          materials={materials}
          lensRefs={lensRefs}
          detail={detail}
          sep={sep}
        />
      ))}
      <PeriscopeAssembly
        center={center}
        zGlass={zGlass}
        materials={materials}
        lensRefs={lensRefs}
        sep={sep}
      />
      {/* Arc flash: frosted diffuser arc bedded on the step ring with two
          LED dies proud of it, all facing the rear. The arc is authored
          mirrored (PI - angle) because the PI turn about Y mirrors x. */}
      <group position={[center.x, center.y, zStep - 0.00008]} rotation={[0, Math.PI, 0]}>
        <mesh>
          <ringGeometry
            args={[
              FLASH_ARC.rIn,
              FLASH_ARC.rOut,
              24,
              1,
              Math.PI - flashStart - flashSweep,
              flashSweep,
            ]}
          />
          <primitive object={materials.flashDiffuser} attach="material" />
        </mesh>
        {[0.3, 0.7].map((t) => {
          const a = Math.PI - (flashStart + t * flashSweep)
          const r = (FLASH_ARC.rIn + FLASH_ARC.rOut) / 2
          // Dies 0.04mm proud of the diffuser (+z here is rear after the turn).
          return (
            <mesh key={t} position={[Math.cos(a) * r, Math.sin(a) * r, 0.00004]}>
              <circleGeometry args={[0.0009, 16]} />
              <primitive object={materials.flashArc} attach="material" />
            </mesh>
          )
        })}
      </group>
      {/* ToF pair as its own proud window above the cover glass */}
      <group ref={sep('tof-module')} position={[tofX, tofY, zGlass - 0.00025]}>
        <mesh geometry={tofWindowGeometry} rotation={[0, 0, tofAngle]}>
          <primitive object={materials.tofWindow} attach="material" />
        </mesh>
        {detail === 'high' ? <ToFInternals materials={materials} angle={tofAngle} /> : null}
      </group>
      {/* Module mic: 0.7mm port, axis on z, top face 0.02mm proud of the glass */}
      <mesh position={[micX, micY, zGlass + 0.00013]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[MODULE_MIC.d / 2, MODULE_MIC.d / 2, 0.0003, 12]} />
        <primitive object={materials.moduleMic} attach="material" />
      </mesh>
      {/* Iris medallion inlaid 0.12mm under the glass at the triangle centre */}
      <group position={[center.x, center.y, zGlass + MEDALLION.z]}>
        <primitive object={medallion} />
      </group>
    </group>
  )
}

/**
 * Six-blade iris medallion (Prompt A2 section 4.3, path A): six identical
 * straight-edged quadrilateral blades at 60 degrees with a fixed overlap
 * offset, so a hexagonal opening stays open at the centre. Real geometry:
 * crisp at 8cm, no texel grid. Blades extrude inboard (+z) from the group
 * plane; the hairline ring faces the rear just proud of the blade faces.
 * Brushing comes from the roughness map on the shared medallion materials,
 * which also dissolve with the shell.
 */
export function buildMedallionGeometry(
  bladeMaterial: THREE.Material,
  ringMaterial: THREE.Material,
): THREE.Group {
  const group = new THREE.Group()
  const R = MEDALLION.r
  const r0 = R * 0.3
  const overlap = 0.5
  for (let k = 0; k < 6; k++) {
    const a0 = (k * Math.PI) / 3
    const a1 = ((k + 1) * Math.PI) / 3
    const shape = new THREE.Shape()
    shape.moveTo(R * Math.cos(a0), R * Math.sin(a0))
    shape.lineTo(R * Math.cos(a1), R * Math.sin(a1))
    shape.lineTo(r0 * Math.cos(a1 + overlap), r0 * Math.sin(a1 + overlap))
    shape.lineTo(r0 * Math.cos(a0 + overlap), r0 * Math.sin(a0 + overlap))
    shape.closePath()
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: MEDALLION.thickness,
      bevelEnabled: false,
    })
    group.add(new THREE.Mesh(geo, bladeMaterial))
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(R - MEDALLION.ringWidth, R, 72), ringMaterial)
  ring.rotation.y = Math.PI
  ring.position.z = -0.000005
  group.add(ring)
  return group
}

/** Emitter/receiver apertures under the ToF window, barely perceptible. */
function ToFInternals({ materials, angle }: { materials: PhoneMaterialSet; angle: number }) {
  const e = TOF.emitter
  const r = TOF.receiver
  const ex = Math.cos(angle + (e.offsetDeg * Math.PI) / 180) * 0.0018
  const ey = Math.sin(angle + (e.offsetDeg * Math.PI) / 180) * 0.0018
  const rx = Math.cos(angle + (r.offsetDeg * Math.PI) / 180) * 0.0018
  const ry = Math.sin(angle + (r.offsetDeg * Math.PI) / 180) * 0.0018
  return (
    <group>
      {/* Apertures sit behind the window's inner face (never coplanar with
          it), face the rear, and read through the filter dimly. */}
      <mesh position={[ex, ey, 0.00016]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[e.d / 2, 20]} />
        <primitive object={materials.tofEmitter} attach="material" />
      </mesh>
      <mesh position={[rx, ry, 0.00016]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[r.d / 2, 20]} />
        <primitive object={materials.tofReceiver} attach="material" />
      </mesh>
      {/* Square sensor edge inside the receiver */}
      <mesh position={[rx, ry, 0.00014]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[r.d * 0.55, r.d * 0.55]} />
        <primitive object={materials.tofHousing} attach="material" />
      </mesh>
    </group>
  )
}

/**
 * Folded periscope optic (Prompt A2 section 2.5): rounded-rectangle window
 * proud of the cover glass over an open-wall cavity that runs down to the
 * ceramic face, with an angled prism face catching one fast highlight.
 * Registers the fourth focusable lens id. The group origin sits on the
 * cover glass plane so focus scaling grows the optic off the glass instead
 * of lifting it.
 */
function PeriscopeAssembly({
  center,
  zGlass,
  materials,
  lensRefs,
  sep,
}: {
  center: { x: number; y: number }
  zGlass: number
  materials: PhoneMaterialSet
  lensRefs: MutableRefObject<Partial<Record<FocusLensId, THREE.Group>>>
  sep: (name: string) => (g: THREE.Group | null) => void
}) {
  const layout = useMemo(() => periscopeLayout(), [])
  const focusGeometry = useMemo(
    () =>
      createRoundedRectRingGeometry(
        PERISCOPE.w + 0.0008,
        PERISCOPE.h + 0.0008,
        PERISCOPE.r + 0.0004,
        PERISCOPE.w + 0.0002,
        PERISCOPE.h + 0.0002,
        PERISCOPE.r + 0.0001,
        0.00001,
      ),
    [],
  )
  useEffect(() => () => focusGeometry.dispose(), [focusGeometry])
  const x = center.x + PERISCOPE.x
  const y = center.y + PERISCOPE.y
  // Local z relative to the glass plane: rear (outward) is negative.
  const local = (rise: number): number => riseZ(rise) - zGlass
  const wallTop = layout.wallTopRise
  const wallMid = local(wallTop / 2)
  const t = PERISCOPE.wall
  return (
    <group
      position={[x, y, zGlass]}
      ref={(group: THREE.Group | null) => {
        if (group !== null) lensRefs.current.periscope = group
      }}
    >
      <group ref={sep('periscope:cover')}>
        {/* Cavity walls: an open frame centered on the window edge, from
            the window down to the ceramic face, never a solid box. */}
        {[
          { x: 0, y: PERISCOPE.h / 2, w: PERISCOPE.w + t, h: t },
          { x: 0, y: -PERISCOPE.h / 2, w: PERISCOPE.w + t, h: t },
          { x: -PERISCOPE.w / 2, y: 0, w: t, h: PERISCOPE.h - t },
          { x: PERISCOPE.w / 2, y: 0, w: t, h: PERISCOPE.h - t },
        ].map(({ x: wx, y: wy, w, h }) => (
          <mesh key={`${wx},${wy}`} position={[wx, wy, wallMid]}>
            <boxGeometry args={[w, h, wallTop]} />
            <primitive object={materials.lensCavity} attach="material" />
          </mesh>
        ))}
        {/* Cover window, a separate sapphire pane above the module glass */}
        <mesh position={[0, 0, local(layout.windowRise)]}>
          <boxGeometry args={[PERISCOPE.w, PERISCOPE.h, layout.windowDepth]} />
          <primitive object={materials.periscopeGlass} attach="material" />
        </mesh>
      </group>
      <group ref={sep('periscope:prism')}>
        {/* Prism face tilted off the rear axis across the cavity: no
            straight-down view, one fast hard highlight as the camera arcs. */}
        <mesh
          position={[0, 0, local(layout.prism.rise)]}
          rotation={[Math.PI - layout.prism.tilt, 0, 0]}
        >
          <planeGeometry args={[layout.prism.width, layout.prism.length]} />
          <primitive object={materials.periscopePrism} attach="material" />
        </mesh>
      </group>
      {/* Focus ring seated on the glass around the window, facing the rear */}
      <mesh
        geometry={focusGeometry}
        position={[0, 0, -0.00002]}
        rotation={[0, Math.PI, 0]}
        name="focus-ring"
      >
        <primitive object={materials.focusRing} attach="material" />
      </mesh>
    </group>
  )
}

/**
 * One parametric optical turret on the cover glass (decreasing z is
 * outward). Collar lathe from the glass to its top, sapphire cover dome in
 * the mouth, inward-facing barrel with two baffles at 35/70 percent depth,
 * front element doming toward the viewer at 45% depth, aperture hint,
 * barrel floor, sensor plane. Called three times, never modelled twice.
 * The group origin sits on the glass plane so focus scaling grows the
 * turret off the glass instead of lifting it.
 */
function LensAssembly({
  spec,
  zGlass,
  materials,
  lensRefs,
  detail,
  sep,
}: {
  spec: LensSpec
  zGlass: number
  materials: PhoneMaterialSet
  lensRefs: CameraAssemblyProps['lensRefs']
  detail: 'high' | 'low'
  sep: (name: string) => (g: THREE.Group | null) => void
}) {
  const glass = materials[spec.glass]
  const profile = useMemo(() => lensTurretProfile(spec), [spec])
  const geometries = useMemo(() => {
    const rel = (pts: Array<[number, number]>): Array<[number, number]> =>
      pts.map(([r, rise]) => [r, rise - MODULE_RISE.glass])
    return {
      collar: createRearLatheGeometry(rel(profile.collar), 40),
      barrel: createRearLatheGeometry(rel(profile.barrel), 32),
    }
  }, [profile])
  const owned = useMemo(() => [geometries.collar, geometries.barrel], [geometries])
  useDisposeGeometries(owned)
  const cap = useMemo(() => lensElementCap(spec), [spec])
  const local = (rise: number): number => riseZ(rise) - zGlass
  const mouthZ = local(MODULE_RISE.lensMouth)
  // Shallow sapphire cover spanning the full mouth: base radius exactly
  // spec.r on the inner collar wall, pole on the collar-top plane.
  const coverR = spec.r / Math.sin(0.12)
  const coverPoleZ = local(MODULE_RISE.lensTop)
  const depthZ = (fraction: number): number => mouthZ + spec.barrelDepth * fraction
  return (
    <group
      position={[spec.x, spec.y, zGlass]}
      ref={(group: THREE.Group | null) => {
        if (group !== null) lensRefs.current[spec.key] = group
      }}
    >
      <group ref={sep(`${spec.key}:collar`)}>
        <mesh geometry={geometries.collar} castShadow>
          <primitive object={materials.lensRing} attach="material" />
        </mesh>
      </group>
      {/* Cover dome spanning the collar mouth: highlight slides, never pops */}
      <group ref={sep(`${spec.key}:cover`)}>
        <mesh position={[0, 0, coverPoleZ + coverR]} rotation={[-Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[coverR, 48, 8, 0, Math.PI * 2, 0, 0.12]} />
          <primitive object={glass} attach="material" />
        </mesh>
      </group>
      {/* Barrel wall plus baffles, descending into the module */}
      <group ref={sep(`${spec.key}:barrel`)}>
        <mesh geometry={geometries.barrel}>
          <primitive object={materials.lensBarrel} attach="material" />
        </mesh>
        {/* Baffle rings at 35/70 percent of barrel depth (one on low LOD) */}
        {(detail === 'high' ? LENS_TUNNEL.baffleDepths : LENS_TUNNEL.baffleDepthLow).map(
          (depth) => (
            <mesh key={depth} position={[0, 0, depthZ(depth)]}>
              <torusGeometry args={[spec.r * LENS_TUNNEL.baffleR, LENS_TUNNEL.baffleTube, 8, 32]} />
              <primitive object={materials.lensBarrel} attach="material" />
            </mesh>
          ),
        )}
      </group>
      {/* Front element at its per-lens depth: shallow cap doming toward
          the viewer, rim clear of the aperture and sensor below it. */}
      <group ref={sep(`${spec.key}:element`)}>
        <mesh
          position={[0, 0, mouthZ + cap.poleDepth + cap.sphereR]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <sphereGeometry args={[cap.sphereR, 32, 8, 0, Math.PI * 2, 0, cap.theta]} />
          <primitive object={glass} attach="material" />
        </mesh>
      </group>
      {/* Aperture hint, barrel floor, and sensor plane, all facing the rear */}
      <group ref={sep(`${spec.key}:sensor`)}>
        <mesh position={[0, 0, depthZ(LENS_TUNNEL.aperture)]} rotation={[0, Math.PI, 0]}>
          <ringGeometry args={[spec.r * 0.3, spec.r * 0.42, 7]} />
          <primitive object={materials.lensCavity} attach="material" />
        </mesh>
        <mesh position={[0, 0, depthZ(1)]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[spec.r * 0.86, 32]} />
          <primitive object={materials.lensCavity} attach="material" />
        </mesh>
        <mesh position={[0, 0, depthZ(1) - 0.00002]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[spec.r * 0.5, 24]} />
          <primitive object={materials.sensorGlint} attach="material" />
        </mesh>
      </group>
      {/* Focus ring seated on the glass around the turret base */}
      <mesh position={[0, 0, -0.00002]} rotation={[0, Math.PI, 0]} name="focus-ring">
        <ringGeometry
          args={[spec.r + LENS_COLLAR.base + 0.00005, spec.r + LENS_COLLAR.base + 0.00055, 40]}
        />
        <primitive object={materials.focusRing} attach="material" />
      </mesh>
    </group>
  )
}

/** Partner wordmark for the collar arc text. Recorded in docs/device-design.md. */
export const PARTNER_MARK = OPTICS_PARTNER
