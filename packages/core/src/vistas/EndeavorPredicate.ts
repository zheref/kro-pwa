/**
 * `EndeavorPredicate` — canon `KroCore/Vistas/EndeavorPredicate.swift`.
 *
 * The closed catalog of named boolean predicates a vista's query may demand at
 * post-fetch time. Canon's Phase 0 D3 decision is the whole point of the type:
 * a closed enum rather than an arbitrary `KeyPath<Endeavor, Bool>` escape
 * hatch, so **every** custom predicate is reviewable and appears by name in the
 * registry. When a new vista needs one, add a case here — never broaden the API.
 *
 * ## What the port changes, and why
 *
 * Canon's `matches(_:)` reads `endeavor.isDueToday` and friends, which consult
 * `Date()` inside the property. This tier has no ambient clock (`types: []`),
 * and `EndeavorComputed` already threads `now` through every time-relative
 * predicate, so `matchesEndeavorPredicate` takes it as a parameter. `isCompleted`
 * ignores it — it reads a stored timestamp, not the clock.
 */
import {
  isCompleted,
  isDueSoon,
  isDueToday,
  isRecent,
} from '../domain/endeavor/EndeavorComputed'
import type { Endeavor } from '../domain/endeavor/Endeavor'
import { assertNever } from '../library/assertNever'

export const EndeavorPredicate = {
  /** `endeavor.due` falls on today's calendar day. */
  isDueToday: 'isDueToday',
  /** `endeavor.due` is within the next 72 hours. */
  isDueSoon: 'isDueSoon',
  /** `endeavor.completed != null`. */
  isCompleted: 'isCompleted',
  /** `endeavor.isRecent` — created within the last 48 hours. */
  isRecent: 'isRecent',
} as const

export type EndeavorPredicate =
  (typeof EndeavorPredicate)[keyof typeof EndeavorPredicate]

/** `EndeavorPredicate.allCases`, in canon declaration order. */
export const endeavorPredicates: readonly EndeavorPredicate[] = [
  EndeavorPredicate.isDueToday,
  EndeavorPredicate.isDueSoon,
  EndeavorPredicate.isCompleted,
  EndeavorPredicate.isRecent,
]

/** `EndeavorPredicate(rawValue:)` — narrows a raw string, or `null`. */
export const endeavorPredicateFromRawValue = (
  raw: string,
): EndeavorPredicate | null =>
  endeavorPredicates.find((predicate) => predicate === raw) ?? null

/** `EndeavorPredicate.matches(_:)`, with the clock passed in. */
export const matchesEndeavorPredicate = (
  predicate: EndeavorPredicate,
  endeavor: Endeavor,
  now: Date,
): boolean => {
  switch (predicate) {
    case EndeavorPredicate.isDueToday:
      return isDueToday(endeavor, now)
    case EndeavorPredicate.isDueSoon:
      return isDueSoon(endeavor, now)
    case EndeavorPredicate.isCompleted:
      return isCompleted(endeavor)
    case EndeavorPredicate.isRecent:
      return isRecent(endeavor, now)
    default:
      return assertNever(predicate)
  }
}
