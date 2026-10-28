# LOG

Newest first. One entry per session or stage.

## 2026-10-28 - Loader shipped; owner critique recorded as acceptance criteria

- Owner asked where the requested loading page was (it had been deferred into
  this plan instead of built) and judged parts of the stopgap lazy: film text,
  pacing with no room for overscroll and no automated/held segments, and an
  exploded view without detailed components or a showcase per component.
- Shipped the loader on the stopgap: the phone silhouette fills as real
  milestones land (shell, type, engine chunks, renderer, first frames). A
  cold-load trace showed scene building blocking the main thread for 2-4 s,
  so the fill runs on the compositor and keeps moving through the stalls; no
  visible percentage, since text cannot update during those stalls.
- The rest of the critique became hard gates in PLAN.md ("Acceptance criteria
  from owner feedback") for the rebuild.

## 2026-10-28 - Stopgap overhaul merged; rebuild planned

- Merged PR #1 as a stopgap: redesign of the web layer (porcelain theme,
  nav/footer, film overlay, configurator, all product pages), the repaired
  original phone model and teardown (three adversarially verified rounds),
  Vercel SPA rewrite (sub-pages 404'd on direct load), PNG social cards,
  single-weight icons, and CI made real (green for the first time: format
  gate, cross-platform Playwright servers, three browsers, Lighthouse).
- Owner then decided the original site and model are too broken to build on:
  rebuild from scratch as "an overhaul of the original website idea with more
  added and polished details and animations and showcase". Full scroll film
  kept and expanded, phone modelled in Blender as glTF, fresh visual
  direction, and a loading page where the phone is the progress bar.
  Lightweight means the engineering, not a smaller experience. See PLAN.md.
- Next: stage R1 (direction and storyboard) in a fresh session.
