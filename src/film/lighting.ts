import type { ActId } from './key.ts'

export interface StageLightState {
  /** Key light intensity. */
  key: number
  /** Cool fill intensity. */
  fill: number
  /** Rim light intensity. */
  rim: number
  /** Environment reflection response for machined metal. */
  env: number
  /** Renderer exposure multiplier. */
  exposure: number
  /** Environment tint: the camera act pushes cooler so coatings read. */
  envTint: string
  /** Cyclorama base: the stage carries the colour, the product stays neutral. */
  stage: string
  /** Cyclorama crown: horizon glow tint. */
  stageTop: string
}

/** Cream studio (user direction), lifted to porcelain in the site overhaul:
 * the whole film sits in a bright, low-chroma product-photography room so
 * the obsidian device pops. Per-act value drift keeps the colour journey
 * alive inside the family; display stays the
 * brightest stage, and the teardown ramp still lightens obviously across
 * its span. Text contrast is carried by the Prompt D 11 scrim, which
 * strengthens automatically as the stage brightens (tested). */
const BASE_LIGHTING: Record<ActId, StageLightState> = {
  arrival: {
    key: 2.2,
    fill: 0.7,
    rim: 1.1,
    env: 0.9,
    exposure: 1,
    envTint: '#ffffff',
    stage: '#dedad1',
    stageTop: '#f1efea',
  },
  settle: {
    key: 2.2,
    fill: 0.7,
    rim: 1.1,
    env: 0.9,
    exposure: 1,
    envTint: '#ffffff',
    stage: '#e0dcd3',
    stageTop: '#f3f1ec',
  },
  approach: {
    key: 2.4,
    fill: 0.6,
    rim: 1.2,
    env: 1,
    exposure: 1,
    envTint: '#ffffff',
    stage: '#e1ddd4',
    stageTop: '#f4f2ed',
  },
  teardown: {
    key: 1.6,
    fill: 0.9,
    rim: 1.5,
    env: 0.8,
    exposure: 1.05,
    envTint: '#eef2ff',
    stage: '#e9e6df',
    stageTop: '#f7f5f1',
  },
  camera: {
    key: 2.4,
    fill: 0.6,
    rim: 1.4,
    env: 1,
    exposure: 1.05,
    envTint: '#d9e6ff',
    stage: '#e2ded5',
    stageTop: '#f4f2ed',
  },
  display: {
    key: 2,
    fill: 0.8,
    rim: 1,
    env: 0.9,
    exposure: 1,
    envTint: '#ffffff',
    stage: '#ece9e3',
    stageTop: '#faf9f6',
  },
  storage: {
    key: 2.2,
    fill: 0.7,
    rim: 1.1,
    env: 0.9,
    exposure: 1,
    envTint: '#ffffff',
    stage: '#dfdbd2',
    stageTop: '#f2f0eb',
  },
  battery: {
    key: 1.6,
    fill: 0.9,
    rim: 1.5,
    env: 0.8,
    exposure: 1.1,
    envTint: '#f2f5ff',
    stage: '#e1ddd4',
    stageTop: '#f3f1ec',
  },
  software: {
    key: 2,
    fill: 0.8,
    rim: 1,
    env: 0.9,
    exposure: 1,
    envTint: '#ffffff',
    stage: '#dcd8cf',
    stageTop: '#f0eee9',
  },
  ai: {
    key: 2.2,
    fill: 0.7,
    rim: 1.1,
    env: 0.9,
    exposure: 1,
    envTint: '#ffffff',
    stage: '#dad6cd',
    stageTop: '#efede8',
  },
  final: {
    key: 2.6,
    fill: 0.7,
    rim: 1.3,
    env: 1,
    exposure: 1.05,
    envTint: '#ffffff',
    stage: '#e1ddd4',
    stageTop: '#f3f1ec',
  },
}

/**
 * Overnight detail-review boost: brighter key/fill/rim/env plus a touch
 * more exposure so small hardware reads at a glance. Ratios and mood
 * carry over — every act scales by the same factors. Stage colors and
 * env tints pass through untouched (colour journey tests pin them).
 */
function brighten(state: StageLightState): StageLightState {
  const r2 = (v: number): number => Math.round(v * 100) / 100
  return {
    ...state,
    key: r2(state.key * 1.35),
    fill: r2(state.fill * 1.6),
    rim: r2(state.rim * 1.3),
    env: r2(state.env * 1.15),
    exposure: r2(Math.min(1.15, state.exposure + 0.08)),
  }
}

export const STAGE_LIGHTING: Record<ActId, StageLightState> = Object.fromEntries(
  (Object.entries(BASE_LIGHTING) as Array<[ActId, StageLightState]>).map(([id, s]) => [
    id,
    brighten(s),
  ]),
) as Record<ActId, StageLightState>
