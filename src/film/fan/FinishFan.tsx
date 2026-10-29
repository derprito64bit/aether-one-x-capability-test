import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import type { FinishId } from '../../data/product.ts'
import { CameraAssembly } from '../../components/PhoneViewer/CameraAssembly.tsx'
import type { FocusLensId } from '../../components/PhoneViewer/PhoneConfig.tsx'
import {
  BACK_FACE,
  BACK_PANEL,
  CERAMIC_FACE_Z,
  CORNER_R,
  MIDFRAME,
} from '../../components/PhoneViewer/phoneDimensions.ts'
import {
  FRAME_BODY_OPENING,
  assignRailGroups,
  bodyOutlineShape,
  createFrameBodyGeometry,
  createFrameRingGeometry,
  createRearRimGeometry,
} from '../../components/PhoneViewer/phoneGeometry.ts'
import { RAIL_KEYS, type PhoneMaterialSet } from '../../components/PhoneViewer/phoneMaterials.ts'
import { softSlab } from '../internals/parts/shapes.ts'
import { createFanMaterialSet, disposeFanMaterialSet } from './fanMaterials.ts'
import { FAN_ORDER } from './fan.ts'

const PANEL_INNER_Z = BACK_PANEL.z + BACK_PANEL.depth / 2

/** Shared rear-shell geometry for every fan card (built once). */
interface ShellGeometry {
  body: THREE.BufferGeometry
  rim: THREE.BufferGeometry
  ring: THREE.BufferGeometry
  back: THREE.BufferGeometry
  plate: THREE.BufferGeometry
  logo: THREE.BufferGeometry
}

/**
 * One fan card: the phone's rear shell at low detail (frame rails, rear
 * rim, front ring for the sides, the ceramic back, the camera module, the
 * etched mark). No display, glass, or internals: only the back shows. The
 * Clear finish also gets the mid-plate, so its smoked back shows a
 * machined interior instead of the room through the phone.
 */
function FanPhone({
  set,
  geo,
  clear,
}: {
  set: PhoneMaterialSet
  geo: ShellGeometry
  clear: boolean
}) {
  const rails = useMemo(
    () => RAIL_KEYS.map((name) => set[name]) as unknown as THREE.Material[],
    [set],
  )
  const lensRefs = useRef<Partial<Record<FocusLensId, THREE.Group>>>({})
  return (
    <group>
      <mesh geometry={geo.body} material={rails} />
      <mesh geometry={geo.rim} material={rails} />
      <mesh geometry={geo.ring} material={rails} />
      <mesh geometry={geo.back} position={[0, 0, BACK_PANEL.z]}>
        <primitive object={set.back} attach="material" />
      </mesh>
      <CameraAssembly materials={set} lensRefs={lensRefs} detail="low" />
      <mesh
        geometry={geo.logo}
        position={[0, -0.065, CERAMIC_FACE_Z - 0.00005]}
        rotation={[0, Math.PI, 0]}
      >
        <primitive object={set.logo} attach="material" />
      </mesh>
      {clear ? (
        <mesh geometry={geo.plate} position={[0, 0, MIDFRAME.plateZ]}>
          <primitive object={set.midplate} attach="material" />
        </mesh>
      ) : null}
    </group>
  )
}

/**
 * The five extra fan cards (titanium through clear; card 0 is the hero).
 * Their groups' world transforms are written by the film director each
 * frame (`cards`); they render only while the fan is open. On the first
 * frame they are compiled once while visible (renderer.compile skips
 * invisible objects), so opening the fan never compiles a shader mid-film.
 */
export function FinishFan({
  base,
  cards,
}: {
  base: PhoneMaterialSet
  cards: MutableRefObject<Array<THREE.Group | null>>
}) {
  const { gl, scene, camera } = useThree()
  const extras = useMemo(() => FAN_ORDER.slice(1), [])
  const sets = useMemo(
    () => extras.map((id: FinishId) => createFanMaterialSet(base, id)),
    [base, extras],
  )
  useEffect(() => () => sets.forEach(disposeFanMaterialSet), [sets])
  const geo = useMemo<ShellGeometry>(() => {
    const body = createFrameBodyGeometry(PANEL_INNER_Z, true)
    assignRailGroups(body)
    const rim = createRearRimGeometry(BACK_FACE + 0.00005, PANEL_INNER_Z, true)
    assignRailGroups(rim)
    const ring = createFrameRingGeometry(true)
    assignRailGroups(ring)
    const plate = new THREE.ExtrudeGeometry(
      bodyOutlineShape(
        FRAME_BODY_OPENING.halfW + 0.0003,
        FRAME_BODY_OPENING.halfH + 0.0003,
        FRAME_BODY_OPENING.r + 0.0003,
        6,
      ),
      { depth: MIDFRAME.plateDepth, bevelEnabled: false, curveSegments: 4, steps: 1 },
    )
    plate.translate(0, 0, -MIDFRAME.plateDepth / 2)
    return {
      body,
      rim,
      ring,
      back: softSlab(
        BACK_PANEL.halfW,
        BACK_PANEL.halfH,
        BACK_PANEL.depth,
        BACK_PANEL.bevel,
        CORNER_R,
        10,
      ),
      plate,
      logo: new THREE.PlaneGeometry(0.016, 0.004),
    }
  }, [])
  useEffect(() => () => Object.values(geo).forEach((g: THREE.BufferGeometry) => g.dispose()), [geo])
  const warm = useRef(0)
  useFrame(() => {
    if (warm.current > 1) return
    warm.current += 1
    if (warm.current === 2) {
      // Compile every card's programs once, while they are visible.
      const groups = cards.current
      const was = groups.map((g) => g?.visible ?? false)
      for (const g of groups) if (g !== null) g.visible = true
      gl.compile(scene, camera)
      groups.forEach((g, i) => {
        if (g !== null) g.visible = was[i] ?? false
      })
    }
  })
  return (
    <group name="finish-fan">
      {extras.map((id, i) => (
        <group
          key={id}
          name={`fan-${id}`}
          visible={false}
          ref={(g) => {
            cards.current[i] = g
          }}
        >
          <FanPhone set={sets[i] as PhoneMaterialSet} geo={geo} clear={id === 'clear'} />
        </group>
      ))}
    </group>
  )
}
