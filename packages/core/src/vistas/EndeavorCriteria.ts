/**
 * `EndeavorGroupingCriteria` / `EndeavorSortingParameter` — canon
 * `KroCore/Model/Endeavor/EndeavorCriteria.swift`.
 *
 * The two axes a lens declares: how a screen's result is **grouped** (a
 * user-mutable preference, persisted in the snapshot) and how each group is
 * **sorted** (per-vista config, deliberately not persisted).
 *
 * ## Why these live under `vistas/` and not `domain/endeavor/`
 *
 * Canon files them beside the Endeavor model. #7 ported that folder and did not
 * bring them across — grouping was not in its scope — and `domain/**` is
 * another child's lane. They arrive here because `EndeavorsLens` cannot be
 * ported without them, and here is where every consumer of them already looks.
 * If a later child moves them down into `domain/endeavor/`, the re-export from
 * `@kro/core` is unchanged.
 *
 * ## What the port leaves out, and why
 *
 * Canon's `groups`, `comparison` and `EndeavorComparisonResult` — the functions
 * that actually *partition and order* a result set — are **not** here. Two of
 * the four grouping criteria (`dueSection`) resolve through `DaySection` and
 * `Endeavor.dueSection`, which are the Do lane's (#16) and do not exist yet;
 * porting half a grouping engine would strand it. What a vista needs today is
 * the **declaration** — which criterion this screen groups by — and that is
 * what this file carries. The engine belongs to whichever child first renders a
 * grouped list (#16 / #29).
 */
import { assertNever } from '../library/assertNever'

/** Criteria for grouping endeavors. */
export const EndeavorGroupingCriteria = {
  status: 'status',
  host: 'host',
  kind: 'kind',
  dueSection: 'dueSection',
} as const

export type EndeavorGroupingCriteria =
  (typeof EndeavorGroupingCriteria)[keyof typeof EndeavorGroupingCriteria]

/** Every grouping criterion, in canon declaration order. */
export const endeavorGroupingCriteriaCases: readonly EndeavorGroupingCriteria[] =
  [
    EndeavorGroupingCriteria.status,
    EndeavorGroupingCriteria.host,
    EndeavorGroupingCriteria.kind,
    EndeavorGroupingCriteria.dueSection,
  ]

/** `EndeavorGroupingCriteria(rawValue:)` — narrows a raw string, or `null`. */
export const endeavorGroupingCriteriaFromRawValue = (
  raw: string,
): EndeavorGroupingCriteria | null =>
  endeavorGroupingCriteriaCases.find((criteria) => criteria === raw) ?? null

/** `EndeavorGroupingCriteria.displayName` — the filter sheet's label. */
export const endeavorGroupingCriteriaDisplayName = (
  criteria: EndeavorGroupingCriteria,
): string => {
  switch (criteria) {
    case EndeavorGroupingCriteria.status:
      return 'Status'
    case EndeavorGroupingCriteria.host:
      return 'Host'
    case EndeavorGroupingCriteria.kind:
      return 'Kind'
    case EndeavorGroupingCriteria.dueSection:
      return 'Due Section'
    default:
      return assertNever(criteria)
  }
}

/**
 * `EndeavorGroupingCriteria.captionString` — the preposition a grouped row's
 * caption prefixes its group name with. **Trailing space included**, because
 * the caption is `captionString + groupName` and the space is the separator;
 * `status` and `dueSection` contribute none.
 */
export const endeavorGroupingCriteriaCaption = (
  criteria: EndeavorGroupingCriteria,
): string => {
  switch (criteria) {
    case EndeavorGroupingCriteria.host:
      return 'At '
    case EndeavorGroupingCriteria.kind:
      return 'As '
    case EndeavorGroupingCriteria.status:
    case EndeavorGroupingCriteria.dueSection:
      return ''
    default:
      return assertNever(criteria)
  }
}

/** Criteria for sorting endeavors. */
export const EndeavorSortingCriteria = {
  due: 'due',
  duration: 'duration',
  createdAt: 'createdAt',
  completedOn: 'completedOn',
} as const

export type EndeavorSortingCriteria =
  (typeof EndeavorSortingCriteria)[keyof typeof EndeavorSortingCriteria]

/** Every sorting criterion, in canon declaration order. */
export const endeavorSortingCriteriaCases: readonly EndeavorSortingCriteria[] =
  [
    EndeavorSortingCriteria.due,
    EndeavorSortingCriteria.duration,
    EndeavorSortingCriteria.createdAt,
    EndeavorSortingCriteria.completedOn,
  ]

/** `EndeavorSortingCriteria(rawValue:)` — narrows a raw string, or `null`. */
export const endeavorSortingCriteriaFromRawValue = (
  raw: string,
): EndeavorSortingCriteria | null =>
  endeavorSortingCriteriaCases.find((criteria) => criteria === raw) ?? null

/** `EndeavorSortingCriteria.displayName`. */
export const endeavorSortingCriteriaDisplayName = (
  criteria: EndeavorSortingCriteria,
): string => {
  switch (criteria) {
    case EndeavorSortingCriteria.due:
      return 'Due'
    case EndeavorSortingCriteria.duration:
      return 'Duration'
    case EndeavorSortingCriteria.createdAt:
      return 'Date Created'
    case EndeavorSortingCriteria.completedOn:
      return 'Date Completed'
    default:
      return assertNever(criteria)
  }
}

/**
 * `EndeavorSortingParameter` — one criterion plus a direction. Canon models it
 * as `.ascending(criteria)` / `.descending(criteria)`; a discriminated union on
 * `direction` says the same thing and keeps the criterion readable without a
 * pattern match.
 */
export interface EndeavorSortingParameter {
  readonly direction: 'ascending' | 'descending'
  readonly criteria: EndeavorSortingCriteria
}

/** `.ascending(criteria)`. */
export const ascendingBy = (
  criteria: EndeavorSortingCriteria,
): EndeavorSortingParameter => ({ direction: 'ascending', criteria })

/** `.descending(criteria)`. */
export const descendingBy = (
  criteria: EndeavorSortingCriteria,
): EndeavorSortingParameter => ({ direction: 'descending', criteria })
