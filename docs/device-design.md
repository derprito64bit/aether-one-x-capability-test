# Device design, as built (A2 circular module + C/D teardown)

The Aether One X is a fictional product. The model is original industrial
design in the genre of a premium camera-forward flagship. No real
manufacturer's wordmark, island shape, or naming appears anywhere; the
device wordmark is a self-designed geometric "AETHER", laser-etched, the
optics partner is the fictional NOVEK (searched: no Novek optics/camera
brand exists; nearest hits Novoflex, Noblex, Novacel are distinct), and
chip markings are invented codes.

## Binding decisions (newest spec wins)

- Prompt A2 supersedes Prompt A section 5: a large **circular** camera
  module, centred, 47mm diameter — not the offset square plateau (retired,
  all constants removed). Prompt D supersedes the x-ray/chip/rebuild acts
  with the horizontal teardown (see `docs/teardown.md`).
- Everything else in Prompt A stands: superellipse body, chamfers, port
  cavity, chip package, finish families.

## Body and frame

- 159.6 × 76.8 × 7.8mm, meters throughout (`phoneDimensions.ts`).
- Superellipse cross-section, exponent **6.0** (rectangular with smoothed
  corners; was 5.0). Body edge bevel 0.9mm (`CHAMFER.body`); tiling derives
  from planes so the frame ring meets the body with no groove.
- Front stack shares the body exponent: ring opening, cover glass, display,
  and bezel ink are superellipses, so lid, glass, and ink bands run uniform
  width through the corners (the old rounded-rect hole cut deep at corners).
- Flat rail with 0.35mm micro-chamfers at the glass meeting edges; chamfer
  faces render 0.6× rail roughness (machined highlight line).
- **Grain direction (Prompt A 8.4):** the frame extrusion is split into
  four rail groups by face-centroid sector (`assignRailGroups`), carrying
  four material instances with alternating `anisotropyRotation`.
- Antenna bands are real geometry: 1.4mm wide across the rail flat, flush
  (0.02mm proud; the rail is an opaque solid, so a recessed band never
  rendered), coloured per finish from `antennaColor`, never across a key.
- Panel gaps are recessed dark hairlines, 0.12mm at frame-to-back.

## Camera module (Prompt A2)

- Centred at (0, 45.8mm), 47mm outer, 1.9mm proud, concave G1 base fillet
  (0.7mm) flaring into the rear panel (lathe profile, not a flat chamfer),
  knurled collar wall above it. Stepped bowl: collar top 1.9mm, step
  1.2mm, cover glass 0.8mm; riser and bore walls face the bowl.
- Two collar steps: knurled outer wall (192 instanced teeth, LOD0; baked
  normal/roughness wall at LOD1), polished top face carrying the etched
  NOVEK arc text (roughness domain, 2048 annular map, mipmapped +
  anisotropic), matte bead-blasted step, dark seal groove, domed cover
  glass with per-optic micro-text.
- Three round lenses on a triangle (apex up): main 12.0mm/1.6mm deep,
  ultra 9.8mm/1.0mm, mid 9.8mm/1.75mm — depths differ physically and read
  with flat lighting. Each lens is a turret standing on the cover glass
  (which is cut around it), collar top 0.35mm above the module top;
  barrels bottom out ahead of the ceramic (2.1mm put the mid sensor
  inside the rear panel). Seven-layer tunnels: dome, collar, gradient barrel,
  two baffles at 35/70% depth, element at per-lens depth, aperture hint,
  sensor. Per-lens AR hues (green / magenta / neutral).
- Periscope: rounded-rect window below the triangle, angled prism face
  across the cavity diagonal (no straight-down view, one fast highlight),
  dark open-wall cavity from the window down to the ceramic face. Flash: two dies on a frosted arc in the step ring. ToF: separate
  emitter/receiver under one IR-pass window (near-black, polished mirror,
  red-violet grazing sheen, barely-visible internals). 0.7mm module mic.
- Iris medallion: six-blade straight-edged geometry + hairline ring,
  polished metal 0.12mm under the glass with radial-brush roughness map;
  glass and medallion highlights separate on orbit.
- Deviations from the prompt's first-draft numbers (all documented at the
  constants): periscope parked/resized to clear collars and land inside
  the glass; module enlarged 42.4 → 47mm per review; knurl 168 → 192.

## Edges and front

- USB-C: chamfered mouth rim, dark mouth, centred tongue with a contact
  glint strip, layered a few hundredths proud of the bottom wall (8.4mm
  along x by 2.6mm across the thickness). Six instanced speaker slots right of port,
  single mic left at a different diameter; top rail mic plus slot,
  asymmetric throughout.
- Buttons: pill caps 0.4mm proud, centred on the rail, in a dark 0.1mm gap
  line with a polished chamfer ring: 32mm rocker, 14mm power key with
  grooves on its face the rocker lacks.
- SIM tray flush with the rail inside a dark parting line, eject pinhole
  beside it.
- Front: superellipse glass/display/bezel sharing the body exponent;
  12mm earpiece slot, 3.2mm punch-hole well with glass-thickness edge and
  internal glint. Bezel is matte ink UNDER the glass (roughness + feathered
  alpha), cool-cast vs the panel; glass specular runs unbroken across it.
- Rear panel split on Slate/Ember only: recessed groove + 0.12mm proud
  textured lower panel; wordmark rides the lower panel when split.

## Finishes

Obsidian (ceramic hero), Titanium (brushed, anisotropy 0.7), Glacier
(glass, opening-frame finish), Ember (anodised + sheen, no clearcoat),
Slate (textured matte + split), Clear (smoked transmissive back over
dressed internals + coil LED ring; configurator shows the smoked back,
film carries the ring during the energy beat).

