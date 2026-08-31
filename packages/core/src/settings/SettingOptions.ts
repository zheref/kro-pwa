/**
 * `SettingOptions` — canon `KroCore/Domain/Constants/SettingOptions.swift`,
 * ported option for option.
 *
 * Every key, glyph, default and sync scope below is transcribed from the Swift
 * at `zheref/KroApple@2c1ee45` (which is `origin/main` at authoring time — canon
 * has not moved since the epic's pin). `__tests__/SettingOptionsSnapshot.test.ts`
 * carries the whole table a second time as a hand-written literal, so the two
 * transcriptions have to agree: that test is the "diffs empty against canon's
 * list" acceptance criterion, and it only means anything because the expectation
 * was typed from the Swift rather than generated from this file.
 *
 * ## Consumption — what `declared` means and how it was decided
 *
 * Canon records "declared, not yet consumed" only in prose, and its two prose
 * sources disagree, so the field is derived from the code instead. The rule,
 * reproducible against a checkout of `KroApple@2c1ee45`:
 *
 * > `declared` — no file outside the option's own `…PreferencesScreen` /
 * > `…PreferencesFeature` / `…PreferencesProducer` / `…PreferencesView` reads it.
 * > `live` — at least one product surface does.
 *
 * For Plan, Do, Earn and Session that rule reproduces
 * `docs/Features/Preferences.md`'s per-option *Live* / *Declared, not yet
 * consumed* annotations exactly. Two divergences it surfaces, both named in the
 * PR: the `// MARK:` comments in the Swift are **stale** for
 * `do.autoAdvanceAfterComplete`, `session.autoStartBreak` and
 * `session.keepScreenAwake` (they call all three unconsumed; `DoProducer` and
 * `MainFeature` read all three — the doc is right and the comment is not); and
 * the doc annotates every section **except General**, where the rule finds 11
 * of 12 options unconsumed — only `general.overdueAlerts` has a reader
 * (`MainFeature`'s overdue-notification gate).
 *
 * The field is canon-parity metadata and gates nothing at runtime. It exists so
 * that a later child wiring a Settings surface (#32) can tell "KroApple reads
 * this" from "KroApple stores this and nothing reads it", and does not invent a
 * consumer Kro does not have.
 */
import { PointsFormula, pointsFormulas } from '../domain/session/PointsFormula'
import { WeekDay, weekDays } from '../domain/shared/WeekDay'
import {
  DayViewRange,
  PlanListGrouping,
  PlanListSort,
  dayViewRanges,
  planListGroupings,
  planListSorts,
} from './PlanSettingChoices'
import {
  AccentChoice,
  AppearanceMode,
  LandingChoice,
  accentChoices,
  appearanceModes,
  landingChoices,
} from './SettingChoices'
import type { SettingOption } from './SettingOption'
import {
  SettingConsumption,
  SettingSyncScope,
  boolSetting,
  daysSetSetting,
  enumerationSetting,
  intSetting,
  makeSettingOption,
  stringSetting,
  timeOfDaySetting,
} from './SettingOption'
import { MONDAY_TO_FRIDAY_BITMASK } from './WeekDayBitmask'

const HOUR = 60

// ---------------------------------------------------------------------------
// Non-preference options
//
// Three options that are `SettingOption`s but deliberately NOT preferences:
// canon excludes them from `allPreferenceOptions` (and therefore from
// `cloudSyncOptions`) because they describe per-device capability or UI state,
// not a portable choice about the person. They keep the implicit `cloud` sync
// scope from canon's initializer default — that scope is simply never consulted
// for them, because membership in the sync set is decided by
// `allPreferenceOptions`, not by the scope. Porting the scope as `local` to
// "fix" the discrepancy would be inventing canon.
// ---------------------------------------------------------------------------

/**
 * Whether this device is connected to Apple Calendar. Web has no EventKit, so
 * kro-pwa never turns this on — it is ported for schema parity and because a
 * synced-in row must not be mistaken for an unknown key.
 */
export const appleCalendarOption: SettingOption = makeSettingOption({
  key: 'appleCalendar',
  type: boolSetting,
  glyph: 'calendar',
  defaultValue: false,
})

/** Whether this device is connected to Apple Reminders. See `appleCalendar`. */
export const appleRemindersOption: SettingOption = makeSettingOption({
  key: 'appleReminders',
  type: boolSetting,
  glyph: 'checklist',
  defaultValue: false,
})

