import { motion, useReducedMotion } from 'motion/react'

export interface Stat {
  value: string
  unit?: string
  label: string
}

/**
 * A row of headline figures (hero-number form, no plot). Large tabular
 * numerals, unit in mono, one plain-language label each. Figures rise in
 * reading order the first time the strip enters the viewport.
 */
export function StatStrip({ stats, label }: { stats: Stat[]; label: string }) {
  const reduced = useReducedMotion()
  return (
    <dl
      aria-label={label}
      className="grid grid-cols-2 gap-x-6 gap-y-10 border-t border-(--color-border-hairline) pt-10 md:grid-cols-4"
    >
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          className="flex flex-col-reverse gap-3"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.7, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
        >
          <dt className="max-w-[18ch] text-sm leading-snug text-(--color-dim)">{s.label}</dt>
          <dd className="flex items-baseline gap-2">
            <span className="spec-num text-[clamp(2.5rem,4.4vw,3.75rem)]">{s.value}</span>
            {s.unit !== undefined ? <span className="spec-unit">{s.unit}</span> : null}
          </dd>
        </motion.div>
      ))}
    </dl>
  )
}
