/**
 * The flag × preference AND-ing helper — canon
 * `Kro/Application/Main/MainFeature.swift`.
 *
 * Two different questions get conflated constantly, and canon keeps them apart:
 *
 * - **The flag is the rollout gate.** It says whether the capability exists in
 *   this build at all.
 * - **The preference is the user's choice.** It says whether they want it.
 *
 * A capability is available only when **both** allow it. Canon writes that
 * inline at each site:
 *
 * ```swift
 * stopwatch: ff.state(.sessionStopwatch) == .enabled && settingsProvider.bool(.sessionEnableStopwatch)
 * breaks:    ff.state(.sessionBreak)     == .enabled && settingsProvider.bool(.sessionEnableBreaks)
 * ```
 *
 * and, for the overdue-notification gate, a **three-way** AND across one flag
 * and *two* preferences:
 *
 * ```swift
 * isGateEnabled: ff.state(.notifications) == .enabled
 *     && settingsProvider.bool(.overdueAlerts)
 *     && settingsProvider.bool(.doNotifyOnOverdue)
 * ```
 *
 * Ported here as a named gate rather than re-spelled at each call site, because
 * the failure mode is silent: a surface that checks only the flag ships a
 * control the user switched off, and one that checks only the preference ships
 * unfinished work. A `FeatureGate` value makes both halves reviewable in one
 * place, and the truth table in `__tests__/FeatureFlagGating.test.ts` pins all
 * four rows.
 *
 * Two layers, on purpose:
 *
 * - `isCapabilityAvailable(isFlagEnabled, ...preferenceStates)` takes the
 *   **answers**, so the rule itself is pure and testable as a truth table with
 *   no service and no store in sight.
 * - `isGateAvailable(gate, service, preferences)` is the convenience over it:
 *   it *does* read a `FeatureFlagService` and a `Preferences`, because that is
 *   the call a Selector in `@kro/app` actually wants to make. Both are
 *   synchronous `Provider`-tier reads (`RC-47`), so a Selector may make it.
 */
import type { SettingOption } from '../settings/SettingOption'
import {
  doNotifyOnOverdueOption,
  overdueAlertsOption,
  sessionEnableBreaksOption,
  sessionEnableStopwatchOption,
} from '../settings/SettingOptions'
import type { Preferences } from '../settings/Preferences'
import { preferenceBool } from '../settings/Preferences'
import type { FeatureFlag } from './FeatureFlag'
import { FeatureFlags } from './FeatureFlag'
import type { FeatureFlagService } from './FeatureFlagService'

/**
 * The AND itself. Trivial by design: naming it is what stops the two halves
 * being combined with `||` or short-circuited to one of them at a call site.
 */
export const isCapabilityAvailable = (
  isFlagEnabled: boolean,
  ...preferenceStates: readonly boolean[]
): boolean => isFlagEnabled && preferenceStates.every((isEnabled) => isEnabled)

/**
 * A named capability: one rollout flag AND every preference the user must also
 * have on. `options` is a list because canon's overdue gate needs two.
 */
export interface FeatureGate {
  /** A stable identifier for the capability, for logging and the Debug list. */
  readonly id: string
  readonly flag: FeatureFlag
  readonly options: readonly SettingOption[]
}

const makeFeatureGate = (
  id: string,
  flag: FeatureFlag,
  options: readonly SettingOption[],
): FeatureGate => ({ id, flag, options })

/**
 * Stopwatch (count-up) mode: the `sessionStopwatch` flag AND
 * `session.enableStopwatch`.
 */
export const sessionStopwatchGate: FeatureGate = makeFeatureGate(
  'session.stopwatch',
  FeatureFlags.sessionStopwatch,
  [sessionEnableStopwatchOption],
)

/** Breaks: the `sessionBreak` flag AND `session.enableBreaks`. */
export const sessionBreaksGate: FeatureGate = makeFeatureGate(
  'session.breaks',
  FeatureFlags.sessionBreak,
  [sessionEnableBreaksOption],
)

/**
 * Overdue notifications: the `notifications` flag AND **both**
 * `general.overdueAlerts` and `do.notifyOnOverdue`. Canon's Preferences spec
 * describes the pair as "paired … both must be on (AND'd) for an overdue alert
 * to be scheduled".
 */
export const overdueNotificationsGate: FeatureGate = makeFeatureGate(
  'notifications.overdue',
  FeatureFlags.notifications,
  [overdueAlertsOption, doNotifyOnOverdueOption],
)

/**
 * Duration learning: the `sessionDurationLearning` flag and **no** preference.
 * Ported as a gate with an empty `options` list because canon's line is
 * `durationLearning: ff.state(.sessionDurationLearning) == .enabled` — a
 * flag-only capability sitting in the same tuple as the two AND'd ones. Keeping
 * it here says "we checked, there is no preference" rather than leaving a
 * reader to wonder which of the three shapes it has.
 */
export const sessionDurationLearningGate: FeatureGate = makeFeatureGate(
  'session.durationLearning',
  FeatureFlags.sessionDurationLearning,
  [],
)

/** Every gate canon declares, so the Debug list can render them. */
export const featureGates: readonly FeatureGate[] = [
  sessionStopwatchGate,
  sessionBreaksGate,
  sessionDurationLearningGate,
  overdueNotificationsGate,
]

/**
 * Evaluates a gate against a flag service and a preferences store.
 *
 * A gate with no options degrades to the flag alone — which is the correct
 * reading of the AND over an empty set, and matches canon's flag-only line.
 */
export const isGateAvailable = (
  gate: FeatureGate,
  service: FeatureFlagService,
  preferences: Preferences,
): boolean =>
  isCapabilityAvailable(
    service.isEnabled(gate.flag),
    ...gate.options.map((option) => preferenceBool(preferences, option)),
  )
