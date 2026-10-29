import { useScroll } from 'motion/react'
import { useScrollSettle } from '../hooks/useScrollSettle.ts'
import { pageSettleTarget, type SectionBox } from '../lib/settle.ts'

/**
 * Page-level section settle: every top-level block of <main> is a
 * section, and a scroll that rests with a boundary part-way up the screen
 * is completed into the section the reader was heading for. Inside the
 * film runway the film does its own (finer) settling, so this stands back.
 */
export function SectionSettle() {
  const { scrollY } = useScroll()
  useScrollSettle(
    scrollY,
    (dir, moved) => {
      const y = window.scrollY
      const vh = window.innerHeight
      if (moved < vh * 0.03) return null
      const runway = document.querySelector<HTMLElement>('[data-testid="film-runway"]')
      if (runway !== null) {
        const top = runway.getBoundingClientRect().top + y
        const end = top + runway.offsetHeight - vh
        if (y > top + 1 && y < end - 1) return null
      }
      const main = document.getElementById('main')
      if (main === null) return null
      const sections: SectionBox[] = []
      for (const el of Array.from(main.children)) {
        const h = (el as HTMLElement).offsetHeight
        if (h <= 0) continue
        sections.push({ top: el.getBoundingClientRect().top + y, height: h })
      }
      const target = pageSettleTarget(sections, y, vh, dir)
      return target === null ? null : { y: target }
    },
    true,
  )
  return null
}
