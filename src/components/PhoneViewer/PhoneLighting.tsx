import { useMemo } from 'react'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'

RectAreaLightUniformsLib.init()

/**
 * Studio rig, M3R section 5. One long softbox (the rail highlight), one
 * narrow strip edge-on to the rail (the chamfer highlight), a cool dim rim,
 * a soft fill, a screen-bounce glow in front of the device, and a rear
 * softbox that rakes the camera pad. The two area lights plus the
 * environment panels are what keep the rail highlight travelling
 * continuously through a full rotation.
 */
export function PhoneLighting({
  bounceTint = '#8fa8ff',
  rear = false,
}: {
  bounceTint?: string
  rear?: boolean
}) {
  const rig = useMemo(() => {
    // Key softbox well off the face axis: narrow and dim enough that the
    // flat glass carries a travelling band, never a full-face wash. A wide
    // hot panel burns the whole screen white and reads as a second phone.
    // Overnight detail-review levels: everything up ~40% so small hardware
    // reads; ratios and positions untouched.
    const key = new THREE.RectAreaLight('#ffffff', 3.0, 0.28, 0.18)
    key.position.set(1.0, 0.35, 0.35)
    key.lookAt(0, 0, 0)
    const strip = new THREE.RectAreaLight('#dfe9ff', 3.2, 0.07, 0.5)
    strip.position.set(-0.7, 0.15, 0.55)
    strip.lookAt(0, 0, 0)
    // Rear softbox: cool, high, behind. Lifts the plateau out of the rim
    // shadow on rear and side studies; idles low on front views so the
    // silhouette still separates without flattening.
    const rearSoft = new THREE.RectAreaLight('#e8f1ff', rear ? 4.2 : 1.2, 0.4, 0.3)
    rearSoft.position.set(-0.4, 0.55, -0.95)
    rearSoft.lookAt(0, 0.02, 0)
    return { key, strip, rearSoft }
  }, [rear])
  return (
    <group>
      <primitive object={rig.key} />
      <primitive object={rig.strip} />
      <primitive object={rig.rearSoft} />
      <directionalLight position={[-0.3, -0.6, -1]} intensity={1.5} color="#7fb4ff" />
      <directionalLight position={[-0.9, 0.2, 0.6]} intensity={0.8} color="#bcd2ff" />
      {/* Screen bounce sits low and in front, off the camera's mirror line:
          on the face axis its specular landed dead centre on the glass as
          a white blob over the wallpaper. */}
      <pointLight
        position={[0, -0.24, 0.3]}
        intensity={0.32}
        distance={1.4}
        decay={2}
        color={bounceTint}
      />
      <ambientLight intensity={0.45} color="#dfe8ff" />
    </group>
  )
}