/**
 * Comma-separated `NowDisplayType` raw values — the visibility filter the user
 * last configured on the Do screen. Absent or empty → all types visible.
 *
 * `declared`: nothing in canon reads it at `2c1ee45`. The Do screen tunes
 * visibility live through its lens instead, which is why the Preferences spec
 * says the filter is "intentionally **not** a separate preference here".
 */
export const nowVisibleTypesOption: SettingOption = makeSettingOption({
  key: 'nowVisibleTypes',
  type: stringSetting,
  glyph: 'eye',
  defaultValue: null,
  consumption: SettingConsumption.declared,
})

/** The three non-preference options, in canon declaration order. */
export const nonPreferenceOptions: readonly SettingOption[] = [
  appleCalendarOption,
  appleRemindersOption,
  nowVisibleTypesOption,
]

// ---------------------------------------------------------------------------
// General preferences
// ---------------------------------------------------------------------------

/**
 * IANA timezone identifier the user plans in (e.g. `"America/Bogota"`).
 * `null` → the device's current timezone is used.
 */
export const timezoneOption: SettingOption = makeSettingOption({
  key: 'general.timezone',
  type: stringSetting,
  glyph: 'globe',
  defaultValue: null,
  consumption: SettingConsumption.declared,
})

/** Start of the working day, minutes from midnight. Default 09:00. */
export const workingHoursStartOption: SettingOption = makeSettingOption({
  key: 'general.workingHoursStart',
  type: timeOfDaySetting,
  glyph: 'sunrise',
  defaultValue: 9 * HOUR,
  consumption: SettingConsumption.declared,
})

/** End of the working day, minutes from midnight. Default 17:00. */
export const workingHoursEndOption: SettingOption = makeSettingOption({
  key: 'general.workingHoursEnd',
  type: timeOfDaySetting,
  glyph: 'sunset',
  defaultValue: 17 * HOUR,
  consumption: SettingConsumption.declared,
})

/** Working days as a `WeekDay` bitmask. Default Mon–Fri. */
export const workingDaysOption: SettingOption = makeSettingOption({
  key: 'general.workingDays',
  type: daysSetSetting,
  glyph: 'calendar',
  defaultValue: MONDAY_TO_FRIDAY_BITMASK,
  consumption: SettingConsumption.declared,
})

/** Time the morning-plan notification fires, minutes from midnight. Default 08:00. */
export const morningPlanTimeOption: SettingOption = makeSettingOption({
  key: 'general.morningPlanTime',
  type: timeOfDaySetting,
  glyph: 'bell.badge',
  defaultValue: 8 * HOUR,
  consumption: SettingConsumption.declared,
})

/** Whether streak-reminder notifications are delivered. Default on. */
export const streakRemindersOption: SettingOption = makeSettingOption({
  key: 'general.streakReminders',
  type: boolSetting,
  glyph: 'flame',
  defaultValue: true,
  consumption: SettingConsumption.declared,
})

/**
 * Whether overdue-item alerts are delivered. Default on. The one General
 * option with a consumer today: `MainFeature` AND's it with
 * `do.notifyOnOverdue` and the `notifications` flag.
 */
export const overdueAlertsOption: SettingOption = makeSettingOption({
  key: 'general.overdueAlerts',
  type: boolSetting,
  glyph: 'exclamationmark.circle',
  defaultValue: true,
})

/** Color-scheme preference (`AppearanceMode` raw value). **Local-only.** */
export const appearanceOption: SettingOption = makeSettingOption({
  key: 'general.appearance',
  type: enumerationSetting(appearanceModes),
  glyph: 'circle.lefthalf.filled',
  defaultValue: AppearanceMode.system,
  syncScope: SettingSyncScope.local,
  consumption: SettingConsumption.declared,
})

/** Accent color preference (`AccentChoice` raw value). */
export const accentColorOption: SettingOption = makeSettingOption({
  key: 'general.accentColor',
  type: enumerationSetting(accentChoices),
  glyph: 'paintpalette',
  defaultValue: AccentChoice.blue,
  consumption: SettingConsumption.declared,
})

