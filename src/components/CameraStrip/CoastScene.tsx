/**
 * Procedural coastal scene for the zoom viewfinder (local, deterministic,
 * zero requests). Composed around the frame centre (800, 500), where a
 * lighthouse stands on a headland: every focal length is a centred crop,
 * so the subject at the centre stays in frame from 14 mm to the 10x crop
 * and gains detail as you zoom. Vector, so it stays sharp at 19x.
 */

const W = 1600

/**
 * Deterministic ridge line: summed sines, sampled every 10 units. An
 * optional taper eases the ridge down to `y` between x0 and x1 (either
 * direction), so a hill runs into the water instead of ending in a cliff.
 */
function ridge(
  base: number,
  waves: ReadonlyArray<readonly [amp: number, freq: number, phase: number]>,
  bottom: number,
  from = 0,
  to = W,
  taper?: { x0: number; x1: number; y: number },
): string {
  let d = `M${from} ${bottom} `
  for (let x = from; x <= to; x += 10) {
    let y = base
    for (const [a, f, p] of waves) y += a * Math.sin(x * f + p)
    if (taper !== undefined) {
      const t = Math.min(1, Math.max(0, (x - taper.x0) / (taper.x1 - taper.x0)))
      const s = t * t * (3 - 2 * t)
      y += (taper.y - y) * s
    }
    d += `L${x} ${y.toFixed(1)} `
  }
  return `${d}L${to} ${bottom} Z`
}

const FAR_RANGE = ridge(
  505,
  [
    [22, 0.006, 0.4],
    [11, 0.017, 1.9],
    [5, 0.041, 0.7],
  ],
  560,
)
/** Waterline the flanking hills stand on (the sea hides anything below). */
const SHORE = 640

// Flanking hills: highest at the frame edge, sloping down into the bay and
// closing on the waterline, so no cliff face shows against the sea.
const LEFT_HILL = ridge(
  560,
  [
    [70, 0.0042, -1.571],
    [9, 0.031, 0.3],
  ],
  SHORE,
  0,
  660,
  { x0: 380, x1: 660, y: SHORE },
)
const RIGHT_HILL = ridge(
  575,
  [
    [62, 0.0047, -2.808],
    [8, 0.029, 1.2],
  ],
  SHORE,
  940,
  W,
  { x0: 1230, x1: 940, y: SHORE },
)
const DUNES = ridge(
  880,
  [
    [26, 0.0052, 1.1],
    [10, 0.019, 2.6],
    [4, 0.07, 0.2],
  ],
  1000,
)

/** Sun glint on the water: short strokes thinning toward the shore. */
const GLINT = Array.from({ length: 22 }, (_, i) => {
  const y = 566 + i * 13
  const half = 26 + i * 4.5
  const jitter = Math.sin(i * 2.7) * 14
  return `M${1010 - half + jitter} ${y} L${1010 + half * 0.6 + jitter} ${y}`
}).join(' ')

export function CoastScene() {
  return (
    <svg
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fa8d6" />
          <stop offset="0.5" stopColor="#d9dbe0" />
          <stop offset="0.56" stopColor="#f3e5d1" />
        </linearGradient>
        <radialGradient id="cs-sun" cx="1010" cy="400" r="260" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff8ec" stopOpacity="1" />
          <stop offset="0.16" stopColor="#fff2df" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff2df" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cs-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9b7cf" />
          <stop offset="1" stopColor="#4f6386" />
        </linearGradient>
        <linearGradient id="cs-tower" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f7f4ee" />
          <stop offset="0.65" stopColor="#e4ded3" />
          <stop offset="1" stopColor="#b9b2a5" />
        </linearGradient>
        <radialGradient id="cs-lamp" cx="800" cy="472.5" r="14" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff6d8" />
          <stop offset="1" stopColor="#fff6d8" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1600" height="1000" fill="url(#cs-sky)" />
      <rect width="1600" height="1000" fill="url(#cs-sun)" />
      <circle cx="1010" cy="400" r="34" fill="#fffaf2" />

      <path d={FAR_RANGE} fill="#aeb8cb" />
      <rect y="548" width="1600" height="452" fill="url(#cs-sea)" />
      <path d={GLINT} stroke="#fff6e6" strokeWidth="2.2" strokeLinecap="round" opacity="0.75" />

      <path d={LEFT_HILL} fill="#76829b" />
      <path d={RIGHT_HILL} fill="#6b7792" />

      {/* Headland under the lighthouse: the subject sits at frame centre. */}
      <path
        d="M600 566 C 660 540, 730 522, 776 517 L 824 517 C 870 522, 930 540, 1000 566 Z"
        fill="#4a556d"
      />
      <path d="M760 520 L 840 520 L 834 524 L 766 524 Z" fill="#3c465c" />

      {/* Lighthouse: 46 units tall so the 10x crop (84 x 52) frames it. */}
      <g>
        <path d="M794.6 517 L 796.2 479 L 803.8 479 L 805.4 517 Z" fill="url(#cs-tower)" />
        <path d="M795.3 503 L 804.7 503 L 805 509 L 795 509 Z" fill="#b5523b" />
        <path d="M795.9 489 L 804.1 489 L 804.4 495 L 795.6 495 Z" fill="#b5523b" />
        <rect x="794.2" y="477.6" width="11.6" height="1.6" rx="0.4" fill="#2f3747" />
        <rect x="796.4" y="470" width="7.2" height="7.6" rx="0.6" fill="#fff3cf" />
        <path
          d="M796.4 471.6 h7.2 M796.4 474.4 h7.2 M800 470 v7.6"
          stroke="#2f3747"
          strokeWidth="0.35"
        />
        <path d="M795.6 470.2 L 800 465.6 L 804.4 470.2 Z" fill="#2f3747" />
        <rect x="799.6" y="463.8" width="0.8" height="2" fill="#2f3747" />
        <circle cx="800" cy="472.5" r="14" fill="url(#cs-lamp)" opacity="0.7" />
        <rect x="798.6" y="508.5" width="2.8" height="5.4" rx="1.2" fill="#3c465c" />
        <rect x="799" y="484" width="2" height="2.6" rx="0.5" fill="#3c465c" />
      </g>
      <path d="M812 517 h9 v-5 l-4.5 -3 l-4.5 3 Z" fill="#e9e4da" />
      <rect x="815.4" y="513" width="2.2" height="4" fill="#3c465c" />

      <path d={DUNES} fill="#2c3445" />
      <path
        d="M120 900 l6 -38 M132 902 l-4 -30 M920 920 l5 -34 M934 922 l-6 -28 M1380 896 l4 -36 M1392 900 l-5 -26"
        stroke="#2c3445"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M690 380 q8 -7 16 0 q8 -7 16 0 M742 352 q6 -5 12 0 q6 -5 12 0"
        stroke="#4a556d"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}
