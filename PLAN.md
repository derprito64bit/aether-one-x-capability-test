# PLAN: Aether One X rebuild (lightweight, from scratch)

Owner direction, 2026-10-28: the original site and phone model are "nearly
entirely broken" and must **not** be used as a code or model reference. Build
a full overhaul. PR #1 (redesign + repaired original model) was merged only
as a **stopgap** so production stops 404ing; the rebuild replaces it.

**What the rebuild is (owner's words, 2026-10-28):** "an overhaul of the
original website idea with more added and polished details and animations and
showcase." Keep the idea, a scroll-driven cinematic showcase film for a
fictional flagship phone with a teardown, the product pages and the
configurator, and make it **bigger and better**: more showcase beats, more
detail on the device, richer and more polished animation. "Lightweight"
describes the engineering (clean code, small bundles, one render loop, a
compressed glTF model), never a smaller or plainer experience.

## Decisions (owner, 2026-10-28)

| #    | Decision                                        | Notes                                                                                                                                                                                                                                                                                                                                 |
| ---- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-D1 | **Full scroll film, rebuilt clean, expanded**   | Keep the concept: a multi-act, scroll-driven product film including a teardown, with **more** showcase than the original (at least its 11 beats plus new ones), more device detail and more polished animation. New code from scratch on a much simpler engine. Do not port the old `src/film/**` or `src/components/PhoneViewer/**`. |
| R-D2 | **Phone model: Blender -> glTF**                | Model a clean, original, fictional phone in Blender (the `blender` MCP is connected; Steam Blender 5.x). Export one compressed `.glb`, loaded with three's `GLTFLoader`.                                                                                                                                                              |
| R-D3 | **Fresh visual direction**                      | Do not reuse the PR #1 porcelain/Geist system by default. Explore directions first and let the owner pick (stage R1).                                                                                                                                                                                                                 |
| R-D4 | **Loading page: the phone is the progress bar** | Requested 2026-10-28. See "Loader" below.                                                                                                                                                                                                                                                                                             |
| R-D5 | Merge PR #1 as stopgap                          | Done. Live site has the redesign + fixes until the rebuild ships.                                                                                                                                                                                                                                                                     |

## Keep (these are not "the broken original"; they are project rules or fresh infra)

- Fictional, original device: no real manufacturer's wordmark, logo, letterforms or product signatures (no pill/capsule "island", no copied camera bumps). Gate: `docs/device-originality.md`.
- Zero third-party runtime requests (self-host fonts, decoders, assets). Draco/KTX2/meshopt decoders, if used, are served from `/public`.
- Accessibility: reduced motion gets a static story, keyboard act navigation, one h1 per route, WCAG AA contrast, axe clean on every route.
- Infra from PR #1 that is new and working: `vercel.json` SPA rewrite, `.prettierignore`, CI (format gate, cross-platform Playwright servers, all three browsers), `scripts/capture-og.mjs` (PNG social cards), `scripts/generate-icons.mjs` (single-weight Phosphor icons), the axe spec's wait-for-animations.
- Stack: React 19 + TypeScript + Vite 8 + Tailwind v4 + three. Re-decide the animation runtime in R1 (below).

## Engineering budgets (lightweight engineering, rich experience; enforce in `scripts/bundle-budget.mjs` + CI)

- Initial JS (shell, before the film chunk): <= 110 KB gzip.
- Film chunk incl. three + loaders: <= 220 KB gzip.
- Phone `.glb` (geometry + textures, compressed): <= 2 MB including the teardown internals; aim for <= 1.2 MB. Detail goes into normal/AO maps and clean topology, not raw triangle count.
- Film: <= 150k triangles assembled with internals, <= 120 draw calls (merge static parts per teardown layer); 60 fps on an RTX 3070 and smooth on an integrated GPU.
- LCP < 2.5 s on a cold load (the loader must not hide text content from crawlers: SSR-free SPA, so keep meaningful `<noscript>` and static meta).
- One `requestAnimationFrame` loop for the film, paused when off screen or the tab is hidden (PR #1 had to add this; build it in from the start).

## Loader (R-D4)

A first-visit loading screen where the phone is the progress bar.

- Real progress: `THREE.LoadingManager` / `GLTFLoader` `onProgress` (bytes of the `.glb` + textures), plus font readiness; never a fake timer.
- Visual: the phone "builds" bottom to top as progress goes 0 -> 100%. Two candidate implementations, pick in R3:
  1. A tiny inline SVG silhouette of the device (front outline from the same Blender model, exported as a path) whose fill rises with progress. Zero dependencies, paints instantly.
  2. A low-poly proxy mesh rendered with a clipping plane rising with progress, then cross-faded into the full model.
- Hand-off: at 100% the loader resolves into the film's first frame (same framing), not a cut to a different layout.
- Reduced motion: a static outline with a numeric percentage; no animated fill.
- Repeat visits with a warm cache should skip or flash it for <= 300 ms; never block for a cached model.
- Accessible: `role="progressbar"` with `aria-valuenow`, and a text percentage.

## Repo workflow

Work directly in this repo (`derprito64bit/muse-spark-testing`) on a branch per
stage, PR, CI green, merge; Vercel deploys `main`. The local build repo
`C:\Users\Aaron\aether-one-x-v2` is synced after merges (apply the merged diff
on a branch there, merge to `master`) until the owner retires it. The old
"work in the build repo, copy to deploy" ritual in CLAUDE.md is superseded.

## Stages (each in a fresh session; update LOG.md at the end of each)

### R1 - Direction and storyboard

- Produce 2-3 distinct visual directions (type pairing, palette, layout grid, motion language) as a shareable artifact for the owner to choose from. Respect the owner's taste notes in memory; avoid generic AI defaults.
- Storyboard the film as an expanded version of the original idea: at least the original's beats (arrival, design, front glass, teardown, camera, display, storage, battery, software, on-device AI, finish) plus new showcase beats (candidates: colourway reveal, materials macro, charging and the coil, audio and haptics, durability, a camera-module close-up, a hero turntable). Camera intent, motion idea and copy per act (data from a fresh `src/data/product.ts`, fictional values), and the teardown layers the model must expose.
- Decide the animation runtime: Motion only, or GSAP ScrollTrigger for the film timeline + Motion for UI (never both in one component tree). Recommendation to evaluate: a single hand-written scroll timeline (pure function of progress) driven by one `useScroll` MotionValue keeps the bundle small; GSAP earns its place only if the timeline authoring gets complex.
- Output: `docs/rebuild/direction.md`, `docs/rebuild/storyboard.md`; owner sign-off.

### R2 - Phone model in Blender

- Model an original fictional phone in Blender from the storyboard, with showcase-level detail: body, chamfered frame, front glass, display, rear panel in each finish, a detailed camera module (lenses, rings, flash, sensors), buttons, ports, speaker grilles, antenna bands, plus the internal parts the teardown shows (midframe, battery, logic board, SoC + shield, thermal, coil, camera assembly, flex cables, screws), each a **named node** in physical stack order. Clean, closed, non-intersecting geometry is the bar the original never met.
- PBR materials suitable for glTF (metal/roughness), baked AO where it helps; correct normals, no coplanar faces, no interpenetration in the assembled pose; real-world scale in metres.
- Export `public/models/aether.glb` with Draco or meshopt compression (+ KTX2 textures if worthwhile); a validation script that loads it headlessly and asserts node names, bounds, triangle count and size budget.
- Also export the front silhouette path for the loader.

### R3 - Foundation

- Fresh `src/` tree (delete the old film/model code in this stage, in one commit, after the new foundation runs).
- Design tokens and primitives from the chosen direction; routes; nav/footer; the loader (R-D4).
- Budget script updated to the new numbers; CI green.

### R4 - Film

- One director, one rAF loop, keyframed acts as data, pure function of scroll progress (reverse scrub retraces exactly).
- Teardown from the glTF's named nodes (explode along a single axis in stack order, no part ever passes through another; test it by sampling the timeline and checking node bounds).
- Overlay copy layout that never sits on the device (decide copy columns per act from the camera framing).
- Static story for reduced motion / no WebGL.

### R5 - Pages and configurator

- Product pages and the configurator in the new direction; finishes as material variants on the glTF (KHR_materials_variants or runtime material swaps).

### R6 - Verify and ship

- Unit tests (timeline purity, budgets, model validation), e2e (smoke, film, modules, axe on every route), visual review at desktop and 390 px, social cards re-captured, independent review pass, PR, merge.

## Carry-over lessons (from the 2026-10-28 session)

- Vercel needs `vercel.json` rewrites for client routes; preview deployments sit behind Vercel auth (302), so verify routing on production or with a bypass token.
- CI had been red since repo creation: keep `.prettierignore` for `.claude/` and `Claude outputs/`; Playwright web servers must use `node node_modules/vite/bin/vite.js` (cross-platform); install chromium, firefox and webkit; headless Firefox on Linux has no WebGL, so runway tests must skip without WebGL; Playwright ignores `timeout` in a test's details object (use `test.setTimeout`).
- Axe must judge settled frames: wait for `document.getAnimations()` to finish, not a fixed sleep.
- Phosphor React ships all six weights per icon (~0.9 KB gzip each): use `scripts/generate-icons.mjs`.
- `AnimatePresence mode="wait"` wedges when a long scroll jump crosses several states; key-remount instead for scroll-driven copy.
- Windows/PowerShell: use `npm.cmd`/`npx.cmd`; in the worktree sandbox avoid compound git/gh commands.
