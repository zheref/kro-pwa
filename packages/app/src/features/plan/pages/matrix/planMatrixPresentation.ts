/**
 * The priority matrix's display vocabulary — the port of
 * `KroUI/Plan/PriorityMatrixView.swift`'s `PlanMatrixQuadrant` enum.
 *
 * Pure: names, captions, order, tints and the two-way mapping onto the domain's
 * `EisenhowerQuadrant`. Nothing here renders, and nothing here classifies — the
 * quadrant an endeavor belongs to is `PlanMatrix.planMatrixQuadrant`'s answer
 * (KC-IS-#18), derived from due date and value and *"never stored as a separate
 * field"*.
 *
 * ## Two names for four quadrants, and both are canon's
 *
 * The domain enum reads `prioritize | decide | delegate | delete`; the surface
 * reads **Prioritize · Schedule · Delegate · Archive**. Canon carries exactly
 * this split — `PlanMatrixQuadrant.schedule.eisenhowerQuadrant == .decide`,
 * `.archive == .delete` — because the domain names the Eisenhower cell and the
 * surface names the action the user takes. Both are kept, and the mapping is one
 * pair of total functions rather than a rename at four call sites.
 *
 * ## The tints are ROLES, not the raw system colours
 *
 * Canon paints `.red`, `.blue`, `.orange`, `.gray`. Those are the raw SwiftUI
 * tints the design system's `endeavorProjections` header already refuses for
 * text ("2.0–3.5:1"), so each maps to the contrast-measured badge role that
 * carries the same hue. The quadrant fill is that role at a low alpha and the
 * label is a foreground role, so the pairing is one the token contract has
 * measured rather than a fresh colour invented here.
 */
import type { EisenhowerQuadrant } from '@kro/core'
import { EisenhowerQuadrant as Quadrant, assertNever } from '@kro/core'
import type { ColorRole } from '../../../../design/system/tokens/roles'
import { planListRowSymbol } from '../list/planListPresentation'

/** Canon's `PlanMatrixQuadrant` — the four destinations, in canon's names. */
export const PlanMatrixQuadrant = {
  prioritize: 'prioritize',
  schedule: 'schedule',
  delegate: 'delegate',
  archive: 'archive',
} as const

export type PlanMatrixQuadrant =
  (typeof PlanMatrixQuadrant)[keyof typeof PlanMatrixQuadrant]

/**
 * `allCases`, in canon's own board order — the reading order of the 2×2:
 * Prioritize · Schedule on the top row, Delegate · Archive on the bottom.
 */
export const planMatrixQuadrants: readonly PlanMatrixQuadrant[] = [
  PlanMatrixQuadrant.prioritize,
  PlanMatrixQuadrant.schedule,
  PlanMatrixQuadrant.delegate,
  PlanMatrixQuadrant.archive,
]

/** `PlanMatrixQuadrant.title`. */
export const planMatrixQuadrantTitle = (
  quadrant: PlanMatrixQuadrant,
): string => {
  switch (quadrant) {
    case PlanMatrixQuadrant.prioritize:
      return 'Prioritize'
    case PlanMatrixQuadrant.schedule:
      return 'Schedule'
    case PlanMatrixQuadrant.delegate:
      return 'Delegate'
    case PlanMatrixQuadrant.archive:
      return 'Archive'
    default:
      return assertNever(quadrant)
  }
}

/** `PlanMatrixQuadrant.caption` — the header's second line, verbatim. */
export const planMatrixQuadrantCaption = (
  quadrant: PlanMatrixQuadrant,
): string => {
  switch (quadrant) {
    case PlanMatrixQuadrant.prioritize:
      return 'Urgent · Important'
    case PlanMatrixQuadrant.schedule:
      return 'Important · Later'
    case PlanMatrixQuadrant.delegate:
      return 'Urgent · Lower impact'
    case PlanMatrixQuadrant.archive:
      return 'Lower impact · Later'
    default:
      return assertNever(quadrant)
  }
}

