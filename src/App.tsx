import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { RouteErrorBoundary } from './components/RouteErrorBoundary.tsx'
import { ScrollManager } from './components/ScrollManager.tsx'
import { Footer } from './components/layout/Footer.tsx'
import { Navbar } from './components/layout/Navbar.tsx'

const HomePage = lazy(() => import('./pages/HomePage.tsx').then((m) => ({ default: m.HomePage })))
const CamerasPage = lazy(() =>
  import('./pages/CamerasPage.tsx').then((m) => ({ default: m.CamerasPage })),
)
const PerformancePage = lazy(() =>
  import('./pages/PerformancePage.tsx').then((m) => ({ default: m.PerformancePage })),
)
const DisplayPage = lazy(() =>
  import('./pages/DisplayPage.tsx').then((m) => ({ default: m.DisplayPage })),
)
const SoftwarePage = lazy(() =>
  import('./pages/SoftwarePage.tsx').then((m) => ({ default: m.SoftwarePage })),
)
const SpecificationsPage = lazy(() =>
  import('./pages/SpecificationsPage.tsx').then((m) => ({ default: m.SpecificationsPage })),
)
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage.tsx').then((m) => ({ default: m.NotFoundPage })),
)
const DevZoomPage = lazy(() =>
  import('./pages/DevZoomPage.tsx').then((m) => ({ default: m.DevZoomPage })),
)
const KitchenSinkPage = lazy(() =>
  import('./pages/KitchenSinkPage.tsx').then((m) => ({ default: m.KitchenSinkPage })),
)

/** Root application shell with lazy routes and per-route error boundaries. */
export function App() {
  return (
    <BrowserRouter>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black"
      >
        Skip to content
      </a>
      <ScrollManager />
      <Navbar />
      <main id="main">
        <Suspense
          fallback={
            // Reserve the route's space so the footer never jumps up and back.
            <div role="status" className="min-h-[100svh]">
              <span className="sr-only">Loading</span>
            </div>
          }
        >
          <Routes>
            <Route
              path="/"
              element={
                <RouteErrorBoundary routeName="Home">
                  <HomePage />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/cameras"
              element={
                <RouteErrorBoundary routeName="Cameras">
                  <CamerasPage />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/performance"
              element={
                <RouteErrorBoundary routeName="Performance">
                  <PerformancePage />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/display"
              element={
                <RouteErrorBoundary routeName="Display">
                  <DisplayPage />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/software"
              element={
                <RouteErrorBoundary routeName="Software">
                  <SoftwarePage />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/specifications"
              element={
                <RouteErrorBoundary routeName="Specifications">
                  <SpecificationsPage />
                </RouteErrorBoundary>
              }
            />
            {import.meta.env.DEV ? (
              <Route
                path="/dev/zoom"
                element={
                  <RouteErrorBoundary routeName="DevZoom">
                    <DevZoomPage />
                  </RouteErrorBoundary>
                }
              />
            ) : null}
            {import.meta.env.DEV ? (
              <Route
                path="/dev/kitchen-sink"
                element={
                  <RouteErrorBoundary routeName="KitchenSink">
                    <KitchenSinkPage />
                  </RouteErrorBoundary>
                }
              />
            ) : null}
            <Route
              path="*"
              element={
                <RouteErrorBoundary routeName="NotFound">
                  <NotFoundPage />
                </RouteErrorBoundary>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </BrowserRouter>
  )
}
