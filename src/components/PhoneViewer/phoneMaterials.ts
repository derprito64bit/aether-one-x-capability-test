import {
  Color,
  MeshPhysicalMaterial,
  RepeatWrapping,
  type MeshPhysicalMaterialParameters,
} from 'three'
import { FINISH_PARAMS, type FinishParams } from './phoneFinishes.ts'
import { COLLAR, OPTICS_PARTNER } from './phoneDimensions.ts'
import {
  createBarrelGradientMap,
  createBezelGrainTexture,
  createBrushTexture,
  createCeramicMottleTexture,
  createCoatingThicknessMap,
  createCollarTextTexture,
  createKnurlMaps,
  createLensGlossMap,
  createLogoTexture,
  createMedallionTexture,
  createMicroTextTexture,
  createRegulatoryTexture,
  createScreenGradientTexture,
  createScreenTexture,
  createSmudgeMap,
  createSubpixelTexture,
} from './phoneTextures.ts'

export { FINISH_COLORS, FINISH_PARAMS, type FinishParams } from './phoneFinishes.ts'

export interface PhoneMaterialSet {
  /**
   * Frame rails, one instance per side. On a real extruded rail the brush
   * grain runs along each side, rotating 90 degrees at every corner, so the
   * anisotropy rotation alternates: X rails (top/bottom) run one way, Y
   * rails (left/right) the other. The corner transition is invisible at
   * 0.25mm; the two long rails finally read correctly.
   */
  framePX: MeshPhysicalMaterial
  frameNX: MeshPhysicalMaterial
  framePY: MeshPhysicalMaterial
  frameNY: MeshPhysicalMaterial
  /**
   * Machined chamfer faces. Same alloy as frame, polished smoother by the
   * tool (0.6x roughness), so the chamfer carries a tighter highlight line
   * than the rail behind it. Assigned to discrete machined parts (seat,
   * collars, flanges). Extrude bevels share their parent extrusion and
   * cannot take a separate instance without splitting the geometry.
   */
  frameChamfer: MeshPhysicalMaterial
  back: MeshPhysicalMaterial
  island: MeshPhysicalMaterial
  /** Front glass surface, reflective near-black. */
  screen: MeshPhysicalMaterial
  /** Inner emissive display panel inset behind the glass. */
  display: MeshPhysicalMaterial
  lensRing: MeshPhysicalMaterial
  /**
   * Per-lens cover glasses. Coatings are tuned per element in life: A leans
   * green, B leans magenta, C stays near neutral. Low saturation throughout.
   */
  lensGlassA: MeshPhysicalMaterial
  lensGlassB: MeshPhysicalMaterial
  lensGlassC: MeshPhysicalMaterial
  /** Machined inner barrel wall visible through the lens glass. */
  lensBarrel: MeshPhysicalMaterial
  lensCavity: MeshPhysicalMaterial
  /** Faint deep sensor reflection inside each optical assembly. */
  sensorGlint: MeshPhysicalMaterial
  button: MeshPhysicalMaterial
  focusRing: MeshPhysicalMaterial
  logo: MeshPhysicalMaterial
  /** Illegible regulatory micro-text block, present because real devices have one. */
  regulatory: MeshPhysicalMaterial
  /** Macro-only RGB stripe overlay, faded by camera distance in the shell. */
  subpixel: MeshPhysicalMaterial
  /** USB-C receptacle interior. */
  port: MeshPhysicalMaterial
  /** Receptacle tongue, lighter than the cavity walls. */
  portTongue: MeshPhysicalMaterial
  /** Contact glint strip on the tongue face. */
  portContact: MeshPhysicalMaterial
  /** Earpiece and mic openings. */
  speaker: MeshPhysicalMaterial
  /** Dark antenna separation seams. */
  antenna: MeshPhysicalMaterial
  /** SIM tray strip. */
  simTray: MeshPhysicalMaterial
  /** Outer collar wall: knurled, machined. */
  collarOuter: MeshPhysicalMaterial
  /** Outer collar top face: polished, carries the etched partner arc text. */
  collarTop: MeshPhysicalMaterial
  /** Plain collar wall with baked knurl maps (LOD1). */
  knurlWall: MeshPhysicalMaterial
  /** Step ring: matte bead-blasted, not polished. */
  collarStep: MeshPhysicalMaterial
  /** Dark seal groove where cover glass meets the step. */
  glassSeal: MeshPhysicalMaterial
  /** Domed module cover glass with per-optic micro-text. */
  moduleGlass: MeshPhysicalMaterial
  /** Polished iris inlay under the glass, much sharper than the collar. */
  medallion: MeshPhysicalMaterial
  /** Medallion hairline ring. */
  medallionRing: MeshPhysicalMaterial
  /** Folded-optic window pane. */
  periscopeGlass: MeshPhysicalMaterial
  /** Angled prism floor inside the periscope cavity. */
  periscopePrism: MeshPhysicalMaterial
  /** Flash LED dies behind the diffuser. */
  flashArc: MeshPhysicalMaterial
  /** Flash diffuser arc in the step ring. */
  flashDiffuser: MeshPhysicalMaterial
  /** ToF IR-pass filter window. Near-black but not flat. */
  tofWindow: MeshPhysicalMaterial
  /** ToF emitter aperture, slightly brighter than the receiver. */
  tofEmitter: MeshPhysicalMaterial
  /** ToF receiver aperture with square sensor edge. */
  tofReceiver: MeshPhysicalMaterial
  /** ToF housing bridge between the apertures. */
  tofHousing: MeshPhysicalMaterial
  /** Module microphone dot. */
  moduleMic: MeshPhysicalMaterial
  /** Display bezel: matte ink under the glass, feathered at the active area. */
  bezel: MeshPhysicalMaterial
  /** Lower rear panel, textured family, on split finishes. */
  panelLower: MeshPhysicalMaterial
  /** Panel split seam groove, self-shadowing. */
  panelSeam: MeshPhysicalMaterial
  /** Punch-hole glint and LED faces. */
  flashGlass: MeshPhysicalMaterial
}

