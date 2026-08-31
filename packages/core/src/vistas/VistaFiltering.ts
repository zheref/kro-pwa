/**
 * Pure filter application — canon
 * `Kro/Dependencies/Vistas/EndeavorsQueryClient.swift`'s `postFilter(_:query:)`
 * and `resolve(dateRange:now:)`, lifted out of the application tier because
 * neither one touches a host.
 *
 * A vista narrows in two stages, and keeping them apart is what makes the empty
 * states distinguishable (`docs/Features/EndeavorsVista.md` names
 * "empty (no data)" and "empty (filter-driven)" as different states):
 *
 * 1. **The query** decides what was asked for. Fixed per screen.
 * 2. **The lens** decides what the user currently wants to see of it.
 *
 * ## The date range is not an in-memory term — deliberately
 *
 * `queryPredicate` carries no date filter, because canon's `postFilter` carries
 * none. The window is a **fetch** parameter: the calendar clients receive
 * `[start, end)` and return only what falls inside it, the Reminders client
 * fetches today's list natively, and the local mirror fetches everything and
 * lets kinds / predicates / the lens narrow. `resolveQueryWindow` is what a
 * fetching tier (#10, #16, #18) calls to get those bounds; it is not applied
 * here, and adding an in-memory window term would be a new business rule
 * rather than a port.
 */
import type { Endeavor } from '../domain/endeavor/Endeavor'
import { EndeavorStatus } from '../domain/endeavor/EndeavorStatus'
import type { ResolvedDateRange } from './DateRangeSpec'
import { resolveDateRange } from './DateRangeSpec'
import { applyLens, lensPredicate } from './EndeavorsLens'
import { matchesEndeavorPredicate } from './EndeavorPredicate'
import type { EndeavorsQuery } from './EndeavorsQuery'
import type { EndeavorsVista } from './EndeavorsVista'

/**
 * `postFilter(_:query:)` as a predicate, term for term and in canon's order:
 * kinds, statuses, hosts, lists, archived, predicates.
 *
 * Two rules read backwards from the hosts one in the lens, so they are worth
 * stating: a query's `hosts` matches when **any** of the endeavor's hosts is
 * requested (the lens hides only when *every* host is hidden), and an endeavor
 * with **no** list never satisfies a list-scoped query.
 *
 * A `null` set is "no constraint"; an **empty** set is also treated as no
 * constraint, matching canon's `if let kinds, !kinds.isEmpty` guards.
 */
export const queryPredicate =
  (query: EndeavorsQuery, now: Date) =>
  (endeavor: Endeavor): boolean => {
    const { kinds, statuses, hosts, lists, predicates } = query

    if (kinds !== null && kinds.size > 0 && !kinds.has(endeavor.kind)) {
      return false
    }
    if (
      statuses !== null &&
      statuses.size > 0 &&
      !statuses.has(endeavor.status)
    ) {
      return false
    }
    if (hosts !== null && hosts.size > 0) {
      const anyHostRequested = endeavor.hostedBy.some((host) => hosts.has(host))
      if (!anyHostRequested) return false
    }
    if (lists !== null && lists.size > 0) {
      const listId = endeavor.list?.id
      if (listId === undefined || !lists.has(listId)) return false
    }
    if (!query.includeArchived) {
      if (
        endeavor.status === EndeavorStatus.closed ||
        endeavor.status === EndeavorStatus.skipped
      ) {
        return false
      }
    }
    if (predicates !== null && predicates.size > 0) {
      for (const predicate of predicates) {
        if (!matchesEndeavorPredicate(predicate, endeavor, now)) return false
      }
    }
    return true
  }

/** `postFilter(_:query:)` over an array. Returns a new array. */
export const applyQuery = (
  query: EndeavorsQuery,
  endeavors: readonly Endeavor[],
  now: Date,
): readonly Endeavor[] => endeavors.filter(queryPredicate(query, now))

/**
 * The concrete `[start, end)` window this query asks its hosts for. A query
 * with no `dateRange` still resolves to today's window, because a calendar
 * client cannot fetch without one — canon's `case nil, .some(.today)` branch.
 */
export const resolveQueryWindow = (
  query: EndeavorsQuery,
  now: Date,
  options?: { readonly firstWeekday?: number },
): ResolvedDateRange => resolveDateRange(query.dateRange, now, options)

/**
 * The whole vista as one predicate: what its query asked for, narrowed by what
 * its lens currently shows.
 */
export const vistaPredicate = (vista: EndeavorsVista, now: Date) => {
  const matchesQuery = queryPredicate(vista.query, now)
  const matchesLens = lensPredicate(vista.lens, now)
  return (endeavor: Endeavor): boolean =>
    matchesQuery(endeavor) && matchesLens(endeavor)
}

/**
 * Query then lens, in that order. Equivalent to `vistaPredicate` as a filter,
 * and written as the two stages so a caller that needs the intermediate
 * "fetched but not yet narrowed" set can reach for `applyQuery` alone.
 */
export const applyVista = (
  vista: EndeavorsVista,
  endeavors: readonly Endeavor[],
  now: Date,
): readonly Endeavor[] =>
  applyLens(vista.lens, applyQuery(vista.query, endeavors, now), now)
