import { CanvasTexture, SRGBColorSpace } from 'three'
import { BOARD_PARTS, MAIN_BOARD, SHIELD_CANS } from './layout.ts'

/**
 * Procedural print for the round 05 showcase parts: the battery label, the
 * main board's solder mask and silkscreen, chip markings, and thermal
 * paste. Every mark is original (the fictional Aether line and invented
 * part codes); no real manufacturer's wordmark or code. Deterministic: a
 * seeded generator, so every load paints the same board.
 */
function makeCanvas(
  w: number,
  h: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null } {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return { canvas, ctx: canvas.getContext('2d') }
}

function finish(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

/** Small seeded PRNG (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Battery label: matte graphite print, white type, ratings from the data layer. */
export function createBatteryLabelTexture(): CanvasTexture {
  const W = 512
  const H = 600
  const { canvas, ctx } = makeCanvas(W, H)
  if (ctx !== null) {
    ctx.fillStyle = '#1d2531'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#4f7cff'
    ctx.fillRect(40, 64, 6, 120)
    ctx.fillStyle = '#eef1f5'
    ctx.font = '600 58px sans-serif'
    ctx.fillText('AETHER', 62, 112)
    ctx.font = '400 26px sans-serif'
    ctx.fillStyle = 'rgba(238,241,245,0.82)'
    ctx.fillText('Silicon-carbon Li-ion polymer', 62, 152)
    ctx.font = '600 44px monospace'
    ctx.fillStyle = '#eef1f5'
    ctx.fillText('4000 mAh', 62, 250)
    ctx.font = '400 28px monospace'
    ctx.fillStyle = 'rgba(238,241,245,0.75)'
    ctx.fillText('15.2 Wh  ·  3.8 V', 62, 296)
    ctx.strokeStyle = 'rgba(238,241,245,0.25)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(40, 340)
    ctx.lineTo(W - 40, 340)
    ctx.stroke()
    // Warning pictograms (outlines only) and fine print.
    for (let i = 0; i < 4; i++) {
      const x = 62 + i * 70
      ctx.strokeStyle = 'rgba(238,241,245,0.6)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(x, 420)
      ctx.lineTo(x + 26, 374)
      ctx.lineTo(x + 52, 420)
      ctx.closePath()
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(238,241,245,0.4)'
    for (let row = 0; row < 6; row++) {
      ctx.fillRect(62, 452 + row * 16, 250 + ((row * 37) % 90), 5)
    }
    // Pseudo matrix code.
    const r = rng(7)
    const cx = W - 152
    const cy = 384
    ctx.fillStyle = '#eef1f5'
    for (let y = 0; y < 14; y++) {
      for (let x = 0; x < 14; x++) {
        const edge = x === 0 || y === 13
        if (edge || r() > 0.52) ctx.fillRect(cx + x * 7, cy + y * 7, 6, 6)
      }
    }
  }
  return finish(canvas)
}

/**
 * Main board rear face: green solder mask over Manhattan copper routing,
 * vias, gold pads under every component footprint, and silkscreen
 * designators. Drawn for a plane turned PI about y (it faces the rear), so
 * world x runs right to left across the canvas.
 */
export function createBoardMaskTexture(): CanvasTexture {
  const W = 792
  const H = 552
  const { canvas, ctx } = makeCanvas(W, H)
  if (ctx !== null) {
    const x0 = MAIN_BOARD.cx - MAIN_BOARD.w / 2
    const y0 = MAIN_BOARD.cy - MAIN_BOARD.h / 2
    const u = (x: number): number => ((x0 + MAIN_BOARD.w - x) / MAIN_BOARD.w) * W
    const v = (y: number): number => ((y0 + MAIN_BOARD.h - y) / MAIN_BOARD.h) * H
    const mm = W / (MAIN_BOARD.w * 1000)
    ctx.fillStyle = '#0d3a2d'
    ctx.fillRect(0, 0, W, H)
    const r = rng(11)
    // Copper under mask: lighter green, routed in runs with 45-degree jogs.
    ctx.strokeStyle = '#1f5c45'
    ctx.lineCap = 'round'
    for (let i = 0; i < 150; i++) {
      ctx.lineWidth = r() > 0.8 ? 4 : 2
      let x = r() * W
      let y = r() * H
      ctx.beginPath()
      ctx.moveTo(x, y)
      for (let k = 0; k < 4; k++) {
        const len = 20 + r() * 90
        const dir = Math.floor(r() * 4)
        if (dir === 0) x += len
        else if (dir === 1) x -= len
        else if (dir === 2) y += len
        else y -= len
        const jog = (r() - 0.5) * 16
        ctx.lineTo(x + jog, y + jog)
      }
      ctx.stroke()
    }
    // Ground pour hatch along the edges.
    ctx.fillStyle = '#123f31'
    ctx.fillRect(0, 0, W, 10)
    ctx.fillRect(0, H - 10, W, 10)
    // Vias.
    for (let i = 0; i < 260; i++) {
      const x = r() * W
      const y = r() * H
      ctx.fillStyle = '#c9a24a'
      ctx.beginPath()
      ctx.arc(x, y, 2.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#0a2b22'
      ctx.beginPath()
      ctx.arc(x, y, 1.1, 0, Math.PI * 2)
      ctx.fill()
    }
    // Pads ringing each component footprint, plus silkscreen outlines.
    ctx.font = '600 15px monospace'
    let n = 1
    for (const part of BOARD_PARTS) {
      const cx = u(part.x)
      const cy = v(part.y)
      const w = part.w * 1000 * mm
      const h = part.h * 1000 * mm
      ctx.fillStyle = '#c9a24a'
      const pads = Math.max(3, Math.round(w / 9))
      for (let k = 0; k < pads; k++) {
        const px = cx - w / 2 + ((k + 0.5) / pads) * w
        ctx.fillRect(px - 2.5, cy - h / 2 - 7, 5, 5)
        ctx.fillRect(px - 2.5, cy + h / 2 + 2, 5, 5)
      }
      ctx.strokeStyle = 'rgba(225,230,214,0.75)'
      ctx.lineWidth = 2
      ctx.strokeRect(cx - w / 2 - 10, cy - h / 2 - 10, w + 20, h + 20)
      ctx.fillStyle = 'rgba(225,230,214,0.85)'
      ctx.fillText(`U${n}`, cx - w / 2 - 8, cy - h / 2 - 14)
      n += 1
    }
    // Shield-can fence pads.
    ctx.strokeStyle = '#b8954a'
    ctx.lineWidth = 3
    for (const can of SHIELD_CANS) {
      ctx.strokeRect(
        u(can.x + can.w / 2),
        v(can.y + can.h / 2),
        can.w * 1000 * mm,
        can.h * 1000 * mm,
      )
    }
    // Passive rows and their designators.
    for (let i = 0; i < 90; i++) {
      const x = r() * W
      const y = r() * H
      ctx.fillStyle = '#c9a24a'
      ctx.fillRect(x, y, 3, 5)
      ctx.fillRect(x + 7, y, 3, 5)
    }
    ctx.fillStyle = 'rgba(225,230,214,0.8)'
    ctx.font = '600 16px monospace'
    ctx.fillText('AETHER ONE X  MLB  REV C', 18, H - 20)
    ctx.font = '400 12px monospace'
    for (let i = 0; i < 26; i++) {
      ctx.fillText(`C${200 + i * 7}`, r() * (W - 40), 20 + r() * (H - 40))
    }
  }
  return finish(canvas)
}

/** Atlas cells for chip and sheet markings (4 x 2 grid, 512 x 256 each). */
export const MARK_CELLS = {
  memory: 0,
  modem: 1,
  pmic: 2,
  charge: 3,
  bms: 4,
  graphite: 5,
  cam: 6,
  port: 7,
} as const

const MARKS: ReadonlyArray<[string, string]> = [
  ['AX UFS4', '1TB  2741'],
  ['AXM-5', '5G  2738'],
  ['AXP-2', 'PM  2735'],
  ['AXC-40', 'WPC 2736'],
  ['AX-BP3', '2S  2730'],
  ['GRAPHITE  T0.12', 'DO NOT CREASE'],
  ['NOVEK 50', 'OIS 2742'],
  ['USB-C', '2737'],
]

/** Laser-mark style atlas: low-contrast light gray on transparent. */
export function createMarkAtlasTexture(): CanvasTexture {
  const W = 2048
  const H = 512
  const { canvas, ctx } = makeCanvas(W, H)
  if (ctx !== null) {
    ctx.clearRect(0, 0, W, H)
    MARKS.forEach(([a, b], i) => {
      const cx = (i % 4) * 512
      const cy = Math.floor(i / 4) * 256
      ctx.fillStyle = 'rgba(210,216,226,0.78)'
      ctx.font = '600 64px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(a, cx + 256, cy + 112)
      ctx.font = '400 46px monospace'
      ctx.fillStyle = 'rgba(210,216,226,0.55)'
      ctx.fillText(b, cx + 256, cy + 178)
      // Pin-one dot.
      ctx.beginPath()
      ctx.arc(cx + 40, cy + 40, 12, 0, Math.PI * 2)
      ctx.fill()
    })
  }
  return finish(canvas)
}

/** UV rect (u0, v0, u1, v1) of an atlas cell, for remapping a plane. */
export function markCellUv(cell: number): [number, number, number, number] {
  const col = cell % 4
  const row = Math.floor(cell / 4)
  return [col / 4, 1 - (row + 1) / 2, (col + 1) / 4, 1 - row / 2]
}

/** Thermal paste: a pressed gray smear with soft edges (alpha). */
export function createPasteTexture(): CanvasTexture {
  const S = 256
  const { canvas, ctx } = makeCanvas(S, S)
  if (ctx !== null) {
    ctx.clearRect(0, 0, S, S)
    const r = rng(23)
    for (let i = 0; i < 900; i++) {
      const x = 28 + r() * (S - 56)
      const y = 28 + r() * (S - 56)
      const g = 150 + Math.floor(r() * 50)
      ctx.fillStyle = `rgba(${g},${g + 4},${g + 8},${0.25 + r() * 0.3})`
      ctx.beginPath()
      ctx.ellipse(x, y, 4 + r() * 12, 2 + r() * 6, r() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  return finish(canvas)
}
