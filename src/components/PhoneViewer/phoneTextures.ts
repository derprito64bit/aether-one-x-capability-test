import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three'

function colorFromCanvas(canvas: HTMLCanvasElement, anisotropy = 4): CanvasTexture {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = 'srgb'
  texture.anisotropy = anisotropy
  return texture
}

function dataFromCanvas(canvas: HTMLCanvasElement, anisotropy = 1): CanvasTexture {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = NoColorSpace
  texture.anisotropy = anisotropy
  return texture
}

function makeCanvas(
  sizeW: number,
  sizeH: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null } {
  const canvas = document.createElement('canvas')
  canvas.width = sizeW
  canvas.height = sizeH
  return { canvas, ctx: canvas.getContext('2d') }
}

/** Seeded deterministic pseudo-random generator so textures are stable per load. */
function seededRng(seed: number): () => number {
  let v = seed % 233280
  return () => {
    v = (v * 9301 + 49297) % 233280
    return v / 233280
  }
}

/** Subtle ceramic mottle: color map plus roughness data map from one canvas. */
export function createCeramicMottleTexture(): { color: CanvasTexture; data: CanvasTexture } {
  const { canvas, ctx } = makeCanvas(128, 128)
  if (ctx !== null) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 128, 128)
    const rng = seededRng(2024 * 7919)
    for (let i = 0; i < 46; i++) {
      const x = rng() * 128
      const y = rng() * 128
      const r = 4 + rng() * 14
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgba(241,241,243,${0.35 + rng() * 0.35})`)
      g.addColorStop(1, 'rgba(241,241,243,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    // Etch sparkle: sparse subpixel facets, darker (smoother) in the
    // roughness channel so they glint under a raking source. Mipmaps average
    // them away at normal distance; they resolve only in macro, which is
    // exactly the specified behaviour.
    for (let i = 0; i < 130; i++) {
      const x = Math.floor(rng() * 128)
      const y = Math.floor(rng() * 128)
      const a = 0.25 + rng() * 0.45
      ctx.fillStyle = `rgba(96,96,104,${a.toFixed(3)})`
      ctx.fillRect(x, y, 1, 1)
    }
  }
  return { color: colorFromCanvas(canvas, 1), data: dataFromCanvas(canvas, 1) }
}

/** Fine parallel machining grooves for the titanium roughness channel. */
export function createBrushTexture(): CanvasTexture {
  const { canvas, ctx } = makeCanvas(64, 64)
  if (ctx !== null) {
    const rng = seededRng(77 * 7919)
    const grooves: number[] = []
    let phase = 0
    for (let x = 0; x < 64; x++) {
      phase = phase * 0.86 + (rng() - 0.5) * 0.5
      let g = x % 2 === 0 ? 0.77 : 0.98
      g += (rng() - 0.5) * 0.05 + phase * 0.018
      grooves.push(Math.min(0.99, Math.max(0.68, g)))
    }
    for (const cx of [20, 21, 44, 45]) {
      const slot = grooves[cx]
      if (slot !== undefined) grooves[cx] = 0.62
    }
    for (let x = 0; x < 64; x++) {
      const slot = grooves[x]
      if (slot === undefined) continue
      const g = Math.round(slot * 255)
      ctx.fillStyle = `rgb(${g},${g},${g})`
      ctx.fillRect(x, 0, 1, 64)
    }
  }
  const texture = dataFromCanvas(canvas, 8)
  // Extrusion UVs run in meters, so the map must tile; repeat is scaled per
  // finish from grainAmplitude in createPhoneMaterials. Rotated a quarter
  // turn so groove lines run along each rail rather than across it.
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.center.set(0.5, 0.5)
  texture.rotation = Math.PI / 2
  return texture
}

/** Center-to-edge gloss gradient driving lens roughness. */
export function createLensGlossMap(): CanvasTexture {
  const { canvas, ctx } = makeCanvas(64, 64)
  if (ctx !== null) {
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30)
    g.addColorStop(0, '#a8a8b0')
    g.addColorStop(0.4, '#cfcfd6')
    g.addColorStop(1, '#f2f2f4')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
  }
  return dataFromCanvas(canvas, 1)
}

/**
 * Radial AR-coating thickness map: shift strengthens toward the lens edge,
 * as on a real curved coated element. Shared by all three lens glasses.
 */
export function createCoatingThicknessMap(): CanvasTexture {
  const { canvas, ctx } = makeCanvas(64, 64)
  if (ctx !== null) {
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30)
    g.addColorStop(0, '#3c3c3c')
    g.addColorStop(0.55, '#8a8a8a')
    g.addColorStop(1, '#e8e8e8')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
  }
  return dataFromCanvas(canvas, 1)
}

/** Vertical roughness gradient for barrel walls. Cylinder v=1 is the deep end. */
export function createBarrelGradientMap(): CanvasTexture {
  const { canvas, ctx } = makeCanvas(8, 64)
  if (ctx !== null) {
    // Canvas top row is v=1 (flipY): deep end rough (0.9), mouth smooth (0.4).
    const g = ctx.createLinearGradient(0, 0, 0, 64)
    g.addColorStop(0, '#e6e6e6')
    g.addColorStop(1, '#666666')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 8, 64)
  }
  return dataFromCanvas(canvas, 1)
}

/** Brand mark decal texture ("AETHER"). */
export function createLogoTexture(): CanvasTexture {
  const { canvas, ctx } = makeCanvas(512, 128)
  if (ctx !== null) {
    ctx.clearRect(0, 0, 512, 128)
    ctx.fillStyle = 'rgba(240,245,252,0.95)'
    ctx.font = '600 76px "Helvetica Neue", Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('A E T H E R', 256, 68)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/** Procedural aurora wallpaper for the emissive display panel. */
export function createScreenTexture(): CanvasTexture {
  const { canvas, ctx } = makeCanvas(256, 512)
  if (ctx !== null) {
    // Same luminous cobalt wallpaper as the film's live screen (site
    // overhaul): deep cobalt crown, azure middle, warm porcelain bloom.
    const gradient = ctx.createLinearGradient(0, 0, 0, 512)
    gradient.addColorStop(0, '#0f2c66')
    gradient.addColorStop(0.5, '#2a64d6')
    gradient.addColorStop(1, '#7fa6ee')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 512)
    const glow = ctx.createRadialGradient(128, 522, 10, 128, 522, 318)
    glow.addColorStop(0, 'rgba(255,243,226,0.85)')
    glow.addColorStop(1, 'rgba(255,243,226,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, 256, 512)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/**
 * Oleophobic smudge map for the front glass roughness channel. Mid-grey
 * base with darker (smoother) thumb-zone blobs in the lower third, kept
 * under the threshold of conscious notice.
 */
export function createSmudgeMap(): CanvasTexture {
  const { canvas, ctx } = makeCanvas(128, 256)
  if (ctx !== null) {
    ctx.fillStyle = '#b0b0b0'
    ctx.fillRect(0, 0, 128, 256)
    const rng = (seed: number): number => {
      const v = (seed * 9301 + 49297) % 233280
      return v / 233280
    }
    for (let i = 0; i < 9; i++) {
      const x = 20 + rng(i + 1) * 88
      const y = 150 + rng(i + 40) * 90
      const r = 12 + rng(i + 80) * 22
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, 'rgba(112,112,112,0.55)')
      g.addColorStop(1, 'rgba(112,112,112,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  return dataFromCanvas(canvas, 1)
}

/** Illegible regulatory micro-text for the rear panel. */
export function createRegulatoryTexture(): CanvasTexture {
  const { canvas, ctx } = makeCanvas(256, 48)
  if (ctx !== null) {
    ctx.clearRect(0, 0, 256, 48)
    ctx.fillStyle = 'rgba(220,228,238,0.4)'
    ctx.font = '400 11px monospace'
    ctx.fillText('AX-1U · 3.7V · IP68 · SN 0042', 8, 20)
    ctx.fillText('RoHS · CE · FCC ID AX1U2026', 8, 36)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/**
 * Off-screen finish: a barely-there vertical gradient with a blue-violet
 * polarizer cast. Multiplied over the near-black base it keeps the panel a
 * dark mirror instead of a flat black.
 */
export function createScreenGradientTexture(): CanvasTexture {
  const { canvas, ctx } = makeCanvas(16, 256)
  if (ctx !== null) {
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, '#e9edff')
    g.addColorStop(0.45, '#f4f6ff')
    g.addColorStop(1, '#d9dff5')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 16, 256)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/**
 * Subpixel hint: high-frequency RGB stripes at very low amplitude for the
 * macro display overlay. Faded in only below ~12cm camera distance by the
 * model shell; never shipped at normal distance, where it would alias.
 */
export function createSubpixelTexture(): CanvasTexture {
  const { canvas, ctx } = makeCanvas(96, 32)
  if (ctx !== null) {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, 96, 32)
    for (let x = 0; x < 96; x += 3) {
      ctx.fillStyle = 'rgba(255,64,64,0.5)'
      ctx.fillRect(x, 0, 1, 32)
      ctx.fillStyle = 'rgba(64,255,64,0.5)'
      ctx.fillRect(x + 1, 0, 1, 32)
      ctx.fillStyle = 'rgba(64,64,255,0.5)'
      ctx.fillRect(x + 2, 0, 1, 32)
    }
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(24, 24)
  return texture
}

/**
 * Medallion micro-detail (Prompt A2 section 4.3, path B): fine radial brush
 * marks for the blade faces plus a slightly smoother ring band. Roughness
 * domain only; the iris shape itself is real geometry.
 */
export function createMedallionTexture(): CanvasTexture {
  const S = 256
  const { canvas, ctx } = makeCanvas(S, S)
  if (ctx !== null) {
    ctx.fillStyle = '#3a3a3a'
    ctx.fillRect(0, 0, S, S)
    const rng = seededRng(168 * 7919)
    // Radial brushing: many short arcs at random radii, low contrast.
    for (let i = 0; i < 420; i++) {
      const r = 12 + rng() * 112
      const a0 = rng() * Math.PI * 2
      const sweep = 0.05 + rng() * 0.22
      const v = 40 + Math.floor(rng() * 40)
      ctx.strokeStyle = `rgba(${v},${v},${v},0.5)`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(S / 2, S / 2, r, a0, a0 + sweep)
      ctx.stroke()
    }
    // Ring band slightly smoother (darker = lower roughness).
    ctx.strokeStyle = 'rgba(28,28,28,0.9)'
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.arc(S / 2, S / 2, S / 2 - 6, 0, Math.PI * 2)
    ctx.stroke()
  }
  return dataFromCanvas(canvas, 4)
}

/**
 * Collar arc text (Prompt A2 section 5.1/5.3): 2048 annular map in the
 * roughness domain. Laser etching scatters, so glyphs read rougher
 * (brighter) than the polished base. RingGeometry UVs are planar over the
 * disc, so canvas pixels map linearly: pixel radius = r / (2 * rOut) * S.
 * flipY puts canvas row 0 at +y; glyph angles compensate.
 */
export function createCollarTextTexture(
  partner: string,
  rIn: number,
  rOut: number,
  notchAngleDeg = 90,
): CanvasTexture {
  const S = 2048
  const { canvas, ctx } = makeCanvas(S, S)
  const px = (r: number): number => (r / (2 * rOut)) * S
  const bandR = px((rIn + rOut) / 2)
  if (ctx !== null) {
    ctx.fillStyle = '#232323'
    ctx.fillRect(0, 0, S, S)
    ctx.fillStyle = '#8f8f8f'
    ctx.strokeStyle = '#8f8f8f'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // Partner name on the lower-left arc: 50 degrees centred at 225.
    const word = partner.split('')
    const spanDeg = 50
    const centerDeg = 225
    const sizePx = (px(rOut) - px(rIn)) * 0.52
    ctx.font = `600 ${Math.round(sizePx)}px "Helvetica Neue", Arial, sans-serif`
    word.forEach((glyph, i) => {
      const t = word.length <= 1 ? 0.5 : i / (word.length - 1)
      const deg = centerDeg - spanDeg / 2 + t * spanDeg
      const rad = (deg * Math.PI) / 180
      // Canvas y flips: ring angle θ lands at canvas angle -θ.
      const x = S / 2 + bandR * Math.cos(rad)
      const y = S / 2 - bandR * Math.sin(rad)
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(-(rad - Math.PI / 2))
      ctx.fillText(glyph, 0, 0)
      ctx.restore()
    })
    // Engraved index notch at 12 o'clock (ring angle 90).
    const nRad = (notchAngleDeg * Math.PI) / 180
    const nx = S / 2 + bandR * Math.cos(nRad)
    const ny = S / 2 - bandR * Math.sin(nRad)
    ctx.save()
    ctx.translate(nx, ny)
    ctx.rotate(-(nRad - Math.PI / 2))
    ctx.lineWidth = Math.max(3, sizePx * 0.12)
    ctx.beginPath()
    ctx.moveTo(0, -sizePx * 0.5)
    ctx.lineTo(0, sizePx * 0.5)
    ctx.stroke()
    ctx.restore()
  }
  const texture = dataFromCanvas(canvas, 8)
  texture.anisotropy = 8
  return texture
}

/** Per-optic micro-text on the cover glass (Prompt A2 section 5.2). */
export interface MicroTextItem {
  text: string
  /** Glass-local meters from the glass centre. */
  x: number
  y: number
}

/**
 * Flat 1024 map for the cover-glass micro-text, roughness domain.
 * CircleGeometry UVs are planar over the disc: pixel = (pos / (2r) + 0.5) S.
 * The glass mesh turns PI about Y to face the rear, which mirrors glass x
 * into phone x, so labels are placed at -x to land beside their optics
 * (they sat beside the opposite lens before); glyphs still read forwards.
 */
export function createMicroTextTexture(items: MicroTextItem[], glassR: number): CanvasTexture {
  const S = 1024
  const { canvas, ctx } = makeCanvas(S, S)
  if (ctx !== null) {
    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(0, 0, S, S)
    ctx.fillStyle = '#7d7d7d'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `500 26px ui-monospace, monospace`
    for (const item of items) {
      const x = (-item.x / (2 * glassR) + 0.5) * S
      const y = (item.y / (2 * glassR) + 0.5) * S
      // flipY: canvas row 0 is +y.
      ctx.fillText(item.text, x, S - y)
    }
  }
  return dataFromCanvas(canvas, 8)
}

/**
 * Knurl LOD1 maps (Prompt A2 section 6): a repeating wedge normal map plus
 * a matching roughness map for a plain cylinder wall. Correct beyond ~25cm.
 */
export function createKnurlMaps(): { normal: CanvasTexture; rough: CanvasTexture } {
  const W = 256
  const H = 64
  const n = makeCanvas(W, H)
  const r = makeCanvas(W, H)
  const nctx = n.ctx
  const rctx = r.ctx
  if (nctx !== null && rctx !== null) {
    const nImg = nctx.createImageData(W, H)
    const rImg = rctx.createImageData(W, H)
    // One wedge per 16px: triangle-wave height, normals from the slope.
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const phase = (((x % 16) + 16) % 16) / 16
        const h = phase < 0.5 ? phase * 2 : 2 - phase * 2
        const slope = phase < 0.5 ? 1 : -1
        const inv = 1 / Math.hypot(slope * 2.2, 1)
        const i = (y * W + x) * 4
        nImg.data[i] = Math.round((-slope * 2.2 * inv * 0.5 + 0.5) * 255)
        nImg.data[i + 1] = 128
        nImg.data[i + 2] = Math.round((inv * 0.5 + 0.5) * 255)
        nImg.data[i + 3] = 255
        const g = Math.round((110 + h * 90) * 1)
        rImg.data[i] = g
        rImg.data[i + 1] = g
        rImg.data[i + 2] = g
        rImg.data[i + 3] = 255
      }
    }
    nctx.putImageData(nImg, 0, 0)
    rctx.putImageData(rImg, 0, 0)
  }
  const normal = new CanvasTexture(n.canvas)
  normal.colorSpace = NoColorSpace
  normal.wrapS = RepeatWrapping
  normal.wrapT = RepeatWrapping
  const rough = dataFromCanvas(r.canvas, 4)
  rough.wrapS = RepeatWrapping
  rough.wrapT = RepeatWrapping
  return { normal, rough }
}

/**
 * Bezel ink grain (Prompt A2 section 7): fine matte grain, high frequency,
 * low amplitude. The alpha feather at the active-area edge is baked into
 * the alpha channel: 0.12mm gradient from the printing process.
 */
export function createBezelGrainTexture(
  w: number,
  h: number,
  featherPx: number,
  insetXPx: number,
  insetYPx: number,
): CanvasTexture {
  const { canvas, ctx } = makeCanvas(w, h)
  if (ctx !== null) {
    ctx.fillStyle = '#d2d2d2'
    ctx.fillRect(0, 0, w, h)
    const rng = seededRng(145 * 7919)
    for (let i = 0; i < w * h * 0.04; i++) {
      const v = 165 + Math.floor(rng() * 60)
      ctx.fillStyle = `rgba(${v},${v},${v},0.6)`
      ctx.fillRect(Math.floor(rng() * w), Math.floor(rng() * h), 1, 1)
    }
    // Feather: erase the active-area opening with a soft edge.
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.shadowColor = 'rgba(0,0,0,1)'
    ctx.shadowBlur = featherPx
    ctx.fillRect(insetXPx, insetYPx, w - insetXPx * 2, h - insetYPx * 2)
    ctx.restore()
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = NoColorSpace
  texture.anisotropy = 4
  return texture
}
