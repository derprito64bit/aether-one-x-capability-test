# Design tokens — Aether One X v2

Source of truth: `src/index.css` under `@theme`. No raw hex in components
except canvas painters and 3D, which cannot read CSS variables (they cite
the token they mirror).

## Direction

Porcelain studio (site overhaul, 2026-10-28). The owner asked for a cream
room with more light; the overhaul keeps that brief and lowers the chroma,
so the obsidian device and the one cobalt accent carry the colour instead
of a yellow page. One theme for the whole site (light), one accent.

## Surfaces

| Token     | Value     | Use                             |
| --------- | --------- | ------------------------------- |
| `night`   | `#f2f0eb` | page background                 |
| `surface` | `#f8f7f3` | panels (`.panel`)               |
| `elev`    | `#fcfbf8` | raised                          |
| `raise`   | `#fefdfb` | chips, active controls          |
| `sunken`  | `#e8e5de` | footer, segmented-control wells |

The film stage colours live in `src/film/lighting.ts` (same family, per act;
display stays the brightest act).

## Section rooms (film, 2026-10-28)

The owner found the film "floating in space": every act used the same
porcelain sweep. Each act now has a room (`src/film/backdrop/`), so the
film reads light studio, then a dark show room for the capabilities, then
light again for the purchase:

| Act      | Room      | Base                   | Accent            | Back-wall figure     |
| -------- | --------- | ---------------------- | ----------------- | -------------------- |
| arrival  | studio    | 3D porcelain sweep     | cobalt            | none                 |
| settle   | titanium  | `#f0f1f3` to `#d0d4da` | brushed sheen     | Ti-6Al-4V (milled)   |
| approach | glass     | `#f7fafd` to `#d4dde8` | light streaks     | 1.45 mm (outline)    |
| teardown | studio    | 3D porcelain sweep     | per-layer accents | none                 |
| camera   | projector | `#060709`              | cool white beam   | 50 MP (projected)    |
| display  | spectrum  | `#040507`              | full hue band     | 144 Hz, 1.07B, 2,800 |
| storage  | data      | `#070b17` navy         | `#708eff` hex     | 1 TB                 |
| battery  | charge    | `#050706` graphite     | `#3ee08f` level   | 4,000 mAh            |
| software | os        | `#0b0d13` slate        | soft cool white   | 2.0 AetherOS         |
| ai       | neural    | `#04060c`              | `#4d7dff` dots    | 46 TOPS              |
| final    | studio    | 3D porcelain sweep     | cobalt            | none                 |

Rules:

- One accent per room, and it never appears in another room; the cobalt
  brand accent stays on copy and controls everywhere.
- Copy follows the room: `.light-scope` ink on light rooms, `.dark-scope`
  on dark ones; the copy veil (`--veil-rgb`) blends with the room.
- Figures are Geist Mono, decoded in (scramble) as their room takes over,
  sized by length to about 55% of the frame and hung opposite the copy.
- Everything is a pure function of progress: transforms and opacity
  driven by the act's local progress `--t`; blurred layers only translate.

## Contrast (measured, WCAG relative luminance)

| Foreground                                 | night | surface | sunken | darkest stage `#d9d5cb` | Use                     |
| ------------------------------------------ | ----- | ------- | ------ | ----------------------- | ----------------------- |
| `ink` `#1c1b19`                            | 15.1  | 16.1    | 13.7   | 11.7                    | primary text            |
| `dim` `#5d5a54`                            | 6.0   | 6.4     | 5.5    | 4.7                     | secondary text          |
| `faint` `#66625a`                          | 5.3   | 5.7     | 4.8    | 4.1                     | technical labels only   |
| `aether` `#1f5fd0`                         | 5.1   | 5.4     | 4.6    | 4.0                     | links, data marks       |
| `aether-strong` `#1a4fb8`                  | 6.5   | 6.9     | 5.9    | 5.0                     | buttons, focus, kickers |
| `ink-inverse` `#f7f6f2` on `aether-strong` | 6.8   |         |        |                         | primary button label    |

`faint` never carries essential information. Text over the 3D stage sits on
a porcelain veil on its own side of the frame (see `FilmOverlay.tsx`).

## Type

- One family: Geist Variable for display and UI; Geist Mono Variable for
  technical readouts (units, focal lengths, part numbers). Space Grotesk was
  removed in the overhaul.
- Display roles: `.display-xl` (page h1), `.display-lg` (section h2),
  `.display-md`; `.lede` for supporting copy (52ch).
- Data roles: `.spec-num` (tabular lining numerals), `.spec-unit`,
  `.spec-tech`, `.kicker`. All live in `@layer components`, so a utility on
  the same element (colour, size) always wins.

## Shape

Controls are full pills (`.btn`, chips, segmented controls). Panels are
`--radius-panel` (24px); inner cards `--radius-inner` (16px). Nothing else.

## Motion

- Easings: `--ease-out-expo`, `--ease-out-quint`, `--ease-in-out-soft`.
- Motion (`motion/react`) is the only UI animation runtime. Springs for
  direct manipulation (selection rings, nav pill, zoom), eased durations for
  system-initiated reveals.
- Film chapters enter in reading order (kicker, headline words, body,
  figure) and exit in 160ms; see `src/film/overlay/motion.ts`.
- `prefers-reduced-motion` is a layout, not a kill switch: the film becomes
  the static story, springs become fades, the Hz demo becomes a still strip.

## Glass tokens

`--glass-tint`, `--glass-blur` (18px), `--glass-saturate` (140%),
`--glass-rim`, `--glass-scrim`. Used by the nav chrome and the inspect
tooltip. Full tier system in `docs/glass.md` (M6).
