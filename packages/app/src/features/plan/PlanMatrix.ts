/**
 * Priority-matrix classification, assignment and admission — the port of
 * `KroCore/Domain/Plan/PlanMatrixResolution.swift` plus the admission rule from
 * `Kro/Application/Plan/PlanSelectors.swift`.
 *
 * ## The quadrant is never stored
 *
 * Canon's header states it outright: *"Matrix membership is derived from the
 * endeavor's due date and value; it is never stored as a separate field."* An
 * endeavor missing **either** due or value is untriaged and appears in no
 * quadrant at all — deliberately, rather than being read as "not urgent" or
 * "low value", which would silently populate Archive with everything the user
 * has not yet rated.
 *
 * | | value 4–5 | value 1–3 |
 * | --- | --- | --- |
 * | **due ≤ end of today** | Prioritize | Delegate |
 * | **due later** | Schedule (`decide`) | Archive (`delete`) |
 *
 * The two raw values that disagree with their labels — `decide` displays as
 * **Schedule**, `delete` as **Archive** — are `EisenhowerQuadrant`'s, already
 * ported in `@kro/core`, and are not renamed here.
 *
 * ## Assignment is deterministic, and asymmetric on purpose
 *
 * Dropping an endeavor into a quadrant writes the due date and value that make
 * the *derived* classification come out as that quadrant. Canon's rules, each
 * of which is a row in the exhaustive table this module's suite walks:
 *
 * - **Urgent destinations** (Prioritize, Delegate) keep an existing due date
 *   that already falls today; otherwise they land on **today at 23:59:59**.
 * - **Non-urgent destinations** (Schedule, Archive) keep an existing due date
 *   that is already in the future; `null`, overdue and today all resolve to
 *   **09:00 on the next Saturday strictly after today**.
 * - **Important destinations** raise the value to at least 4, preserving a 5.
 * - **Lower-impact destinations** preserve 1–3, reduce 4–5 to 2, and assign 2
 *   when there is no value at all.
 *
 * ## Admission is by resolved presentation kind, and nothing else
 *
 * Canon: *"Matrix admission is classification-only. Hosting determines where an
 * endeavor is read and mutated, never whether its resolved kind belongs on this
 * surface. Only actionable tasks and issue-tracker tickets qualify."*
 *
 * That is why this reads `resolvedKind` (#12's source-resolution pass) rather
 * than the stored `kind`: a daily Apple reminder that a stale local row still
 * calls a `task` resolves to a **habit** and must not appear, and the whole
 * point of `resolvedKind` is that *"the stored kind is a compatibility
 * fallback, not the final presentation kind."*
 *
 * ## Ported from the app tier, not the domain tier
 *
 * `planPresentationKind` and `isIssueTrackerTicket` are canon's
 * `Endeavor.nowDisplayType` / `Endeavor.isIssueTrackerTicket`, which live in
 * `Kro/Models/Endeavors.swift` — the **app** target, not `KroCore`. They are
 * ported into this lane because admission needs them and no shared home exists
 * yet; the Do feature (#16) needs the same buckets and may promote them to
 * `@kro/core` when it lands. Flagged in the PR Notes.
 */
import type {
  Endeavor,
  EisenhowerQuadrant,
  ReconciliationContext,
} from '@kro/core'
import {
  EisenhowerQuadrant as Quadrant,
  EndeavorKind,
  defaultReconciliationContext,
  hasBeenCompleted,
  quadrantIsImportant,
  quadrantIsUrgent,
  resolvedKind,
  withDue,
  withValue,
} from '@kro/core'
import { addingPlanDays, startOfPlanDay } from './PlanCalendar'

/** The value at or above which an endeavor counts as important. */
export const MATRIX_IMPORTANT_VALUE_FLOOR = 4

/** The value a lower-impact destination assigns when it cannot preserve one. */
export const MATRIX_LOWER_IMPACT_DEFAULT_VALUE = 2

/** The hour a non-urgent destination parks an endeavor on the next Saturday. */
export const MATRIX_WEEKEND_HOUR = 9

// ------------------------------------------------------- presentation kind

/**
 * `NowDisplayType` — the five buckets a surface sorts an endeavor into. Named
 * for the Do screen, which is where canon defines them.
 */
export const PlanPresentationKind = {
  events: 'events',
  habits: 'habits',
  reminders: 'reminders',
  tasks: 'tasks',
  tickets: 'tickets',
} as const

export type PlanPresentationKind =
  (typeof PlanPresentationKind)[keyof typeof PlanPresentationKind]

