import {
  BATTERY,
  CAMERA_LENSES,
  CHIPSET,
  DISPLAY,
  FINISHES,
  FRAME_MATERIAL,
  MEMORY,
  PERFORMANCE,
  STORAGE_OPTIONS,
} from '../data/product.ts'
import { formatNumber } from '../lib/format.ts'
import type { ActId } from './key.ts'
import type { CalloutDef } from './overlay/callouts.ts'
import { cameraFeature } from './teardown/transform.ts'

export interface ChapterNumeral {
  value: string
  unit: string
}

export interface Chapter {
  act: ActId
  kicker: string
  headline: string
  body: string
  numeral?: ChapterNumeral
  spec?: string[]
}

/**
 * Editorial captions per act. Copy lives here as data, never inline in JSX.
 * Every figure is imported from src/data so the film and the specifications
 * page can never disagree.
 */
export const CHAPTERS: Chapter[] = [
  {
    act: 'arrival',
    kicker: 'Aether One X',
    headline: 'Power, without the noise.',
    body: 'A fictional flagship, presented in one continuous shot.',
  },
  {
    act: 'settle',
    kicker: 'Grade-5 titanium',
    headline: 'Quiet from every angle.',
    body: 'Machined rails, ceramic back, symmetrical 1.45 mm bezels.',
  },
  {
    act: 'approach',
    kicker: 'Front glass',
    headline: 'Edge to edge.',
    body: 'The display runs to the frame on all four sides.',
  },
  {
    act: 'teardown',
    kicker: 'Inside',
    headline: 'Ten layers. One by one.',
    body: `The stack opens flat: board, a ${CHIPSET.dieAreaMm2} mm² ${CHIPSET.name} die, cell, and optics, one layer at a time.`,
    numeral: { value: formatNumber(PERFORMANCE.cpu.hero.value), unit: PERFORMANCE.cpu.hero.suffix },
    spec: [`NPU ${PERFORMANCE.npu.hero.value} ${PERFORMANCE.npu.hero.suffix} on-device`],
  },
  {
    act: 'camera',
    kicker: 'Quad camera',
    headline: 'Five focal lengths.',
    body: CAMERA_LENSES[0]?.detail ?? '',
    numeral: { value: String(CAMERA_LENSES[0]?.mp ?? 50), unit: 'MP main' },
    spec: [`${CAMERA_LENSES[1]?.mp ?? 48} MP ultra-wide`, `${CAMERA_LENSES[3]?.detail ?? ''}`],
  },
  {
    act: 'display',
    kicker: 'LTPO OLED',
    headline: 'Light, controlled.',
    body: `${DISPLAY.size} panel, 1 to ${DISPLAY.refreshMax} Hz adaptive.`,
    numeral: { value: formatNumber(DISPLAY.peakNits), unit: 'nits peak' },
    spec: [`${DISPLAY.resolution}`, `${DISPLAY.pwm} Hz dimming`],
  },
  {
    act: 'storage',
    kicker: 'Storage',
    headline: 'Room for everything.',
    body: `UFS 4.1 with ${MEMORY.ramGb} GB ${MEMORY.type} alongside.`,
    numeral: { value: String((STORAGE_OPTIONS[2]?.gb ?? 1024) / 1024), unit: 'TB max' },
    spec: STORAGE_OPTIONS.map((s) => `${s.label} · $${s.price}`),
  },
  {
    act: 'battery',
    kicker: 'Silicon-carbon',
    headline: 'Two days. Then minutes.',
    body: `${BATTERY.charge50Min} minutes on ${BATTERY.wired} W refills half the cell.`,
    numeral: { value: formatNumber(BATTERY.capacity), unit: 'mAh' },
    spec: [`${BATTERY.wireless} W wireless`, `${BATTERY.reverse} W reverse`],
  },
  {
    act: 'software',
    kicker: 'AetherOS 2.0',
    headline: 'Software that steps aside.',
    body: 'On-device summaries, offline transcription, private photo cleanup.',
  },
  {
    act: 'ai',
    kicker: 'On-device AI',
    headline: 'Intelligence, kept inside.',
    body: `The neural engine delivers ${PERFORMANCE.npu.hero.value} ${PERFORMANCE.npu.hero.suffix}. Nothing leaves the phone.`,
    numeral: { value: String(PERFORMANCE.npu.hero.value), unit: PERFORMANCE.npu.hero.suffix },
  },
  {
    act: 'final',
    kicker: 'Aether One X',
    headline: 'Choose your finish.',
    body: 'Six finishes, three capacities. Configure below.',
  },
]

