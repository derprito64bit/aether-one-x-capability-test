import { Link } from 'react-router'
import { CONCEPT_NOTICE } from '../../data/product.ts'
import { BrandMark } from './BrandMark.tsx'

const EXPLORE = [
  { to: '/', label: 'The film' },
  { to: '/cameras', label: 'Cameras' },
  { to: '/performance', label: 'Performance' },
  { to: '/display', label: 'Display' },
  { to: '/software', label: 'Software' },
  { to: '/specifications', label: 'Specifications' },
]

/** Shared footer: route index, fiction disclaimer, and a closing wordmark. */
export function Footer() {
  return (
    <footer className="mt-24 overflow-hidden bg-(--color-sunken)">
      <div className="page grid gap-12 pt-16 pb-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em]">
            <BrandMark className="h-6 w-6" />
            Aether One X
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-(--color-dim)">
            {CONCEPT_NOTICE}
          </p>
        </div>
        <nav aria-label="Footer">
          <h2 className="text-sm font-medium">Explore</h2>
          <ul className="mt-4 grid gap-2.5 text-sm text-(--color-dim)">
            {EXPLORE.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="transition-colors hover:text-(--color-ink)">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="text-sm font-medium">This site</h2>
          <ul className="mt-4 grid gap-2.5 text-sm text-(--color-dim)">
            <li>MIT licensed</li>
            <li>Procedural, local assets only</li>
            <li>No trackers, no third-party requests</li>
            <li>
              <Link to="/#buy" className="transition-colors hover:text-(--color-ink)">
                Configure yours
              </Link>
            </li>
          </ul>
        </div>
      </div>
      {/* Closing logotype. A graphic, not text: logotypes are exempt from
          WCAG 1.4.3, and the tonal treatment is the point. textLength pins
          it to the column width at every viewport. */}
      <div className="page" aria-hidden="true">
        <svg
          viewBox="0 0 1000 150"
          className="block w-full select-none text-(--color-border-strong)"
        >
          <text
            x="0"
            y="140"
            textLength="1000"
            lengthAdjust="spacing"
            fill="currentColor"
            fontSize="182"
            fontWeight="600"
            letterSpacing="-10"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Aether One X
          </text>
        </svg>
      </div>
    </footer>
  )
}
