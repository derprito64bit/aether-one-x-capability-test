import { ListIcon, XIcon } from '../icons.tsx'
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Glass } from '../Glass/Glass.tsx'
import { BrandMark } from './BrandMark.tsx'

const LINKS = [
  { to: '/', label: 'Film', end: true },
  { to: '/cameras', label: 'Cameras', end: false },
  { to: '/performance', label: 'Performance', end: false },
  { to: '/display', label: 'Display', end: false },
  { to: '/software', label: 'Software', end: false },
  { to: '/specifications', label: 'Specs', end: false },
]

/**
 * Already on /#buy (e.g. scrolled back up into the film): the location does
 * not change, so ScrollManager will not fire. Jump and focus directly.
 */
function jumpToBuyDeck(reduced: boolean | null): void {
  const el = document.getElementById('buy')
  if (el === null) return
  el.scrollIntoView({ behavior: reduced === true ? 'instant' : 'smooth', block: 'start' })
  el.focus({ preventScroll: true })
}

/**
 * Floating glass navigation. Hides while scrolling down so the film owns
 * the frame, returns on any upward scroll (direction from Motion's scroll
 * MotionValue, never a scroll listener). Under 768px the links collapse
 * into a sheet behind a menu button.
 */
export function Navbar() {
  const { pathname, hash } = useLocation()
  const reduced = useReducedMotion()
  const { scrollY } = useScroll()
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const last = useRef(0)
  const menuId = useId()

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = last.current
    last.current = y
    if (open) return
    if (y < 120) setHidden(false)
    else if (y > prev + 6) setHidden(true)
    else if (y < prev - 6) setHidden(false)
  })

  // Close the sheet on navigation and on Escape.
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <motion.header
      className="sticky top-3 z-40 px-3 md:px-[var(--page-gutter)]"
      initial={false}
      animate={{ y: hidden && !reduced ? -96 : 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 40 }}
    >
      <div className="mx-auto max-w-[74rem]">
        <Glass variant="chrome" label="Primary">
          <nav aria-label="Primary" className="flex h-14 items-center gap-2 pl-4 pr-2 md:gap-6">
            <Link
              to="/"
              className="flex shrink-0 items-center gap-2 text-[15px] font-semibold tracking-[-0.02em]"
            >
              <BrandMark className="h-6 w-6" />
              Aether One X
            </Link>
            <ul className="hidden items-center gap-1 text-sm md:flex">
              {LINKS.map((link) => (
                <li key={link.to} className="relative">
                  <NavLink
                    to={link.to}
                    end={link.end}
                    className={({ isActive }: { isActive: boolean }) =>
                      `relative block rounded-full px-3 py-1.5 transition-colors duration-200 ${
                        isActive
                          ? 'text-(--color-ink)'
                          : 'text-(--color-dim) hover:text-(--color-ink)'
                      }`
                    }
                  >
                    {({ isActive }: { isActive: boolean }) => (
                      <>
                        {isActive ? (
                          <motion.span
                            layoutId="nav-active"
                            aria-hidden="true"
                            className="absolute inset-0 rounded-full bg-(--color-raise) shadow-[0_0_0_1px_var(--color-border-hairline)]"
                            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                          />
                        ) : null}
                        <span className="relative">{link.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
            {/* Client-side link: ScrollManager waits for the lazy home route
                to render #buy, then scrolls to it and focuses it. */}
            <Link
              to="/#buy"
              data-testid="skip-film"
              className="btn btn-primary ml-auto min-h-10 px-4 text-sm"
              onClick={() => {
                if (pathname === '/' && hash === '#buy') jumpToBuyDeck(reduced)
              }}
            >
              Buy
            </Link>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-(--color-ink) hover:bg-(--color-raise) md:hidden"
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <XIcon size={20} weight="bold" /> : <ListIcon size={20} weight="bold" />}
            </button>
          </nav>
        </Glass>
        <AnimatePresence>
          {open ? (
            <motion.div
              id={menuId}
              key="sheet"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: 'top center' }}
              className="panel mt-2 p-2 md:hidden"
            >
              <ul className="grid">
                {LINKS.map((link) => (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      end={link.end}
                      className={({ isActive }: { isActive: boolean }) =>
                        `flex min-h-12 items-center rounded-2xl px-4 text-lg font-medium tracking-[-0.02em] ${
                          isActive ? 'bg-(--color-raise) text-(--color-ink)' : 'text-(--color-dim)'
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.header>
  )
}
