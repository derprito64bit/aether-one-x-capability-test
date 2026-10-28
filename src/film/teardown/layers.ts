/**
 * Teardown layer manifest (Prompt D section 4). Order is the physical stack
 * front to back: front glass, display, midframe, battery, logic board,
 * silicon, thermal, coil, camera module, rear panel. Silicon at index 5
 * lands almost exactly at the sequence midpoint: the strongest beat.
 *
 * `shell` names PhoneModel layer groups; `parts` names Prompt C explode
 * registry ids. Both travel with the layer.
 */
export interface TeardownLayer {
  id: string
  /** Stack index, 0 = frontmost. Drives the separation offset. */
  index: number
  /** PhoneModel shell groups travelling with this layer. */
  shell: ReadonlyArray<'frame' | 'back' | 'glass' | 'display' | 'module'>
  /** Parts from Prompt C's layout manifest travelling with this layer. */
  parts: readonly string[]
  /** Copy key into TEARDOWN_COPY in chapters.ts. */
  copyKey: string
  /** Accent hue for this layer's rim light and text accent. */
  accent: string
  /** Hero-side scale bump when featured. */
  featureScale: number
  /**
   * Phone-local pivot the hero scale acts about (overnight fix). Shell
   * children sit near the origin, but part groups carry layout offsets —
   * scaling those groups about the origin displaces the hero by
   * (scale-1) × offset (4mm+ for the die). The driver counter-translates
   * by the flipped pivot so the featured part stays centered.
   */
  heroPivot: readonly [number, number]
  /**
   * Half-height of the featured subject in meters (round 01 A4). Drives the
   * narrow-viewport macro floor so the featured layer never crops: full
   * phone for shell layers, measured part bounds for internals (see the
   * layout manifest: cell, board union, SoC package, graphite, NFC ring,
   * camera module outerR).
   */
  featureHalfM: number
  /** Heavy layers move slowly with almost no tumble; light layers faster. */
  weight: 'light' | 'medium' | 'heavy'
}

const SCREWS = [
  'screw-0',
  'screw-1',
  'screw-2',
  'screw-3',
  'screw-4',
  'screw-5',
  'screw-6',
  'screw-7',
] as const

export const TEARDOWN_LAYERS: TeardownLayer[] = [
  {
    id: 'cover-glass',
    index: 0,
    shell: ['glass'],
    parts: [],
    copyKey: 'cover-glass',
    accent: '#9fd4ff',
    featureScale: 1.1,
    heroPivot: [0, 0] as const,
    featureHalfM: 0.08, // full phone silhouette (159.6mm)
    weight: 'light',
  },
  {
    id: 'display',
    index: 1,
    shell: ['display'],
    parts: [],
    copyKey: 'display',
    accent: '#cfe9ff',
    featureScale: 1.08,
    heroPivot: [0, 0] as const,
    featureHalfM: 0.08,
    weight: 'light',
  },
  {
    id: 'midframe',
    index: 2,
    shell: ['frame'],
    parts: [...SCREWS, 'haptic', 'speaker', 'earpiece'],
    copyKey: 'midframe',
    accent: '#b8c2d0',
    featureScale: 1.04,
    heroPivot: [0, 0] as const,
    featureHalfM: 0.08,
    weight: 'heavy',
  },
  {
    id: 'battery',
    index: 3,
    shell: [],
    parts: ['cell', 'cell-wrap'],
    copyKey: 'battery',
    accent: '#c4d99a',
    featureScale: 1.06,
    heroPivot: [0, -0.01675] as const,
    featureHalfM: 0.0348, // cell h 0.0695
    weight: 'heavy',
  },
  {
    id: 'logic-board',
    index: 4,
    shell: [],
    parts: [
      'main-board',
      'sub-board',
      'btb-flex',
      'coax-l',
      'coax-r',
      // USB-C block rides the sub-board it is soldered to.
      'port-block',
      'shield-fence',
      'nand',
      'modem',
      'pmic',
      'codec',
      'rf-a',
      'rf-b',
      'rf-c',
      'charge-ic',
      'sim-cage',
    ],
    copyKey: 'logic-board',
    accent: '#7fd4b0',
    featureScale: 1.08,
    heroPivot: [0, 0.042] as const,
    featureHalfM: 0.0715, // main + sub board union, y -0.078 to 0.065
    weight: 'medium',
  },
  {
    id: 'silicon',
    index: 5,
    shell: [],
    // Shield lids sit behind the die: they lift with the silicon so the
    // die never passes through a lid while the stack opens.
    parts: ['substrate', 'die', 'bga-array', 'decoupling-cluster', 'shield-lid'],
    copyKey: 'silicon',
    accent: '#ffc978',
    featureScale: 1.12,
    heroPivot: [-0.013, 0.0345] as const,
    featureHalfM: 0.0125, // SoC package + BGA array
    weight: 'medium',
  },
  {
    id: 'thermal',
    index: 6,
    shell: [],
    parts: ['vapor-chamber', 'graphite-sheet'],
    copyKey: 'thermal',
    accent: '#b9aecb',
    featureScale: 1.06,
    heroPivot: [0, 0.02] as const,
    featureHalfM: 0.045, // graphite sheet h 0.09, tallest in the layer
    weight: 'light',
  },
  {
    id: 'power-coil',
    index: 7,
    shell: [],
    parts: ['charge-coil', 'nfc'],
    copyKey: 'power-coil',
    accent: '#e09a5f',
    featureScale: 1.08,
    heroPivot: [0, -0.008] as const,
    featureHalfM: 0.026, // NFC ring rOut, outboard of the coil
    weight: 'medium',
  },
  {
    id: 'camera',
    index: 8,
    // The camera bump (shell module) is bonded to the rear panel and nests
    // in its group; this layer is the internal camera modules.
    shell: [],
    parts: [
      'camera-module',
      'lens-main',
      'lens-ultra',
      'lens-mid',
      'lens-periscope',
      'sensor-stack',
      'tof-module',
    ],
    copyKey: 'camera',
    accent: '#8fd8e0',
    featureScale: 1.1,
    heroPivot: [0, 0.0458] as const,
    featureHalfM: 0.024, // module outerR 0.0235
    weight: 'medium',
  },
  {
    id: 'rear-panel',
    index: 9,
    shell: ['back'],
    parts: [],
    copyKey: 'rear-panel',
    accent: '#c8ccd4',
    featureScale: 1.04,
    heroPivot: [0, 0] as const,
    featureHalfM: 0.08, // full phone silhouette
    weight: 'medium',
  },
]