/**
 * Teardown layer copy (Prompt D section 6). One kicker, one headline, one
 * sentence, one figure per layer. Every figure comes from src/data so the
 * film and the specifications page can never disagree.
 */
export interface TeardownCopy {
  key: string
  kicker: string
  headline: string
  body: string
  figure: string
}

export const TEARDOWN_COPY: TeardownCopy[] = [
  {
    key: 'cover-glass',
    kicker: 'Cover glass',
    headline: 'The surface you touch.',
    body: 'Ion glass with an oleophobic coat. What it reflects is the room around you.',
    figure: `${DISPLAY.pwm} Hz dimming`,
  },
  {
    key: 'display',
    kicker: 'Display',
    headline: 'Light, controlled.',
    body: 'LTPO panel under matte bezel ink. Bright when it must be, dark otherwise.',
    figure: `${formatNumber(DISPLAY.peakNits)} nits peak`,
  },
  {
    key: 'midframe',
    kicker: 'Midframe',
    headline: 'The structure.',
    body: 'Everything mounts to this frame. Eight Torx screws hold the story together.',
    figure: FRAME_MATERIAL,
  },
  {
    key: 'battery',
    kicker: 'Battery',
    headline: 'Two days of charge.',
    body: 'Silicon-carbon cell, the heaviest thing in the phone. It moves like it.',
    figure: `${formatNumber(BATTERY.capacity)} mAh`,
  },
  {
    key: 'logic-board',
    kicker: 'Logic board',
    headline: 'The system.',
    body: 'Main and sub boards joined by flex, shielded can by can against their own noise.',
    figure: `${MEMORY.ramGb} GB RAM`,
  },
  {
    key: 'silicon',
    kicker: CHIPSET.name,
    headline: 'The hero beat.',
    body: `A ${CHIPSET.dieAreaMm2} mm² die that runs every model on-device. Nothing leaves the phone.`,
    figure: `${PERFORMANCE.npu.hero.value} ${PERFORMANCE.npu.hero.suffix} neural engine`,
  },
  {
    key: 'thermal',
    kicker: 'Thermal',
    headline: 'Sustained, not spiky.',
    body: 'Vapour chamber over the die, graphite spreading it wide. Peak clocks hold.',
    figure: `${CHIPSET.processNm} nm efficiency`,
  },
  {
    key: 'power-coil',
    kicker: 'Power coil',
    headline: 'Charge through the case.',
    body: 'Eighteen turns of litz copper ringed by NFC. No port required.',
    figure: `${BATTERY.wireless} W wireless`,
  },
  {
    key: 'camera',
    kicker: 'Camera module',
    headline: 'Four optics, one circle.',
    body: 'Triangle lenses plus a folded periscope, each at its own physical depth.',
    figure: CAMERA_LENSES[3]?.label ?? '135 mm folded tele',
  },
  {
    key: 'rear-panel',
    kicker: 'Rear panel',
    headline: 'The finish.',
    body: 'Ceramic, brushed, glass, anodised, textured, or clear. Pick yours below.',
    figure: `${FINISHES.length} finishes`,
  },
]

/**
 * Exploded-diagram callouts. Nine labels maximum: only parts a general
 * audience can care about. Copy lives here as data, never inline in JSX.
 */
