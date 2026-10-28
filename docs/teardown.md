# Teardown sequence — Prompt D build notes and rubric

Replaces the x-ray, chip, and rebuild acts with one horizontal
layer-by-layer teardown (0.25–0.52). Before: `docs/teardown-before-xray.png`.
After: `docs/film-snaps/act-teardown-*.png` (stack + ten layers).

Sandwich rewrite (user direction, 2026-09-24): the flip-to-face beats are
gone — every layer rides its slot, the camera tours the open stack. The
only rotation left is the camera layer turning lens-up during its own
beat, out beside the stack, so its decorated face meets the tour camera.

## Round 05 showcase (2026-10-28): one part at a time

Owner direction: the open stack was overwhelming and never focused on one
part. The teardown is now a showcase (`src/film/teardown/showcase.ts`,
manifest in `showcaseLayers.ts`):

- **Wide sandwich.** The phone lies down turned a quarter in its own plane
  (keys `rz = -PI/2`), long axis across the frame, and the stack opens to a
  34mm gap (was 8.5mm) over p 0.265-0.283. Seen from the rig camera no two
  layers' outlines overlap more than 25% (asserted on every vertex).
- **Overview hold** p 0.283-0.295 (tour cursor u < 0): all ten layers at
  full opacity, framed right of the copy (landscape) or in the top half
  (portrait).
- **Tour** u = (p - 0.295) / 0.02, unchanged mapping (e2e cards at
  p = 0.30 + 0.02 i). Layer i owns u in [i, i + 1), d = u - i: arrive
  d 0-0.2 (slides out of the footprint in its own plane toward the camera,
  then flies to its hero pose, turning only in flight), hold 0.2-0.8,
  leave 0.8-1. Focus is 0 at d 0.12, 1 from 0.24 to 0.78, 0 by 0.9. Only
  one layer is ever out of its slot (asserted). Every other layer dims to
  15% (`ShowcaseDimmer`: per-layer material clones, synced each frame).
- **Hero pose.** Solved in front of the rig camera: the layer's projected
  subject box is centred in and fitted to `showcaseBridge.slot`, the free
  rectangle the overlay publishes on resize (defaults
  `DEFAULT_SLOT_LANDSCAPE` / `_PORTRAIT` until it has measured), capped at
  60% of the height (landscape) or 42% (portrait). Detailed face to camera
  with a 3/4 tilt toward the copy (rear-facing layers flip: midframe,
  logic board, silicon, coil, camera, rear panel).
- **Rig camera.** While the stack is open the director blends to a solved
  camera (fixed 14-degree look, distance that fits the stack in the
  region); it slides the dimmed stack aside during the tour and rides
  35% of the way toward the presented layer's slot.
- **Bridge.** `writeShowcaseBridge` publishes layer, focus, overview, the
  presented layer's sub-component anchors (on their visible faces), one
  left-edge anchor per layer, and the presented layer's world AABB.
- **Sub-components** built for the showcase: display flex tail with driver
  IC and connector (unfolds below the panel while presented) and the panel
  punch cutout; open midframe rails with a mid-plate and machined ribs;
  battery label, protection board with nickel tabs, flex and BTB
  connector, stretch-release pull tabs; board solder mask/routing/
  silkscreen and chip markings, USB-C receptacle shell; SoC caps on the
  substrate border; vapour chamber seam, fill tube, and paste footprint;
  graphite print; ferrite sheet and three-turn NFC; LRA with ears and
  flex; speaker grille; camera voice-coil cans, barrels, coated elements,
  sensor boards, periscope prism window, ToF emitter and receiver.

The camera-layer beat (slide, lens-up turn, module rising to the
housings) and the tour aim offset are retired: the camera bump stays
bonded to the rear panel, and the internal camera modules are their own
presented layer.

### Overlay side (copy, callouts, pacing)

- **Copy** (`TEARDOWN_COPY` in `chapters.ts`): per layer a name, headline,
  two-sentence intro, four capabilities and 3-4 callouts whose keys match
  the 3D anchors. Figures come from `src/data` (`TEARDOWN_FACTS` for the
  ones with no other home) and `chapters.test.ts` checks the counts against
  the model (screws, coil turns, BGA grid, chamber size, ppi, Wh).
