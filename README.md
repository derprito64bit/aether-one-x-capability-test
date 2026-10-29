# Aether One X: a prompting and design capability test

A scroll-driven 3D product film for a phone that does not exist, built to
answer one question: **how far can plain-language direction take AI coding
agents in product design and front-end craft?** The owner directed it, with
written briefs and then critique of the live site. AI agents wrote the code,
the procedural 3D phone, the copy and the tests, and separate AI reviewers
checked the major rounds before they merged.

**Live:** https://muse-spark-testing.vercel.app (any current browser; a
desktop GPU shows it best)
**Status:** a working stopgap. A from-scratch rebuild is planned in
[PLAN.md](PLAN.md); this page describes what is live now.

> The phone is fiction: brand, specifications, benchmarks and prices are
> illustrative. No real product's design, logo or wording is used
> ([docs/device-originality.md](docs/device-originality.md)). The idea and
> the name come from a public reference repository the first brief set as the
> bar to beat, [Vasiniks/aether-one-x](https://github.com/Vasiniks/aether-one-x):
> "audit, keep strengths, rebuild higher". The audit kept several of its
> engineering ideas, credited in [docs/audit.md](docs/audit.md) (the
> re-clocked keyframe sampler, fit-based framing, the battery maths, local-only
> procedural assets).

## What to look at

| Moment          | Where                                                                                      | What it shows                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading screen  | [the site](https://muse-spark-testing.vercel.app), in a fresh tab                          | The phone                                                                                                                                                                        | procedural three.js geometry; the exterior is 41,926 triangles at full detail (test budget 120,000); the open six-finish fan is about 114,000 |
| One shot        | scroll from the top                                                                        | Eleven acts driven by a single scroll value. One scroll gesture (or Space, Page Down) glides to the next of 25 composed stops and lands with that moment's text fully on screen. |
| Teardown        | [`?t=0.289`](https://muse-spark-testing.vercel.app/?t=0.289)                               | Ten layers open like a sandwich, then each comes forward alone with its named sub-components ([`?t=0.365`](https://muse-spark-testing.vercel.app/?t=0.365) is the battery).      |
| Camera          | [`?t=0.532`](https://muse-spark-testing.vercel.app/?t=0.532)                               | A projector room with the 50 MP figure on the wall; scroll on and the camera dives into the circular module.                                                                     |
| Display         | [`?t=0.774`](https://muse-spark-testing.vercel.app/?t=0.774)                               | A colour-spectrum room with the panel's figures.                                                                                                                                 |
| Finish fan      | [`?t=0.995`](https://muse-spark-testing.vercel.app/?t=0.995)                               | The six finishes fanned out from the back.                                                                                                                                       |
| Buy deck, pages | [`/#buy`](https://muse-spark-testing.vercel.app/#buy), `/cameras`, `/display`, `/software` | A configurator, an OS simulator, a refresh-rate slider, a focal-length strip.                                                                                                    |

Links with `?t=` jump straight to a moment and skip the loader. Reduced
motion gets the same story as stills.

## How it was made

### Who did what

| Role                                            | Who                                                                                                                                                                                                                  | On the record                                                                                                                                                                                                                                                                       |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direction                                       | The owner: six brief documents (about 14,400 words) given to the agents, then critique of the live site after each round. Who drafted each brief's text is not recorded; two sit in a folder named `Claude outputs`. | [docs/meta-prompt-main.md](docs/meta-prompt-main.md), [docs/m3r-device-model.md](docs/m3r-device-model.md), [docs/prompt-a-fidelity.md](docs/prompt-a-fidelity.md), [docs/prompt-b-animation.md](docs/prompt-b-animation.md), [Claude outputs/](Claude%20outputs), [LOG.md](LOG.md) |
| First build, 19 to 24 Sep 2026                  | An AI coding agent in opencode, working through the milestone brief (M0 to M10) and the follow-up briefs. Which model it ran is not recorded.                                                                        | 26 commits, including the repository's first; [docs/tooling.md](docs/tooling.md), [docs/handoff.md](docs/handoff.md)                                                                                                                                                                |
| Overhaul and feedback rounds, 28 to 29 Oct 2026 | Claude Code (Claude Opus 5.5), one pull request per round.                                                                                                                                                           | PRs [#1](../../pull/1) to [#8](../../pull/8); 20 commits carry its co-author trailer                                                                                                                                                                                                |
| Review                                          | Independent AI reviewers with separate scopes (the 3D code, the HTML and overlay code, a live pass in Chrome on a real GPU) before the major merges.                                                                 | the review-fix commit in PRs [#4](../../pull/4), [#5](../../pull/5) and [#7](../../pull/7)                                                                                                                                                                                          |
| Gate                                            | CI on every push: typecheck, lint, format, unit tests, bundle budgets, end-to-end tests in Chromium, Firefox and WebKit with axe, and Lighthouse.                                                                    | [.github/workflows/ci.yml](.github/workflows/ci.yml)                                                                                                                                                                                                                                |

### Timeline

| When                       | Stage                      | What triggered it, and what changed                                                                                                                                                                                                                                                                                    |
| -------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 19 to 20 Sep               | Milestones M0 to M10       | The main brief, in order: scaffold and verify gate, design system, data layer, static 3D phone, timeline engine, the film, glass and zoom, interactive modules, product pages.                                                                                                                                         |
| 20 to 24 Sep               | Fidelity, motion, teardown | Prompt A (detail the device in millimetres), Prompt B (exploded views and transitions), the circular camera module, the internals, and numbered review rounds.                                                                                                                                                         |
| 28 Oct, [#1](../../pull/1) | Overhaul and model repair  | A new web layer; the phone model and teardown repaired over three adversarially verified rounds; sub-pages that 404'd on direct load fixed; CI green for the first time.                                                                                                                                               |
| 28 Oct, [#2](../../pull/2) | Rebuild plan               | The owner judged the original site and model "nearly entirely broken" and asked for a from-scratch rebuild, planned in [PLAN.md](PLAN.md). The overhaul stays live as a stopgap until then.                                                                                                                            |
| 28 Oct, [#3](../../pull/3) | Loader and gates           | The owner asked where the loading page was and judged parts of the stopgap "done very lazily"; that critique became six hard gates in [PLAN.md](PLAN.md). The loader fills the phone as real milestones land, on the compositor, because a cold-load trace showed scene building holding the main thread for 2 to 4 s. |
| 28 Oct, [#4](../../pull/4) | Teardown showcase          | The per-part copy was "a generic block" and the exploded view "never focused on one part". Now: 10 layers at 34 mm gaps, a labelled overview, one part at a time with the rest dimmed, 36 modelled sub-components.                                                                                                     |
| 28 Oct, [#5](../../pull/5) | Section rooms              | The film "looks like it's floating in space". Now: a room per section with one accent and a giant code-set figure, type that decodes in, and auto-advance.                                                                                                                                                             |
| 28 Oct, [#6](../../pull/6) | Dark-room veil             | A check of the live site found the battery figure greyed by the copy veil; the veil now eases off in dark rooms.                                                                                                                                                                                                       |
| 28 Oct, [#7](../../pull/7) | Dark home, stop to stop    | The pop-out still rushed out and the cream studio was now the outlier. Now: a dark room with a spotlight, 25 stops, fuller copy and the finish fan. Its review found and fixed, among others, nav links at 1.3:1 contrast and stops skipped by page keys.                                                              |
| 29 Oct, [#8](../../pull/8) | Loader first               | The loading screen arrived after the home page. Its first frame is now painted from index.html: on a 4 Mbps cold load with the cache off, the loader was up at 0.11 s on the fix branch, against 2.87 s on the live site before; the page now first appears as the loader dissolves.                                   |

### The method: what got it to this level

1. **Briefs with numbers, not adjectives.** The device brief reads like a
   drawing: "A micro-chamfer at each glass meeting edge: 0.25mm at roughly 45
   degrees. [...] It is not optional." The motion brief defines success as
   something a reviewer can test: "a viewer scrubbing backward never sees a
   pop, snap, or teleport". The performance target is a number: "55fps
   sustained, no frame over 50ms, under 4x throttle". The first brief named a
   reference to "audit, keep strengths, rebuild higher".
2. **Rules the agent cannot forget.** [CLAUDE.md](CLAUDE.md) loads at the
   start of every session with nine invariants (everything a pure function of
   scroll progress, zero allocation per frame, dispose everything, the device
   is fictional, zero third-party requests, ...) and a list of landmines that
   each cost hours once. The ones that can be tested are tests: no network
   requests in source, no drei, no scroll listeners, pure math kept free of
   React and three.js, a triangle budget, and film copy checked against the
   product data.
3. **One source of truth.** Every figure the film shows comes from
   [src/data/product.ts](src/data/product.ts), and
   [chapters.test.ts](src/film/chapters.test.ts) fails if the copy disagrees
   with it.
4. **Critique becomes acceptance criteria.** The owner's verdict on the
   stopgap ("made in mind of just getting results instead of making something
   special and sleek") was turned into six gates in [PLAN.md](PLAN.md): a
   dwell of at least 40vh per beat on desktop, automated showcase segments,
   a showcase for every component, launch-quality copy, a loader on the
   compositor, and "special, not done". PRs #3, #4, #5, #7 and #8 each answer
   a critique recorded in [LOG.md](LOG.md).
5. **Measure, don't guess.** The phone's projected extents were measured in
   the live scene for every act before the wall figures were placed. A
   scripted wheel-walk of the whole page found one 1.4-screen settle, which
   was fixed (0 after). Reviewers computed contrast for the theme's text and
   surface pairs and measured the live page, which caught nav links at 1.3:1
   on the dark home. The loader fix was timed frame by frame on a throttled
   4 Mbps cold load (2.87 s before, 0.11 s after). After the
   stop-to-stop work, every keyboard and wheel landing measured 0 px from
   its stop.
6. **Independent review before merge.** In the major rounds (#4, #5, #7),
   separate reviewers covered the 3D code, the HTML and overlay code, and a
   live pass in Chrome on the real GPU. Confirmed findings were fixed in a
   second commit before merging; PR #1's model repair went through three
   adversarially verified rounds.
7. **Check the real thing.** Captures ran in headless Chrome on the real GPU
   (ANGLE on Direct3D 11) at 1440, 1280, 1024 and 390 px and on a short
   375 x 667 phone. The reverse scrub (drag from the end back to the start)
   is the check that "catches more than every other check combined". The
   live site was checked again after merging; PR #6 came out of one such
   check.
8. **Memory that lives in the repo.** [CLAUDE.md](CLAUDE.md) holds the rules,
   [PLAN.md](PLAN.md) the plan and its gates, [LOG.md](LOG.md) what happened
   (newest first), and [docs/](docs) the details. Every session starts from
   that record instead of from a conversation that is gone.

### By the numbers (29 Oct 2026)

| What                 | Count                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------- |
| Commits on `main`    | 54: 26 in the September build, 28 from 28 to 29 Oct (8 PRs, about 18,100 lines added)   |
| App code             | about 22,000 non-blank lines in some 140 TypeScript and CSS files, tests excluded       |
| Tests                | 243 unit tests in 47 files; 27 end-to-end cases in each of Chromium, Firefox and WebKit |
| The phone            | procedural three.js geometry, 41,926 triangles at full detail (budget 120,000)          |
| The film             | 11 acts, 25 stops, a 10-layer teardown with 36 sub-components, 9 rooms, 6 finishes      |
| Initial JavaScript   | 178.5 KB gzip (budget 180 KB); the lazy 3D chunks add 376.6 KB; CSS 14.8 KB             |
| Third-party requests | 0: fonts are self-hosted, and a source-scan test forbids remote URLs                    |

### What it does not prove

- **It is a stopgap.** The owner judged the September result "nearly
  entirely broken"; PR #1 repaired it rather than replacing it. The planned
  rebuild (a Blender-modelled glTF phone, tighter budgets: initial JS at most
  110 KB) has not been done, and the current build would not meet those
  budgets.
- **No real-GPU frame timings are on record.** The performance notes hold
  software-renderer lower bounds only, some of the perf docs are out of date,
  and Lighthouse performance is not asserted in CI (CI renders WebGL in
  software).
- **Known flaws were documented rather than fixed** in PR #1: camera
  housings that share volume with the board, and small field-of-view steps on
  portrait at two points in the teardown. A third, the solid midframe, was
  rebuilt in PR #4, but some docs still describe it: parts of docs/ lag the
  code.
- **CI has not been spotless.** It was red on every September push and first
  went green with PR #1. Of the 42 runs on 28 and 29 Oct, 15 failed, mostly
  end-to-end timeouts and flakes on the shared runners plus one Lighthouse
  browser-launch error, and runs on `main` failed after the merges of PRs
  #1, #5 and #7. `main` is green as of PR #8.
- **The originality gate is a human sign-off**, not an automated check.
- **The September agent's model is not recorded**, and git cannot show
  whether any commit was edited by hand: every commit is under the owner's
  account.

### Read the record

[LOG.md](LOG.md) (every round, newest first), [PLAN.md](PLAN.md) (the
rebuild and its gates), [CLAUDE.md](CLAUDE.md) (the rules every session
loads), the briefs in [docs/](docs) and [Claude outputs/](Claude%20outputs),
and the pull requests [#1 to #8](../../pulls?q=is%3Apr+is%3Amerged).

This repository was called `muse-spark-testing` until 29 Oct 2026; the live
site keeps that address.

## Developer reference

| command             | what                                                          |
| ------------------- | ------------------------------------------------------------- |
| `npm run dev`       | local dev server                                              |
| `npm run verify`    | typecheck + lint + format + test + build + analyze (the gate) |
| `npm run test`      | vitest unit suite                                             |
| `npm run e2e`       | playwright matrix (CI)                                        |
| `npm run e2e:quick` | chromium smoke + film (local loop)                            |
| `npm run build`     | production bundle                                             |
| `npm run analyze`   | bundle budgets (fails when exceeded)                          |

On Windows use `npm.cmd` / `npx.cmd`; the PowerShell `.ps1` shims are
blocked by execution policy.

### Routes

`/`, `/cameras`, `/performance`, `/display`, `/software`,
`/specifications`. Dev-only: `/dev/zoom`, `/dev/kitchen-sink`
(`?t=` deep-links film progress, `?nogl=1` forces the static fallback,
`?bodyN=` tunes the body superellipse for a session).

### Architecture

```text
scroll ──► progress MV ──► sampleFilm(p) ──► FilmDirector ──► scene
                                │                  ├─ camera/pose/FOV (damped + capped)
                                │                  ├─ lighting states (damped per act)
                                │                  ├─ shell dissolve + internals control
                                │                  └─ screen mode/brightness
                                └─► computeFilmStates(p) ──► overlay chapters,
                                    callouts, screen, internals
```

- `src/film/`: acts (keyframes), timeline, sampler, states, director,
  overlay, internals, teardown, rooms (`backdrop/`), finish fan (`fan/`),
  loader.
- `src/components/PhoneViewer/`: the procedural device (geometry,
  materials, textures, lighting, LOD).
- `src/data/product.ts`: single source of truth; film copy must match it
  (tested).
- `src/lib/`: pure math, imports neither React nor three (boundary tested).

How the film works in two minutes: one sticky stage inside a long runway;
scroll position maps to progress 0..1; pure functions sample keyframes and
state windows; the director damps everything toward the sample (rotation
and FOV capped, position glided); the overlay crossfades chapters and
projects the teardown's callouts. Reduced motion, missing WebGL, or `?nogl`
collapses to a static chapter list.

### Constraints

- Fictional product; no real brand imitation anywhere.
- No analytics, fonts, HDR, images, or beacons off-device (tested).
- ACES Filmic, one curve; sRGB authored colours converted once
  ([docs/rendering.md](docs/rendering.md)).
- 120k triangle device budget; bundle budgets enforced
  ([docs/perf.md](docs/perf.md)).
- Accessibility: skip link, arrow-key act navigation, aria-live chapters,
  static story under reduced motion, contrast-tested tokens, axe on every
  route in CI.

### Docs

[docs/FILM.md](docs/FILM.md) (add an act), [docs/teardown.md](docs/teardown.md)
(the showcase), [docs/design-tokens.md](docs/design-tokens.md) (themes,
rooms, contrast), [docs/glass.md](docs/glass.md) (tiers),
[docs/motion.md](docs/motion.md) (grammar),
[docs/rendering.md](docs/rendering.md) (colour),
[docs/device-design.md](docs/device-design.md),
[docs/device-perf.md](docs/device-perf.md) and
[docs/device-originality.md](docs/device-originality.md) (the device),
[docs/adr/](docs/adr) (big decisions), [docs/tooling.md](docs/tooling.md)
(environment).
