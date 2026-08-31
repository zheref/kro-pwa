/**
 * The hero lane's geometry — the pure port of `EndeavorLaneLayout`
 * (`KroUI/Components/EndeavorLane.swift`), which canon itself factored out of
 * the view so "rendering and unit tests" could share it.
 *
 * ## What the tip of canon changed, and why it matters here
 *
 * The epic pins `zheref/KroApple@2c1ee45`; `origin/main` has since moved to
 * `2117efc`, and `docs/Features/Do.md` gained the paragraph this file
 * implements:
 *
 * > "The row always begins at the standard leading inset and **never centers
 * > or distributes its cards to absorb spare width**. Side cards, the
 * > emphasized card, and every 24-point gap keep fixed dimensions as the window
 * > grows; spare width remains after the trailing card. Only a genuinely narrow
 * > phone presentation proportionally shrinks the cards to avoid clipping,
 * > while the gap itself remains fixed."
 *
 * So "centered" describes the **hero's place in the ranked sequence**, not the
 * row's place in the viewport: the top-scoring card sits at the middle index of
 * the visible window and is drawn larger, and the row as a whole is
 * leading-anchored. `cardWidths` below is what encodes the second half — fixed
 * 120/200 widths whenever they fit, proportional shrink only when they do not.
 *
 * Nothing here reads the DOM. The caller measures once and passes the number
 * in, exactly as canon's `GeometryReader` hands the width to these functions.
 */

/**
 * `EndeavorLane.Configuration.AdaptiveStack`'s defaults, value for value.
 *
 * `EndeavorLaneMetrics.cardSpacing` is 24 and is the gap *every* Do lane uses —
 * "Every other horizontal card lane … uses that same fixed 24-point inter-card
 * gap" — so it is exported on its own for the scrolling lanes to read.
 */
export const DO_LANE_CARD_SPACING = 24

export const FEATURED_LANE_METRICS = {
  spacing: DO_LANE_CARD_SPACING,
  /** Canon's `horizontalPadding`; the row applies half of it on each side. */
  horizontalPadding: 32,
  minimumSideWidth: 120,
  minimumHeroWidth: 200,
  sideHeight: 200,
  heroHeight: 240,
  laneHeight: 248,
  maximumCards: 9,
} as const

/** The odd counts the responsive lane supports, largest first. */
export const FEATURED_ODD_COUNTS = [9, 7, 5, 3] as const

/** The width one arrangement of `count` cards needs — canon's `requiredWidth`. */
export const featuredRequiredWidth = (count: number): number =>
  FEATURED_LANE_METRICS.horizontalPadding +
  FEATURED_LANE_METRICS.minimumHeroWidth +
  (count - 1) * FEATURED_LANE_METRICS.minimumSideWidth +
  (count - 1) * FEATURED_LANE_METRICS.spacing

/** `Int.oddFloor` — the largest odd number not greater than `value`. */
const oddFloor = (value: number): number =>
  value % 2 === 0 ? value - 1 : value

/**
 * `EndeavorLaneLayout.visibleCount` — how many cards this width can show.
 *
 * Three is the floor once three exist: canon's lane "remains focused at compact
 * widths" and never drops below hero-plus-two, shrinking the cards instead.
 * One- and two-card days keep every card, which is why a two-card lane is
 * legitimately even — `Do.md`'s "3, 5, 7, or 9" describes the full lane, not
 * the degenerate ones.
 */
export const featuredVisibleCount = (input: {
  readonly availableWidth: number
  readonly cardCount: number
}): number => {
  const { availableWidth, cardCount } = input
  if (cardCount <= 0) return 0
  if (cardCount < 3) return cardCount

  const maximumOdd = oddFloor(
    Math.min(cardCount, Math.max(FEATURED_LANE_METRICS.maximumCards, 3)),
  )

  for (let count = maximumOdd; count >= 3; count -= 2) {
    if (availableWidth >= featuredRequiredWidth(count)) return count
  }
  return 3
}

/**
 * The capacity the slice should be told about — the largest supported odd count
 * this width fits, independent of how many cards exist today.
 *
 * `onFeaturedCapacityChanged` takes a `FeaturedNowCapacity` (3 | 5 | 7 | 9) and
 * the Selector then takes the centred window of that size. Keeping the capacity
 * free of the card count is what makes a resize a one-field change: the
 * arrangement is untouched, so the hero never moves.
 */
export const featuredCapacityForWidth = (
  availableWidth: number,
): 3 | 5 | 7 | 9 => {
  for (const count of FEATURED_ODD_COUNTS) {
    if (availableWidth >= featuredRequiredWidth(count)) return count
  }
  return 3
}

/**
 * `EndeavorLaneLayout.cardWidths` — the side and hero widths at this width.
 *
 * Fixed at the minimums whenever the row fits, so "spare width remains after
 * the trailing card"; proportionally scaled only when it does not, so a
 * genuinely narrow phone shrinks rather than clips. The **gap never scales** —
 * it is subtracted before the ratio is taken, which is what keeps the 24pt
 * inter-card gap fixed at every width.
 */
export const featuredCardWidths = (input: {
  readonly availableWidth: number
  readonly visibleCount: number
}): { readonly side: number; readonly hero: number } => {
  const { availableWidth, visibleCount } = input
  if (visibleCount <= 0) return { side: 0, hero: 0 }

  const gaps = Math.max(visibleCount - 1, 0)
  const availableCardWidth = Math.max(
    1,
    availableWidth -
      FEATURED_LANE_METRICS.horizontalPadding -
      gaps * FEATURED_LANE_METRICS.spacing,
  )
  const fixedCardWidth =
    FEATURED_LANE_METRICS.minimumHeroWidth +
    gaps * FEATURED_LANE_METRICS.minimumSideWidth

  if (availableCardWidth >= fixedCardWidth) {
    return {
      side: FEATURED_LANE_METRICS.minimumSideWidth,
      hero: FEATURED_LANE_METRICS.minimumHeroWidth,
    }
  }

  const scale = availableCardWidth / fixedCardWidth
  return {
    side: Math.max(FEATURED_LANE_METRICS.minimumSideWidth * scale, 1),
    hero: Math.max(FEATURED_LANE_METRICS.minimumHeroWidth * scale, 1),
  }
}

/**
 * Which index in the visible window is the hero — canon's
 * `index == visibleTasks.count / 2`, integer division included.
 *
 * For an odd window that is the exact centre. For the two-card degenerate case
 * it is the second card, which is canon's behaviour and not a rounding
 * accident: the arrangement ranks the top scorer at index 1 there too.
 */
export const featuredHeroIndex = (visibleCount: number): number =>
  Math.floor(visibleCount / 2)
