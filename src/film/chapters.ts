import {
  BATTERY,
  CAMERA_LENSES,
  CHIPSET,
  DIMENSIONS,
  DISPLAY,
  FINISHES,
  FRAME_MATERIAL,
  MEMORY,
  PERFORMANCE,
  STORAGE_OPTIONS,
  TEARDOWN_FACTS,
} from '../data/product.ts'
import { formatNumber } from '../lib/format.ts'
import type { ActId } from './key.ts'

export interface ChapterNumeral {
  value: string
  unit: string
}

/** One headline capability: a figure, its unit, and what it buys you. */
export interface TeardownStat {
  value: string
  unit: string
  label: string
}

export interface Chapter {
  act: ActId
  kicker: string
  headline: string
  /** Two sentences: what this part of the phone is, then what it does for you. */
  body: string
  numeral?: ChapterNumeral
  /** Three key facts under the copy, figures from src/data. */
  facts?: TeardownStat[]
}

const CAM_MAIN = CAMERA_LENSES[0]
const CAM_ULTRA = CAMERA_LENSES[1]
const CAM_TELE = CAMERA_LENSES[3]
const CAM_FRONT = CAMERA_LENSES[4]
const npuMetric = (label: string): number =>
  PERFORMANCE.npu.metrics.find((m) => m.label === label)?.value ?? 0
const price = (n: number): string => `$${formatNumber(n)}`

/**
 * Editorial copy per act. Copy lives here as data, never inline in JSX.
 * Every figure is imported from src/data so the film and the specifications
 * page can never disagree (chapters.test.ts checks it).
 */