export const CALLOUTS: CalloutDef[] = [
  {
    partId: 'die',
    title: CHIPSET.name,
    body: `${CHIPSET.processNm} nm · ${CHIPSET.dieAreaMm2} mm² · runs every model on-device`,
    priority: 1,
  },
  {
    partId: 'bga-array',
    title: 'BGA array',
    body: '14 × 14 balls · revealed on lift',
    priority: 5,
  },
  {
    partId: 'nand',
    title: 'Storage',
    body: `${STORAGE_OPTIONS[2]?.label ?? '1 TB'} UFS 4.1 · keeps a decade of photos`,
    priority: 6,
  },
  {
    partId: 'cell',
    title: 'Silicon-carbon cell',
    body: `${BATTERY.capacity} mAh · two-day reserve`,
    priority: 2,
  },
  {
    partId: 'charge-coil',
    title: 'Wireless coil',
    body: `${BATTERY.wireless} W · 18-turn litz · charges through the case`,
    priority: 4,
  },
  {
    partId: 'vapor-chamber',
    title: 'Vapour chamber',
    body: 'pulls heat off the A1 Ultra · sustains peak clocks',
    priority: 7,
  },
  {
    partId: 'haptic',
    title: 'Haptic motor',
    body: 'X-axis linear actuator · clicks, never buzzes',
    priority: 8,
  },
  {
    partId: 'speaker',
    title: 'Speaker',
    body: 'bottom-firing driver · tuned against the port',
    priority: 9,
  },
  {
    partId: 'camera-module',
    title: 'Camera module',
    body: `${CAMERA_LENSES.length - 1} optics · ${CAMERA_LENSES[3]?.label ?? '135 mm folded tele'}`,
    priority: 3,
  },
]

/**
 * One pointer per featured teardown layer (overnight watchability): during
 * each layer's hold a single leader names the part while the copy card
 * tells its story. Shell-only layers (cover glass, display, rear panel)
 * fill the frame and need no pointer; every other layer anchors to a
 * registered part group that the callout loop already projects.
 */
export interface FeatureCallout {
  partId: string
  title: string
  /** 0..1 leader opacity: fades in/out at the window edges. */
  opacity: number
}

const FEATURE_CALLOUT_PART: Readonly<Record<number, { partId: string; title: string }>> = {
  2: { partId: 'haptic', title: 'Haptic motor' },
  3: { partId: 'cell', title: 'Silicon-carbon cell' },
  4: { partId: 'nand', title: 'Logic board' },
  5: { partId: 'die', title: CHIPSET.name },
  6: { partId: 'vapor-chamber', title: 'Vapour chamber' },
  7: { partId: 'charge-coil', title: 'Wireless coil' },
  8: { partId: 'camera-module', title: 'Camera module' },
}

/** Representative part per featured layer, for the Internals publisher. */
export function featureCalloutPart(index: number): string | null {
  return FEATURE_CALLOUT_PART[index]?.partId ?? null
}

/**
 * Featured-layer pointer for a continuous cursor. Pure function of
 * progress: null outside feature windows and on shell-only layers.
 */
export function featuredCallout(cursor: number): FeatureCallout | null {
  const index = Math.floor(cursor)
  const def = FEATURE_CALLOUT_PART[index]
  if (def === undefined) return null
  // The camera layer slides out of the stack and back inside its own
  // beat: its pointer shares that window so it rides the module out and
  // back, instead of appearing only after the move and vanishing before
  // the return.
  if (index === 8) {
    const opacity = cameraFeature(cursor)
    return opacity > 0.001 ? { ...def, opacity } : null
  }
  const d = cursor - index
  if (d < 0.15 || d > 0.95) return null
  const entry = Math.min(1, Math.max(0, (d - 0.15) / 0.15))
  const exit = Math.min(1, Math.max(0, (0.95 - d) / 0.15))
  return { ...def, opacity: entry * exit }
}
