/**
 * First-visit load tracker for the film. Progress is the sum of real
 * milestones, never a timer: the page shell, the type, the 3D engine
 * download (three + R3F + the film code, the bulk of the bytes), the WebGL
 * renderer coming up, and the first frames of the phone actually drawn.
 * While a milestone is pending the loader may ease toward its ceiling, but
 * the floor only moves when something real finishes.
 */
export type LoadStage = 'shell' | 'fonts' | 'engine' | 'renderer' | 'scene'

export const LOAD_ORDER: readonly LoadStage[] = ['shell', 'fonts', 'engine', 'renderer', 'scene']

/**
 * Share of the bar per milestone. Measured on a 4 Mbps cold load: the engine
 * bytes land in under a second, then building the scene (shaders, procedural
 * geometry and textures) holds the main thread for several seconds, so the
 * renderer and scene carry real weight, not just the download.
 */
export const LOAD_WEIGHTS: Readonly<Record<LoadStage, number>> = {
  shell: 0.05,
  fonts: 0.07,
  engine: 0.38,
  renderer: 0.2,
  scene: 0.3,
}

/** Typical seconds each milestone takes; sizes the eased approach to its ceiling. */
export const LOAD_EXPECTED_S: Readonly<Record<LoadStage, number>> = {
  shell: 0.4,
  fonts: 0.8,
  engine: 2.5,
  renderer: 2.5,
  scene: 4,
}

/** What the loader says while a milestone is pending. */
export const LOAD_LABELS: Readonly<Record<LoadStage | 'done', string>> = {
  shell: 'Opening',
  fonts: 'Setting the type',
  engine: 'Loading the 3D engine',
  renderer: 'Starting the renderer',
  scene: 'Building the phone',
  done: 'Ready',
}

/** Each JS chunk that lands during the engine download earns this share of it. */
const CHUNK_CREDIT = 0.22
/** Chunk credit never claims the whole engine slice before the import resolves. */
const CHUNK_CREDIT_CAP = 0.85

export class LoadTracker {
  private readonly done = new Set<LoadStage>()
  private chunks = 0
  private observer: PerformanceObserver | null = null
  /** Set once the loader has been shown or skipped this page load. */
  seen = false
  /** performance.now() of the last milestone, for easing toward the ceiling. */
  lastMarkAt = 0

  mark(stage: LoadStage): void {
    if (this.done.has(stage)) return
    this.done.add(stage)
    this.lastMarkAt = typeof performance !== 'undefined' ? performance.now() : 0
    if (stage === 'engine') this.stopObserving()
  }

  has(stage: LoadStage): boolean {
    return this.done.has(stage)
  }

  /** Count JS chunks finishing while the engine downloads (real bytes landing). */
  observeChunks(): void {
    if (this.observer !== null || this.done.has('engine')) return
    if (typeof PerformanceObserver === 'undefined') return
    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.endsWith('.js')) this.chunks += 1
        }
      })
      this.observer.observe({ type: 'resource', buffered: false })
    } catch {
      this.observer = null
    }
  }

  stopObserving(): void {
    this.observer?.disconnect()
    this.observer = null
  }

  /** Real progress floor, 0..1: finished milestones plus landed engine chunks. */
  value(): number {
    let v = 0
    for (const stage of LOAD_ORDER) if (this.done.has(stage)) v += LOAD_WEIGHTS[stage]
    if (!this.done.has('engine')) {
      v += LOAD_WEIGHTS.engine * Math.min(CHUNK_CREDIT_CAP, this.chunks * CHUNK_CREDIT)
    }
    return Math.min(1, v)
  }

  /** The value once the next pending milestone completes (easing never passes it). */
  ceiling(): number {
    let v = 0
    let addedNext = false
    for (const stage of LOAD_ORDER) {
      if (this.done.has(stage)) v += LOAD_WEIGHTS[stage]
      else if (!addedNext) {
        v += LOAD_WEIGHTS[stage]
        addedNext = true
      }
    }
    return Math.min(1, v)
  }

  complete(): boolean {
    return LOAD_ORDER.every((stage) => this.done.has(stage))
  }

  /** The first pending milestone, or null when complete. */
  pending(): LoadStage | null {
    return LOAD_ORDER.find((stage) => !this.done.has(stage)) ?? null
  }

  /** The first pending milestone's label, or 'Ready'. */
  label(): string {
    return LOAD_LABELS[this.pending() ?? 'done']
  }
}

/** One tracker per page load: the loader appears at most once. */
export const filmLoad = new LoadTracker()