## Internals (Prompt C)

Single manifest (`src/film/internals/layout.ts`, bounds-tested): main/sub
boards, BTB flex, 9 discrete packages, 4 vented shield cans with separate
lifting lids, 18-turn instanced litz coil + lead-out + 16-LED ring, NFC,
vapour chamber, graphite, haptic with flex tail, speaker, earpiece, port
block, coax runs, 8 spinning Torx screws, SoC package (substrate, 14×14
BGA, marked die, floorplan, decoupling ring). Battery 4000 mAh (cell
volume 17.4cm³ ≈ 875 Wh/L Si-C — data and hardware agree, tested).
Internal z stack follows the teardown order so no layer passes through
another anywhere in the teardown (`layerStack.test.tsx` sweeps it); the
exceptions are the solid midframe body and the camera housings, which
mount through the board, silicon, and spreaders under the module.
Choreography: removal-order delays + per-layer radial blends + weight
damping; teardown mode lays layers flat in a sandwich stack with a
outside-in peel and a camera module that slides out and turns lens-up
in its own beat (see `docs/teardown.md`).

## Lighting and color

- Procedural canvas studio environment through PMREM (compact softbox,
  strip, horizon break, practicals, rim band, bounce pool) — no remote HDR.
- Viewer rig: narrow dim RectArea key + strip (full-face wash was reading
  as a second phone), cool rim, fill, screen bounce per finish.
- Film: per-act key/fill/rim/env/exposure + accent source; macro sits a
  third of a stop below hero. Stage carries per-act colour (Prompt D).
- ACES Filmic, one curve, sRGB authored colors converted once.

## LOD policy

- **high** (desktop viewers, film): everything.
- **low** (coarse pointers): no instanced knurl (mapped wall), one baffle,
  no ToF internals, port tongue/contacts, or regulatory text; outline
  sampling halved; no subpixel overlay. Budgets measured in
  `phoneBudget.test.ts`, recorded in `docs/device-perf.md`.
- Below-200px instances render the static CSS phone (viewer fallback),
  never WebGL. The CSS fallback mirrors the circular module.

## Deferred with reasons

- Static-shell mesh merging: not draw-bound; teardown needs layers separate.
- True floor reflection: ContactShadows + gradient room ship; planar
  reflection measured separately (cost unknown, D 13.6).
- Depth-of-field rack focus: rejected pending measurement (D: blurred
  backdrop plane if needed; not needed yet).
- Real-GPU frame times: SwiftShader lower bounds only (teardown scroll
  4.2 avg / 300ms worst on CPU GL). Needs a device pass.
- Per-part internals recede: shared materials; featured pops via
  emissive (unique mats), accent light, aim track, and pointer instead.

## Prompt A2 rubric (15 checks, honest)

1. Medallion crispness — **pass** (geometry, not texture; 8cm renders clean).
2. Medallion separation — **pass** (0.12mm z-offset; orbit splits highlights).
3. Medallion material — **pass** (metal 1 / 0.14 + brush vs glass above).
4. Collar text legibility — **pass at 8cm** (2048 annular map); distance
   shimmer controlled by mips + aniso 8. No crawling observed in stills.
5. Text material — **pass** (roughness domain; darkens at grazing).
6. Two type scales — **pass** (collar arc + per-optic micro-text, two
   surfaces/depths).
7. Lens depth differentiation — **pass** (1.0 / 1.6 / 1.75mm barrels +
   scaled baffles; asserted in geometry, visible in macro).
8. Knurl silhouette — **pass** (192 teeth, 0.18mm proud; Blender macro
   confirms teeth break the outline).
9. Knurl LOD handoff — **pass on construction** (distance-switched, not
   viewport; no pop mechanism). Visual pull-through pending a freerun.
10. ToF two apertures — **pass** (2.1 vs 2.6mm + square sensor edge).
11. ToF black-not-flat — **pass** (clearcoat mirror + red-violet sheen).
12. Periscope folded read — **pass** (prism face across the cavity, capped at 40°, open-wall cavity, fast
    highlight; no straight-down view).
13. Bezel not a void — **pass** (ink under glass, grain, feathered edge).
14. Punch-hole depth — **pass** (well + glass edge + glint).
15. Originality gate — **pass** (five angles reviewed; circular module +
    triangle + periscope + NOVEK mark matches no real device combination).

**A2: 15/15** (9 conditional on a macro freerun, noted above).

## Prompt C rubric (12 checks, honest)

1. Coordinate unification — **pass** (bounds test green).
2. Board reads — **pass** (cans, discretes, flex, coax distinct in stills).
3. Shield reveal — **pass** (lids lift on own window + tumble).
4. Coil turns resolve — **pass** (18 countable turns + lead-out in macro).
5. Screws read — **pass** (Torx hex recess at macro; spin on explode).
6. Weight legible — **pass** (battery slow/still, screws fast/spin).
7. Removal order reads — **pass** (order-dominated delays).
8. Reassembly exact — **pass** (pure functions; continuity tests bound it).
9. Clear dressed — **partial** (dressed toggle + smoked back + ring wired;
   configurator shows smoked back without resident internals — cost call).
10. Room reflection structure — **pass** (softbox shapes + horizon +
    practicals sweep the off screen).
11. Glass continuity — **pass** (one sheet over bezel + active area).
12. Screen-on layering — **pass** (specular stays over emissive; relative
    visibility only).

**C: 11 pass, 1 partial.**
