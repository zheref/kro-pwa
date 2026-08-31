/**
 * `EndeavorsQuery` — canon `KroCore/Vistas/EndeavorsQuery.swift`.
 *
 * The first question a vista answers: **where does the data come from, and
 * what slice of it?** Immutable per screen — a user never edits a query; they
 * edit the lens. Every field is optional-as-`null`, and `null` means "no
 * constraint on this axis", which is a different statement from an empty set
 * ("constrain to nothing"). Canon relies on that distinction (`hosts: nil` =
 * every configured host), so the port keeps `null` and never collapses it to
 * `[]`.
 *
 * ## What the port changes, and why
 *
 * Swift `Set<T>?` becomes `ReadonlySet<T> | null`. The constructors accept any
 * iterable and normalize, so a registry entry reads `kinds: [EndeavorKind.task]`
 * exactly as canon's `kinds: [.task]` does, while the stored field stays a Set
 * with Set membership costs.
 *
 * The date range is **not** applied in memory. Canon's `postFilter` — the whole
 * of the in-memory narrowing — has no date term: the window is a *fetch*
 * parameter handed to the calendar clients, and the local mirror fetches
 * everything and lets kinds/predicates/the lens narrow. `resolveDateRange` is
 * therefore what `dateRange` is for; see `VistaFiltering`.
 */
import type { EndeavorHost } from '../domain/endeavor/EndeavorHost'
import { EndeavorHost as Host } from '../domain/endeavor/EndeavorHost'
import type { EndeavorKind } from '../domain/endeavor/EndeavorKind'
import type { EndeavorStatus } from '../domain/endeavor/EndeavorStatus'
import type { DateRangeSpec } from './DateRangeSpec'
import type { EndeavorPredicate } from './EndeavorPredicate'

export interface EndeavorsQuery {
  /**
   * Restrict the fan-out to these hosts. `null` = every configured host. An
   * endeavor is in the result if **any** of its hosts is in the set.
   */
  readonly hosts: ReadonlySet<EndeavorHost> | null
  /** Restrict to these kinds. `null` = all kinds. */
  readonly kinds: ReadonlySet<EndeavorKind> | null
  /** Restrict to these statuses. `null` = all statuses. */
  readonly statuses: ReadonlySet<EndeavorStatus> | null
  /**
   * Restrict to endeavors belonging to these list ids. `null` = no list
   * constraint. Only meaningful on hosts that surface lists; an endeavor with
   * no list never matches a list-scoped query.
   */
  readonly lists: ReadonlySet<string> | null
  /**
   * Time window to ask the hosts for. `null` = no time constraint — the local
   * store returns everything, while a calendar client still needs a window and
   * gets today's (see `resolveDateRange`).
   */
  readonly dateRange: DateRangeSpec | null
  /** Include closed / skipped endeavors in the result. */
  readonly includeArchived: boolean
  /**
   * Named boolean predicates the endeavor must **all** satisfy at post-fetch
   * time. `null` or empty = none.
   */
  readonly predicates: ReadonlySet<EndeavorPredicate> | null
}

/** Normalize an iterable (or `null`/absent) into a `ReadonlySet` or `null`. */
const toSet = <T>(
  values: Iterable<T> | null | undefined,
): ReadonlySet<T> | null =>
  values === null || values === undefined ? null : new Set(values)

export const makeEndeavorsQuery = (params?: {
  readonly hosts?: Iterable<EndeavorHost> | null
  readonly kinds?: Iterable<EndeavorKind> | null
  readonly statuses?: Iterable<EndeavorStatus> | null
  readonly lists?: Iterable<string> | null
  readonly dateRange?: DateRangeSpec | null
  readonly includeArchived?: boolean
  readonly predicates?: Iterable<EndeavorPredicate> | null
}): EndeavorsQuery => ({
  hosts: toSet(params?.hosts),
  kinds: toSet(params?.kinds),
  statuses: toSet(params?.statuses),
  lists: toSet(params?.lists),
  dateRange: params?.dateRange ?? null,
  includeArchived: params?.includeArchived ?? false,
  predicates: toSet(params?.predicates),
})

/** `EndeavorsQuery.everything` — every host, no filters. */
export const everythingEndeavorsQuery: EndeavorsQuery = makeEndeavorsQuery()

/**
 * `requesting(hosts:)` — a copy restricted to `hosts`, every other field
 * preserved. Used by a surface that fetches most hosts through the query client
 * but keeps one (Google Calendar) on a dedicated path.
 */
export const queryRequestingHosts = (
  query: EndeavorsQuery,
  hosts: Iterable<EndeavorHost> | null,
): EndeavorsQuery => ({ ...query, hosts: toSet(hosts) })

/**
 * `includingLocalMirrorSource()` — add the offline mirror when the query
 * explicitly refreshes one or more **external** hosts, so locally-enriched
 * fields win duplicate reconciliation without broadening an unrestricted query.
 *
 * A query with no host constraint, or one naming only Kro's own two stores, is
 * returned unchanged — that is canon's guard, and it is what stops the helper
 * from silently turning "every host" into "every host plus local".
 */
export const queryIncludingLocalMirrorSource = (
  query: EndeavorsQuery,
): EndeavorsQuery => {
  const hosts = query.hosts
  if (hosts === null) return query
  let hasExternal = false
  for (const host of hosts) {
    if (host !== Host.local && host !== Host.supabase) hasExternal = true
  }
  if (!hasExternal) return query
  return queryRequestingHosts(query, [...hosts, Host.local])
}
