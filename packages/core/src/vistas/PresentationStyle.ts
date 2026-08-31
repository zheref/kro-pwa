/**
 * `PresentationStyle` — canon `KroCore/Vistas/PresentationStyle.swift`.
 *
 * The fourth question a vista answers: **how do the cards look?** It is a
 * declaration, not a renderer — the UI child interprets `cardVariant` to pick a
 * concrete component and `density` to size it. Nothing here knows what a pixel
 * is, which is why it can live in the platform-free tier.
 */

export const CardVariant = {
  /** Hero card in a featured carousel (Do). */
  carouselHero: 'carouselHero',
  /** Secondary cards flanking the hero in a featured carousel (Do). */
  carouselSecondary: 'carouselSecondary',
  /** Standard list row (Find, Tasks). */
  standardRow: 'standardRow',
  /** Timed event block in the Plan timeline. */
  timelineBlock: 'timelineBlock',
  /** All-day event strip across the top of the Plan timeline. */
  allDayStrip: 'allDayStrip',
  /** Compact in-overlay representation (e.g. the mark-complete overlay). */
  miniRow: 'miniRow',
} as const

export type CardVariant = (typeof CardVariant)[keyof typeof CardVariant]

/** `CardVariant.allCases`, in canon declaration order. */
export const cardVariants: readonly CardVariant[] = [
  CardVariant.carouselHero,
  CardVariant.carouselSecondary,
  CardVariant.standardRow,
  CardVariant.timelineBlock,
  CardVariant.allDayStrip,
  CardVariant.miniRow,
]

/** `CardVariant(rawValue:)` — narrows a raw string, or `null`. */
export const cardVariantFromRawValue = (raw: string): CardVariant | null =>
  cardVariants.find((variant) => variant === raw) ?? null

export const Density = {
  compact: 'compact',
  regular: 'regular',
  featured: 'featured',
} as const

export type Density = (typeof Density)[keyof typeof Density]

/** `Density.allCases`, in canon declaration order. */
export const densities: readonly Density[] = [
  Density.compact,
  Density.regular,
  Density.featured,
]

/** `Density(rawValue:)` — narrows a raw string, or `null`. */
export const densityFromRawValue = (raw: string): Density | null =>
  densities.find((density) => density === raw) ?? null

export interface PresentationStyle {
  readonly cardVariant: CardVariant
  /** Sizing hint. Canon defaults to `.regular`. */
  readonly density: Density
  /**
   * Cap on items shown per group while no group is expanded full. `null` = no
   * limit. Tasks uses `7`; any surface wanting "top N per section, everything
   * when one section is focused" reads this.
   */
  readonly itemLimit: number | null
}

export const makePresentationStyle = (params: {
  readonly cardVariant: CardVariant
  readonly density?: Density
  readonly itemLimit?: number | null
}): PresentationStyle => ({
  cardVariant: params.cardVariant,
  density: params.density ?? Density.regular,
  itemLimit: params.itemLimit ?? null,
})