/**
 * `Endeavor.isIssueTrackerTicket` — provider-neutral until dedicated Jira /
 * GitHub hosts land. *"Their shadow source names are enough to preserve the
 * semantic bucket without pretending either integration exists today."*
 */
export const isIssueTrackerTicket = (endeavor: Endeavor): boolean =>
  (endeavor.shadows ?? []).some((shadow) => {
    const source = shadow.source.toLowerCase()
    return (
      source === 'jira' ||
      source === 'github' ||
      source === 'githubissues' ||
      source === 'github-issues'
    )
  })

/** `Endeavor.nowDisplayType`, computed from the **resolved** kind. */
export const planPresentationKind = (
  endeavor: Endeavor,
  context: ReconciliationContext = defaultReconciliationContext(),
): PlanPresentationKind => {
  switch (resolvedKind(endeavor, context)) {
    case EndeavorKind.calendarEvent:
      return PlanPresentationKind.events
    case EndeavorKind.habit:
      return PlanPresentationKind.habits
    case EndeavorKind.reminder:
      return PlanPresentationKind.reminders
    case EndeavorKind.task:
      return isIssueTrackerTicket(endeavor)
        ? PlanPresentationKind.tickets
        : PlanPresentationKind.tasks
    default:
      // The three meta kinds have no bucket of their own; canon's `default`
      // arm files them under tasks. Admission still refuses them, because the
      // `resolvedKind === task` guard below runs first.
      return PlanPresentationKind.tasks
  }
}

/**
 * `PlanSelectors.isEligibleMatrixKind` — both halves, in canon's order.
 *
 * The two conditions overlap by construction today (every `task` resolves to
 * `tasks` or `tickets`), and canon still writes both. Preserved rather than
 * simplified: the second is the statement of *what* is admitted, so a future
 * bucket added under `.task` would have to be added here consciously instead of
 * sliding in unnoticed.
 */
export const isEligibleMatrixKind = (
  endeavor: Endeavor,
  context: ReconciliationContext = defaultReconciliationContext(),
): boolean => {
  if (resolvedKind(endeavor, context) !== EndeavorKind.task) return false
  const presentation = planPresentationKind(endeavor, context)
  return (
    presentation === PlanPresentationKind.tasks ||
    presentation === PlanPresentationKind.tickets
  )
}

// ----------------------------------------------------------- classification

/**
 * `PlanMatrixResolution.quadrant(for:now:calendar:)` — the quadrant implied by
 * an endeavor's due date and value, or `null` when either is missing.
 */
export const planMatrixQuadrant = (
  endeavor: Endeavor,
  now: Date,
): EisenhowerQuadrant | null => {
  const { due, value } = endeavor
  if (due === null || value === null) return null

  const startOfTomorrow = addingPlanDays(now, 1)
  const isUrgent = due.getTime() < startOfTomorrow.getTime()
  const isImportant = value >= MATRIX_IMPORTANT_VALUE_FLOOR

  if (isUrgent) return isImportant ? Quadrant.prioritize : Quadrant.delegate
  return isImportant ? Quadrant.decide : Quadrant.delete
}

// -------------------------------------------------------------- assignment

/**
 * `followingWeekend(from:calendar:)` — 09:00 on the next Saturday **strictly
 * after** today. Saturday itself therefore resolves to the Saturday a week out,
 * which is canon's `if daysUntilSaturday == 0 { daysUntilSaturday = 7 }`.
 *
 * Canon computes from `Calendar.component(.weekday)`, which is 1-based with
 * Sunday = 1; `Date.prototype.getDay()` is 0-based with Sunday = 0. The
 * translation `(7 - (getDay() + 1) + 7) % 7` folds to `(13 - getDay()) % 7`,
 * which is what is written below.
 */
export const followingWeekend = (now: Date): Date => {
  const startOfToday = startOfPlanDay(now)
  let daysUntilSaturday = (13 - startOfToday.getDay()) % 7
  if (daysUntilSaturday === 0) daysUntilSaturday = 7
  const nextSaturday = addingPlanDays(startOfToday, daysUntilSaturday)
  nextSaturday.setHours(MATRIX_WEEKEND_HOUR, 0, 0, 0)
  return nextSaturday
}

