import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { progressFromUrl } from '../film/scroll.ts'

/** How long to wait for a hash target inside a lazily loaded route. */
const HASH_WAIT_MS = 3000
/** Beyond this many viewports a smooth scroll is just a long blur. */
const SMOOTH_MAX_VIEWPORTS = 2

/**
 * Scroll management: reset on route change, honor hashes, respect reduced
 * motion. Routes are lazy, so a hash like /#buy usually points into a page
 * that has not rendered yet when the location changes: wait (per frame,
 * bounded) for the target before falling back to the top. A target that
 * only appeared after waiting (a fresh route) or that sits more than two
 * viewports away is jumped to instantly: smooth-scrolling 17,000 px of film
 * runway adds nothing, and crossing every act at speed is exactly the load
 * that wedged the chapter copy. The target is focused when focusable
 * (tabIndex set) so keyboard and screen-reader users land where the eye does.
 *
 * A ?t= film deep link owns the scroll position: the film jumps the runway
 * on mount, and when the lazy route resolves in the same commit its effect
 * runs before this (parent) one, so a reset here would undo the jump.
 */
export function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (hash === '') {
      if (progressFromUrl() !== null) return
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
      return
    }
    let raf = 0
    let waited = false
    const started = performance.now()
    const find = (): void => {
      const el = document.querySelector<HTMLElement>(hash)
      if (el !== null) {
        const far =
          Math.abs(el.getBoundingClientRect().top) > window.innerHeight * SMOOTH_MAX_VIEWPORTS
        const smooth = !reduced && !waited && !far
        el.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' })
        if (el.hasAttribute('tabindex')) el.focus({ preventScroll: true })
        return
      }
      if (performance.now() - started > HASH_WAIT_MS) {
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
        return
      }
      waited = true
      raf = requestAnimationFrame(find)
    }
    find()
    return () => cancelAnimationFrame(raf)
  }, [pathname, hash])
  return null
}
