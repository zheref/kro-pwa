/**
 * `EndeavorsLens` — canon `KroCore/Vistas/EndeavorsLens.swift`.
 *
 * The second question a vista answers: **how is the fetched set narrowed in
 * memory?** Which kinds, hosts, statuses, calendars and computed states the
 * user has hidden; what they typed in the search field; whether archived items
 * are visible; how the result is grouped.
 *
 * The lens is the **only** user-mutable component of a vista, and the only one
 * that persists across sessions (as an `EndeavorsLensSnapshot`). `sort` and
 * `exposes` sit on the same value but belong to the vista's static config: they
 * are never persisted and never edited by a user.
 *
 * ## What the port changes, and why
 *
 * - **`exposes` is a `Set`, not an `OptionSet`.** Swift's bit-flag `OptionSet`
 *   exists because a Swift `Set<Enum>` costs a hash per member; TypeScript has
 *   no such pressure, and a `Set<UserFilter>` reads at a call site
 *   (`exposes: [UserFilter.search, UserFilter.grouping]`) exactly as canon's
 *   array literal does — while a raw bitmask would make the persisted and
 *   logged forms unreadable.
 * - **Nothing mutates.** Canon's `apply(snapshot:)` is `mutating`; here
 *   `lensApplyingSnapshot` returns a new lens, matching the `with…` convention
 *   the Endeavor domain already uses. `sort` and `exposes` are carried through
 *   untouched — the snapshot has no business setting them.
 * - **Search folds case with `toLowerCase`, not the locale's rules.** Canon uses
 *   `localizedCaseInsensitiveContains`, which reads the user's locale. This
 *   tier has none, and a locale-sensitive fold would make a Turkish-locale
 *   runner match differently from an English one for the same saved query. The
 *   invariant fold is deterministic; if a locale-aware search is ever wanted it
 *   belongs at the presentation boundary that knows the locale.
 * - **`resolvedKind` is read as `kind`** — see `EndeavorComputedState` for the
 *   full reason; #12 owns the reconciliation that will make them differ.
 */
import type { Endeavor } from '../domain/endeavor/Endeavor'
import type { EndeavorHost } from '../domain/endeavor/EndeavorHost'
import type { EndeavorKind } from '../domain/endeavor/EndeavorKind'
import type { EndeavorStatus } from '../domain/endeavor/EndeavorStatus'
import { EndeavorStatus as Status } from '../domain/endeavor/EndeavorStatus'
import type { EndeavorComputedState } from './EndeavorComputedState'
import { matchesEndeavorComputedState } from './EndeavorComputedState'
import type {
  EndeavorGroupingCriteria,
  EndeavorSortingParameter,
} from './EndeavorCriteria'
import { EndeavorGroupingCriteria as Grouping } from './EndeavorCriteria'
import type { EndeavorsLensSnapshot } from './EndeavorsLensSnapshot'
import { makeEndeavorsLensSnapshot } from './EndeavorsLensSnapshot'

/**
 * Which user-facing toggles a vista exposes in its filter sheet. Immutable per
 * vista: it lives in the static config, so the Inbox's empty set is a statement
 * that the screen is read-only, not a user preference that could change.
 */
export const UserFilter = {
  kinds: 'kinds',
  hosts: 'hosts',
  statuses: 'statuses',
  calendars: 'calendars',
  search: 'search',
  showArchived: 'showArchived',
  grouping: 'grouping',
  /** Derived states — overdue / expired / completed-today. Used by Do. */
  computedStates: 'computedStates',
} as const

export type UserFilter = (typeof UserFilter)[keyof typeof UserFilter]

/** Every toggle, in canon declaration (bit) order. */
export const userFilters: readonly UserFilter[] = [
  UserFilter.kinds,
  UserFilter.hosts,
  UserFilter.statuses,
  UserFilter.calendars,
  UserFilter.search,
  UserFilter.showArchived,
  UserFilter.grouping,
  UserFilter.computedStates,
]

/** Narrows a raw string to a `UserFilter`, or `null`. */
export const userFilterFromRawValue = (raw: string): UserFilter | null =>
  userFilters.find((filter) => filter === raw) ?? null

/** `UserFilterDescriptor.all`. */
export const ALL_USER_FILTERS: ReadonlySet<UserFilter> = new Set(userFilters)

/** `UserFilterDescriptor.basics` — kinds, hosts and statuses. */
export const BASIC_USER_FILTERS: ReadonlySet<UserFilter> = new Set([
  UserFilter.kinds,
  UserFilter.hosts,
  UserFilter.statuses,
])

export interface EndeavorsLens {
  // -------------------------------------------------------- user-mutable
  readonly hiddenKinds: ReadonlySet<EndeavorKind>
  readonly hiddenHosts: ReadonlySet<EndeavorHost>
  readonly hiddenStatuses: ReadonlySet<EndeavorStatus>
  readonly hiddenComputedStates: ReadonlySet<EndeavorComputedState>
  readonly hiddenCalendarIds: ReadonlySet<string>
  readonly searchQuery: string
  readonly showArchived: boolean
  readonly grouping: EndeavorGroupingCriteria

  // ------------------------------------------ static, per-vista config
  /** Per-vista sort parameters. Not persisted — part of the vista config. */
  readonly sort: readonly EndeavorSortingParameter[]
  /** Which toggles the vista's filter sheet shows. Not persisted. */
  readonly exposes: ReadonlySet<UserFilter>
}