/** `PlanMatrixQuadrant.tint`, as a measured design-system role. */
export const planMatrixQuadrantTint = (
  quadrant: PlanMatrixQuadrant,
): ColorRole => {
  switch (quadrant) {
    case PlanMatrixQuadrant.prioritize:
      return 'badgeRed'
    case PlanMatrixQuadrant.schedule:
      return 'badgeBlue'
    case PlanMatrixQuadrant.delegate:
      return 'badgeOrange'
    case PlanMatrixQuadrant.archive:
      return 'badgeNeutral'
    default:
      return assertNever(quadrant)
  }
}

/**
 * Canon's `actionForeground(for:)` — *"Preserve Triage's exact quadrant tint
 * while keeping Archive controls legible against the tint's translucent fill in
 * both appearances."* Archive's neutral grey is the one that loses to its own
 * fill, so its controls take the ordinary foreground.
 */
export const planMatrixActionForeground = (
  quadrant: PlanMatrixQuadrant,
): ColorRole =>
  quadrant === PlanMatrixQuadrant.archive
    ? 'fore'
    : planMatrixQuadrantTint(quadrant)

/** `PlanMatrixQuadrant.eisenhowerQuadrant`. */
export const eisenhowerQuadrantFor = (
  quadrant: PlanMatrixQuadrant,
): EisenhowerQuadrant => {
  switch (quadrant) {
    case PlanMatrixQuadrant.prioritize:
      return Quadrant.prioritize
    case PlanMatrixQuadrant.schedule:
      return Quadrant.decide
    case PlanMatrixQuadrant.delegate:
      return Quadrant.delegate
    case PlanMatrixQuadrant.archive:
      return Quadrant.delete
    default:
      return assertNever(quadrant)
  }
}

/** `PlanMatrixQuadrant.init(_:)` — the inverse, and total in the same way. */
export const planMatrixQuadrantFor = (
  quadrant: EisenhowerQuadrant,
): PlanMatrixQuadrant => {
  switch (quadrant) {
    case Quadrant.prioritize:
      return PlanMatrixQuadrant.prioritize
    case Quadrant.decide:
      return PlanMatrixQuadrant.schedule
    case Quadrant.delegate:
      return PlanMatrixQuadrant.delegate
    case Quadrant.delete:
      return PlanMatrixQuadrant.archive
    default:
      return assertNever(quadrant)
  }
}

/**
 * The glyph a matrix card shows.
 *
 * Canon's `PlanMatrixItem` carries a `symbol` its selector supplies; this
 * domain's item (`PlanMatrix.PlanMatrixItem`) carries only an id, a title and
 * the derived quadrant, so the card derives the glyph from the title with the
 * SAME leading-emoji rule the list rows use — one endeavor therefore shows the
 * same face in both Plan destinations. The fallback differs on purpose: the
 * matrix admits only tasks and tickets, so an untitled-emoji card falls back to
 * a checkmark rather than the list's calendar.
 */
export const planMatrixItemSymbol = (
  title: string,
): { readonly symbol: string; readonly isGeneric: boolean } => {
  const lead = planListRowSymbol(title)
  return lead.isGeneric
    ? { symbol: 'checkmark.circle', isGeneric: true }
    : { symbol: lead.symbol, isGeneric: false }
}

/** Accessibility label for a quadrant's add control — canon's own string. */
export const planMatrixAddLabel = (quadrant: PlanMatrixQuadrant): string =>
  `Add to ${planMatrixQuadrantTitle(quadrant)}`

/** Canon's `"Add new endeavor to \(quadrant.title)"`. */
export const planMatrixAddNewLabel = (quadrant: PlanMatrixQuadrant): string =>
  `Add new endeavor to ${planMatrixQuadrantTitle(quadrant)}`

/** Canon's `"Add existing endeavor to \(quadrant.title)"`. */
export const planMatrixAddExistingLabel = (
  quadrant: PlanMatrixQuadrant,
): string => `Add existing endeavor to ${planMatrixQuadrantTitle(quadrant)}`