/**
 * Gap between adjacent layers at full separation (round 05 showcase): the
 * sandwich opens wide enough that, seen from the tour camera, no two
 * layers' outlines overlap by more than ~25%, so every face reads in the
 * overview. It was 8.5mm, where the stack read as one block of strata.
 */
export const LAYER_GAP = 0.034
/** Narrow viewports: the showcase rig frames the stack, so the gap can stay wide. */
export const LAYER_GAP_COMPACT = 0.034

/**
 * Layer offset = ((count - 1) / 2 - index) * gap * separation. Front layers
 * (low index) lift toward +z, the phone's front, so the stack opens in its
 * physical order: cover glass on top, rear panel at the bottom. The sign
 * used to be reversed, which sent the glass down through every other layer
 * (and the rear panel up through them) during the peel, and parked the
 * camera module inside the rear panel.
 */
export function layerOffset(index: number, count: number, gap: number, separation: number): number {
  return ((count - 1) / 2 - index) * gap * separation
}

/** Part id to layer index, covering the whole explode registry. */
export const PART_LAYER: Record<string, number> = {}
for (const layer of TEARDOWN_LAYERS) {
  for (const part of layer.parts) PART_LAYER[part] = layer.index
}

/**
 * Master-progress to continuous layer cursor 0..10. Integer part is the
 * current layer, fraction is local progress. Pure: reverses exactly.
 */
export function cursorAt(p: number): number {
  return Math.min(10, Math.max(0, (p - 0.295) / 0.02))
}

/**
 * Outside-in peel (sandwich rewrite): every layer rides its own slot
 * offset. The stack opens from both faces at once: the cover glass
 * (index 0) and the rear panel (index 9) lead, each half follows from
 * the outside in, and the two middle layers land last; all ten arrive by
 * sep = 1, so the open sandwich holds through the tour and restacks in
 * exact mirror on reverse. Pure function of sep.
 *
 * Outside-in is what keeps the peel collision-free: in each half the
 * outer layer starts no later and travels further than the layer inside
 * it, so every gap only ever widens (layerStack.test.tsx samples the whole
 * peel). Front-first ordering let the rear panel, which travels furthest,
 * start last, so the inner rear layers drove down through it.
 */
const PEEL_STAGGER = 0.08
// Worst stagger plus span is exactly 1: the middle pair lands at sep 1.
const PEEL_SPAN = 1 - 4 * PEEL_STAGGER

/** Stagger rank: 0 for the two faces, 4 for the two middle layers. */
export function peelRank(index: number): number {
  return index <= 4 ? index : 9 - index
}

export function peelLocal(sep: number, index: number): number {
  const t = Math.min(1, Math.max(0, sep))
  return Math.min(1, Math.max(0, (t - peelRank(index) * PEEL_STAGGER) / PEEL_SPAN))
}

/** Damping rate per weight class: mass inferable from motion alone. */
export function weightDamp(weight: TeardownLayer['weight']): number {
  if (weight === 'heavy') return 2.2
  if (weight === 'medium') return 4
  return 5.5
}