- **Cards** (`FilmOverlay.tsx`): the intro card holds over the opening and
  overview; each layer card turns over with its part (in d -0.04..0.04,
  out 0.86..0.96, never two at once) and staggers headline, intro and
  capabilities off one `--reveal` variable, so it scrubs both ways.
- **Callouts** (`Callouts.tsx`): project the bridge anchors through the
  live camera. Two modes chosen on resize: `aside` (label columns beside
  the part, clear of its projected `bounds`) when the frame leaves the part
  a real slot, else `over` (title chips beside each hotspot). Labels
  stagger in (`calloutReveal`), leaders draw out from the hotspot, columns
  never overlap (`resolveColumn`). The overview names every layer, or
  shows numbered markers keyed to a legend in the intro card when names do
  not fit (phones). The overlay writes `showcaseBridge.slot` from the same
  measurements, so part and labels share one layout.
- **Pacing** (`tour.ts`): the tour span is read off `cursorAt`. A scroll
  that comes to rest mid-move settles into the next hold in the direction
  of travel (only after real wheel/touch/key input, never while playing or
  under reduced motion); Play runs the opening and overview in about 5 s
  and holds each layer about 4 s.

## How it works

- Ten layers front to back (`src/film/teardown/layers.ts`), wired to
  Prompt C part IDs (coverage asserted: every registry part exactly once).
- `layerCursor` 0–10 continuous float drives copy, accent, pointer, and
  the aim track; pure function of progress, reverses exactly.
- Outside-in peel: each layer's slot offset is its own staggered function
  of the shared separation (`peelLocal`: both faces lead, cover glass and
  rear panel together, each half follows from the outside in, the middle
  pair lands at sep 1). Slots run in physical order, front layers toward
  +z (screen-up in the flat lay): glass on top, rear panel at the bottom.
  Outside-in means every gap only widens, so no layer passes through
  another at any separation (front-first ordering drove the inner rear
  layers through the rear panel; an inverted sign once sent the glass
  down through every layer). `layerStack.test.tsx` drives the real shell
  and internals drivers through the whole teardown span every 0.0005 of
  progress, snapped and damped at scroll speed, forward and reverse, with
  the film's lifts, and fails on any cross-layer interpenetration. Two
  pose-gated exceptions only: the solid midframe body holds the internal
  parts until the stack is over half open, and the camera housings mount
  through the main board, silicon, and spreaders under the module until
  it starts to open. No detach travel, no flip, no scale bump.
- One motion for every layer: the director damps a single pair of
  teardown scalars (separation, cursor) once per frame
  (`dampTeardownScalars`), and every layer, shell and internal, sits
  exactly on its goal for those values. Per-layer weight damping is gone:
  each group lagged at its own rate and snapped on its own, which inverted
  neighbours mid-peel. Weight now reads through the outside-in order only.
  The director's frame runs first (useFrame priority -1), so Internals
  reads this frame's control plane. Screw spin is `explode × 2π` about
  each screw's own axis. Act lifts (die, shield lids) join the layer
  goal, scaled by the layer's own peel.
  Reduced motion needs no special path: the motion is positional only,
  and the static fallback serves the full reduce preference anyway.
- The shell camera module rides bonded to the rear panel through the
  peel. In the camera beat (in over cursor 8.0-8.45, out over 8.55-9.0,
  the pointer on the same window) the camera layer slides 76mm out beside
  the stack, the module rises to its housings, and the assembly
  turns lens-up (π about the module center) toward the tour camera: three
  phases, never together, so the turn happens clear of the stack. The
  aim follows the slide; the pointer anchors on the part's bounds, not
  its group origin.
- The tour camera drifts toward the spotlight layer's slot (half-gain aim
  track at lookAt) while the stack never moves for the camera.
- Feature accent on the rim light + per-layer copy with accent figure
  underline. The accent light is single-writer: damped toward the
  featured layer's accent at 1.4 (converges; previously reset to stage
  tint every frame and ran at 8%).
