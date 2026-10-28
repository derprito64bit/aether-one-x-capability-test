import { defineConfig, devices } from '@playwright/test'

// Safety rails against hanging runs:
// - workers: 2 (WebGL tests crash browsers under contention).
// - timeout per test: 60s; expect: 5s. No test may wait silently.
// - reuseExistingServer: false (stale preview = nondeterministic failures).
// - Local loop: `e2e:quick` (chromium only, ~15s). Full matrix runs in CI.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 2,
  timeout: 60000,
  expect: { timeout: 5000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  // Vite's own bin through node: cross-platform (CI is Ubuntu, where the old
  // `cmd /c node_modules\.bin\vite` exited 127) and no PowerShell .ps1 shim.
  webServer: [
    {
      command:
        'node node_modules/vite/bin/vite.js preview --port 4173 --strictPort --host 127.0.0.1',
      port: 4173,
      // Never reuse: a stale preview of the previous dist causes nondeterministic
      // failures. Always boot the current build. CI already behaves this way.
      reuseExistingServer: false,
    },
    {
      // Dev server exists only for DEV-gated routes (/dev/*) under test.
      command: 'node node_modules/vite/bin/vite.js --port 5174 --strictPort --host 127.0.0.1',
      port: 5174,
      reuseExistingServer: false,
    },
  ],
})