/** First day of the week (`WeekDay` raw value). */
export const weekStartDayOption: SettingOption = makeSettingOption({
  key: 'general.weekStartDay',
  type: enumerationSetting(weekDays),
  glyph: 'calendar.day.timeline.left',
  defaultValue: WeekDay.monday,
  consumption: SettingConsumption.declared,
})

/** Section shown on cold launch (`LandingChoice` raw value). */
export const defaultLandingSectionOption: SettingOption = makeSettingOption({
  key: 'general.defaultLandingSection',
  type: enumerationSetting(landingChoices),
  glyph: 'house',
  defaultValue: LandingChoice.plan,
  consumption: SettingConsumption.declared,
})

/** Whether in-app haptic feedback is enabled. **Local-only.** Default on. */
export const hapticsOption: SettingOption = makeSettingOption({
  key: 'general.haptics',
  type: boolSetting,
  glyph: 'hand.tap',
  defaultValue: true,
  syncScope: SettingSyncScope.local,
  consumption: SettingConsumption.declared,
})

/** `generalOptions` — every General option, in display order. */
export const generalOptions: readonly SettingOption[] = [
  timezoneOption,
  workingHoursStartOption,
  workingHoursEndOption,
  workingDaysOption,
  morningPlanTimeOption,
  streakRemindersOption,
  overdueAlertsOption,
  appearanceOption,
  accentColorOption,
  weekStartDayOption,
  defaultLandingSectionOption,
  hapticsOption,
]

// ---------------------------------------------------------------------------
// Plan preferences
// ---------------------------------------------------------------------------

/** Default block duration in minutes for new time slots. Default 25. */
export const planDefaultSlotDurationOption: SettingOption = makeSettingOption({
  key: 'plan.defaultSlotDuration',
  type: intSetting,
  glyph: 'clock',
  defaultValue: 25,
  consumption: SettingConsumption.declared,
})

/** Whether AI-generated plan drafts auto-commit vs. await confirmation. */
export const planAutoCommitDraftsOption: SettingOption = makeSettingOption({
  key: 'plan.autoCommitDrafts',
  type: boolSetting,
  glyph: 'sparkles',
  defaultValue: false,
  consumption: SettingConsumption.declared,
})

/** The band of hours the Day timeline shows (`DayViewRange` raw value). */
export const planDayViewRangeOption: SettingOption = makeSettingOption({
  key: 'plan.dayViewRange',
  type: enumerationSetting(dayViewRanges),
  glyph: 'arrow.up.and.down',
  defaultValue: DayViewRange.full,
})

/** Whether completed items appear on the Day timeline. Default on. */
export const planShowCompletedInTimelineOption: SettingOption =
  makeSettingOption({
    key: 'plan.showCompletedInTimeline',
    type: boolSetting,
    glyph: 'checkmark.circle',
    defaultValue: true,
  })

/** Default sort for Plan lists (`PlanListSort` raw value). */
export const planListSortOption: SettingOption = makeSettingOption({
  key: 'plan.listSort',
  type: enumerationSetting(planListSorts),
  glyph: 'arrow.up.arrow.down',
  defaultValue: PlanListSort.time,
})

/** Default grouping for Plan lists (`PlanListGrouping` raw value). */
export const planListGroupingOption: SettingOption = makeSettingOption({
  key: 'plan.listGrouping',
  type: enumerationSetting(planListGroupings),
  glyph: 'rectangle.3.group',
  defaultValue: PlanListGrouping.none,
})

/** `planOptions` — every Plan option, in display order. */
export const planOptions: readonly SettingOption[] = [
  planDefaultSlotDurationOption,
  planAutoCommitDraftsOption,
  planDayViewRangeOption,
  planShowCompletedInTimelineOption,
  planListSortOption,
  planListGroupingOption,
]

// ---------------------------------------------------------------------------
// Do preferences
// ---------------------------------------------------------------------------

/** Whether the Do screen shows the suggestions carousel. Default on. */
export const doShowSuggestionsOption: SettingOption = makeSettingOption({
  key: 'do.showSuggestions',
  type: boolSetting,
  glyph: 'sparkles',
  defaultValue: true,
})

/**
 * Whether overdue-item notifications are delivered for the Do screen. Default
 * on. AND'd with `general.overdueAlerts` and the `notifications` flag.
 */
