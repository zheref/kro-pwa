/**
 * The **source-resolved classification** machinery — provider-neutral.
 *
 * `docs/Features/SourceReconciliation.md`: *"The stored kind is a
 * compatibility fallback, not the final presentation kind. When the required
 * source evidence is available, the displayed and actionable kind is computed
 * from current native properties."*
 *
 * Canon hard-codes one provider's table in `AppleReminderKindResolver`, in
 * Swift control flow. The web epic's flagship external host is **Google
 * Calendar**, not Apple Reminders, so this port keeps canon's *rule structure*
 * and moves the *table* out into data: a `ProviderClassificationRuleset` is a
 * provider name plus an ordered list of `condition → outcome` rows. The Apple
 * table ships as one such value (`AppleRemindersRuleset.ts`) so parity data
 * reconciles identically here; #33 adds Google's as a second value, and no
 * code in this file changes.
 *
 * ## Why the rows are ordered, and why one of them is `keepStoredKind`
 *
 * Canon's resolver is a short-circuiting cascade, and the short circuit is
 * load-bearing:
 *
 * ```swift
 * if AppleReminderKindResolver.isHabitRecurrence(...) { return .habit }
 * guard let priority = appleReminderPriority(in: endeavor) else {
 *     return endeavor.kind          // ← not "skip this rule": STOP
 * }
 * return hasPriority || !hasScheduledDate ? .task : .reminder
 * ```
 *
 * A missing-evidence row does not fall through to the next row — it ends the
 * evaluation and yields the stored kind. Modelling the table as a flat
 * predicate list without that outcome would quietly invent a priority for
 * every legacy shadow, which is the one thing the spec forbids: *"Older cached
 * shadows may not contain the Apple priority evidence required to recompute a
 * non-habit classification. In that case Kro keeps the last stored kind rather
 * than inventing a priority."* So `keepStoredKind` is a first-class outcome,
 * and recurrence is tested **before** the evidence gate because *"Recurrence
 * remains sufficient to resolve a cached item as a Habit"*.
 */
import { assertNever } from '../../library/assertNever'
import type { EndeavorKind } from '../endeavor/EndeavorKind'
import type { RepeatBaseType, RepeatConfig } from '../endeavor/RepeatConfig'

/**
 * The normalized, provider-neutral facts a ruleset decides from. A provider
 * adapter (#33) fills this from its own wire shape; the rules never see the
 * wire shape.
 */
export interface SourceEvidence {
  /** The recurrence base the provider currently reports, or `null`. */
  readonly recurrenceBase: RepeatBaseType | null
  /**
   * The provider's own priority. **`null` means the evidence is absent** — a
   * shadow cached before the provider's metadata was persisted — while `0`
   * means the provider explicitly reports *no* priority. Collapsing the two
   * would silently reclassify every legacy row (`Shadow.ts` carries the same
   * three-way note on the field this is read from).
   */
  readonly priority: number | null
  /**
   * Whether the provider reports any scheduling. Per the spec, *"A date
   * without a clock time still counts as scheduled."*
   */
  readonly hasScheduledDate: boolean
}

/** The evidence keys a rule may require. One today; the union is the point. */
export const SourceEvidenceKey = {
  priority: 'priority',
} as const

export type SourceEvidenceKey =
  (typeof SourceEvidenceKey)[keyof typeof SourceEvidenceKey]

/** The closed condition catalog a ruleset row may test. */
export type ClassificationCondition =
  /** The current recurrence is one of the ruleset's series bases. */
  | { readonly type: 'seriesRecurrence' }
  /** The named evidence is absent (not merely falsy). */
  | { readonly type: 'evidenceMissing'; readonly key: SourceEvidenceKey }
  /** Priority evidence is present **and** non-zero. */
  | { readonly type: 'hasPriority' }
  /** The provider reports neither a date nor a time. */
  | { readonly type: 'unscheduled' }
  /** The table's terminal row. */
  | { readonly type: 'always' }

/** What a matching row yields. */
export type ClassificationOutcome =
  | { readonly type: 'kind'; readonly kind: EndeavorKind }
  | { readonly type: 'keepStoredKind' }

