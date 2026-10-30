# LOG

Newest first. One entry per session or stage.

## 2026-10-30 - Phone model alignment: back-plate corners and rail facets (stopgap)

- Owner: alignment issues and clipping on the phone, "the corners of the
  backplate and the flips of the phone". Captured on the real GPU at 4x
  through the camera-act flip and the finish fan, then traced to four causes.
- Every outline was sampled by polar angle from the centre. A tall phone's
  corner subtends only ~10 degrees of that, so a corner got ~5 of 48 points
  (1 to 3 at low detail). The rails turned the corner in stepped facets, and
  the fan's backs (10 points a quadrant) cut their corners straight, poking
  through the rim. Outlines are now walked by arc, with half of every
  quadrant on the corner; concentric loops pair along their normals.
- The back panel and its rim opening kept the body's 11mm corner radius
  while inset 1.45mm, leaving a crescent of rail at every rear corner. They
  are now concentric (BACK_PANEL_R), as are the lower panel, panel gap and
  the fan's backs (which were also 0.3mm small).
- The rail walls had one flat normal per facet; now per-vertex normals.
  The rails' material split sat a quarter of the way down each long side,
  brushing those ends across the grain; it now falls at each corner's 45
  degree point.
- Faint cross-lines along the lit rail did not change when the rail meshes
  were resampled at twice the density, so they are not geometry
  (reflections, most likely); left as is.
- CI: `ubuntu-latest` moved to 26.04 the same day and every WebKit test
  failed to launch (the cached WebKit links ICU 74, which 26.04 lacks). The
  jobs are pinned to `ubuntu-24.04`, and the browser cache key names the
  image.

## 2026-10-29 - Renamed as a prompting and design capability test

- The owner asked for the GitHub name and description to present the
  project as a prompting and design capability test, with a detailed account
  of how it reached its level. Renamed `muse-spark-testing` to
  `aether-one-x-capability-test` (the local folder and the Vercel address
  keep the old name); new description and topics.
- README rewritten around that story: who did what (owner briefs and
  critique; an opencode agent for the September build, model not recorded;
  Claude Code for PRs #1-#8; independent AI review), the timeline, the method,
  the numbers, and what it does not prove. Facts came from three read-only
  research agents and were checked by an independent fact-checker before
  merge.

## 2026-10-29 - Loader first on a cold load (stopgap)

- The owner saw the loading screen arrive after the home page. Measured at
  4 Mbps: the page shell showed uncovered at 2.3 s and the loader came at
  2.9 s. It lived inside the lazy home route and waited 160 ms more.
- index.html now paints the loader's first frame itself (a boot loader:
  static silhouette, outline draw, scroll hold), before any script loads.
  FilmLoader takes it over in the same frame, continuing the draw. After
  the fix the loader is up at 0.1 s and the page appears only as it
  dissolves. Deep links, sub-pages, ?nogl and reduced motion get none; the
  static film and the route error boundary release it, and it releases
  itself after 20 s.

## 2026-10-28 - Dark home, stop-to-stop film, fuller copy, finish fan (stopgap)

- Owner on round 6: pop-out still rushes out; the cream studio is now the
  outlier, so the home page becomes a dark room with a spotlight on the
  phone; auto-scroll must carry the reader all the way (and land with all
  of a section's text in view); fuller text per section; "Choose your
  finish" shows every finish's back, fanned like a paper fan.
- Dark home: `data-theme="dark"` on `<html>` (inline script before paint,
  HomePage while mounted) swaps the surface/ink tokens; film, buy deck,
  nav and footer follow. The 3D studio is a dark room with a volumetric
  spot, a floor pool and a real SpotLight; titanium and glass rooms went
  dark too. Other pages keep porcelain.
- Stop to stop: a deliberate gesture glides to the next composed moment
  (act landings, the camera's macro dive, each display figure, the
  teardown overview and every layer, the open fan), 1.8 s per teardown
  layer; callout labels are all in before the stop. The pop-out's arrive
  span grew to 0.38 and the stack has a 0.75 layer/s cap on local moves.
- Fuller copy: two-sentence bodies and three decoded facts per act, all
  data-sourced (tested). Finish fan: six rear-facing finishes fanned in
  the final act, labelled from `fanBridge`. Portrait framing keeps the
  phone in the top half so the copy has room.
- Found on the live site and fixed: the film loader covered /#buy for
  seconds after a cold load; it now skips deep links and holds the page by
  refusing input instead of toggling overflow (WebKit lost ?t= positions).
- Independent review (3D code, HTML code, a real-GPU browser pass) found
  and this round fixed:
  - the nav stayed milky porcelain glass on the dark home (links 1.3:1);
  - the primary button's hover fell to 3.5:1;
  - arrow-key act jumps glided one stop past where they landed;
  - Page keys and big wheel notches skipped stops. Now one gesture goes
    to one stop, and page keys step stop to stop.
  - the open fan stalled 0.2% into the buy deck;
  - on phones, figures hid behind the phone (the copy carries the numeral
    there now) and the battery x-ray sat under the copy (the portrait fit
    now frames the cell);
  - the battery figure and caption collided with the copy at 1024 and
    1440 px;
  - a mobile teardown label covered the copy's eyebrow;
  - the cover glass was invisible in the overview (its rim now outlines
    it);
  - finish names were missing for screen readers;
  - the arrival facts were mislabelled.

## 2026-10-28 - Section rooms, code-set type, auto-advance (stopgap)

- Owner on the showcase: "much much better". Next asks: auto-scroll into
  the next section (readers stop short), a smoother and slower pop-out,
  hacker/code-like type that scrambles before showing, a giant projected
  "megapixels" figure on a dark camera backdrop, and a colour review per
  section because the film "looks like it's floating in space" (display:
  colour spectrum plus refresh rate and range in big type).
- Rooms: studio sweep for the opening, teardown and finale; HTML rooms
  behind a transparent canvas for the rest (titanium, glass, projector,
  spectrum, data, charge, os, neural), each with one accent and a giant
  Geist Mono figure placed in that act's measured free wall. The phone is
  relit per room. Palette in docs/design-tokens.md.
- Code-set type decodes in everywhere it appears; screen readers only get
  the true text. Auto-advance completes a resting scroll into the next
  composed section (film rest map, page sections, film to buy deck),
  after real input only. Pop-out: 30% arrive/leave, smootherstep, arc.
- Measured, not guessed: phone extents per act from the live scene; a
  wheel-walk of the whole page found one 1.4-screen settle out of the
  teardown's opening, so the opening became a rest zone (0 anomalies
  after).

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
