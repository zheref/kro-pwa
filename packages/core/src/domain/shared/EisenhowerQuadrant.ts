/**
 * `EisenhowerQuadrant` — canon `KroCore/Domain/Triage/EisenhowerQuadrant.swift`.
 *
 * The urgency × importance classification the Triage feature (#25/#26) writes
 * onto an endeavor. Lives under `domain/shared/` rather than a `domain/triage/`
 * of its own because #7's file lane is `domain/endeavor/**` +
 * `domain/shared/**`, and the vocabulary is shared: Plan's priority-matrix
 * mode (#20) reads it too.
 *
 * Note the two places where the case name and the label deliberately disagree
 * — `decide` displays as **Schedule** and `delete` as **Archive**. The raw
 * values are the wire form and must not be renamed to match the labels.
 */
import { assertNever } from '../../library/assertNever'
import { type IconRepresentation, glyphIcon } from './IconRepresentation'

export const EisenhowerQuadrant = {
  prioritize: 'prioritize',
  decide: 'decide',
  delegate: 'delegate',
  delete: 'delete',
} as const

export type EisenhowerQuadrant =
  (typeof EisenhowerQuadrant)[keyof typeof EisenhowerQuadrant]

/** `EisenhowerQuadrant.allCases`, in canon declaration order. */
export const eisenhowerQuadrants: readonly EisenhowerQuadrant[] = [
  EisenhowerQuadrant.prioritize,
  EisenhowerQuadrant.decide,
  EisenhowerQuadrant.delegate,
  EisenhowerQuadrant.delete,
]

/**
 * Canon's `defaultTriageDurationOptionsMinutes` — the duration chips the
 * Triage screen offers.
 */
export const defaultTriageDurationOptionsMinutes: readonly number[] = [
  1, 5, 15, 25, 45, 60, 90, 120, 180,
]

/** `displayName` — note `decide` → "Schedule", `delete` → "Archive". */
export const quadrantDisplayName = (quadrant: EisenhowerQuadrant): string => {
  switch (quadrant) {
    case EisenhowerQuadrant.prioritize:
      return 'Prioritize'
    case EisenhowerQuadrant.decide:
      return 'Schedule'
    case EisenhowerQuadrant.delegate:
      return 'Delegate'
    case EisenhowerQuadrant.delete:
      return 'Archive'
    default:
      return assertNever(quadrant)
  }
}

/**
 * `isImportant` — the **Important row** (Prioritize / Schedule). Drives the
 * value↔importance auto-link: a value ≥ 3 promotes the quadrant into this row.
 */
export const quadrantIsImportant = (quadrant: EisenhowerQuadrant): boolean =>
  quadrant === EisenhowerQuadrant.prioritize ||
  quadrant === EisenhowerQuadrant.decide

/**
 * `isUrgent` — the **Urgent column** (Prioritize / Delegate). Picking an
 * urgent quadrant forces a scheduled date and a matching expiry.
 */
export const quadrantIsUrgent = (quadrant: EisenhowerQuadrant): boolean =>
  quadrant === EisenhowerQuadrant.prioritize ||
  quadrant === EisenhowerQuadrant.delegate

/**
 * `importantSibling` — the Important-row quadrant that preserves this one's
 * urgency. Urgent stays urgent (`delegate` → `prioritize`); not-urgent stays
 * not-urgent (`delete` → `decide`).
 */
export const quadrantImportantSibling = (
  quadrant: EisenhowerQuadrant,
): EisenhowerQuadrant => {
  switch (quadrant) {
    case EisenhowerQuadrant.prioritize:
      return EisenhowerQuadrant.prioritize
    case EisenhowerQuadrant.decide:
      return EisenhowerQuadrant.decide
    case EisenhowerQuadrant.delegate:
      return EisenhowerQuadrant.prioritize
    case EisenhowerQuadrant.delete:
      return EisenhowerQuadrant.decide
    default:
      return assertNever(quadrant)
  }
}

/** `caption` — the one-line explanation shown under a matrix tile. */
export const quadrantCaption = (quadrant: EisenhowerQuadrant): string => {
  switch (quadrant) {
    case EisenhowerQuadrant.prioritize:
      return 'Urgent · Important'
    case EisenhowerQuadrant.decide:
      return 'Important · Not Urgent'
    case EisenhowerQuadrant.delegate:
      return 'Urgent · Not Important'
    case EisenhowerQuadrant.delete:
      return 'Neither'
    default:
      return assertNever(quadrant)
  }
}

/** `glyphName` — the SF Symbol the matrix tile uses (see `IconRepresentation`). */
export const quadrantIcon = (
  quadrant: EisenhowerQuadrant,
): IconRepresentation => {
  switch (quadrant) {
    case EisenhowerQuadrant.prioritize:
      return glyphIcon('bolt.fill')
    case EisenhowerQuadrant.decide:
      return glyphIcon('calendar')
    case EisenhowerQuadrant.delegate:
      return glyphIcon('person.2.fill')
    case EisenhowerQuadrant.delete:
      return glyphIcon('trash')
    default:
      return assertNever(quadrant)
  }
}

/**
 * `keepsEndeavor` — whether picking this quadrant leaves the endeavor on the
 * active list. Only `delete` (displayed as **Archive**) takes it off.
 */
export const quadrantKeepsEndeavor = (quadrant: EisenhowerQuadrant): boolean =>
  quadrant !== EisenhowerQuadrant.delete