- Layer copy renders all ten cards stacked; a rAF loop writes
  opacity/transform from the continuous cursor (pure function of
  progress). No AnimatePresence queue to wedge on fast scrolls. Each
  featured layer (2-8) also gets exactly one floating pointer naming
  its part, anchored from a per-frame world-position bridge the
  Internals driver publishes; shell-only layers carry none.
- Camera stands ~14° above the phone plane (Prompt D 3.1), not the old
  42° overhead dive: stack 68.5mm vs plate ~100mm (ratio ~0.68; the
  > 0.80 bar contradicts the protected 8.5mm gap, ceiling ~0.70).
- Framing fits the separated stack volume (projected extents grow with
  stackSeparate), not one plate; narrow viewports keep a full-silhouette
  macro floor as backstop. Over-zoom vs stack ≤ 0.64 on 0.5/1.0/2.0 aspects.
- Internals share materials across layers, so per-part dimming is not
  possible without cloning the set per layer (rejected: 10× material
  memory for a dimming effect). Context pop comes from the accent light,
  the aim track, and the pointer instead — see rubric 6 note.
- Legacy explode/chip scalars kept alongside (dissolve, visibility, die
  lift, battery beats); teardown overrides positioning while stacked.
- Cream studio room: stage, floor, and canvas background sit in the cream
  family across the whole film; overlay text wears ink on light stages
  (the Prompt D 11 dark scrim only applies while a stage is dark).
- Both layer drivers (director shell groups, Internals parts) call one
  shared `applyLayerTransform` helper; module nesting and screw spin stay
  at the call sites. Registered part groups must keep layout seats on
  their child meshes — a seat on the group itself is overwritten by the
  slot drive (caught on the optics lenses: all three barrels collapsed
  to the phone origin).

## Rubric (12 checks)

1. **Silhouette separation — pass.** Stage gradient + horizon + rim carry
   the edges; compare against `teardown-before-xray.png`.
2. **Stack reads as a stack — pass.** `act-teardown-stack.png`: ten
   bands, coil/board/cell/port edge distinguishable.
3. **Not a striped rectangle — pass.** 77° tilt keeps face slivers;
   coil turns and board canshapes read as objects.
4. **Hold is real — pass.** Establishing hold 0.272–0.295 on identical
   keys; the open sandwich holds sep 1 from 0.295 to 0.485 while the
   cursor tours all ten windows (tested).
5. **No collision — pass on desktop, mobile visual pending.** Text left
   42%, subject right; the stack never leaves its slots. <900px split
   implemented (compact gap + stacked copy) but not eyeballed.
6. **Context legible — pass with a note.** Accent rim light retargets per
   layer + aim track + one pointer; featured emissive pop on
   unique-material parts (die, cell band, sensor glint). Accents passed through the dataviz validator:
   they fail as a categorical palette (pastel adjacents) but that gate
   does not apply — each accent appears alone with a text label, never
   as chart series; figure text wears dim ink, never the accent. Accent
   floor asserted at 3:1 (technical, like `faint`). A bright coil can
   still outshine a small die at some angles; lighting balance is queued
   polish, not a fail.
7. **Gap persists — pass.** Stack offsets apply every frame; featured
   slot stays open by construction.
8. **Weight reads — partial (round 04).** Per-layer weight damping was
   removed (it inverted neighbours); weight reads through the outside-in
   peel order, screw spin, and the still battery only.
9. **Stage progression — pass.** `stageColors` ramps 0.25–0.52; stack vs
   rear-panel stills differ obviously.
10. **Product neutral — pass.** Stage carries colour; materials untouched
    (rim/accent lights only).
11. **Contrast — pass.** 24-point vitest (ink 4.5, headline 7, dim 3,
    all accents 4.5) + axe both motion modes green.
12. **Reverse scrub — pass on units, visual pass pending.** Envelopes,
    cursor, and colors are pure; scrub-continuity bounds hold. A slow
    manual 0.52→0.25 watch-through is still owed.

Score: **10 pass, 2 partial** (6 context pop, 12 visual reverse). Neither
partial blocks; both are queued polish with a defined shape.
