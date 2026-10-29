import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { silhouetteHeightM, silhouetteWidthM } from './phoneDimensions.ts'
import { PhoneLighting } from './PhoneLighting.tsx'
import { PhoneModel } from './PhoneModel.tsx'
import { StudioEnvironment } from './phoneEnvironment.ts'
import { FINISH_PARAMS } from './phoneMaterials.ts'
import { usePhoneConfig } from './PhoneConfig.tsx'

export type PhonePoseId = 'hero' | 'rear' | 'side' | 'front'

interface PoseTarget {
  rx: number
  ry: number
  scale: number
  fit: number
}

const POSES: Record<PhonePoseId, PoseTarget> = {
  hero: { rx: -0.28, ry: 0.42, scale: 1.34, fit: 0.6 },
  rear: { rx: -0.3, ry: 2.9, scale: 1.3, fit: 0.6 },
  side: { rx: -0.1, ry: 1.55, scale: 1.2, fit: 0.55 },
  front: { rx: 0, ry: 0, scale: 1.4, fit: 0.64 },
}

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'

/** Low-frequency deterministic noise for idle sway. Value noise, never a sine. */
function idleNoise(t: number): number {
  const a = Math.sin(t * 0.31 + 1.7) * 0.5 + Math.sin(t * 0.53 + 0.4) * 0.3
  const b = Math.sin(t * 0.47 + 2.9) * 0.2
  return (a + b) * 0.012
}

interface PhoneSceneProps {
  pose?: PhonePoseId
  label: string
  detail?: 'high' | 'low'
}

/**
 * Viewport-aware phone study. Holds the phone at a fit share of the viewport
 * height on every monitor, damps rotation at 5.5/s, snaps under reduced motion.
 */
export function PhoneScene({ pose = 'hero', label, detail = 'high' }: PhoneSceneProps) {
  const group = useRef<THREE.Group>(null)
  const size = useThree((state) => state.size)
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  const target = useMemo(() => POSES[pose], [pose])
  // Dev-only probe hook (scripts/probe.mjs and live console probes):
  // window.__scene and __ray. Compiled out of production builds.
  const debugScene = useThree((state) => state.scene)
  const debugCamera = useThree((state) => state.camera)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as {
      __scene?: THREE.Scene
      __ray?: (x: number, y: number) => string
    }
    w.__scene = debugScene
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    w.__ray = (x, y) => {
      ndc.set(x, y)
      raycaster.setFromCamera(ndc, debugCamera)
      const hits = raycaster.intersectObjects(debugScene.children, true)
      return hits
        .slice(0, 6)
        .map((hit) => {
          const o = hit.object as THREE.Mesh
          if (!o.isMesh) return 'non-mesh'
          const m = o.material as THREE.Material | THREE.Material[]
          const mat = Array.isArray(m)
            ? `array[${o.geometry.groups.map((g) => g.materialIndex).join(',')}]`
            : `${m.type}:${(m as THREE.MeshPhysicalMaterial).color?.getHexString()}:op${(m as THREE.MeshPhysicalMaterial).opacity?.toFixed(2)}:side${(m as THREE.MeshPhysicalMaterial).side}:vis=${o.visible}:dw=${(m as THREE.MeshPhysicalMaterial).depthWrite}`
          return `${o.geometry.type}@${o.position
            .toArray()
            .map((v) => +v.toFixed(4))
            .join(',')} mat=${mat}`
        })
        .join('\n')
    }
  }, [debugScene, debugCamera])
  // Warm finishes borrow the bounce tint so ember reads under the cool rig.
  const { finish } = usePhoneConfig()
  const bounceTint = FINISH_PARAMS[finish]?.envTint ?? '#ffffff'
  const rear = pose === 'rear' || pose === 'side'
  // Deterministic per-pose phase so two studies never sway in sync.
  const phase = pose.length * 37.7 + target.rx * 10

  useFrame((state, delta) => {
    const g = group.current
    if (g === null) return
    const reduced = window.matchMedia(REDUCED_QUERY).matches
    const damp = reduced ? 1 : 1 - Math.exp(-delta * 5.5)
    const t = state.clock.elapsedTime + phase
    const swayX = reduced ? 0 : idleNoise(t)
    const swayY = reduced ? 0 : idleNoise(t * 1.31 + 40)

    g.rotation.x += (target.rx + swayX - g.rotation.x) * damp
    g.rotation.y += (target.ry + swayY - g.rotation.y) * damp
    const s = target.scale
    g.scale.x += (s - g.scale.x) * damp
    g.scale.y += (s - g.scale.y) * damp
    g.scale.z += (s - g.scale.z) * damp

    const aspect = size.width / Math.max(1, size.height)
    const eh = silhouetteHeightM(target.scale, target.rx)
    const ew = silhouetteWidthM(target.scale, target.ry)
    const distance = 0.62
    const tanV = eh / (2 * distance * target.fit)
    const tanH = ew / (2 * distance * Math.max(aspect, 0.3) * 0.86)
    const fov = (2 * Math.atan(Math.max(tanV, tanH)) * 180) / Math.PI
    const next = Math.min(52, Math.max(10, fov))
    if (Math.abs(camera.fov - next) > 0.01) {
      camera.fov = reduced ? next : camera.fov + (next - camera.fov) * damp
      camera.updateProjectionMatrix()
    }
    camera.position.set(0, 0.01, distance)
    camera.lookAt(0, 0, 0)
  })

  return (
    <group name={label}>
      <StudioEnvironment />
      <PhoneLighting bounceTint={bounceTint} rear={rear} />
      <group ref={group}>
        <PhoneModel detail={detail} />
      </group>
    </group>
  )
}
