import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export type ScreenMode = 'off' | 'boot' | 'wallpaper' | 'viewfinder' | 'os' | 'ai'

interface LiveScreenProps {
  texture: THREE.CanvasTexture
  modeRef: { current: ScreenMode }
  brightnessRef: { current: number }
  runningRef: { current: boolean }
  /** Film time: master progress written by the director every frame. */
  timeRef: { current: number }
}

function paint(
  ctx: CanvasRenderingContext2D,
  mode: ScreenMode,
  t: number,
  brightness: number,
): void {
  const w = 256
  const h = 512
  ctx.fillStyle = '#02040a'
  ctx.fillRect(0, 0, w, h)
  if (mode === 'off') return
  const dim = 0.35 + brightness * 0.65
  if (mode === 'boot') {
    ctx.fillStyle = `rgba(240,245,252,${0.85 * dim})`
    ctx.font = '600 28px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('A E T H E R', w / 2, h / 2)
    return
  }
  // Luminous cobalt wallpaper (site overhaul): the old navy read as a dead
  // slab through the cover glass on the bright stage. Deep cobalt crown,
  // azure middle, a warm porcelain bloom rising from below.
  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, '#0f2c66')
  gradient.addColorStop(0.5, '#2a64d6')
  gradient.addColorStop(1, '#7fa6ee')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
  const glow = ctx.createRadialGradient(w / 2, h * 1.02, 10, w / 2, h * 1.02, h * 0.62)
  glow.addColorStop(0, `rgba(255,243,226,${0.85 * dim})`)
  glow.addColorStop(1, 'rgba(255,243,226,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
  if (mode === 'viewfinder') {
    ctx.strokeStyle = `rgba(240,246,255,${0.8 * dim})`
    ctx.lineWidth = 3
    ctx.strokeRect(24, 120, w - 48, 240)
    ctx.fillStyle = `rgba(255,255,255,${0.9 * dim})`
    ctx.beginPath()
    ctx.arc(w / 2 + Math.sin(t * 0.8) * 20, 240, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = `rgba(240,246,255,${0.7 * dim})`
    ctx.font = '500 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('1x · 50 MP', w / 2, 400)
    return
  }
  if (mode === 'os') {
    ctx.fillStyle = `rgba(240,246,255,${0.9 * dim})`
    ctx.font = '600 44px sans-serif'
    ctx.textAlign = 'center'
    const hours = new Date().getHours().toString().padStart(2, '0')
    ctx.fillText(`${hours}:09`, w / 2, 120)
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        ctx.fillStyle = `rgba(255,255,255,${(0.3 + ((row + col) % 3) * 0.16) * dim})`
        ctx.beginPath()
        ctx.roundRect(28 + col * 56, 170 + row * 62, 40, 40, 10)
        ctx.fill()
      }
    }
    return
  }
  if (mode === 'ai') {
    ctx.fillStyle = `rgba(255,255,255,${(0.55 + 0.3 * Math.sin(t * 2)) * dim})`
    ctx.beginPath()
    ctx.arc(w / 2, h / 2 - 40, 54, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = `rgba(255,255,255,${0.92 * dim})`
    ctx.font = '500 22px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('On-device', w / 2, h / 2 + 80)
    return
  }
  // wallpaper: a soft light bloom high on the cobalt, not a hard disc (the
  // old navy design's "moon" read as a flat grey blob once the panel UVs
  // were fixed and the whole texture became visible).
  const bloom = ctx.createRadialGradient(178, 110, 4, 178, 110, 96)
  bloom.addColorStop(0, `rgba(235,242,255,${0.55 * dim})`)
  bloom.addColorStop(1, 'rgba(235,242,255,0)')
  ctx.fillStyle = bloom
  ctx.fillRect(0, 0, w, h)
}

/**
 * Live display painter. Redraws at roughly 9fps into the shared texture,
 * pauses when the document hides or the stage leaves the viewport.
 * Animation phase comes from film time, not the wall clock (round 03
 * A11): the same progress paints the same pixels, so captures are
 * deterministic and reverse scrub retraces exactly. (The os minute
 * readout still shows real time.)
 */
export function LiveScreen({
  texture,
  modeRef,
  brightnessRef,
  runningRef,
  timeRef,
}: LiveScreenProps) {
  const tick = useMemo(() => ({ acc: 0 }), [])
  useEffect(() => {
    let frame = 0
    let last = performance.now()
    const canvas = texture.image as HTMLCanvasElement
    const ctx = canvas.getContext('2d')
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop)
      if (!runningRef.current || document.hidden || ctx === null) {
        last = now
        return
      }
      tick.acc += (now - last) / 1000
      last = now
      if (tick.acc < 0.11) return
      tick.acc = 0
      paint(ctx, modeRef.current, timeRef.current * Math.PI * 2, brightnessRef.current)
      texture.needsUpdate = true
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [texture, modeRef, brightnessRef, runningRef, timeRef, tick])
  return null
}

export function useScreenRefs(): {
  modeRef: { current: ScreenMode }
  brightnessRef: { current: number }
  runningRef: { current: boolean }
  timeRef: { current: number }
} {
  const modeRef = useRef<ScreenMode>('wallpaper')
  const brightnessRef = useRef(0.6)
  const runningRef = useRef(true)
  const timeRef = useRef(0)
  return { modeRef, brightnessRef, runningRef, timeRef }
}
