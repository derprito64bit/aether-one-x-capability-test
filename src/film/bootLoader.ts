/**
 * The boot loader: FilmLoader's first frame, painted by index.html before
 * any script or page content has loaded, so on a cold load of the home page
 * the loader is the very first thing on screen instead of arriving after
 * the page. The inline script there marks <html data-boot="film">, records
 * when the outline began drawing, holds scrolling, and defines the release
 * (also its own 20 s failsafe). FilmLoader takes over in the same frame it
 * releases it; the static film releases it too.
 */
declare global {
  interface Window {
    __bootT0?: number
    __bootRelease?: () => void
  }
}

/** True while the boot loader is on screen. */
export function bootLoaderShown(): boolean {
  return (
    document.documentElement.dataset.boot === 'film' &&
    document.getElementById('boot-loader') !== null
  )
}

/** Milliseconds since the boot loader's outline began drawing. */
export function bootElapsedMs(): number {
  return window.__bootT0 === undefined ? 0 : performance.now() - window.__bootT0
}

/** Removes the boot loader and its scroll hold. Safe to call repeatedly. */
export function releaseBootLoader(): void {
  window.__bootRelease?.()
  document.getElementById('boot-loader')?.remove()
}
