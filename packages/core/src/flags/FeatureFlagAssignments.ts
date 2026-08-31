/**
 * `FeatureFlagAssignment.statusQuoSet` — canon
 * `KroCore/Domain/FeatureFlags.swift`, ported assignment for assignment.
 *
 * The ship baseline: 24 of the 28 declared flags carry an explicit assignment;
 * **`matrix`, `board`, `blueprints` and `developmentActions` carry none**, so
 * `state(for:)` resolves `null` for them and `enabledResolver` reads that as
 * off. That is not an omission to tidy up — an unassigned flag is how canon
 * says "declared, never staged", and the `allEnabled` baseline is what turns
 * them on for development.
 *
 * Canon's is a `Set<FeatureFlagAssignment>`, which is unordered. This is an
 * **array in canon's literal order**, and the ordering is inert: no flag
 * appears twice in the baseline, so last-match-wins has nothing to resolve
 * inside it. The order matters only where overrides are appended *after* the
 * baseline, which is exactly the property the service relies on.
 *
 * The inline comments canon attaches to five of these assignments explain *why*
 * a flag ships the way it does, so they are ported with them.
 */
import { allKnownFlags, FeatureFlags } from './FeatureFlag'
import type { FeatureFlagAssignment } from './FeatureFlagAssignment'
import { disabledAssignment, enabledAssignment } from './FeatureFlagAssignment'

/** `FeatureFlagAssignment.statusQuoSet`, in canon literal order. */
export const statusQuoSet: readonly FeatureFlagAssignment[] = [
  disabledAssignment(FeatureFlags.authenticationEnforced),
  enabledAssignment(FeatureFlags.session),
  enabledAssignment(FeatureFlags.tasks),
  enabledAssignment(FeatureFlags.lists),
  enabledAssignment(FeatureFlags.rewards),
  enabledAssignment(FeatureFlags.day),
  enabledAssignment(FeatureFlags.quickDay),
  enabledAssignment(FeatureFlags.remindersIntegration),
  enabledAssignment(FeatureFlags.settings),
  enabledAssignment(FeatureFlags.calendarIntegration),
  enabledAssignment(FeatureFlags.googleCalendarIntegration),
  enabledAssignment(FeatureFlags.googleCalendar),
  disabledAssignment(FeatureFlags.sessionStopwatch),
  disabledAssignment(FeatureFlags.sessionDurationLearning),
  disabledAssignment(FeatureFlags.sessionBreak),
  disabledAssignment(FeatureFlags.supabaseHosting),
  enabledAssignment(FeatureFlags.now),
  disabledAssignment(FeatureFlags.habits),
  enabledAssignment(FeatureFlags.triage),
  // Notifications preferences are an announced-but-unbuilt dead-end (Thirst
  // audit). Disabled by default; mapped to the `notifications` registry
  // feature, marked available_soon.
  disabledAssignment(FeatureFlags.notifications),
  // Endeavor Detail — dark-launched behind this flag while its navigable
  // skeleton, edit path and persistence land across its epic's children.
  disabledAssignment(FeatureFlags.endeavorDetail),
  // Outlook integration foundation — Microsoft sign-in + Outlook Calendar
  // read-only client. No UI reads it yet.
  disabledAssignment(FeatureFlags.outlookCalendarIntegration),
  // Ships enabled rather than the usual greenfield `disabled`: the rings are a
  // passive, read-only indicator over data the Do tab already fetches, so
  // there is no new write path or destination to stage behind a dark launch.
  // The flag is a kill switch, not a rollout gate.
  enabledAssignment(FeatureFlags.doActivityRings),
  // Press-and-hold (double-click on macOS) an empty timeline slot to open the
  // creation prompt pre-seeded as an event. Ships enabled: it adds an
  // affordance to an existing surface and reuses the prompt and the event
  // handoff that already exist, so the flag is a kill switch for the gesture
  // rather than a rollout gate.
  enabledAssignment(FeatureFlags.timelineQuickEventCreation),
]

/**
 * The `allEnabled` baseline: every flag in `allKnownFlags` starts enabled and
 * `statusQuoSet` is not consulted at all.
 *
 * Canon's `HardcodedFeatureFlagService` builds this inline and notes that it
 * already seeds `developmentActions`, which is why the `statusQuo` branch —
 * and only that branch — appends `developmentActions` separately in DEBUG:
 * appending it here too would leave two entries for one flag and make the
 * effective state depend on ordering rather than intent.
 */
export const allEnabledSet: readonly FeatureFlagAssignment[] =
  allKnownFlags.map(enabledAssignment)

/**
 * The four flags `statusQuoSet` leaves unassigned. Derived rather than written
 * out, so it can never drift from the set above.
 */
export const unassignedInStatusQuo: readonly string[] = allKnownFlags
  .filter(
    (flag) =>
      !statusQuoSet.some((assignment) => assignment.flag.name === flag.name),
  )
  .map((flag) => flag.name)