export const CHAPTERS: Chapter[] = [
  {
    act: 'arrival',
    kicker: 'Aether One X',
    headline: 'Power, without the noise.',
    body: `A fictional flagship, shown in one continuous shot: a titanium frame, a circular camera and a ${DISPLAY.size} display that runs to the edge. Scroll, and each part of it steps into the light in turn.`,
    facts: [
      { value: DISPLAY.size.replace(' in', ''), unit: 'in', label: 'LTPO OLED display' },
      { value: String(DIMENSIONS.thicknessMm), unit: 'mm', label: 'Edge to edge' },
      { value: String(DIMENSIONS.weightG), unit: 'g', label: FRAME_MATERIAL },
    ],
  },
  {
    act: 'settle',
    kicker: 'Grade-5 titanium',
    headline: 'Quiet from every angle.',
    body: `The frame is machined from one billet of ${FRAME_MATERIAL} and brushed by hand, so every phone carries its own grain. It weighs ${DIMENSIONS.weightG} g, measures ${DIMENSIONS.thicknessMm} mm, and keeps its ${DIMENSIONS.bezelsMm} mm bezels even all the way round.`,
    facts: [
      { value: 'Ti-6Al-4V', unit: '', label: 'Grade-5 alloy' },
      { value: String(DIMENSIONS.weightG), unit: 'g', label: 'Weight' },
      { value: String(DIMENSIONS.thicknessMm), unit: 'mm', label: 'Thickness' },
    ],
  },
  {
    act: 'approach',
    kicker: 'Front glass',
    headline: 'Edge to edge.',
    body: `Ion-strengthened Aether glass meets the titanium rail with a soft 2.5D edge, and the picture runs right up to it: ${DIMENSIONS.bezelsMm} mm of bezel on every side. An anti-reflective layer cuts glare to ${TEARDOWN_FACTS.reflectancePct}%, so it stays readable in direct sun.`,
    facts: [
      { value: String(DIMENSIONS.bezelsMm), unit: 'mm', label: 'Symmetrical bezels' },
      { value: String(TEARDOWN_FACTS.reflectancePct), unit: '%', label: 'Reflectance' },
      { value: 'IP68', unit: '', label: 'Water and dust' },
    ],
  },
  {
    act: 'teardown',
    kicker: 'Teardown',
    headline: 'Ten layers, each one on its own.',
    body: 'The phone opens like a sandwich. Then every layer comes forward by itself: what it is, and what it does for you.',
  },
  {
    act: 'camera',
    kicker: 'Quad camera',
    headline: 'Five focal lengths.',
    body: `A ${CAM_MAIN?.mp ?? 50} MP main camera on a ${CAM_MAIN?.sensor ?? '1/1.3 in'} sensor, a ${CAM_ULTRA?.mp ?? 48} MP ultra-wide, a 50 mm portrait lens and a folded 135 mm periscope cover everything from 14 to 135 mm. Optical stabilisation on three of them and a depth sensor keep every frame sharp, and video runs to 8K.`,
    numeral: { value: String(CAM_MAIN?.mp ?? 50), unit: 'MP main' },
    facts: [
      {
        value: String(CAM_MAIN?.mp ?? 50),
        unit: 'MP',
        label: `Main, ${CAM_MAIN?.aperture ?? 'f/1.6'}`,
      },
      { value: CAM_TELE?.zoom ?? '5x', unit: '', label: 'Optical periscope' },
      { value: String(CAM_FRONT?.mp ?? 32), unit: 'MP', label: 'Front, 4K60' },
    ],
  },
  {
    act: 'display',
    kicker: 'LTPO OLED',
    headline: 'Light, controlled.',
    body: `A ${DISPLAY.size} panel at ${DISPLAY.resolution} that refreshes anywhere from ${DISPLAY.refreshMin} to ${DISPLAY.refreshMax} Hz, slowing to one frame a second when nothing moves. It reaches ${formatNumber(DISPLAY.peakNits)} nits in sun, shows 1.07 billion colours in ${DISPLAY.colorBits}-bit, and dims at ${formatNumber(DISPLAY.pwm)} Hz so it stays easy on the eyes.`,
    numeral: { value: formatNumber(DISPLAY.peakNits), unit: 'nits peak' },
    facts: [
      { value: formatNumber(DISPLAY.peakNits), unit: 'nits', label: 'Peak brightness' },
      {
        value: `${DISPLAY.refreshMin} to ${DISPLAY.refreshMax}`,
        unit: 'Hz',
        label: 'Adaptive refresh',
      },
      { value: formatNumber(DISPLAY.pwm), unit: 'Hz', label: 'PWM dimming' },
    ],
  },
  {
    act: 'storage',
    kicker: 'Storage',
    headline: 'Room for everything.',
    body: `Up to ${STORAGE_OPTIONS[STORAGE_OPTIONS.length - 1]?.label ?? '1 TB'} of ${TEARDOWN_FACTS.storageType} sits beside ${MEMORY.ramGb} GB of ${MEMORY.type}: room for years of photos, offline maps and every model the phone runs itself. Three capacities, priced simply.`,
    numeral: { value: String((STORAGE_OPTIONS[2]?.gb ?? 1024) / 1024), unit: 'TB max' },
    facts: STORAGE_OPTIONS.map((s) => ({
      value: s.label.replace(/\s.*$/, ''),
      unit: s.label.replace(/^\S+\s/, ''),
      label: price(s.price),
    })),
  },
  {
    act: 'battery',
    kicker: 'Silicon-carbon',
    headline: 'Two days. Then minutes.',
    body: `A ${formatNumber(BATTERY.capacity)} mAh silicon-carbon cell carries you through two days, and ${BATTERY.charge50Min} minutes on ${BATTERY.wired} W refills half of it. Lay it on a pad for ${BATTERY.wireless} W wireless, or share ${BATTERY.reverse} W with your earbuds.`,
    numeral: { value: formatNumber(BATTERY.capacity), unit: 'mAh' },
    facts: [
      {
        value: String(BATTERY.wired),
        unit: 'W',
        label: `Wired, 50% in ${BATTERY.charge50Min} min`,
      },
      { value: String(BATTERY.wireless), unit: 'W', label: 'Wireless' },
      { value: String(BATTERY.reverse), unit: 'W', label: 'Reverse wireless' },
    ],
  },
  {
    act: 'software',
    kicker: 'AetherOS 2.0',
    headline: 'Software that steps aside.',
    body: `Summaries, transcription and photo cleanup run on the phone itself, so they work offline and what you say or shoot never leaves it. The interface stays out of the way until you need it.`,
    facts: [
      {
        value: String(npuMetric('Offline transcription')),
        unit: 'wpm',
        label: 'Offline transcription',
      },
      { value: String(npuMetric('Photo cleanup')), unit: 's', label: 'Photo cleanup' },
      { value: 'Offline', unit: '', label: 'Summaries' },
    ],
  },
  {
    act: 'ai',
    kicker: 'On-device AI',
    headline: 'Intelligence, kept inside.',
    body: `The ${CHIPSET.name}'s neural engine delivers ${PERFORMANCE.npu.hero.value} ${PERFORMANCE.npu.hero.suffix}, enough to run a full assistant with no connection at all. Documents, photos and voice are processed where they live, and nothing leaves the phone.`,
    numeral: { value: String(PERFORMANCE.npu.hero.value), unit: PERFORMANCE.npu.hero.suffix },
    facts: [
      {
        value: String(PERFORMANCE.npu.hero.value),
        unit: PERFORMANCE.npu.hero.suffix,
        label: 'Neural engine',
      },
      { value: String(npuMetric('On-device inference')), unit: 'ms', label: 'Inference' },
      { value: 'Private', unit: '', label: 'Documents and voice' },
    ],
  },
  {
    act: 'final',
    kicker: 'Aether One X',
    headline: 'Choose your finish.',
    body: `${FINISHES.length} finishes, from near-black ${FINISHES[0]?.name ?? 'Obsidian'} to ${FINISHES[FINISHES.length - 1]?.name ?? 'Clear'}, which shows the parts you have just seen. Pick one, then a capacity, below.`,
    facts: [
      { value: String(FINISHES.length), unit: '', label: 'Finishes' },
      { value: String(STORAGE_OPTIONS.length), unit: '', label: 'Capacities' },
      { value: price(STORAGE_OPTIONS[0]?.price ?? 999), unit: '', label: 'From' },
    ],
  },
]

