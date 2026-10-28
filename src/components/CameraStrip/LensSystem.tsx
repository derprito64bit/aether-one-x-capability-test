import { CAMERA_LENSES, type CameraLens } from '../../data/product.ts'
import { Reveal } from '../ui/Reveal.tsx'

/** Optical format "1/1.3 in" -> 1/1.3. Unparsable formats fall back to 0.4. */
function format(sensor: string): number {
  const m = /1\/(\d+(?:\.\d+)?)/.exec(sensor)
  return m?.[1] !== undefined ? 1 / Number.parseFloat(m[1]) : 0.4
}

/** Equivalent focal length in mm from the lens label ("Main · 23mm"). */
function focalMm(lens: CameraLens): string | null {
  const m = /(\d+)\s?mm/.exec(lens.label)
  return m?.[1] ?? null
}

/** One pixel scale for every tile, so sizes compare honestly. */
const SENSOR_PX = 150
const LARGEST = Math.max(...CAMERA_LENSES.map((l) => format(l.sensor)))

/** Sensor rectangle at true relative scale (4:3, sized by optical format). */
function Sensor({ lens }: { lens: CameraLens }) {
  const max = SENSOR_PX
  const k = format(lens.sensor) / LARGEST
  const w = max * k
  return (
    <div
      className="flex h-[var(--sensor-box)] items-end"
      style={{ ['--sensor-box' as string]: `${max * 0.75}px` }}
    >
      <span
        aria-hidden="true"
        className="block rounded-[3px] bg-[linear-gradient(135deg,#3a4c74,#16203a_60%,#2a3a5f)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]"
        style={{ width: `${w}px`, height: `${w * 0.75}px` }}
      />
    </div>
  )
}

function Tile({
  lens,
  className,

  big = false,
}: {
  lens: CameraLens
  className: string

  big?: boolean
}) {
  const mm = focalMm(lens)
  const name = lens.label.split('·')[0]?.trim() ?? lens.label
  return (
    <article
      className={`flex flex-col justify-between gap-8 rounded-[var(--radius-panel)] p-6 md:p-8 ${className}`}
    >
      <Sensor lens={lens} />
      <div>
        <p className="flex items-baseline gap-2">
          <span
            className={`spec-num ${big ? 'text-[clamp(4rem,8vw,7rem)]' : 'text-[clamp(2.75rem,4.5vw,4rem)]'}`}
          >
            {mm ?? lens.mp}
          </span>
          <span className="spec-unit">{mm !== null ? 'mm' : 'MP'}</span>
        </p>
        <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em]">
          {name} <span className="font-normal text-(--color-dim)">· {lens.zoom}</span>
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-(--color-dim)">{lens.detail}</p>
        <p className="spec-tech mt-3">
          {lens.mp} MP · {lens.sensor} · {lens.aperture} · {lens.stabilization}
        </p>
      </div>
    </article>
  )
}

/**
 * The lens system as a bento: the main camera leads, each tile carries its
 * sensor drawn to scale against the others (the only honest way to show
 * why the main lens is the low-light lens).
 */
export function LensSystem() {
  const [main, ultra, mid, periscope, front] = CAMERA_LENSES
  if (!main || !ultra || !mid || !periscope || !front) return null
  return (
    <section aria-labelledby="lens-system" className="page pt-28">
      <Reveal>
        <h2 id="lens-system" className="display-lg max-w-3xl">
          Four rear lenses, one circle.
        </h2>
        <p className="lede mt-4">
          Each lens sits at its own depth inside the module. Sensors below are drawn to scale
          against each other.
        </p>
      </Reveal>
      <div className="mt-12 grid gap-4 md:grid-cols-6 md:grid-rows-[auto_auto_auto]">
        <Tile
          lens={main}
          big

          className="bg-(--color-sunken) md:col-span-3 md:row-span-2"
        />
        <Tile lens={ultra} className="panel md:col-span-3" />
        <Tile lens={mid} className="panel md:col-span-3" />
        <Tile lens={periscope} className="panel md:col-span-4" />
        <Tile lens={front} className="panel md:col-span-2" />
      </div>
    </section>
  )
}
