import { useMotionValue, useScroll, type MotionValue } from 'motion/react'
import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { releaseBootLoader } from './bootLoader.ts'
import { PhoneFrame } from '../components/Phone/PhoneFrame.tsx'
import { CHAPTERS, TEARDOWN_COPY } from './chapters.ts'
import { FilmOverlay } from './overlay/FilmOverlay.tsx'
import { progressFromUrl, scrollToProgress } from './scroll.ts'
import { FilmLoader } from './FilmLoader.tsx'
import { filmLoad } from './loadTracker.ts'

// Section rooms behind the transparent canvas: only needed with the 3D, so
// they load beside it instead of in the initial bundle.
const BackdropLazy = lazy(() => import('./backdrop/Backdrop.tsx'))

const FilmCanvasLazy = lazy(() =>
  import('./FilmCanvas.tsx').then((m) => {
    // three + R3F + the film code have landed: the bulk of the loader's bar.
    filmLoad.mark('engine')
    return { default: m.FilmCanvas }
  }),
)

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null
  } catch {
    return false
  }
}

/** Binds a MotionValue to the runway scroll position. */
function useRunwayProgress(runway: RefObject<HTMLElement | null>): MotionValue<number> {
  const { scrollYProgress } = useScroll({ target: runway, offset: ['start start', 'end end'] })
  return scrollYProgress
}

/**
 * The product film: one sticky stage inside a long runway, driven by a
 * single master scroll progress. Falls back to a static chapter list
 * without WebGL, on context loss, or with ?nogl.
 */
