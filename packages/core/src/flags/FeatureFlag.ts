/**
 * `FeatureFlag` and the declared registry — canon
 * `KroCore/Domain/FeatureFlags.swift`, `extension FeatureFlag` and
 * `FeatureFlag.allKnownFlags`.
 *
 * All **29** flags KroApple declares, ported name for name. The name is the
 * stable identity: it is what a persisted `debug.ff.<name>` override keys on,
 * what the Debug flag list renders, and what a cross-platform reader compares.
 *
 * Two shape notes:
 *
 * - **`FeatureFlag` stays a wrapper object, not a bare string.** Canon's is a
 *   `struct FeatureFlag { name }`, and BankaiCore's protocol is written against
 *   that type. Collapsing it to `type FeatureFlag = string` would read the same
 *   at every call site here and then diverge the moment the flag carries a
 *   second field (an owner, a sunset date), which is the sort of change a
 *   registry attracts.
 * - **`allKnownFlags` is a flat list, not canon's `[(flag, name)]` pairs.**
 *   Canon pairs each flag with its name because `FeatureFlag.name` is
 *   `internal` to BankaiCore and unreadable from KroApple. Here `name` is on
 *   the value, so the pair collapses; the comment canon attaches to that array
 *   ("keep in sync with the extension above") stops applying, because
 *   `__tests__/FeatureFlag.test.ts` derives one from the other.
 *
 * Flags are compared **by name**, never by object identity — `isSameFeatureFlag`
 * is the only comparison this module uses, so a flag reconstructed from a
 * persisted name resolves the same as the declared constant.
 */

export interface FeatureFlag {
  readonly name: string
}

/** Every declared flag, in canon's `extension FeatureFlag` declaration order. */
export const FeatureFlags = {
  authenticationEnforced: { name: 'authenticationEnforced' },
  session: { name: 'session' },
  tasks: { name: 'tasks' },
  lists: { name: 'lists' },
  matrix: { name: 'matrix' },
  habits: { name: 'habits' },
  board: { name: 'board' },
  rewards: { name: 'rewards' },
  blueprints: { name: 'blueprints' },
  day: { name: 'day' },
  now: { name: 'now' },
  quickDay: { name: 'quickDay' },
  triage: { name: 'triage' },
  remindersIntegration: { name: 'remindersIntegration' },
  supabaseHosting: { name: 'supabaseHosting' },
  settings: { name: 'settings' },
  calendarIntegration: { name: 'calendarIntegration' },
  googleCalendarIntegration: { name: 'googleCalendarIntegration' },
  googleCalendar: { name: 'googleCalendar' },
  developmentActions: { name: 'developmentActions' },
  sessionStopwatch: { name: 'sessionStopwatch' },
  sessionDurationLearning: { name: 'sessionDurationLearning' },
  sessionBreak: { name: 'sessionBreak' },
  notifications: { name: 'notifications' },
  endeavorDetail: { name: 'endeavorDetail' },
  outlookCalendarIntegration: { name: 'outlookCalendarIntegration' },
  doActivityRings: { name: 'doActivityRings' },
  timelineQuickEventCreation: { name: 'timelineQuickEventCreation' },
  appearanceThemes: { name: 'appearanceThemes' },
} as const satisfies Record<string, FeatureFlag>

/** The key set of `FeatureFlags` — every declared flag's name, as a type. */
export type FeatureFlagName = keyof typeof FeatureFlags

/**
 * `FeatureFlag.allKnownFlags` — every declared flag, **name-sorted**, exactly as
 * canon orders it. The order is what the Debug flag list renders in, so it is
 * part of the port rather than an implementation detail.
 */
export const allKnownFlags: readonly FeatureFlag[] = Object.values(FeatureFlags)
  .slice()
  .sort((left, right) => (left.name < right.name ? -1 : 1))

/** Every declared flag's name, name-sorted. */
export const allKnownFlagNames: readonly string[] = allKnownFlags.map(
  (flag) => flag.name,
)

/**
 * Flag equality is by name — canon's `Equatable` on a single-field struct, and
 * the only comparison the service and the override store use.
 */
export const isSameFeatureFlag = (
  left: FeatureFlag,
  right: FeatureFlag,
): boolean => left.name === right.name

/**
 * Resolves a persisted flag name back to its declared flag, or `null` when
 * nothing declares it. Canon's `applyPersistedOverrides` builds the same lookup
 * and `guard`s on it: an override for a flag that has since been deleted is
 * skipped, never resurrected as a new flag.
 */
export const featureFlagNamed = (name: string): FeatureFlag | null =>
  allKnownFlags.find((flag) => flag.name === name) ?? null
