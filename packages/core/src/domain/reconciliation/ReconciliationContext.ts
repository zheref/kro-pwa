/**
 * `ReconciliationContext` — everything the pass needs from outside itself.
 *
 * The reconciliation engine is pure: it reads no clock, no time zone and no
 * global registry. Canon gets the same discipline from parameters
 * (`reconcile(_:calendar:now:)`) and from `CurrentTimeManager`; here the three
 * ambient inputs are gathered into one value so a call site passes one thing
 * and a test overrides one field.
 *
 * `now` is **nullable on purpose**, exactly as canon's `now: Date? = nil` is.
 * With no instant supplied the pass still collapses superseded source history
 * — that rule compares rows to each other — but it will not *project* a
 * completion onto the live occurrence, because deciding whether a completion
 * happened "today" is meaningless without a today. Defaulting to
 * `new Date()` instead would make the domain tier reach for a clock and make
 * every test that omits `now` non-deterministic.
 */
import type { TimeIntervalSeconds } from '../shared/TimeInterval'
import { defaultProviderRulesets } from './AppleRemindersRuleset'
import type { ProviderClassificationRuleset } from './ProviderClassification'
import {
  type ReconciliationCalendar,
  systemCalendar,
} from './ReconciliationCalendar'

/**
 * How long an orphaned shadow is kept before cleanup — integrity rule 4,
 * *"orphan cleanup only after a quarantine window (so a transient sync failure
 * doesn't immediately purge user data)"*.
 *
 * **Canon states the rule but never states the number**, and `KroEnhanced.md`
 * lists the reconcile pass itself as not yet built (`⛔ No reconcile pass /
 * orphaned-shadow cleanup`). Seven days is this port's choice: long enough to
 * outlast a provider outage or a week away from the device, short enough that
 * a genuinely deleted item does not linger for a month. It lives here as one
 * named constant so a canon ruling later changes one line.
 */
export const DEFAULT_ORPHAN_QUARANTINE_SECONDS: TimeIntervalSeconds =
  7 * 24 * 60 * 60

export interface ReconciliationContext {
  /**
   * The current instant, or `null` to run the row-versus-row rules only. See
   * the module note — this is canon's optional `now`, not a missing default.
   */
  readonly now: Date | null
  readonly calendar: ReconciliationCalendar
  /**
   * The per-provider classification tables in force, in precedence order.
   * `resolvedKind` applies the first one whose provider the row is linked to.
   */
  readonly rulesets: readonly ProviderClassificationRuleset[]
  readonly orphanQuarantineSeconds: TimeIntervalSeconds
}

/**
 * Build a context, defaulting every field. Callers usually override `now`
 * (production) or `calendar` + `now` (tests).
 */
export const makeReconciliationContext = (
  params: {
    readonly now?: Date | null
    readonly calendar?: ReconciliationCalendar
    readonly rulesets?: readonly ProviderClassificationRuleset[]
    readonly orphanQuarantineSeconds?: TimeIntervalSeconds
  } = {},
): ReconciliationContext => ({
  now: params.now ?? null,
  calendar: params.calendar ?? systemCalendar,
  rulesets: params.rulesets ?? defaultProviderRulesets,
  orphanQuarantineSeconds:
    params.orphanQuarantineSeconds ?? DEFAULT_ORPHAN_QUARANTINE_SECONDS,
})

/**
 * The context every read-side selector uses when the caller has no opinion —
 * notably `resolvedKind(endeavor)`, which classifies from the row's own
 * shadows and needs neither a clock nor a calendar.
 */
export const defaultReconciliationContext = (): ReconciliationContext =>
  makeReconciliationContext()