export const MATERIAL_KEYS = [
  'framePX',
  'frameNX',
  'framePY',
  'frameNY',
  'frameChamfer',
  'back',
  'island',
  'screen',
  'display',
  'lensRing',
  'lensGlassA',
  'lensGlassB',
  'lensGlassC',
  'lensBarrel',
  'lensCavity',
  'sensorGlint',
  'button',
  'focusRing',
  'logo',
  'regulatory',
  'subpixel',
  'port',
  'portTongue',
  'portContact',
  'speaker',
  'antenna',
  'simTray',
  'collarOuter',
  'collarTop',
  'knurlWall',
  'collarStep',
  'glassSeal',
  'moduleGlass',
  'medallion',
  'medallionRing',
  'periscopeGlass',
  'periscopePrism',
  'flashArc',
  'flashDiffuser',
  'tofWindow',
  'tofEmitter',
  'tofReceiver',
  'tofHousing',
  'moduleMic',
  'bezel',
  'panelLower',
  'panelSeam',
  'flashGlass',
] as const satisfies ReadonlyArray<keyof PhoneMaterialSet>

/** The four rail instances, updated as one in the finish lerp. */
export const RAIL_KEYS = [
  'framePX',
  'frameNX',
  'framePY',
  'frameNY',
] as const satisfies ReadonlyArray<keyof PhoneMaterialSet>

/**
 * Cover-glass opacity with the display lit in the film: the director lerps
 * from 1 (screen off, dark mirror) to this as the screen powers on.
 */
export const GLASS_SCREEN_ON_OPACITY = 0.42
/**
 * Product-page viewers rest with the screen on: a lighter glass veil and a
 * slightly hot panel so the cobalt wallpaper reads luminous through the
 * dark cover glass. At the old opaque default the viewers showed a black
 * slab with only a light's highlight in it (and the panel sampled one
 * corner texel; see roundedRectSlabGeometry).
 */
const VIEWER_GLASS_OPACITY = 0.22
const VIEWER_SCREEN_EMISSIVE = 1.1

function makeMaterial(overrides: MeshPhysicalMaterialParameters): MeshPhysicalMaterial {
  // Transparent from birth (Prompt A section 1): the x-ray opacity dissolve
  // must never trigger a mid-film shader recompile. Opacity stays 1 until
  // a director writes otherwise.
  return new MeshPhysicalMaterial({ envMapIntensity: 1, transparent: true, ...overrides })
}