export const doNotifyOnOverdueOption: SettingOption = makeSettingOption({
  key: 'do.notifyOnOverdue',
  type: boolSetting,
  glyph: 'exclamationmark.circle',
  defaultValue: true,
})

/** How many hours ahead counts as "now" on the Do screen. Default 2. */
export const doNowThresholdHoursOption: SettingOption = makeSettingOption({
  key: 'do.nowThresholdHours',
  type: intSetting,
  glyph: 'clock',
  defaultValue: 2,
})

/** Whether completing a card auto-advances to the next one. Default off. */
export const doAutoAdvanceAfterCompleteOption: SettingOption =
  makeSettingOption({
    key: 'do.autoAdvanceAfterComplete',
    type: boolSetting,
    glyph: 'forward.end',
    defaultValue: false,
  })

/** `doOptions` — every Do option, in display order. */
export const doOptions: readonly SettingOption[] = [
  doShowSuggestionsOption,
  doNotifyOnOverdueOption,
  doNowThresholdHoursOption,
  doAutoAdvanceAfterCompleteOption,
]

// ---------------------------------------------------------------------------
// Earn preferences
// ---------------------------------------------------------------------------

/** Which scoring formula awards points (`PointsFormula` raw value). */
export const earnPointsFormulaOption: SettingOption = makeSettingOption({
  key: 'earn.pointsFormula',
  type: enumerationSetting(pointsFormulas),
  glyph: 'function',
  defaultValue: PointsFormula.slidingScale,
})

/** The point cost pre-filled when creating a new reward. Default 100. */
export const earnDefaultRewardThresholdOption: SettingOption =
  makeSettingOption({
    key: 'earn.defaultRewardThreshold',
    type: intSetting,
    glyph: 'target',
    defaultValue: 100,
  })

/** Whether the Earn screen shows the weekly challenge. Default on. */
export const earnShowWeeklyChallengeOption: SettingOption = makeSettingOption({
  key: 'earn.showWeeklyChallenge',
  type: boolSetting,
  glyph: 'trophy',
  defaultValue: true,
  consumption: SettingConsumption.declared,
})

/** Whether milestone celebrations are shown. Default on. */
export const earnCelebrateMilestonesOption: SettingOption = makeSettingOption({
  key: 'earn.celebrateMilestones',
  type: boolSetting,
  glyph: 'party.popper',
  defaultValue: true,
  consumption: SettingConsumption.declared,
})

/** Whether milestone celebrations play haptics. **Local-only.** Default on. */
export const earnMilestoneHapticsOption: SettingOption = makeSettingOption({
  key: 'earn.milestoneHaptics',
  type: boolSetting,
  glyph: 'hand.tap',
  defaultValue: true,
  syncScope: SettingSyncScope.local,
  consumption: SettingConsumption.declared,
})

/** `earnOptions` — every Earn option, in display order. */
export const earnOptions: readonly SettingOption[] = [
  earnPointsFormulaOption,
  earnDefaultRewardThresholdOption,
  earnShowWeeklyChallengeOption,
  earnCelebrateMilestonesOption,
  earnMilestoneHapticsOption,
]

// ---------------------------------------------------------------------------
// Session preferences
// ---------------------------------------------------------------------------

/** Default focus-session length in minutes. Default 20. */
export const sessionDefaultDurationOption: SettingOption = makeSettingOption({
  key: 'session.defaultDuration',
  type: intSetting,
  glyph: 'timer',
  defaultValue: 20,
})

/** Default break length in minutes. Default 5. */
export const sessionDefaultBreakDurationOption: SettingOption =
  makeSettingOption({
    key: 'session.defaultBreakDuration',
    type: intSetting,
    glyph: 'cup.and.saucer',
    defaultValue: 5,
  })

/**
 * Whether the user wants stopwatch (count-up) mode available. Default on.
 * Gated together with the `sessionStopwatch` feature flag — see
 * `flags/FeatureFlagGating.ts`.
 */
export const sessionEnableStopwatchOption: SettingOption = makeSettingOption({
  key: 'session.enableStopwatch',
  type: boolSetting,
  glyph: 'stopwatch',
  defaultValue: true,
})

/**
 * Whether the user wants breaks available. Default on. Gated together with the
 * `sessionBreak` feature flag.
 */
export const sessionEnableBreaksOption: SettingOption = makeSettingOption({
  key: 'session.enableBreaks',
  type: boolSetting,
  glyph: 'pause.circle',
  defaultValue: true,
})