/** One labelled sub-component; `key` matches a 3D anchor in showcaseBridge. */
export interface TeardownCallout {
  key: string
  title: string
  detail: string
}

/**
 * Teardown showcase copy, one entry per layer in physical stack order.
 * Each layer is introduced properly while it holds alone at its hero
 * pose: a headline, a two-sentence intro (what it is, then what it does
 * for you), four capabilities, and callouts that name its sub-components
 * on the model. Every figure comes from src/data (tested).
 */
export interface TeardownCopy {
  /** Layer id, teardown/layers.ts. */
  key: string
  name: string
  headline: string
  intro: string
  stats: TeardownStat[]
  callouts: TeardownCallout[]
}

const FRONT = CAMERA_LENSES[4]
const MAIN = CAMERA_LENSES[0]
const ULTRA = CAMERA_LENSES[1]
const TELE = CAMERA_LENSES[3]
const MAX_STORAGE = STORAGE_OPTIONS[STORAGE_OPTIONS.length - 1]?.label ?? '1 TB'
const WH_PER_LITRE = Math.round((TEARDOWN_FACTS.cellWh / TEARDOWN_FACTS.cellCm3) * 1000)
const [CHAMBER_W, CHAMBER_H] = TEARDOWN_FACTS.chamberMm
const sustained = (key: 'cpu' | 'gpu', label: string): number =>
  PERFORMANCE[key].metrics.find((m) => m.label === label)?.value ?? 0

