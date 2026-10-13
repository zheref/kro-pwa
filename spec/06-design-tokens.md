# 06 — Design Tokens

> **STUB — deliberately empty.** This file states what will fill it and when. No token values
> are recorded here yet, because none have been ported.

## Why it is empty

The design-system foundation is **issue #6**, which is blocked on this one. Writing token values
now would either duplicate KroApple's `KroTokens` (forking canon) or invent values nobody has
reviewed. Both are worse than a stub.

`make tokens` is a documented no-op. The Scenario 5 template's Style Dictionary pipeline is
**not** wired here, and `spec/architecture/README.md` records that the only generated tree in
this repo is `.claude/rules/` — standing up an unused generator would make that false.

## What fills it, and when

**#6 — Design system foundation** fills this file with the ported token set and the decision of
how it is expressed (CSS custom properties + a Tailwind v4 `@theme`, or a generator if one earns
its place). Specifically:

| Group | Source of truth | Notes |
|---|---|---|
| **Palette roles** | KroApple `KroTokens` | Light/dark adaptive, per accent. Contrast **≥4.5:1** is regression-tested, not asserted (epic AC 9). |
| **Spacing** | KroApple | 4 / 8 / 16 / 24 / 32 / 48. |
| **Radii** | KroApple | 8 / 12 / 12 / 20 / pill. |
| **Motion** | KroApple | quick 180 ms, standard 240 ms, spring equivalents. Every motion token has a `prefers-reduced-motion` answer. |
| **Shadows** | KroApple | Recipe per elevation. |
| **Disabled** | KroApple | opacity `0.62`, applied exactly once per control — never compounded by nesting. |
| **`indigoGrape` header gradient** | KroApple | The content's top inset; on desktop it runs behind the translucent sidebar as one slab. |
| **Glass (KroGlass)** | `zheref.io@b2cda9f` | The web equivalent of Liquid Glass — see below. |
| **Icons** | chosen once in #6 | KroApple's `sf-symbols` glyphs map to one web icon set, decided in that child and recorded here. |

## The glass recipe (binding once ported)

The web stand-in for Apple's Liquid Glass is the layered CSS material proven on `zheref.io`
(`src/styles/global.css` tokens, `src/components/Nav.module.css` layering, the `BackToTop`
original):

- `--glass-surface` — a `color-mix` translucent elevated background
- `backdrop-filter: blur(20px) saturate(180%)` — 14 px / 160 % for small controls
- `--glass-rim` — a thin inset ring
- `--glass-hi` — an inner top highlight
- `--glass-sheen` — a specular radial + linear gradient overlay on `::before` / `::after`
- dark-mode token overrides

**The Safari constraint is part of the recipe, not a caveat:** never put `backdrop-filter` on a
`position: fixed` element — carry it on an inner pseudo-element. A glass surface that ignores
this renders wrong on Safari, which is a supported browser.

### The light canon

Every glass piece carries a light rim. Where it points is decided by one rule:

- **Outside a piece, the pointer aims its rim.** The bright edge faces the pointer and eases
  toward it frame by frame. Reduced motion keeps the resting light (upper left) and never tracks.
- **A lit piece glows uniformly.** A piece is lit while it has keyboard focus (`:focus-visible`),
  while the pointer is inside its box, or, for a control, while it is pressed (a tap on touch has
  no pointer to track). A lit piece ignores where the pointer is: an even rim on every edge
  and a soft centred sheen, as if the pointer were everywhere at once. Script only decides
  lit-or-not; the stylesheet owns the look. A static state is not motion, so reduced motion keeps
  it. The two-tone focus ring is kept on focus and still clears 3:1: on the gradient field its
  inner band is the scheme's back colour, so it contrasts with the tinted primary in dark (where
  the primary is light) as well as in light (where it is dark), lit rim included.
- **A bar lights its bottom edge only.** The fixed top chrome sits on the viewport edges, so its
  top and sides are never drawn. Its bottom hairline has a hotspot that follows the pointer's x
  along the edge, and lights evenly along its whole length when the pointer is inside the bar or
  a control in it has keyboard focus. Scrolled bars keep their shadow. Under reduced transparency
  the bar keeps an opaque bottom hairline, lit or not, while every other rim goes dark.
- **The primary on marketing surfaces is tinted glass in both schemes**, never a flat fill. Dark:
  88 % accent (hover 92 %) over the glass surface with a restrained top sheen; ink is black.
  Light: 94 % accent (hover 96 %) with no sheen; ink is white. The ink floor is 4.5:1 at the 5th
  percentile of every pixel under the label, idle, hovered, lit and focused. Reduced
  transparency falls back to the opaque accent.

## What must be true when this file is filled

- Every token has a name, a light value, a dark value, and the surface it applies to.
- Every colour pairing used for text or a meaningful icon is contrast-tested in CI.
- No component hardcodes a colour, radius, spacing step or duration — a literal in a component
  is the bug this file exists to prevent.
- `make tokens` either does something real or keeps saying it does nothing. It never pretends.
