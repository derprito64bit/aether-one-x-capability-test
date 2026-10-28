import { CanvasTexture } from 'three'

function makeCanvas(
  w: number,
  h: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null } {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return { canvas, ctx: canvas.getContext('2d') }
}

/**
 * Laser-etched die marking. Original codes only, low contrast like real
 * laser marking, never printed white text.
 */
export function createDieMarkingTexture(): CanvasTexture {
  const { canvas, ctx } = makeCanvas(256, 256)
  if (ctx !== null) {
    ctx.clearRect(0, 0, 256, 256)
    ctx.fillStyle = 'rgba(206,216,232,0.72)'
    ctx.textAlign = 'center'
    ctx.font = '600 30px monospace'
    ctx.fillText('A1 ULTRA', 128, 84)
    ctx.font = '400 20px monospace'
    ctx.fillStyle = 'rgba(206,216,232,0.55)'
    ctx.fillText('AX24-0317', 128, 124)
    ctx.fillText('3NM · TW', 128, 154)
    ctx.strokeStyle = 'rgba(206,216,232,0.4)'
    ctx.strokeRect(52, 52, 152, 130)
  }
  const texture = new CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/**
 * Procedural floorplan: regular arrays plus noisy logic at different
 * reflectivities, driving die roughness and faint emissive.
 */
export function createFloorplanTexture(): CanvasTexture {
  const { canvas, ctx } = makeCanvas(256, 256)
  if (ctx !== null) {
    // Transparent base: the overlay only adds faint cool structure over
    // the dark die (an opaque gray floorplan veiled it pale).
    ctx.clearRect(0, 0, 256, 256)
    let v = 1237
    const rng = (): number => {
      v = (v * 9301 + 49297) % 233280
      return v / 233280
    }
    // Regular SRAM-like arrays top-left.
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        ctx.fillStyle = `rgba(150,160,215,${(0.07 + rng() * 0.05).toFixed(3)})`
        ctx.fillRect(16 + c * 6, 16 + r * 6, 5, 5)
      }
    }
    // Noisy logic elsewhere.
    for (let i = 0; i < 520; i++) {
      ctx.fillStyle = `rgba(140,150,210,${(0.03 + rng() * 0.1).toFixed(3)})`
      ctx.fillRect(128 + rng() * 112, rng() * 240, 3 + rng() * 9, 2 + rng() * 5)
    }
    // Four large blocks outlined at distinct reflectivity.
    ctx.strokeStyle = 'rgba(170,180,235,0.18)'
    ctx.lineWidth = 2
    ctx.strokeRect(16, 128, 96, 112)
    ctx.strokeRect(128, 128, 112, 48)
    ctx.strokeRect(12, 12, 104, 104)
    ctx.fillStyle = 'rgba(120,130,200,0.07)'
    ctx.fillRect(16, 128, 96, 112)
  }
  const texture = new CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/** Illegible regulatory micro-text block for the rear panel. */
export function createRegulatoryTexture(): CanvasTexture {
  const { canvas, ctx } = makeCanvas(256, 48)
  if (ctx !== null) {
    ctx.clearRect(0, 0, 256, 48)
    ctx.fillStyle = 'rgba(220,228,238,0.4)'
    ctx.font = '400 11px monospace'
    ctx.fillText('AX-1U · 3.7V · IP68 · DESIGNED BY AETHER · SN 0042', 8, 20)
    ctx.fillText('RoHS · CE · FCC ID AX1U2026 · MADE FOR CONCEPT', 8, 36)
  }
  const texture = new CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}
