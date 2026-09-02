/**
 * The Settings hub's information architecture — canon `SettingsFeature.Section`
 * (id, title, `systemImage`) and the three groups `SettingsHubView` draws
 * them in.
 *
 * Canon keeps the section list and its grouping in two different files: the
 * `Section` enum carries id/title/glyph, and `SettingsHubScreen` decides which
 * ids go into `profileSection`, `preferencesSections` and `accountSections`.
 * Both facts are here, because on this stack the hub is one Fragment and a
 * grouping that lives in the caller is a grouping that drifts.
 *
 * ## What is NOT here
 *
 * The preference *options* — those come from the schema (`@kro/core`'s
 * `settingOptionsByGroup`), never from a list typed out again. A section knows
 * which `SettingGroup` it renders; the rows inside it are whatever that group
 * declares. See `SettingsElements.ts`.
 *
 * ## Appearance
 *
 * Canon's sixth preferences section, listed immediately after General while
 * the `appearanceThemes` flag is on. The section is always in this table; the
 * hub Selector hides it when the flag is off. Theme and palette live here
 * rather than in General when the flag is on.
 */
import { SettingGroup, assertNever } from '@kro/core'

/** Canon's `SettingsFeature.Section`, by raw value. */
export const SettingsSectionId = {
  profile: 'profile',
  general: 'general',
  appearance: 'appearance',
  planPreferences: 'planPreferences',
  doPreferences: 'doPreferences',
  earnPreferences: 'earnPreferences',
  sessionPreferences: 'sessionPreferences',
  integrations: 'integrations',
  subscription: 'subscription',
} as const

export type SettingsSectionId =
  (typeof SettingsSectionId)[keyof typeof SettingsSectionId]

/** Which of the hub's three groups a section is listed under. */
export const SettingsHubGroup = {
  /** The lone top row — canon's unlabelled first `Section`. */
  profile: 'profile',
  /** Canon's `Section("Preferences")`. */
  preferences: 'preferences',
  /** Canon's second unlabelled `Section` — Integrations and Subscription. */
  account: 'account',
} as const

export type SettingsHubGroup =
  (typeof SettingsHubGroup)[keyof typeof SettingsHubGroup]

/** One hub row. `glyph` is canon's SF Symbol name, resolved by the surface. */
export interface SettingsSection {
  readonly id: SettingsSectionId
  readonly title: string
  readonly glyph: string
  readonly group: SettingsHubGroup
  /**
   * The preference group this section renders from the schema, or `null` for a
   * section whose content is not schema-driven (Profile, Appearance,
   * Integrations, Subscription). Appearance has options, but they are not a
   * `SettingGroup` — the palette is spliced beside General, not inside it.
   */
  readonly settingGroup: SettingGroup | null
}

/**
 * Every section, in canon's hub order: Profile, General, Appearance, the four
 * remaining preference sections, then Integrations and Subscription.
 *
 * Titles and glyphs are transcribed from `SettingsFeature.Section` verbatim.
 */
export const settingsSections: readonly SettingsSection[] = [
  {
    id: SettingsSectionId.profile,
    title: 'Profile',
    glyph: 'person.crop.circle',
    group: SettingsHubGroup.profile,
    settingGroup: null,
  },
  {
    id: SettingsSectionId.general,
    title: 'General',
    glyph: 'gearshape',
    group: SettingsHubGroup.preferences,
    settingGroup: SettingGroup.general,
  },
  {
    id: SettingsSectionId.appearance,
    title: 'Appearance',
    // `circle.lefthalf.filled`, not `paintpalette`: it is the glyph
    // `SettingOption.appearance` already declares, so the hub row and
    // the stored option agree — and `paintpalette` is already spent on
    // the accent/palette options themselves.
    glyph: 'circle.lefthalf.filled',
    group: SettingsHubGroup.preferences,
    settingGroup: null,
  },
  {
    id: SettingsSectionId.planPreferences,
    title: 'Plan Preferences',
    glyph: 'slider.horizontal.3',
    group: SettingsHubGroup.preferences,
    settingGroup: SettingGroup.plan,
  },
  {
    id: SettingsSectionId.doPreferences,
    title: 'Do Preferences',
    glyph: 'checkmark.circle',
    group: SettingsHubGroup.preferences,
    settingGroup: SettingGroup.do,
  },
  {
    id: SettingsSectionId.earnPreferences,
    title: 'Earn Preferences',
    glyph: 'star.circle',
    group: SettingsHubGroup.preferences,
    settingGroup: SettingGroup.earn,
  },
  {
    id: SettingsSectionId.sessionPreferences,
    title: 'Session Preferences',
    glyph: 'timer',
    group: SettingsHubGroup.preferences,
    settingGroup: SettingGroup.session,
  },
  {
    id: SettingsSectionId.integrations,
    title: 'Integrations',
    glyph: 'square.stack.3d.up',
    group: SettingsHubGroup.account,
    settingGroup: null,
  },
  {
    id: SettingsSectionId.subscription,
    title: 'Subscription',
    glyph: 'creditcard',
    group: SettingsHubGroup.account,
    settingGroup: null,
  },
]

/** The sections of one hub group, in declaration order. */
export const settingsSectionsIn = (
  group: SettingsHubGroup,
): readonly SettingsSection[] =>
  settingsSections.filter((section) => section.group === group)

/**
 * Preference rows with Appearance included or omitted, matching the
 * `appearanceThemes` flag.
 */
export const preferencesHubSectionsFor = (
  isAppearanceThemesEnabled: boolean,
): readonly SettingsSection[] => {
  const sections = settingsSectionsIn(SettingsHubGroup.preferences)
  if (isAppearanceThemesEnabled) return sections
  return sections.filter(
    (section) => section.id !== SettingsSectionId.appearance,
  )
}

/** The section a raw id names, or `null` when nothing declares it. */
export const settingsSectionForId = (id: string): SettingsSection | null =>
  settingsSections.find((section) => section.id === id) ?? null

/**
 * The heading a drill-down pane shows. Canon's `navigationTitle` per screen,
 * which is the section's own title everywhere except Integrations — whose view
 * titles itself "Integrations", the same string — so this is the title.
 */
export const settingsSectionTitle = (id: SettingsSectionId): string => {
  const section = settingsSectionForId(id)
  // Unreachable: `id` is the union of the declared ids. Kept as a total
  // function so a caller never has to handle a `null` that cannot happen.
  return section?.title ?? ''
}

/** Which pane shape a section renders as — the surface's dispatch. */
export const SettingsPaneKind = {
  /** Rows built from the preference schema. */
  preferences: 'preferences',
  /** Theme + palette — schema options, but not a `SettingGroup`. */
  appearance: 'appearance',
  profile: 'profile',
  integrations: 'integrations',
  subscription: 'subscription',
} as const

export type SettingsPaneKind =
  (typeof SettingsPaneKind)[keyof typeof SettingsPaneKind]

export const settingsPaneKind = (id: SettingsSectionId): SettingsPaneKind => {
  switch (id) {
    case SettingsSectionId.profile:
      return SettingsPaneKind.profile
    case SettingsSectionId.integrations:
      return SettingsPaneKind.integrations
    case SettingsSectionId.subscription:
      return SettingsPaneKind.subscription
    case SettingsSectionId.appearance:
      return SettingsPaneKind.appearance
    case SettingsSectionId.general:
    case SettingsSectionId.planPreferences:
    case SettingsSectionId.doPreferences:
    case SettingsSectionId.earnPreferences:
    case SettingsSectionId.sessionPreferences:
      return SettingsPaneKind.preferences
    default:
      return assertNever(id)
  }
}
