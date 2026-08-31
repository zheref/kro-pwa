/**
 * The event card's own presentation rules — the port of
 * `TimelineDayView.TimelineEventCardStyle`, `accentColor(for:fallback:)` and
 * `EventCardTier`.
 *
 * Pure, so every number canon tuned is assertable without mounting anything.
 * Nothing here reads the DOM, a clock or the store.
 *
 * ## The two colour families stay apart, exactly as canon keeps them
 *
 * A block's identity is its **calendar colour** — `associatedColor`, a hex the
 * Google/Apple bridges set — and its **foreground** is the scheme's own
 * adaptive ink. Canon's comment says why in one line: the tint is drawn at
 * 0.15–0.25 opacity, so text painted in that same tint sits on its own colour
 * and falls under 4.5:1. So `cardForeground` never returns the accent.
 *
 * ## The press deepen is a value, not an animation
 *
 * `fillOpacity` takes `isPressed` and adds canon's `+0.14`. The *instantaneous*
 * part of the press feedback is this number changing with no transition —
 * canon: *"a press has to be acknowledged on the frame it happens"* — and the
 * only eased half is the release. `TimelineFragment` wires that asymmetry; this
 * module owns the number.
 */
import type { Endeavor } from '@kro/core'
import type { ColorRole } from '../../../../design/system/tokens/roles'
import { colorVar } from '../../../../design/system/tokens/roles'

/** `TimelineEventCardStyle.fillOpacity(in:isPressed:)`. */
export const cardFillOpacity = (
  scheme: 'light' | 'dark',
  isPressed: boolean,
): number => {
  const resting = scheme === 'dark' ? 0.25 : 0.15
  return isPressed ? resting + 0.14 : resting
}

/**
 * The tint as a background value that carries **both** of canon's opacities.
 *
 * `fillOpacity` differs per scheme, and a React component has no CSS selector
 * to branch on — so the branch is CSS's own `light-dark()`, which resolves from
 * the `color-scheme` the design system's `tokens.css` already sets on every
 * theme root (`:root`, `[data-theme="light"]`, `[data-theme="dark"]`). That
 * matters twice over: a story that puts `data-theme="dark"` on a wrapping
 * `div` gets the dark fill inside that subtree only, which is exactly how the
 * side-by-side scheme stories are built.
 *
 * The alternative — reading the resolved theme in JavaScript — would need a
 * `MutationObserver` on the document root, would be wrong for one frame after
 * hydration, and would still not answer correctly for a themed subtree.
 */
export const cardFillBackground = (
  accentColor: string,
  isPressed: boolean,
): string => {
  const mix = (scheme: 'light' | 'dark') => {
    // Rounded to two decimals: `0.15 + 0.14` is `0.29000000000000004` in
    // binary floating point, and a percentage with sixteen digits in it is
    // both unreadable in devtools and unassertable in a test.
    const percent = Math.round(cardFillOpacity(scheme, isPressed) * 10_000) / 100
    return `color-mix(in srgb, ${accentColor} ${percent}%, transparent)`
  }
  return `light-dark(${mix('light')}, ${mix('dark')})`
}

/**
 * `TimelineEventCardStyle.rippleDiameter(from:in:)` — how wide the wave must
 * grow to cover the whole block from its centre.
 *
 * Canon measures the distance to the furthest corner and doubles it, because
 * *"the ripple starts at the touch and grows outward, so it has to reach the
 * corner furthest from that point"*. Canon's own call site always passes
 * `cardCentre`, so the furthest corner is half the diagonal and the answer is
 * the diagonal.
 *
 * **The web port returns a CSS expression, not a number, and that is the whole
 * point.** A card's height is known here — it comes from the placement — but
 * its width is a *fraction of the canvas*, decided by the browser from the
 * overlap column count. Reading it back would mean a `ResizeObserver` per card
 * on a canvas that can hold dozens. `max(200%, 2·height)` is at least twice
 * each side, and `2·max(w, h) ≥ hypot(w, h)` for every rectangle, so the circle
 * always covers the block — with no measurement, and with the guarantee stated
 * as arithmetic rather than hoped for.
 */
