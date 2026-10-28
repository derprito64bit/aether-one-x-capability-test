# Device performance (measured)

Prompt A section 11 recording. Triangle counts are exact, asserted in
`src/components/PhoneViewer/phoneBudget.test.ts`, which mounts the real
PhoneModel headless (`sceneHarness.ts`) and counts every mesh and
instance (round 04: the old hand-written constructor mirror drifted), and
fails if the budget regresses.

## Triangles (2026-09-20 run)

| part             | LOD0 high  | LOD1 low                    |
| ---------------- | ---------- | --------------------------- |
| frameBody        | 5,116      | (halved sampling, in total) |
| frameRing        | 2,048      | (halved sampling, in total) |
| backSlab         | 828        | 828                         |
| glassSlab        | 828        | 828                         |
| displaySlab      | 828        | 828                         |
| logo             | 2          | 2                           |
| regulatory       | 2          | dropped                     |
| subpixel overlay | 2          | dropped                     |
| panel gaps       | 24         | 24                          |
| plateau module   | 15,674     | baffles ×1, no knurl/thread |
| edge hardware    | 4,400      | no tongue/contacts          |
| front sensors    | 168        | 168                         |
| **total**        | **29,920** | **22,180**                  |

- Budget: 120k LOD0. Headroom: 4×.
- LOD1 ("roughly 40k" in the brief): 22.2k — under target, so no further
  cuts were taken. Reduction comes from knurl (1,440), thread (1,152),
  second baffles, tongue/contacts, regulatory, and halved outline sampling.
- The plateau module is 52% of the total; the lens barrels and baffles are
  the densest parts and the first place to look if the budget tightens.

## Draw calls

~70 meshes for the full device at LOD0 (2 frame, ~38 dial including three
9-part lenses, ~24 edge hardware, ~7 glass/front). Instanced: knurl teeth
(120), thread teeth (96), speaker slots (6). Not draw-bound; the static
shell stays unmerged because the x-ray act parts the layers.

## Texture memory (~4MB)

| texture                             | size       | bytes      |
| ----------------------------------- | ---------- | ---------- |
| studio environment equirect + PMREM | 1024×512   | ~2,800,000 |
| display wallpaper                   | 256×512    | 524,288    |
| wordmark decal                      | 512×128    | 262,144    |
| ceramic mottle + data               | 128×128 ×2 | 131,072    |
| oleophobic smudge                   | 128×256    | 131,072    |
| regulatory micro-text               | 256×48     | 49,152     |
| brush grain                         | 64×64      | 16,384     |
| lens gloss                          | 64×64      | 16,384     |
| coating thickness                   | 64×64      | 16,384     |
| screen gradient                     | 16×256     | 16,384     |
| subpixel stripes                    | 96×32      | 12,288     |
| barrel gradient                     | 8×64       | 2,048      |

Shared where content is identical (one brush, one coating map, one mottle
pair per material set). `disposePhoneMaterials` covers every slot;
`SceneDisposer` frees geometries on unmount; the studio environment owns
and releases its PMREM target per canvas.

New A2 maps: collar annulus 2048² (~16MB, the largest single map —
roughness domain), micro-text 1024² (~4MB), medallion brush 256²,
knurl normal + rough 256×64, bezel grain 512×1024 with alpha feather.
Total texture memory roughly 25MB per material set; film and configurator
own separate sets.

## Frame time

SwiftShader (software GL) lower-bounds only — see the open M10 thread for
the real-GPU 55fps trace. The film snapshot suite (`e2e/film.spec.ts`)
plus the budget test above are the merge gates until then.

Teardown window (measured 2026-09-21, SwiftShader CPU GL, full-runway
scroll): 4.2fps avg, 300ms worst frame. Same class as the pre-teardown
3.9–7.3fps band on this renderer: the stage sphere, ContactShadows pass,
and per-part loops cost real time on CPU GL, but nothing in the profile
points at a device-GPU problem. Cyclorama + floor + one shadow pass;
no SSR, no DoF (both rejected pending measurement).

## Triangle budget, circular module era (measured)

LOD0 total 39,864 (budget 120k): cameraModule 15,290 (knurl 192 instanced
teeth, three tunnels, medallion, periscope, ToF), bezel 512. LOD1 32,290
(knurl to maps, one baffle, no ToF internals). Round 04 geometry audit,
measured on the mounted model: LOD0 ~40.9k, LOD1 ~33.4k.

## Frame time

SwiftShader (software GL) lower-bounds only — see the open M10 thread for
the real-GPU 55fps trace. The film snapshot suite (`e2e/film.spec.ts`)
plus the budget test above are the merge gates until then.
