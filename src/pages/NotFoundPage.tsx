import { ArrowLeftIcon } from '../components/icons.tsx'
import { useEffect } from 'react'
import { Link } from 'react-router'
import { Head } from '../components/head/Head.tsx'

/**
 * Catch-all route: every unknown path lands here (the host rewrites to the
 * SPA, so the status is 200); noindex keeps those URLs out of search.
 */
export function NotFoundPage() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])
  return (
    <>
      <Head title="Not found — Aether One X" description="This page does not exist." path="/404" />
      <section
        aria-label="Page not found"
        className="page flex min-h-[60vh] flex-col justify-center py-24"
      >
        <p className="kicker">404</p>
        <h1 className="display-xl mt-5">Nothing here.</h1>
        <p className="lede mt-6">That page does not exist. The phone is still where you left it.</p>
        <p className="mt-10">
          <Link to="/" className="btn btn-primary">
            <ArrowLeftIcon size={16} weight="bold" aria-hidden="true" />
            Back to the film
          </Link>
        </p>
      </section>
    </>
  )
}
