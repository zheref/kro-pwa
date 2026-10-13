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
