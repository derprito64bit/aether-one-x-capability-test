# LOG

Newest first. One entry per session or stage.

## 2026-10-28 - Teardown rebuilt as a one-part-at-a-time showcase (stopgap)

- Owner on the live teardown: the copy was a generic block, not an
  introduction of each part's capabilities; the open stack never focused
  on one part and was overwhelming; it should open like a sandwich so
  each part can be seen, which would expose low-detail parts.
- 3D (model agent, round 05): the stack opens to 34 mm gaps and holds a
  labelled overview, then each layer slides out alone to a hero pose
  while the rest dim to 15%. Every part that was a box or slab got real
  detail (midframe, battery, port, haptic, speaker, chamber, camera and
  more); 36 sub-components exist as geometry with anchors.
- Copy and overlay: each layer has a headline, a two-sentence intro, four
  capabilities and 3-4 named sub-components, every figure traced to
  src/data or the model (tested). Callouts stagger in with leaders drawn
  from hotspots; label columns beside the part on wide frames, title chips
  over it on narrow ones. The overlay publishes the free slot the part
  must fit, so labels and part never collide.
- Pacing: `--film-height` 3200svh desktop / 2300svh mobile (about 62vh per
  layer on desktop); a resting scroll mid-move settles into the next hold
  in the direction of travel; Play holds each layer about 4 s.
- This also lands on the stopgap before the rebuild: PLAN.md's gates for a
  detailed per-component teardown and held segments still apply to R1-R6.

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