/** Whether a break auto-starts after a focus session. Default off. */
export const sessionAutoStartBreakOption: SettingOption = makeSettingOption({
  key: 'session.autoStartBreak',
  type: boolSetting,
  glyph: 'arrow.triangle.2.circlepath',
  defaultValue: false,
})

/** Whether the screen stays awake during a session. **Local-only.** Default on. */
export const sessionKeepScreenAwakeOption: SettingOption = makeSettingOption({
  key: 'session.keepScreenAwake',
  type: boolSetting,
  glyph: 'sun.max',
  defaultValue: true,
  syncScope: SettingSyncScope.local,
})

/** Whether a sound plays when a session ends. **Local-only.** Default on. */
export const sessionSoundOnEndOption: SettingOption = makeSettingOption({
  key: 'session.soundOnEnd',
  type: boolSetting,
  glyph: 'speaker.wave.2',
  defaultValue: true,
  syncScope: SettingSyncScope.local,
})

/** `sessionOptions` — every Session option, in display order. */
export const sessionOptions: readonly SettingOption[] = [
  sessionDefaultDurationOption,
  sessionDefaultBreakDurationOption,
  sessionEnableStopwatchOption,
  sessionEnableBreaksOption,
  sessionAutoStartBreakOption,
  sessionKeepScreenAwakeOption,
  sessionSoundOnEndOption,
]

// ---------------------------------------------------------------------------
// Groups and the cloud-sync subset
// ---------------------------------------------------------------------------

/** The five preference sections, in hub order. */
export const SettingGroup = {
  general: 'general',
  plan: 'plan',
  do: 'do',
  earn: 'earn',
  session: 'session',
} as const

export type SettingGroup = (typeof SettingGroup)[keyof typeof SettingGroup]

/**
 * Each section's options, keyed by group. Canon has no such map — it has five
 * separate arrays — but the Settings hub (#32) renders one section per group,
 * and a map is what makes that a loop rather than five copies of the same JSX.
 */
export const settingOptionsByGroup: Readonly<
  Record<SettingGroup, readonly SettingOption[]>
> = {
  [SettingGroup.general]: generalOptions,
  [SettingGroup.plan]: planOptions,
  [SettingGroup.do]: doOptions,
  [SettingGroup.earn]: earnOptions,
  [SettingGroup.session]: sessionOptions,
}

/** `SettingGroup.allCases`, in hub order. */
export const settingGroups: readonly SettingGroup[] = [
  SettingGroup.general,
  SettingGroup.plan,
  SettingGroup.do,
  SettingGroup.earn,
  SettingGroup.session,
]

/**
 * `allPreferenceOptions` — every preference, across all sections, in a stable
 * order (`generalOptions + planOptions + doOptions + earnOptions +
 * sessionOptions`).
 *
 * The integration toggles and the Do visibility filter are **intentionally
 * excluded**: they describe per-device capability and UI state, not portable
 * user preferences. That exclusion is the whole reason `cloudSyncOptions`
 * filters this array and not every declared `SettingOption`.
 */
export const allPreferenceOptions: readonly SettingOption[] = [
  ...generalOptions,
  ...planOptions,
  ...doOptions,
  ...earnOptions,
  ...sessionOptions,
]

/** Every declared option, preferences and non-preferences alike. */
export const allSettingOptions: readonly SettingOption[] = [
  ...nonPreferenceOptions,
  ...allPreferenceOptions,
]

/**
 * `cloudSyncOptions` — the subset that participates in account cloud sync
 * (#31): every preference declared `syncScope: cloud`.
 *
 * The five `local` options (appearance, haptics, milestone haptics,
 * keep-screen-awake, end sound) are filtered out here and **never** leave the
 * device. `__tests__/SettingOptions.cloudSync.test.ts` pins that as an exact
 * set equality rather than a spot check, so adding a `local` option can never
 * silently widen the sync surface.
 */
export const cloudSyncOptions: readonly SettingOption[] =
  allPreferenceOptions.filter(
    (option) => option.syncScope === SettingSyncScope.cloud,
  )

/** Look an option up by its persisted key. `null` when nothing declares it. */
export const settingOptionForKey = (key: string): SettingOption | null =>
  allSettingOptions.find((option) => option.key === key) ?? null