export const rippleDiameterCss = (cardHeightPx: number): string =>
  `max(200%, ${Math.max(0, cardHeightPx) * 2}px)`

/**
 * Canon's `opacity(1 - progress * 0.45)` at full expansion — *"thins as it
 * spreads, so the leading edge reads as a wave rather than a disc landing on
 * the block."*
 */
export const RIPPLE_SETTLED_OPACITY = 1 - 0.45

/**
 * `TimelineDayView.accentPalette`, cycled by index — the fallback for a
 * Kro-native event with no calendar colour.
 *
 * Canon's nine SwiftUI tints, as design-system roles. Eight map one-for-one
 * onto the badge palette; canon's `.yellow` has no `badgeYellow` twin, so it
 * takes `rewardYellow` — the one yellow the token set actually declares —
 * rather than minting a colour from a lane that does not own colours.
 */
export const CARD_ACCENT_PALETTE = [
  'badgeBlue',
  'badgeTeal',
  'badgePurple',
  'badgeOrange',
  'badgePink',
  'badgeGreen',
  'badgeIndigo',
  'badgeMint',
  'rewardYellow',
] as const satisfies readonly ColorRole[]

/** The palette entry for a card at `index`, wrapping as canon's `%` does. */
export const paletteAccentFor = (index: number): ColorRole => {
  const count = CARD_ACCENT_PALETTE.length
  const wrapped = ((index % count) + count) % count
  return CARD_ACCENT_PALETTE[wrapped] as ColorRole
}

/**
 * `#RRGGBB` normalised, or `null` when the string is not one.
 *
 * Canon accepts a leading `#`, trims whitespace and upper-cases before
 * scanning, and rejects anything that is not exactly six hex digits. The same
 * three rules, and the same rejection: an unparseable value falls back to the
 * palette rather than painting a card black.
 */
export const normalizedHexColor = (raw: string | null): string | null => {
  if (raw === null) return null
  let hex = raw.trim().toUpperCase()
  if (hex.startsWith('#')) hex = hex.slice(1)
  if (!/^[0-9A-F]{6}$/.test(hex)) return null
  return `#${hex}`
}

/**
 * The CSS colour a card paints with: the calendar's own hex where it has one,
 * the cycled palette role otherwise.
 *
 * Returns a colour *string* rather than a role because half the answers are
 * host-supplied hexes that no token can name.
 */
export const cardAccentColor = (
  endeavor: Endeavor,
  index: number,
): string =>
  normalizedHexColor(endeavor.associatedColor) ??
  colorVar(paletteAccentFor(index))

/**
 * `EventCardTier` — how much a card has room to say, by its own duration.
 *
 * Canon's five bands in minutes: `<60` compact, `<90` adds the time range,
 * `<120` allows a two-line title, `<150` adds the calendar name, and beyond
 * that the emoji line leads.
 */
export const CardTier = {
  compact: 0,
  timeRange: 1,
  twoLineTitle: 2,
  calendarName: 3,
  emojiLine: 4,
} as const

export type CardTier = (typeof CardTier)[keyof typeof CardTier]

/** `EventCardTier(minutes:)`. */
export const cardTierForMinutes = (minutes: number): CardTier => {
  if (minutes < 60) return CardTier.compact
  if (minutes < 90) return CardTier.timeRange
  if (minutes < 120) return CardTier.twoLineTitle
  if (minutes < 150) return CardTier.calendarName
  return CardTier.emojiLine
}

/** The tier an endeavor's own duration earns it — `duration ?? 0` seconds. */
export const cardTierFor = (endeavor: Endeavor): CardTier =>
  cardTierForMinutes((endeavor.duration ?? 0) / 60)