/** Creates a full independent material set for one phone instance. */
export function createPhoneMaterials(params: FinishParams): PhoneMaterialSet {
  const ceramic = createCeramicMottleTexture()
  const brush = createBrushTexture()
  const lensGloss = createLensGlossMap()
  const coating = createCoatingThicknessMap()
  const barrelGradient = createBarrelGradientMap()
  const smudge = createSmudgeMap()
  // Groove period follows the finish: slate's heavy grain reads near 0.08mm,
  // obsidian's faint grain near 0.13mm.
  brush.repeat.setScalar(90 + params.grainAmplitude * 80)
  // Ceramic mottle tiles: the back panel's UVs are 0..1 over the panel, so
  // 8 x 16 tiles keep a texel near 0.07mm and the etch sparkle subpixel
  // until macro, as specified. Stretched once over the panel, each sparkle
  // texel read as a 0.6mm white fleck.
  for (const map of [ceramic.color, ceramic.data]) {
    map.wrapS = RepeatWrapping
    map.wrapT = RepeatWrapping
    map.repeat.set(8, 16)
  }

  const makeRail = (anisotropyRotation: number): MeshPhysicalMaterial =>
    makeMaterial({
      color: new Color(params.frameColor),
      metalness: 1,
      roughness: params.frameRoughness,
      roughnessMap: brush,
      anisotropy: params.frameAnisotropy,
      anisotropyRotation,
      envMapIntensity: 1.2,
    })
  const framePX = makeRail(0)
  const frameNX = makeRail(0)
  const framePY = makeRail(Math.PI / 2)
  const frameNY = makeRail(Math.PI / 2)
  const frameChamfer = makeMaterial({
    color: new Color(params.frameColor),
    metalness: 1,
    roughness: params.frameRoughness * 0.6,
    roughnessMap: brush,
    anisotropy: params.frameAnisotropy,
    anisotropyRotation: Math.PI / 2,
    envMapIntensity: 1.4,
  })
  // Per-family recipes: ceramic gets clearcoat over mottle, brushed gets
  // bare metal with strong grain, glass gets hard clearcoat, anodised gets
  // sheen without clearcoat, textured gets matte grain.
  const brushed = params.family === 'brushed'
  const back = makeMaterial({
    color: new Color(params.backColor),
    metalness: params.backMetalness,
    roughness: params.backRoughness,
    roughnessMap: ceramic.data,
    map: brushed ? null : ceramic.color,
    clearcoat: params.backClearcoat,
    clearcoatRoughness: params.backClearcoatRoughness,
    sheen: params.family === 'anodised' ? 0.5 : 0,
    sheenColor: new Color(params.backColor),
    // Kept below the frame response: a matte back should hold darkness
    // under the softbox, not wash into a sticker.
    envMapIntensity: brushed ? 1.25 : 1.05,
  })
  const island = makeMaterial({
    color: new Color(params.islandColor),
    metalness: params.backMetalness,
    roughness: Math.min(0.28, params.backRoughness * 0.8),
    roughnessMap: ceramic.data,
    map: brushed ? null : ceramic.color,
    clearcoat: Math.min(1, params.backClearcoat + 0.05),
    clearcoatRoughness: Math.max(0.05, params.backClearcoatRoughness - 0.05),
    envMapIntensity: 1.2,
  })
  const screen = makeMaterial({
    color: new Color('#06080d'),
    metalness: 0,
    roughness: 0.06,
    roughnessMap: smudge,
    map: createScreenGradientTexture(),
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    // Kept below the mirror clip: at 0.95 the softbox panel burned to full
    // white and read as a second phone overlapping the first. The arrival
    // sweep still plays through the directional key, not the env map.
    envMapIntensity: 0.55,
    opacity: VIEWER_GLASS_OPACITY,
  })
  const display = makeMaterial({
    color: new Color('#02040a'),
    metalness: 0,
    roughness: 0.08,
    clearcoat: 0.85,
    clearcoatRoughness: 0.1,
    emissive: new Color('#ffffff'),
    emissiveIntensity: 1,
    envMapIntensity: 0.5,
  })
  const lensRing = makeMaterial({
    // Dark machined collar: bright metal blew out flat-on in the camera act.
    // Dark walls keep the module reading black while chamfers carry the line.
    color: new Color('#3a3f47'),
    metalness: 1,
    roughness: 0.32,
    envMapIntensity: 0.9,
  })
  const makeLensGlass = (tint: string, thickness: [number, number]): MeshPhysicalMaterial =>
    makeMaterial({
      color: new Color(tint),
      metalness: 0,
      roughness: 0.025,
      roughnessMap: lensGloss,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      iridescence: 0.25,
      iridescenceIOR: 1.32,
      iridescenceThicknessRange: thickness,
      iridescenceThicknessMap: coating,
      // Translucent: the barrel tunnel, baffles, and element read through
      // dimmed instead of rendering as a dark sticker. The director must
      // respect this base opacity (see BASE_OPACITY), not stomp it to 1.
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      envMapIntensity: 1.1,
    })
  const lensGlassA = makeLensGlass('#0d141f', [120, 320])
  const lensGlassB = makeLensGlass('#140f1c', [200, 420])
  const lensGlassC = makeLensGlass('#0a101d', [100, 200])
  const lensBarrel = makeMaterial({
    color: new Color('#1e232c'),
    metalness: 0.95,
    roughness: 0.55,
    roughnessMap: barrelGradient,
    envMapIntensity: 0.85,
  })
  const lensCavity = makeMaterial({
    color: new Color('#04060b'),
    metalness: 0,
    roughness: 0.92,
    envMapIntensity: 0.15,
  })
  const sensorGlint = makeMaterial({
    color: new Color('#2f63c8'),
    metalness: 0,
    roughness: 0.2,
    emissive: new Color('#2f63c8'),
    emissiveIntensity: 1.4,
    envMapIntensity: 0.2,
  })
  const button = makeMaterial({
    color: new Color('#99a0aa'),
    metalness: 1,
    roughness: 0.38,
    envMapIntensity: 0.9,
  })
  const focusRing = makeMaterial({
    color: new Color('#7fb4ff'),
    emissive: new Color('#7fb4ff'),
    emissiveIntensity: 2,
    metalness: 0,
    roughness: 1,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  })
  // Laser-etched, not printed: the mark takes the back colour shifted a
  // step toward white on dark finishes (toward ink on glacier), at low
  // opacity and etched roughness, so it sits in the glass.
  const backLum = new Color(params.backColor).getHSL({ h: 0, s: 0, l: 0 }).l
  const etchTarget = backLum > 0.6 ? new Color('#1a1d24') : new Color('#ffffff')
  const etchColor = new Color(params.backColor).lerp(etchTarget, 0.16)
  const logo = makeMaterial({
    color: etchColor,
    map: createLogoTexture(),
    metalness: 0,
    roughness: 0.55,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  })
  const regulatory = makeMaterial({
    color: new Color('#ffffff'),
    map: createRegulatoryTexture(),
    metalness: 0,
    roughness: 1,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  })
  const subpixel = makeMaterial({
    color: new Color('#ffffff'),
    map: createSubpixelTexture(),
    metalness: 0,
    roughness: 0.4,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  })
  const port = makeMaterial({
    color: new Color('#0a0d12'),
    metalness: 0.9,
    roughness: 0.4,
    envMapIntensity: 0.5,
  })
  const portTongue = makeMaterial({
    color: new Color('#3a4048'),
    metalness: 0.7,
    roughness: 0.5,
    envMapIntensity: 0.7,
  })
  const portContact = makeMaterial({
    color: new Color('#d8b45a'),
    metalness: 1,
    roughness: 0.22,
    envMapIntensity: 1.2,
  })
  const speaker = makeMaterial({
    color: new Color('#05070a'),
    metalness: 0,
    roughness: 0.95,
  })
  const antenna = makeMaterial({
    color: new Color(params.antennaColor),
    metalness: 0.5,
    roughness: 0.55,
  })
  const simTray = makeMaterial({
    color: new Color('#9aa3b0'),
    metalness: 1,
    roughness: 0.35,
    envMapIntensity: 1.1,
  })
  // Smoked, not water-clear: the Clear finish tints the rear panel so the
  // dressed internals sit in one unifying colour (Prompt C section 3).
  const smoked = params.transparentBack === true
  if (smoked) {
    back.color.set('#121722')
    back.roughness = 0.06
    back.clearcoat = 1
    back.opacity = 0.45
    back.depthWrite = false
    back.envMapIntensity = 1.4
  }
  const collarText = createCollarTextTexture(OPTICS_PARTNER, COLLAR.outer.rIn, COLLAR.outer.rOut)
  const collarOuter = makeMaterial({
    color: new Color(params.frameColor),
    metalness: 1,
    roughness: 0.32,
    roughnessMap: brush,
    envMapIntensity: 1.3,
  })
  // Etched text scatters: glyphs read rougher than the polished face.
  const collarTop = makeMaterial({
    color: new Color(params.frameColor),
    metalness: 1,
    roughness: 0.16,
    roughnessMap: collarText,
    envMapIntensity: 1.5,
  })
  const knurlMaps = createKnurlMaps()
  knurlMaps.normal.repeat.set(12, 1)
  knurlMaps.rough.repeat.set(12, 1)
  const knurlWall = makeMaterial({
    color: new Color(params.frameColor),
    metalness: 1,
    roughness: 0.5,
    roughnessMap: knurlMaps.rough,
    normalMap: knurlMaps.normal,
    envMapIntensity: 1.1,
  })
  const collarStep = makeMaterial({
    color: new Color(params.frameColor),
    metalness: 1,
    roughness: 0.44,
    roughnessMap: brush,
    envMapIntensity: 1.25,
  })
  const glassSeal = makeMaterial({
    // Seated gasket, not a floating wire: dark, but with enough env
    // response to catch a rim highlight at grazing angles so the ring
    // reads as seated in the camera-act yaw transit.
    color: new Color('#161b24'),
    metalness: 0,
    roughness: 0.55,
    envMapIntensity: 0.8,
  })
  // Per-optic micro-text, etched in the roughness domain. Must match
  // src/data/product.ts focal specs (Prompt A2 section 9).
  const microText = createMicroTextTexture(
    [
      { text: '23MM 1:1.6', x: 0, y: 0.0182 },
      { text: '14MM 1:2.2', x: -0.01463, y: -0.00845 },
      { text: '50MM 1:1.9', x: 0.01463, y: -0.00845 },
      { text: '135MM 1:3.0', x: 0.0085, y: -0.0151 },
      { text: 'NVT-2 AF', x: 0.01351, y: 0.00089 },
    ],
    COLLAR.glass.r,
  )
  // Semi-transparent: hardware reads through dimmed, glass highlight passes
  // over. Layered correctly it never crossfades with what is underneath.
  const moduleGlass = makeMaterial({
    color: new Color('#0a0e14'),
    metalness: 0,
    roughness: 0.05,
    roughnessMap: microText,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    envMapIntensity: 1.6,
  })
  const medallionBrush = createMedallionTexture()
  const medallion = makeMaterial({
    color: new Color('#dfe6f0'),
    metalness: 1,
    roughness: 0.14,
    roughnessMap: medallionBrush,
    anisotropy: 0.6,
    envMapIntensity: 1.2,
  })
  const medallionRing = makeMaterial({
    color: new Color('#e8eef6'),
    metalness: 1,
    roughness: 0.1,
    envMapIntensity: 1.2,
  })
  const periscopeGlass = makeMaterial({
    color: new Color('#0b0f16'),
    metalness: 0,
    roughness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    envMapIntensity: 1.7,
  })
  const periscopePrism = makeMaterial({
    color: new Color('#1a2432'),
    metalness: 0.9,
    roughness: 0.12,
    envMapIntensity: 2.2,
  })
  const flashArc = makeMaterial({
    color: new Color('#fff6e0'),
    metalness: 0,
    roughness: 0.4,
    emissive: new Color('#ffedb8'),
    emissiveIntensity: 1.6,
  })
  const flashDiffuser = makeMaterial({
    color: new Color('#f2f5fa'),
    metalness: 0,
    roughness: 0.62,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    envMapIntensity: 0.8,
  })
  // IR-pass filter: near-black base, polished mirror, deep red-violet
  // grazing sheen. The reflection is what stops it reading as a hole.
  const tofWindow = makeMaterial({
    color: new Color('#04060a'),
    metalness: 0,
    roughness: 0.06,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    sheen: 0.6,
    sheenColor: new Color('#3a0d1e'),
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    envMapIntensity: 2,
  })
  const tofEmitter = makeMaterial({
    color: new Color('#10141c'),
    metalness: 0.2,
    roughness: 0.5,
    emissive: new Color('#40200c'),
    emissiveIntensity: 0.35,
    envMapIntensity: 0.4,
  })
  const tofReceiver = makeMaterial({
    color: new Color('#05070b'),
    metalness: 0.1,
    roughness: 0.7,
    envMapIntensity: 0.2,
  })
  const tofHousing = makeMaterial({
    color: new Color('#0c0f15'),
    metalness: 0.6,
    roughness: 0.5,
    envMapIntensity: 0.5,
  })
  const moduleMic = makeMaterial({
    color: new Color('#030405'),
    metalness: 0,
    roughness: 0.95,
    envMapIntensity: 0.1,
  })
  // Matte ink under the glass: grain in the green channel doubles as the
  // feathered alpha edge at the active area (Prompt A2 section 7).
  // ShapeGeometry UVs are raw meters, so normalize to the glass footprint
  // (superellipse half extents 0.0376 by 0.079).
  const bezelGrain = createBezelGrainTexture(512, 1024, 2, 11, 10)
  bezelGrain.repeat.set(1 / 0.0752, 1 / 0.158)
  bezelGrain.offset.set(0.5, 0.5)
  const bezel = makeMaterial({
    color: new Color('#07080b'),
    metalness: 0,
    roughness: 0.84,
    roughnessMap: bezelGrain,
    alphaMap: bezelGrain,
    transparent: true,
    envMapIntensity: 0.35,
  })
  // Lower panel: textured-family recipe against the smoother upper panel.
  const panelLower = makeMaterial({
    color: new Color(params.backColor).multiplyScalar(0.9),
    metalness: 0.2,
    roughness: 0.55,
    roughnessMap: ceramic.data,
    clearcoat: 0.05,
    clearcoatRoughness: 0.6,
    envMapIntensity: 0.8,
  })
  const panelSeam = makeMaterial({
    color: new Color('#030405'),
    metalness: 0,
    roughness: 0.95,
    envMapIntensity: 0.1,
  })
  const flashGlass = makeMaterial({
    color: new Color('#eef6ff'),
    metalness: 0,
    roughness: 0.08,
    emissive: new Color('#dfeaff'),
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.9,
  })

  display.emissiveMap = createScreenTexture()
  // Viewer rest level: the wallpaper reads through the 0.42 cover glass,
  // so the panel runs a little hot to land the cobalt luminous, not navy.
  // The film director writes its own per-act level every frame.
  display.emissiveIntensity = VIEWER_SCREEN_EMISSIVE

  const set: PhoneMaterialSet = {
    framePX,
    frameNX,
    framePY,
    frameNY,
    frameChamfer,
    back,
    island,
    screen,
    display,
    lensRing,
    lensGlassA,
    lensGlassB,
    lensGlassC,
    lensBarrel,
    lensCavity,
    sensorGlint,
    button,
    focusRing,
    logo,
    regulatory,
    subpixel,
    port,
    portTongue,
    portContact,
    speaker,
    antenna,
    simTray,
    collarOuter,
    collarTop,
    knurlWall,
    collarStep,
    glassSeal,
    moduleGlass,
    medallion,
    medallionRing,
    periscopeGlass,
    periscopePrism,
    flashArc,
    flashDiffuser,
    tofWindow,
    tofEmitter,
    tofReceiver,
    tofHousing,
    moduleMic,
    bezel,
    panelLower,
    panelSeam,
    flashGlass,
  }
  // Named by registry key so live scene probes can identify every part.
  for (const k of MATERIAL_KEYS) set[k].name = k
  return set
}

/** Creates the owned default material set with a static display texture. */
export function createDefaultMaterials(): PhoneMaterialSet {
  const set = createPhoneMaterials(FINISH_PARAMS.obsidian)
  const previous = set.display.emissiveMap
  set.display.emissiveMap = createScreenTexture()
  set.display.emissiveIntensity = VIEWER_SCREEN_EMISSIVE
  if (previous !== null) previous.dispose()
  return set
}

/** Disposes every material plus its owned maps. Safe to call once per owner. */
export function disposePhoneMaterials(set: PhoneMaterialSet): void {
  const seen = new Set<string>()
  for (const key of MATERIAL_KEYS) {
    const material = set[key]
    // Walk every map slot in use, including the coating thickness map.
    // Any new slot must be added here in the same commit.
    for (const slot of [
      material.map,
      material.roughnessMap,
      material.emissiveMap,
      material.normalMap,
      material.iridescenceThicknessMap,
    ] as const) {
      if (slot !== null && !seen.has(slot.uuid)) {
        seen.add(slot.uuid)
        slot.dispose()
      }
    }
    material.dispose()
  }
}
