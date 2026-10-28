import { describe, expect, it } from 'vitest'
import {
  BATTERY,
  CHIPSET,
  DISPLAY,
  MEMORY,
  PERFORMANCE,
  STORAGE_OPTIONS,
  TEARDOWN_FACTS,
} from '../data/product.ts'
import { formatNumber } from '../lib/format.ts'
import { CHAPTERS, TEARDOWN_COPY, TEARDOWN_INTRO_STATS } from './chapters.ts'
import { COIL, SCREWS, VAPOR_CHAMBER } from './internals/layout.ts'
import { SHOWCASE_PART_SLOTS } from './overlay/callouts.ts'
import { TEARDOWN_LAYERS } from './teardown/layers.ts'
import { ACTS } from './timeline.ts'

const teardownText = (): string =>
  TEARDOWN_COPY.map((t) =>
    [
      t.name,
      t.headline,
      t.intro,
      ...t.stats.flatMap((s) => [s.value, s.unit, s.label]),
      ...t.callouts.flatMap((c) => [c.title, c.detail]),
    ].join(' | '),
  ).join('\n')

/** The film overlay and the specifications page can never disagree. */
describe('chapter spec consistency', () => {
  it('covers every act exactly once', () => {
    const ids = CHAPTERS.map((c) => c.act).sort()
    expect(ids).toEqual(ACTS.map((a) => a.id).sort())
  })

  it('uses data values for every figure it renders', () => {
    const text = [
      ...CHAPTERS.map((c) =>
        [c.kicker, c.headline, c.body, c.numeral?.value ?? '', ...(c.spec ?? [])].join(' | '),
      ),
      teardownText(),
    ].join('\n')
    const required: string[] = [
      CHIPSET.name,
      `${CHIPSET.processNm} nm`,
      `${CHIPSET.dieAreaMm2} mm²`,
      `${CHIPSET.cpuClockGhZ} GHz`,
      String(PERFORMANCE.npu.hero.value),
      String(DISPLAY.refreshMax),
      formatNumber(DISPLAY.peakNits),
      formatNumber(BATTERY.capacity),
      String(BATTERY.wired),
      String(BATTERY.wireless),
      String(BATTERY.reverse),
      String(MEMORY.ramGb),
      STORAGE_OPTIONS[2]?.label ?? '1 TB',
    ]
    for (const needle of required) {
      expect(text).toContain(needle)
    }
  })
})

describe('teardown showcase copy', () => {
  it('introduces every layer in physical stack order', () => {
    expect(TEARDOWN_COPY.map((t) => t.key)).toEqual(TEARDOWN_LAYERS.map((l) => l.id))
    for (const layer of TEARDOWN_LAYERS) {
      expect(TEARDOWN_COPY.some((t) => t.key === layer.copyKey)).toBe(true)
    }
  })

  it('gives each layer a real introduction, four capabilities and its parts', () => {
    for (const t of TEARDOWN_COPY) {
      // Two sentences: what it is, then what it does for you.
      expect(t.intro.split(/(?<=[.!?])\s+/).length, t.key).toBeGreaterThanOrEqual(2)
      expect(t.intro.length, t.key).toBeGreaterThan(140)
      expect(t.stats, t.key).toHaveLength(4)
      expect(t.callouts.length, t.key).toBeGreaterThanOrEqual(3)
      expect(t.callouts.length, t.key).toBeLessThanOrEqual(SHOWCASE_PART_SLOTS)
      for (const s of t.stats) expect(s.value.trim(), t.key).not.toBe('')
    }
    expect(TEARDOWN_INTRO_STATS).toHaveLength(3)
  })

  it('keys every callout uniquely, under its own layer', () => {
    const keys = TEARDOWN_COPY.flatMap((t) => t.callouts.map((c) => c.key))
    expect(new Set(keys).size).toBe(keys.length)
    for (const t of TEARDOWN_COPY) {
      const prefixes = new Set(t.callouts.map((c) => c.key.split('.')[0]))
      expect(prefixes.size, t.key).toBe(1)
    }
  })

  it('writes ranges in words, never with en or em dashes', () => {
    expect(teardownText()).not.toMatch(/[–—]/)
    expect(CHAPTERS.map((c) => c.body).join(' ')).not.toMatch(/[–—]/)
  })

  it('quotes facts that match the model', () => {
    expect(TEARDOWN_FACTS.layers).toBe(TEARDOWN_LAYERS.length)
    expect(TEARDOWN_FACTS.screws).toBe(SCREWS.length)
    expect(TEARDOWN_FACTS.coilTurns).toBe(COIL.turns)
    expect(TEARDOWN_FACTS.chamberMm[0]).toBe(Math.round(VAPOR_CHAMBER.w * 1000))
    expect(TEARDOWN_FACTS.chamberMm[1]).toBe(Math.round(VAPOR_CHAMBER.h * 1000))
    const [w, h] = DISPLAY.resolution.split('×').map((n) => Number.parseInt(n.trim(), 10))
    expect(TEARDOWN_FACTS.ppi).toBe(Math.round(Math.hypot(w ?? 0, h ?? 0) / 6.7))
    // 3.8 V nominal: capacity and energy agree.
    expect(TEARDOWN_FACTS.cellWh).toBeCloseTo((BATTERY.capacity * 3.8) / 1000, 1)
  })
})
