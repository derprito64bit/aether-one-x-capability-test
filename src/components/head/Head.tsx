import { useEffect } from 'react'

/** Production origin: og:image, og:url and canonical must be absolute. */
const ORIGIN = 'https://muse-spark-testing.vercel.app'

interface HeadProps {
  title: string
  description: string
  path: string
  /** Local PNG social card in public/og (scripts/capture-og.mjs). */
  image?: string
}

/**
 * Minimal per-route head manager. No heavy dependency. Crawlers that skip
 * JS still get the home card from the static tags in index.html; this
 * keeps titles, cards and canonicals right for everything that runs JS.
 */
export function Head({ title, description, path, image = '/og/home.png' }: HeadProps) {
  useEffect(() => {
    document.title = title
    const set = (selector: string, attr: string, key: string, value: string) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null
      if (el === null) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.setAttribute('content', value)
    }
    const url = `${ORIGIN}${path}`
    set('meta[name="description"]', 'name', 'description', description)
    set('meta[property="og:title"]', 'property', 'og:title', title)
    set('meta[property="og:description"]', 'property', 'og:description', description)
    set('meta[property="og:url"]', 'property', 'og:url', url)
    set('meta[property="og:image"]', 'property', 'og:image', `${ORIGIN}${image}`)
    set('meta[name="twitter:image"]', 'name', 'twitter:image', `${ORIGIN}${image}`)
    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (link === null) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = url
  }, [title, description, path, image])
  return null
}