export interface ClassificationRule {
  readonly when: ClassificationCondition
  /**
   * Named `outcome` rather than the more natural `then`: an object literal
   * with a `then` property is a *thenable*, which `await` and dynamic
   * `import()` treat as a promise. A ruleset is plain data that may well be
   * passed through an async boundary, so the hazard is real and Biome's
   * `noThenProperty` rule is right to refuse it.
   */
  readonly outcome: ClassificationOutcome
}

/**
 * One provider's decision table.
 *
 * `seriesRecurrenceBases` is separate from the rows because it answers a
 * second question the rows do not: which recurrences mark a **series** whose
 * occurrences reconcile against each other (`SeriesReconciliation.ts`). For
 * Apple those are `daily` and `weekly` — *"any daily or weekly recurrence is a
 * Habit, regardless of interval, selected weekdays, priority, or
 * scheduling"* — and the order of the array is also the preference order used
 * when a provider hands back several rules at once.
 */
export interface ProviderClassificationRuleset {
  /** The `EndeavorHost` raw value this table classifies. */
  readonly provider: string
  readonly seriesRecurrenceBases: readonly RepeatBaseType[]
  readonly rules: readonly ClassificationRule[]
}

/** Convenience constructors, so a table reads as a table. */
export const classifyAs = (kind: EndeavorKind): ClassificationOutcome => ({
  type: 'kind',
  kind,
})

export const keepStoredKind = (): ClassificationOutcome => ({
  type: 'keepStoredKind',
})

/**
 * Whether `repeatConfig` marks a recurring **series** for this provider.
 * `null` (no recurrence) is never a series.
 */
export const isSeriesRecurrence = (
  ruleset: ProviderClassificationRuleset,
  repeatConfig: RepeatConfig | null,
): boolean =>
  repeatConfig !== null &&
  ruleset.seriesRecurrenceBases.includes(repeatConfig.base.type)

const evidenceValueOf = (
  evidence: SourceEvidence,
  key: SourceEvidenceKey,
): number | null => {
  switch (key) {
    case SourceEvidenceKey.priority:
      return evidence.priority
    default:
      return assertNever(key)
  }
}

const conditionHolds = (
  condition: ClassificationCondition,
  evidence: SourceEvidence,
  ruleset: ProviderClassificationRuleset,
): boolean => {
  switch (condition.type) {
    case 'seriesRecurrence':
      return (
        evidence.recurrenceBase !== null &&
        ruleset.seriesRecurrenceBases.includes(evidence.recurrenceBase)
      )
    case 'evidenceMissing':
      return evidenceValueOf(evidence, condition.key) === null
    case 'hasPriority':
      return evidence.priority !== null && evidence.priority !== 0
    case 'unscheduled':
      return !evidence.hasScheduledDate
    case 'always':
      return true
    default:
      return assertNever(condition)
  }
}

/**
 * Walk the table top to bottom and yield the first matching row's outcome.
 *
 * A table that matches nothing yields `storedKind` — defensive, since a
 * well-formed table ends in an `always` row, but a ruleset is data and data
 * can be incomplete. Failing open to the stored kind is the same conservative
 * answer the spec gives for missing evidence.
 */
export const classifyFromEvidence = (
  ruleset: ProviderClassificationRuleset,
  evidence: SourceEvidence,
  storedKind: EndeavorKind,
): EndeavorKind => {
  for (const rule of ruleset.rules) {
    if (!conditionHolds(rule.when, evidence, ruleset)) continue
    switch (rule.outcome.type) {
      case 'kind':
        return rule.outcome.kind
      case 'keepStoredKind':
        return storedKind
      default:
        return assertNever(rule.outcome)
    }
  }
  return storedKind
}

/**
 * `AppleReminderKindResolver.preferredRecurrence` — generalized.
 *
 * A provider may hand back several recurrence rules for one item (EventKit
 * exposes an array). Kro stores one, so picking by source ordering would
 * "accidentally lose habit evidence" — canon's words. Prefer the first rule
 * whose base appears earliest in `seriesRecurrenceBases` (for Apple: daily,
 * then weekly), falling back to the first rule supplied.
 */
export const preferredRecurrence = (
  ruleset: ProviderClassificationRuleset,
  recurrences: readonly RepeatConfig[],
): RepeatConfig | null => {
  for (const base of ruleset.seriesRecurrenceBases) {
    const match = recurrences.find(
      (recurrence) => recurrence.base.type === base,
    )
    if (match !== undefined) return match
  }
  return recurrences[0] ?? null
}
