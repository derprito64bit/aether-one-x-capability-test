# Session context (compact-safe — read this first after compaction)

## What this is

Aether One X v2 — fictional flagship product film site. Build repo:
`C:\Users\Aaron\aether-one-x-v2` (git `master`). Deploy repo:
`C:\Users\Aaron\Documents\GitHub\muse-spark-testing` (git `main`,
GitHub `derprito64bit/aether-one-x-capability-test`, formerly
`muse-spark-testing`; Vercel Hobby auto-deploys).
Sync ritual: work in build, copy excluding `.git node_modules dist
reference test-results playwright-report .playwright-mcp`, commit both,
push deploy.

## Prompt authority (date order — newest governs)

meta (09:52) → setup (09:54:37) → meta_1 (09:54:44) → device-model
(14:06) → **prompt-A (15:53:20, DESIGN bible)** → **prompt-B (15:53:22,
animation)** → **prompt-A2 (2026-09-21, supersedes A §5)** →
**prompt-C (internals)** → **prompt-D (2026-09-21, teardown, newest
overall)** → **round-01 review (2026-09-22)**. Design = **circular
camera module** (centred, 47mm, triangle lenses + periscope, NOVEK
partner, iris medallion) — the offset plateau (D7) was retired by A2.
Repo implements A2 + C + D (see `docs/device-design.md`); when docs and
code disagree, `phoneDimensions.ts` + `timeline.ts` win.
Blender build is a SIMPLIFIED subset of the circular design (see Blender
section below for the as-built list).

## State (all committed + pushed)

- Build: `ea6ecd2` + `07fcbc7`. Deploy: `0110aeb` pushed (`fc19f19..0110aeb`).
- Verify green: typecheck/lint/format/98 tests/build/analyze, e2e:quick 5/5.
- Secrets sweep clean (public-safe). Local paths redacted from handoff.

## Hard-won facts (do not relearn)

- Earcut drops dense holes in superellipse extrudes → ring is an explicit
  annulus; `ringHole.test.ts` guards it. Annulus loops must start at +X
  with monotone winding or the lid pinwheels (regression test exists).
- R3F `aria-label` on `<group>` throws on re-render → use `name`.
- Parallax must not accumulate inside damped aim (apply at lookAt).
- Film glass opacity was flat 0.42 (x-ray leftover) washing all faces;
  now tracks power state. Subpixel overlay must never enter SHELL_MATS
  (it pinned the macro overlay opaque = gray veil).
- `?t=` captures land short (layout shift) → `m3r-shots.mjs` re-scrolls
  after settle. Multi-viewer pages poison `window.__` probes.
- PowerShell: no heredocs, no `||`, use `npx.cmd`/`npm.cmd`/`px.cmd`,
  `>` corrupts binaries (UTF-16). Never use shell for file ops.
- `npm run verify` = typecheck+lint+format+test+build+analyze.
  Visual: `node scripts/m3r-shots.mjs` (9 views), `capture-film.mjs`
  (13 acts), `probe.mjs`, `crop/shrink/roll/survey.mjs` (untracked dev).
- GPU: RTX 3070 (CUDA+OPTIX), Ryzen 5600X. SwiftShader only for headless.

## Blender link (LIVE — use it for design renders)

- Blender 4.5.14 LTS (Steam) + MCP-for-Blender addon v1.7, protocol 9.
  Auto-start flag saved in the .blend; a relaunch usually reconnects.
  Else: N-panel → BlenderMCP tab → Start MCP Server.
- FILE: `C:\Users\Aaron\AppData\Local\Temp\opencode\aether-one-x.blend`
  (open live in the user's Blender right now).
- Scene (v2, REBUILT circular): n=5 body, enlarged module outerR 0.0235
  at (0, 0.0458), collar steps, seal, cover glass, 3 lenses
  (0.0060/0.0049/0.0049, flat dark domes), periscope + prism, arc flash,
  ToF pair, mic, iris medallion + ring, 192-tooth knurl, 2 dial rings,
  volume/power side keys, USB-C, AETHER text. Cycles GPU 64spp + denoise,
  Key 400W / RimStrip 250W / Fill 80W / RearSoft 50W size 0.35 (raking).
  Renders: `aether-v2-rear3.png` (best), `aether-v2-macro2.png` (knurl +
  triangle verified).
- Blender lessons: 2D-curve slabs render UNCAPPED — bmesh loft instead;
  body needs dark caps under cover glass; big flat-on area light blows
  obsidian white — dim raking light; bmesh has NO create_torus (hand-roll
  parametric torus); transmission glass over bright lights blows white —
  darken lens base. execute_blender_code is stateless — redefine helpers.

## Dimensions (meters, single source: phoneDimensions.ts)

Body 0.0768×0.1596×0.0078, BODY_N=5. Circular module centered (0, 0.0458),
outerR 0.0235 (47mm). Lenses polar R=0.0102: main r.0060 @90°, ultra
r.0049 @210°, mid r.0049 @330°, periscope below, ToF pair, arc flash.
Finishes: obsidian/titanium/glacier/ember/slate/clear.

## Honest gaps

Real-GPU traces, reduced-motion e2e, rack-focus DOF, callouts show 1–2
labels (spec collision rule), LOD2/merged shell deferred (see
docs/device-design.md). `/dev/*` DEV-guarded. Lighthouse CI untested
locally (runs in CI).