export const TEARDOWN_COPY: TeardownCopy[] = [
  {
    key: 'cover-glass',
    name: 'Cover glass',
    headline: 'Tough where you hold it. Invisible where you look.',
    intro: `A single ${TEARDOWN_FACTS.glassMm} mm sheet of ion-strengthened Aether glass, rounded only where it meets the rail so the ${DISPLAY.size} display reads perfectly flat. An anti-reflective layer cuts glare to ${TEARDOWN_FACTS.reflectancePct}%, and an oleophobic coat wipes clean in one pass.`,
    stats: [
      { value: String(TEARDOWN_FACTS.glassMm), unit: 'mm', label: 'Ion-strengthened glass' },
      { value: String(TEARDOWN_FACTS.reflectancePct), unit: '%', label: 'Reflectance, anti-glare' },
      { value: DISPLAY.size.replace(' in', ''), unit: 'in', label: 'Flat to the very edge' },
      { value: 'IP68', unit: '', label: 'Sealed into the rail' },
    ],
    callouts: [
      {
        key: 'glass.surface',
        title: 'Oleophobic coat',
        detail: 'Sheds fingerprints and wipes clean in one pass.',
      },
      {
        key: 'glass.edge',
        title: '2.5D edge',
        detail: 'Rounded into the rail, so no sharp corner meets your hand.',
      },
      {
        key: 'glass.earpiece',
        title: 'Earpiece channel',
        detail: 'A hairline acoustic slot, invisible above the display.',
      },
    ],
  },
  {
    key: 'display',
    name: 'Display',
    headline: 'Bright at noon. Barely there at night.',
    intro: `A ${DISPLAY.size} LTPO OLED at ${DISPLAY.resolution}, ${TEARDOWN_FACTS.ppi} pixels per inch. It refreshes anywhere from ${DISPLAY.refreshMin} to ${DISPLAY.refreshMax} Hz, dropping to one frame a second on a still page, and reaches ${formatNumber(DISPLAY.peakNits)} nits in direct sun.`,
    stats: [
      { value: formatNumber(DISPLAY.peakNits), unit: 'nits', label: 'Peak brightness' },
      {
        value: `${DISPLAY.refreshMin} to ${DISPLAY.refreshMax}`,
        unit: 'Hz',
        label: 'Adaptive refresh',
      },
      { value: String(TEARDOWN_FACTS.ppi), unit: 'ppi', label: DISPLAY.resolution },
      { value: formatNumber(DISPLAY.pwm), unit: 'Hz', label: 'Low-flicker dimming' },
    ],
    callouts: [
      {
        key: 'display.panel',
        title: 'Active area',
        detail: `${DISPLAY.resolution} at ${TEARDOWN_FACTS.ppi} ppi, ${DISPLAY.colorBits}-bit colour.`,
      },
      {
        key: 'display.driver',
        title: 'Display driver',
        detail: `Sets the refresh every frame, down to ${DISPLAY.refreshMin} Hz when nothing moves.`,
      },
      {
        key: 'display.flex',
        title: 'Panel flex',
        detail: 'Folds under the panel to a single board connector.',
      },
      {
        key: 'display.punch',
        title: 'Front camera',
        detail: `${FRONT?.mp ?? 32} MP with autofocus and 4K60 video.`,
      },
    ],
  },
  {
    key: 'midframe',
    name: 'Midframe',
    headline: 'One frame holds everything.',
    intro: `Machined from a single billet of ${FRAME_MATERIAL}, the midframe carries the display above it and the boards and battery below. Insulated splits in the rail turn the frame itself into the antennas for 5G, Wi-Fi 7 and UWB.`,
    stats: [
      { value: String(TEARDOWN_FACTS.screws), unit: 'screws', label: 'Torx, one driver' },
      { value: String(DIMENSIONS.thicknessMm), unit: 'mm', label: 'Thickness, whole phone' },
      { value: String(DIMENSIONS.weightG), unit: 'g', label: 'Weight, whole phone' },
      { value: '5G', unit: 'mmWave', label: 'Antennas in the rail' },
    ],
    callouts: [
      {
        key: 'midframe.rail',
        title: 'Antenna split',
        detail: 'An insulated gap: the titanium rail itself carries the radio.',
      },
      {
        key: 'midframe.screw',
        title: 'Torx screw',
        detail: `One of ${TEARDOWN_FACTS.screws}. A single driver opens the whole phone.`,
      },
      {
        key: 'midframe.haptic',
        title: 'X-axis haptics',
        detail: 'A linear actuator that taps instead of buzzing.',
      },
      {
        key: 'midframe.speaker',
        title: 'Bottom speaker',
        detail: 'Fires through the rail, tuned against its own port.',
      },
    ],
  },
  {
    key: 'battery',
    name: 'Battery',
    headline: `Two days of power. Half back in ${BATTERY.charge50Min} minutes.`,
    intro: `A silicon-carbon anode packs ${formatNumber(BATTERY.capacity)} mAh, ${TEARDOWN_FACTS.cellWh} Wh, into ${TEARDOWN_FACTS.cellCm3} cm³: about ${WH_PER_LITRE} Wh per litre. A protection board on its top edge meters current and heat continuously, so ${BATTERY.wired} W charging stays cool, cycle after cycle.`,
    stats: [
      {
        value: formatNumber(BATTERY.capacity),
        unit: 'mAh',
        label: `${TEARDOWN_FACTS.cellWh} Wh cell`,
      },
      {
        value: String(BATTERY.wired),
        unit: 'W',
        label: `Wired, 50% in ${BATTERY.charge50Min} min`,
      },
      { value: String(BATTERY.wireless), unit: 'W', label: 'Wireless' },
      { value: String(BATTERY.reverse), unit: 'W', label: 'Reverse wireless' },
    ],
    callouts: [
      {
        key: 'battery.cell',
        title: 'Silicon-carbon cell',
        detail: `${TEARDOWN_FACTS.cellWh} Wh in ${TEARDOWN_FACTS.cellCm3} cm³, the heaviest part inside.`,
      },
      {
        key: 'battery.bms',
        title: 'Protection board',
        detail: 'Meters current and heat; cuts the charge long before the cell is at risk.',
      },
      {
        key: 'battery.connector',
        title: 'Board connector',
        detail: 'Unclips in one motion. No solder, no heat.',
      },
      {
        key: 'battery.tabs',
        title: 'Pull tabs',
        detail: 'Stretch-release adhesive: pull, and the cell lifts free.',
      },
    ],
  },
  {
    key: 'logic-board',
    name: 'Logic board',
    headline: 'Two boards. Every chip in its own shield.',
    intro: `The main and sub boards stack and join by flex, every chip under its own shield can so the 5G modem never hears the processor. ${MEMORY.ramGb} GB of ${MEMORY.type} and up to ${MAX_STORAGE} of ${TEARDOWN_FACTS.storageType} sit millimetres from the ${CHIPSET.name}.`,
    stats: [
      { value: String(MEMORY.ramGb), unit: 'GB', label: `${MEMORY.type} memory` },
      {
        value: MAX_STORAGE.replace(/\s.*$/, ''),
        unit: MAX_STORAGE.replace(/^\S+\s/, ''),
        label: `${TEARDOWN_FACTS.storageType}, maximum`,
      },
      { value: '5G', unit: 'mmWave', label: 'Modem, sub-6 too' },
      { value: 'Wi-Fi 7', unit: '', label: 'With Bluetooth 5.4' },
    ],
    callouts: [
      {
        key: 'board.memory',
        title: 'Memory and storage',
        detail: `${MEMORY.ramGb} GB ${MEMORY.type} beside up to ${MAX_STORAGE} of ${TEARDOWN_FACTS.storageType}.`,
      },
      {
        key: 'board.modem',
        title: '5G modem',
        detail: 'Sub-6 and mmWave, under its own shield can.',
      },
      {
        key: 'board.pmic',
        title: 'Power management',
        detail: 'Feeds every chip its own clean supply.',
      },
      {
        key: 'board.port',
        title: 'USB-C',
        detail: `Sealed port block, rated for ${BATTERY.wired} W.`,
      },
    ],
  },
  {
    key: 'silicon',
    name: CHIPSET.name,
    headline: 'Every model runs on the phone itself.',
    intro: `A ${CHIPSET.processNm} nm system on a chip: ${CHIPSET.cpuCores} CPU cores up to ${CHIPSET.cpuClockGhZ} GHz, a ${CHIPSET.gpuCores}-core GPU with hardware ray tracing, and a ${CHIPSET.npuTops} TOPS neural engine. Transcription, summaries and photo cleanup run right here, so nothing has to leave the phone.`,
    stats: [
      { value: String(CHIPSET.cpuClockGhZ), unit: 'GHz', label: `${CHIPSET.cpuCores}-core CPU` },
      { value: String(CHIPSET.npuTops), unit: 'TOPS', label: 'Neural engine' },
      { value: String(CHIPSET.gpuCores), unit: 'cores', label: 'GPU, ray traced' },
      {
        value: String(CHIPSET.dieAreaMm2),
        unit: 'mm²',
        label: `${CHIPSET.processNm} nm die`,
      },
    ],
    callouts: [
      {
        key: 'soc.die',
        title: 'Die',
        detail: `${CHIPSET.dieAreaMm2} mm² of ${CHIPSET.processNm} nm silicon.`,
      },
      {
        key: 'soc.package',
        title: 'Package',
        detail: 'Fans thousands of connections out from the die.',
      },
      {
        key: 'soc.bga',
        title: 'Ball grid array',
        detail: `${TEARDOWN_FACTS.bgaGrid} × ${TEARDOWN_FACTS.bgaGrid} solder balls, seen as the package turns.`,
      },
      {
        key: 'soc.caps',
        title: 'Decoupling capacitors',
        detail: `Steady the supply when the cores spike to ${CHIPSET.cpuClockGhZ} GHz.`,
      },
    ],
  },
  {
    key: 'thermal',
    name: 'Thermal',
    headline: 'Sustained, not spiky.',
    intro: `A vapour chamber sits directly on the ${CHIPSET.name} and boils its heat away; a graphite sheet then spreads it across the whole back of the phone. Under long load the CPU holds ${sustained('cpu', 'Sustained load')}% of its peak and the GPU keeps ${sustained('gpu', 'Sustained thermal headroom')}% of its headroom.`,
    stats: [
      {
        value: String(sustained('cpu', 'Sustained load')),
        unit: '%',
        label: 'CPU peak, sustained',
      },
      {
        value: String(sustained('gpu', 'Sustained thermal headroom')),
        unit: '%',
        label: 'GPU thermal headroom',
      },
      { value: String(PERFORMANCE.gpu.hero.value), unit: 'fps', label: 'Average, long sessions' },
      { value: `${CHAMBER_W} × ${CHAMBER_H}`, unit: 'mm', label: 'Vapour chamber' },
    ],
    callouts: [
      {
        key: 'thermal.chamber',
        title: 'Vapour chamber',
        detail: 'Liquid boils at the hot spot and condenses at the cool edges.',
      },
      {
        key: 'thermal.graphite',
        title: 'Graphite sheet',
        detail: 'Spreads heat sideways, so no one spot on the back gets hot.',
      },
      {
        key: 'thermal.contact',
        title: 'Contact pad',
        detail: `Sits directly on the ${CHIPSET.name}, where the heat starts.`,
      },
    ],
  },
  {
    key: 'power-coil',
    name: 'Wireless charging',
    headline: 'Charges through the case.',
    intro: `${TEARDOWN_FACTS.coilTurns} turns of litz copper take up to ${BATTERY.wireless} W without a cable and give ${BATTERY.reverse} W back to earbuds or a watch laid on the back. A ferrite sheet keeps the field out of the battery, and an NFC loop rings the coil for tap to pay.`,
    stats: [
      { value: String(BATTERY.wireless), unit: 'W', label: 'Wireless charging' },
      { value: String(BATTERY.reverse), unit: 'W', label: 'Reverse, for accessories' },
      { value: String(TEARDOWN_FACTS.coilTurns), unit: 'turns', label: 'Litz copper' },
      { value: 'NFC', unit: '', label: 'Pay, pair, unlock' },
    ],
    callouts: [
      {
        key: 'coil.windings',
        title: 'Litz windings',
        detail: `${TEARDOWN_FACTS.coilTurns} turns of fine stranded copper, cooler at high power.`,
      },
      {
        key: 'coil.ferrite',
        title: 'Ferrite shield',
        detail: 'Turns the field toward the charger, away from the cell.',
      },
      {
        key: 'coil.nfc',
        title: 'NFC loop',
        detail: 'Tap to pay, pair or unlock.',
      },
    ],
  },
  {
    key: 'camera',
    name: 'Camera module',
    headline: 'Four rear cameras, one circle.',
    intro: `A ${MAIN?.mp ?? 50} MP main camera on a ${MAIN?.sensor ?? '1/1.3 in'} sensor, a ${ULTRA?.mp ?? 48} MP ultra-wide, a 50 mm portrait lens and a folded 135 mm periscope share one circular module. A depth sensor times reflected light to place every subject before the shutter fires.`,
    stats: [
      { value: String(MAIN?.mp ?? 50), unit: 'MP', label: `Main, ${MAIN?.aperture ?? 'f/1.6'}` },
      { value: String(ULTRA?.mp ?? 48), unit: 'MP', label: 'Ultra-wide, 122°' },
      { value: TELE?.zoom ?? '5x', unit: '', label: 'Periscope, 135 mm' },
      { value: '8K30', unit: '', label: 'Video, cinematic mode' },
    ],
    callouts: [
      {
        key: 'camera.main',
        title: MAIN?.label ?? 'Main',
        detail: `${MAIN?.detail ?? ''}.`,
      },
      {
        key: 'camera.ultra',
        title: ULTRA?.label ?? 'Ultra-wide',
        detail: `${ULTRA?.mp ?? 48} MP, 122° field of view, macro focus.`,
      },
      {
        key: 'camera.periscope',
        title: TELE?.label ?? 'Periscope',
        detail: `A prism folds the light sideways, so ${TELE?.zoom ?? '5x'} zoom fits in ${DIMENSIONS.thicknessMm} mm.`,
      },
      {
        key: 'camera.tof',
        title: 'Depth sensor',
        detail: 'Times reflected light to map the scene for portraits and focus.',
      },
    ],
  },
  {
    key: 'rear-panel',
    name: 'Rear panel',
    headline: 'The part you will see most.',
    intro: `${FINISHES.length} finishes, from polished ceramic to a smoked clear panel that shows the parts you have just seen. A raised window guards the camera module, and the wordmark is etched into the surface, not printed on it.`,
    stats: [
      { value: String(FINISHES.length), unit: 'finishes', label: 'Ceramic to clear' },
      { value: 'IP68', unit: '', label: 'Water and dust' },
      { value: String(BATTERY.wireless), unit: 'W', label: 'Charges straight through' },
      { value: 'Clear', unit: '', label: 'Option: every part on show' },
    ],
    callouts: [
      {
        key: 'rear.finish',
        title: 'Ceramic finish',
        detail: 'Polished, scratch-hard and warm in the hand.',
      },
      {
        key: 'rear.window',
        title: 'Camera window',
        detail: 'One raised window over the whole module, flush with the collar.',
      },
      {
        key: 'rear.mark',
        title: 'Etched wordmark',
        detail: 'Laser-etched into the panel, so it can never wear off.',
      },
    ],
  },
]

