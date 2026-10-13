/**
 * The page's anchors, in document order. One list feeds the nav links, the
 * footer links, `useActiveSection` and the section Fragments' `id`s, so an
 * anchor can never point at a section that does not exist.
 */
export const LANDING_SECTION_IDS = {
  top: 'top',
  loop: 'the-loop',
  focus: 'focus',
  platforms: 'platforms',
  federation: 'federation',
  privacy: 'privacy',
  earlyAccess: 'early-access',
  faq: 'faq',
  start: 'start',
} as const

export type LandingSectionKey = keyof typeof LANDING_SECTION_IDS

/** Document order: what `useActiveSection` observes. */
export const LANDING_OBSERVED_IDS: readonly string[] = [
  LANDING_SECTION_IDS.top,
  LANDING_SECTION_IDS.loop,
  LANDING_SECTION_IDS.focus,
  LANDING_SECTION_IDS.platforms,
  LANDING_SECTION_IDS.federation,
  LANDING_SECTION_IDS.privacy,
  LANDING_SECTION_IDS.earlyAccess,
  LANDING_SECTION_IDS.faq,
  LANDING_SECTION_IDS.start,
]

/** The `#id` href for a section. */
export const sectionHref = (id: string): string => `#${id}`

/** The id of a section's heading, for `aria-labelledby`. */
export const headingIdFor = (id: string): string => `${id}-title`

/** The pricing page's own address. */
export const PRICING_PATH = '/pricing'

/**
 * The pricing page's anchors. None of them repeats a landing id, so the
 * landing's section observer never mistakes a pricing band for one of its own.
 */
export const PRICING_SECTION_IDS = {
  top: 'pricing-top',
  tiers: 'tiers',
  compare: 'compare',
  faq: 'pricing-faq',
  start: 'pricing-start',
} as const

/** Which marketing page the bar and footer sit on. */
export type MarketingSurface = 'landing' | 'pricing'

/** The bar's id for the Pricing link — what `activeId` names on `/pricing`. */
export const PRICING_NAV_ID = 'pricing'

/**
 * The href of a landing section from `surface`: `#id` on the landing itself,
 * `/#id` anywhere else, so a link on `/pricing` lands on the section.
 */
export const landingSectionHref = (
  id: string,
  surface: MarketingSurface,
): string => (surface === 'landing' ? sectionHref(id) : `/${sectionHref(id)}`)

export interface MarketingNavLink {
  readonly label: string
  readonly id: string
  readonly href: string
}

/**
 * The bar's links — and therefore the phone menu's — for `surface`: the
 * landing's sections, then Pricing, which is its own page.
 */
export const marketingNavLinks = (
  surface: MarketingSurface,
): readonly MarketingNavLink[] => [
  ...[
    { label: 'The loop', id: LANDING_SECTION_IDS.loop },
    { label: 'Sessions', id: LANDING_SECTION_IDS.focus },
    { label: 'Platforms', id: LANDING_SECTION_IDS.platforms },
    { label: 'Privacy', id: LANDING_SECTION_IDS.privacy },
    { label: 'FAQ', id: LANDING_SECTION_IDS.faq },
  ].map((link) => ({ ...link, href: landingSectionHref(link.id, surface) })),
  { label: 'Pricing', id: PRICING_NAV_ID, href: PRICING_PATH },
]