export const makeEndeavorsLens = (params?: {
  readonly hiddenKinds?: Iterable<EndeavorKind>
  readonly hiddenHosts?: Iterable<EndeavorHost>
  readonly hiddenStatuses?: Iterable<EndeavorStatus>
  readonly hiddenComputedStates?: Iterable<EndeavorComputedState>
  readonly hiddenCalendarIds?: Iterable<string>
  readonly searchQuery?: string
  readonly showArchived?: boolean
  readonly grouping?: EndeavorGroupingCriteria
  readonly sort?: readonly EndeavorSortingParameter[]
  readonly exposes?: Iterable<UserFilter>
}): EndeavorsLens => ({
  hiddenKinds: new Set(params?.hiddenKinds ?? []),
  hiddenHosts: new Set(params?.hiddenHosts ?? []),
  hiddenStatuses: new Set(params?.hiddenStatuses ?? []),
  hiddenComputedStates: new Set(params?.hiddenComputedStates ?? []),
  hiddenCalendarIds: new Set(params?.hiddenCalendarIds ?? []),
  searchQuery: params?.searchQuery ?? '',
  showArchived: params?.showArchived ?? false,
  grouping: params?.grouping ?? Grouping.status,
  sort: params?.sort ?? [],
  exposes:
    params?.exposes === undefined ? ALL_USER_FILTERS : new Set(params.exposes),
})

/** Whether the vista's filter sheet shows this toggle. */
export const lensExposes = (lens: EndeavorsLens, filter: UserFilter): boolean =>
  lens.exposes.has(filter)

/**
 * The lens as a predicate over one endeavor. Canon's `apply(to:now:)` order of
 * operations, term for term — the order is not cosmetic, because each term
 * narrows what the next one sees and the hidden-hosts rule below is the one
 * that surprises people:
 *
 * 1. **Hidden kinds** — excluded outright.
 * 2. **Hidden hosts** — excluded only when **every** host of `hostedBy` is
 *    hidden. A multi-host (shadowed) endeavor survives while at least one of
 *    its hosts is visible, which matches the user's mental model: hiding
 *    source X should not also hide items that additionally live in visible
 *    source Y. An endeavor with **no** host (in memory only) always survives.
 * 3. **Hidden statuses** — excluded outright.
 * 4. **Hidden computed states** — excluded if **any** hidden state matches,
 *    evaluated against `now`.
 * 5. **Archived** — closed / skipped excluded unless `showArchived`.
 * 6. **Search** — case-insensitive title contains.
 *
 * `hiddenCalendarIds` deliberately has no term: canon's `apply` does not filter
 * on it either. The calendar toggle narrows what the *calendar host* is asked
 * for, one layer up; the lens only carries the user's choice so it persists.
 */
export const lensPredicate =
  (lens: EndeavorsLens, now: Date) =>
  (endeavor: Endeavor): boolean => {
    if (lens.hiddenKinds.size > 0 && lens.hiddenKinds.has(endeavor.kind)) {
      return false
    }
    if (lens.hiddenHosts.size > 0 && endeavor.hostedBy.length > 0) {
      const everyHostHidden = endeavor.hostedBy.every((host) =>
        lens.hiddenHosts.has(host),
      )
      if (everyHostHidden) return false
    }
    if (
      lens.hiddenStatuses.size > 0 &&
      lens.hiddenStatuses.has(endeavor.status)
    ) {
      return false
    }
    if (lens.hiddenComputedStates.size > 0) {
      for (const state of lens.hiddenComputedStates) {
        if (matchesEndeavorComputedState(state, endeavor, now)) return false
      }
    }
    if (!lens.showArchived) {
      if (
        endeavor.status === Status.closed ||
        endeavor.status === Status.skipped
      ) {
        return false
      }
    }
    if (lens.searchQuery.length > 0) {
      const needle = lens.searchQuery.toLowerCase()
      if (!endeavor.title.toLowerCase().includes(needle)) return false
    }
    return true
  }

/**
 * `apply(to:now:)` — narrow a flat array. Returns a new array; it does not
 * group and does not sort, exactly as canon does not.
 */
export const applyLens = (
  lens: EndeavorsLens,
  endeavors: readonly Endeavor[],
  now: Date,
): readonly Endeavor[] => endeavors.filter(lensPredicate(lens, now))

/** `snapshot()` — the user-mutable subset, ready to persist. */
export const lensSnapshotOf = (lens: EndeavorsLens): EndeavorsLensSnapshot =>
  makeEndeavorsLensSnapshot({
    hiddenKinds: lens.hiddenKinds,
    hiddenHosts: lens.hiddenHosts,
    hiddenStatuses: lens.hiddenStatuses,
    hiddenComputedStates: lens.hiddenComputedStates,
    hiddenCalendarIds: lens.hiddenCalendarIds,
    searchQuery: lens.searchQuery,
    showArchived: lens.showArchived,
    grouping: lens.grouping,
  })

/**
 * `apply(snapshot:)` — a new lens carrying the restored user choices. `sort`
 * and `exposes` are untouched: they belong to the vista config, and a save that
 * could rewrite them would let a stale preference change which toggles a screen
 * offers.
 */
export const lensApplyingSnapshot = (
  lens: EndeavorsLens,
  snapshot: EndeavorsLensSnapshot,
): EndeavorsLens => ({
  hiddenKinds: snapshot.hiddenKinds,
  hiddenHosts: snapshot.hiddenHosts,
  hiddenStatuses: snapshot.hiddenStatuses,
  hiddenComputedStates: snapshot.hiddenComputedStates,
  hiddenCalendarIds: snapshot.hiddenCalendarIds,
  searchQuery: snapshot.searchQuery,
  showArchived: snapshot.showArchived,
  grouping: snapshot.grouping,
  sort: lens.sort,
  exposes: lens.exposes,
})