/** The open-sandwich overview: the stack as a whole, before the tour. */
export const TEARDOWN_INTRO_STATS: TeardownStat[] = [
  { value: String(TEARDOWN_FACTS.layers), unit: 'layers', label: 'Glass to rear panel' },
  { value: String(DIMENSIONS.thicknessMm), unit: 'mm', label: 'All ten, stacked' },
  { value: String(TEARDOWN_FACTS.screws), unit: 'screws', label: 'One driver opens it' },
]

/** One giant figure a section's room projects behind the phone. */
export interface SceneFigure {
  value: string
  unit: string
}

/**
 * What each section's room puts on its back wall (backdrop scenes): giant
 * code-set figures, shown one after another across the act, and a caption
 * line. Decorative (the copy column carries the same facts for assistive
 * tech); every figure comes from src/data (tested).
 */
export interface SceneBoard {
  figures: SceneFigure[]
  caption: string
  /**
   * False when the act's subject fills a phone's whole frame (no wall
   * left for the figure): the copy column then keeps its numeral there.
   */
  onPhones?: boolean
}

/** 2^(3 x bits) colours, in billions: 10-bit panels show 1.07 billion. */
const COLOURS_B = (2 ** (3 * DISPLAY.colorBits) / 1e9).toFixed(2)

export const SCENE_BOARDS: Partial<Record<ActId, SceneBoard>> = {
  settle: {
    figures: [{ value: 'Ti-6Al-4V', unit: '' }],
    caption: `${FRAME_MATERIAL} · ${DIMENSIONS.thicknessMm} mm · ${DIMENSIONS.weightG} g`,
  },
  approach: {
    figures: [{ value: String(DIMENSIONS.bezelsMm), unit: 'mm' }],
    caption: 'Symmetrical bezels on all four sides',
  },
  camera: {
    figures: [{ value: String(MAIN?.mp ?? 50), unit: 'MP' }],
    caption: `${MAIN?.sensor ?? '1/1.3 in'} sensor · ${MAIN?.aperture ?? 'f/1.6'} · 14 / 23 / 50 / 135 mm`,
  },
  display: {
    figures: [
      { value: String(DISPLAY.refreshMax), unit: 'Hz' },
      { value: `${COLOURS_B}B`, unit: 'colours' },
      { value: formatNumber(DISPLAY.peakNits), unit: 'nits' },
    ],
    caption: `${DISPLAY.size} LTPO OLED · ${DISPLAY.refreshMin} to ${DISPLAY.refreshMax} Hz · ${DISPLAY.colorBits}-bit colour`,
  },
  storage: {
    figures: [{ value: MAX_STORAGE.replace(/\s.*$/, ''), unit: MAX_STORAGE.replace(/^\S+\s/, '') }],
    caption: `${TEARDOWN_FACTS.storageType} · ${MEMORY.ramGb} GB ${MEMORY.type}`,
  },
  battery: {
    onPhones: false,
    figures: [{ value: formatNumber(BATTERY.capacity), unit: 'mAh' }],
    caption: `${BATTERY.wired} W wired · 50% in ${BATTERY.charge50Min} min · ${BATTERY.wireless} W wireless`,
  },
  software: {
    figures: [{ value: '2.0', unit: 'AetherOS' }],
    caption: 'On-device · offline · private',
  },
  ai: {
    figures: [{ value: String(PERFORMANCE.npu.hero.value), unit: PERFORMANCE.npu.hero.suffix }],
    caption: 'Neural engine · nothing leaves the phone',
  },
}

/** The board an act's room shows, or null for the studio acts. */
export function figureFor(act: ActId): SceneBoard | null {
  return SCENE_BOARDS[act] ?? null
}