/** The due date `quadrant` writes, given what the endeavor already carries. */
export const planMatrixResolvedDue = (
  existingDue: Date | null,
  quadrant: EisenhowerQuadrant,
  now: Date,
): Date => {
  const startOfToday = startOfPlanDay(now)
  const startOfTomorrow = addingPlanDays(startOfToday, 1)

  if (quadrantIsUrgent(quadrant)) {
    if (
      existingDue !== null &&
      existingDue.getTime() >= startOfToday.getTime() &&
      existingDue.getTime() < startOfTomorrow.getTime()
    ) {
      return existingDue
    }
    // `startOfTomorrow - 1 second` — today at 23:59:59, exactly as canon's
    // `calendar.date(byAdding: .second, value: -1, to: startOfTomorrow)`.
    return new Date(startOfTomorrow.getTime() - 1000)
  }

  if (
    existingDue !== null &&
    existingDue.getTime() >= startOfTomorrow.getTime()
  ) {
    return existingDue
  }
  return followingWeekend(now)
}

/** The value `quadrant` writes, given what the endeavor already carries. */
export const planMatrixResolvedValue = (
  existingValue: number | null,
  quadrant: EisenhowerQuadrant,
): number => {
  if (quadrantIsImportant(quadrant)) {
    return Math.max(MATRIX_IMPORTANT_VALUE_FLOOR, existingValue ?? 0)
  }
  if (existingValue !== null && existingValue <= 3) return existingValue
  return MATRIX_LOWER_IMPACT_DEFAULT_VALUE
}

/**
 * `PlanMatrixResolution.resolve(_:into:now:calendar:)` — a copy whose derived
 * classification is `quadrant`.
 *
 * Canon assigns `resolved.value` directly on a `var` copy. Here the write goes
 * through `@kro/core`'s `withDue` / `withValue`, which are **guarded** by the
 * kind-relevance matrix. For every endeavor the matrix admits that is a no-op
 * difference — `due` and `value` are both editable for `task` and `reminder`.
 * A row stored as a `calendarEvent` has no editable `due`, and would keep its
 * old one; such a row cannot reach here, because admission demands a resolved
 * kind of `task` and a calendar event only resolves to one when a provider
 * ruleset reclassifies it. Named in the PR Notes rather than worked around.
 */
export const resolveIntoQuadrant = (
  endeavor: Endeavor,
  quadrant: EisenhowerQuadrant,
  now: Date,
): Endeavor => {
  const due = planMatrixResolvedDue(endeavor.due, quadrant, now)
  const value = planMatrixResolvedValue(endeavor.value, quadrant)
  return withValue(withDue(endeavor, due), value)
}

// ------------------------------------------------------------------- items

/** One card on the matrix surface. */
export interface PlanMatrixItem {
  readonly id: string
  readonly title: string
  readonly quadrant: EisenhowerQuadrant
}

export interface PlanMatrixOptions {
  readonly now: Date
  readonly context?: ReconciliationContext
}

/**
 * Whether one endeavor belongs on the matrix at all: open, admissible by
 * resolved kind, and carrying both a due date and a value.
 */
export const planMatrixAdmits = (
  endeavor: Endeavor,
  options: PlanMatrixOptions,
): boolean =>
  !hasBeenCompleted(endeavor) &&
  isEligibleMatrixKind(endeavor, options.context) &&
  planMatrixQuadrant(endeavor, options.now) !== null

/**
 * `PlanSelectors.priorityMatrixItemsSelector` — the admitted set, each carrying
 * its derived quadrant. Input order is preserved, so a reconciled fan-out does
 * not repaint the board on every refresh.
 */
export const planMatrixItems = (
  endeavors: readonly Endeavor[],
  options: PlanMatrixOptions,
): readonly PlanMatrixItem[] => {
  const items: PlanMatrixItem[] = []
  for (const endeavor of endeavors) {
    if (hasBeenCompleted(endeavor)) continue
    if (!isEligibleMatrixKind(endeavor, options.context)) continue
    const quadrant = planMatrixQuadrant(endeavor, options.now)
    if (quadrant === null) continue
    items.push({ id: endeavor.id, title: endeavor.title, quadrant })
  }
  return items
}

/**
 * `PlanSelectors.availableMatrixPickerEndeavorsSelector` — everything already
 * fetched that a user may drop into a quadrant. Unlike `planMatrixItems` this
 * does **not** require a due date and value: assigning them is the whole point
 * of the picker.
 */
export const planMatrixPickerCandidates = (
  endeavors: readonly Endeavor[],
  options: PlanMatrixOptions,
): readonly Endeavor[] =>
  endeavors.filter(
    (endeavor) =>
      !hasBeenCompleted(endeavor) &&
      isEligibleMatrixKind(endeavor, options.context),
  )