export function Film() {
  const runway = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const progress = useRunwayProgress(runway)
  const parallaxX = useMotionValue(0)
  const parallaxY = useMotionValue(0)
  const [canRender] = useState(() => {
    try {
      return !new URLSearchParams(window.location.search).has('nogl') && webglAvailable()
    } catch {
      return false
    }
  })
  // Reduced motion gets the static story, not a snapped film: a
  // scroll-driven film is a barrier for some people and a nausea trigger
  // for others (meta prompt section 6.9). Same fallback as no-WebGL.
  // Subscribed (round 03 Part H): a mid-session OS toggle swaps the tree
  // instead of stranding the film in a half-reduced state.
  const [reducedMotion, setReducedMotion] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  })
  useEffect(() => {
    let mq: MediaQueryList | null = null
    try {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    } catch {
      return
    }
    const onChange = (event: MediaQueryListEvent): void => setReducedMotion(event.matches)
    mq.addEventListener('change', onChange)
    return () => mq?.removeEventListener('change', onChange)
  }, [])
  const [contextLost, setContextLost] = useState(false)
  const showFallback = !canRender || contextLost || reducedMotion
  // The static story has no loader: clear the one index.html painted.
  useLayoutEffect(() => {
    if (showFallback) releaseBootLoader()
  }, [showFallback])

  // Render the film only while it can be seen: the runway intersects the
  // viewport and the tab is visible. A boolean that flips at most twice per
  // visit (never a scroll value), so it is fine as React state.
  const [onScreen, setOnScreen] = useState(true)
  const [tabVisible, setTabVisible] = useState(() => document.visibilityState !== 'hidden')
  useEffect(() => {
    const el = runway.current
    if (el === null || showFallback) return
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        setOnScreen(entry.isIntersecting)
        // Off screen at load (e.g. a /#buy link): the paused film draws no
        // frames, so there is no scene to wait for; never hold the page.
        if (!entry.isIntersecting) filmLoad.mark('scene')
      }
    })
    io.observe(el)
    const onVisibility = (): void => setTabVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [showFallback])

  // Loader milestones owned by the page: the shell is up, the type is
  // ready, and JS chunks landing during the engine download count as real
  // bytes. The WebGL film only: the static story has nothing to wait for.
  useEffect(() => {
    if (showFallback) return
    filmLoad.mark('shell')
    filmLoad.observeChunks()
    let live = true
    void document.fonts.ready.then(() => {
      if (live) filmLoad.mark('fonts')
    })
    return () => {
      live = false
    }
  }, [showFallback])

  // Pointer parallax for fine pointers only. MotionValues, never state.
  useEffect(() => {
    const el = stage.current
    if (el === null || !window.matchMedia('(pointer: fine)').matches) return
    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      parallaxX.set(((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2)
      parallaxY.set(((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2)
    }
    const onLeave = () => {
      parallaxX.set(0)
      parallaxY.set(0)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [parallaxX, parallaxY])

  // ?t=0.42 deep link: jump the runway itself to that progress on mount.
  // Mapped against the runway rect, not the document: buy deck and footer
  // below the film would otherwise offset every value.
  useEffect(() => {
    const t = progressFromUrl()
    const runwayEl = runway.current
    if (t === null || runwayEl === null) return
    scrollToProgress(runwayEl, t, 'instant')
    // The page can still grow or shift after mount (fonts, lazy chunks, a
    // slow first layout), which clamped or lost the jump now and then in
    // WebKit and left the film at the top. Hold the position for the first
    // two seconds; any reader input hands the scroll back at once.
    const until = performance.now() + 2000
    let raf = 0
    const hold = (): void => {
      if (performance.now() > until) return
      const rect = runwayEl.getBoundingClientRect()
      const want = rect.top + window.scrollY + t * (rect.height - window.innerHeight)
      if (Math.abs(window.scrollY - want) > 2) scrollToProgress(runwayEl, t, 'instant')
      raf = requestAnimationFrame(hold)
    }
    raf = requestAnimationFrame(hold)
    const release = (): void => cancelAnimationFrame(raf)
    const inputs = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
    for (const type of inputs) window.addEventListener(type, release, { passive: true })
    return () => {
      release()
      for (const type of inputs) window.removeEventListener(type, release)
    }
  }, [])

  if (showFallback) {
    return (
      <section aria-label="Aether One X story" className="page py-16" data-testid="film-fallback">
        <h1 className="sr-only">Aether One X: power, without the noise.</h1>
        {CHAPTERS.map((chapter) =>
          chapter.act === 'teardown' ? (
            // The teardown is information, not decoration: the static story
            // carries all ten layers with their copy.
            <div key="teardown-layers">
              <article aria-label="Act teardown" className="grid gap-6 py-12 md:grid-cols-2">
                <div>
                  <p className="kicker">{chapter.kicker}</p>
                  <h2 className="display-lg mt-3">{chapter.headline}</h2>
                  <p className="lede mt-4">{chapter.body}</p>
                </div>
              </article>
              {TEARDOWN_COPY.map((layer, i) => (
                <article
                  key={layer.key}
                  aria-label={`Teardown layer ${layer.key}`}
                  className="grid gap-6 py-12 md:grid-cols-2"
                >
                  <div>
                    <p className="kicker">
                      {String(i + 1).padStart(2, '0')} / {TEARDOWN_COPY.length} · {layer.name}
                    </p>
                    <h2 className="display-lg mt-3">{layer.headline}</h2>
                    <p className="lede mt-4">{layer.intro}</p>
                    <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-(--color-border-hairline) pt-5">
                      {layer.stats.map((stat) => (
                        <div key={stat.label} className="flex flex-col-reverse">
                          <dt className="mt-1 text-sm text-(--color-dim)">{stat.label}</dt>
                          <dd className="text-2xl font-semibold tracking-tight tabular-nums">
                            {stat.value}
                            {stat.unit !== '' && (
                              <span className="ml-1 text-sm font-medium text-(--color-dim)">
                                {stat.unit}
                              </span>
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <ul className="mt-6 space-y-2 text-sm">
                      {layer.callouts.map((callout) => (
                        <li key={callout.key}>
                          <span className="font-medium">{callout.title}.</span>{' '}
                          <span className="text-(--color-dim)">{callout.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex justify-center">
                    <PhoneFrame
                      face={i >= 8 ? 'rear' : 'front'}
                      label={`${layer.headline} (static view)`}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <article
              key={chapter.act}
              aria-label={`Act ${chapter.act}`}
              className="grid gap-6 py-12 md:grid-cols-2"
            >
              <div>
                <p className="kicker">{chapter.kicker}</p>
                <h2 className="display-lg mt-3">{chapter.headline}</h2>
                <p className="lede mt-4">{chapter.body}</p>
                {chapter.facts !== undefined && (
                  <dl className="mt-6 grid grid-cols-3 gap-x-6 gap-y-4 border-t border-(--color-border-hairline) pt-5">
                    {chapter.facts.map((fact) => (
                      <div key={fact.label} className="flex flex-col">
                        <dt className="mt-1 text-sm text-(--color-dim)">{fact.label}</dt>
                        <dd className="order-first font-mono text-xl font-medium tabular-nums">
                          {fact.value}
                          {fact.unit !== '' && (
                            <span className="ml-1 text-sm text-(--color-dim)">{fact.unit}</span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
              <div className="flex justify-center">
                <PhoneFrame
                  face={chapter.act === 'camera' ? 'rear' : 'front'}
                  label={`${chapter.headline} (static view)`}
                />
              </div>
            </article>
          ),
        )}
        {contextLost && (
          <p role="status" className="text-sm text-(--color-dim)">
            3D paused after a graphics reset. Static story shown.
          </p>
        )}
        {reducedMotion && !contextLost && (
          <p className="text-sm text-(--color-dim)">
            Motion is reduced on this device, so the story is told in stills.
          </p>
        )}
      </section>
    )
  }

  return (
    <section
      ref={runway}
      aria-label="Aether One X product film"
      style={{ height: 'var(--film-height)' }}
      data-testid="film-runway"
    >
      <h1 className="sr-only">Aether One X: power, without the noise.</h1>
      <FilmLoader tracker={filmLoad} />
      <div
        ref={stage}
        className="dark-scope sticky top-0 h-screen w-full overflow-hidden supports-[height:100svh]:h-[100svh]"
      >
        <Suspense fallback={null}>
          <BackdropLazy progress={progress} />
        </Suspense>
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center" role="status">
              <p className="kicker">Preparing the film</p>
            </div>
          }
        >
          <FilmCanvasLazy
            progress={progress}
            parallaxX={parallaxX}
            parallaxY={parallaxY}
            onContextLost={() => setContextLost(true)}
            active={onScreen && tabVisible}
            onStage={(stage) => filmLoad.mark(stage)}
          />
        </Suspense>
        <FilmOverlay progress={progress} runway={runway} />
      </div>
    </section>
  )
}
