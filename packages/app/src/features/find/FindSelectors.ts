/**
 * Find/Tasks Selectors (`RC-5`, `RC-20`) — canon's `FindSelectors.swift` and
 * `TasksSelectors.swift`, plus the narrowing half of `TasksShifters.applyReprocess`.
 *
 * Every derived read lives here, built with `createSelector` over `RootState`
 * alone. **None reads a clock**: the reducer parked the instant it installed
 * against in `clockAnchor`, and the predicates read it as ordinary state — which
 * is what canon's own `FindSelectors` note says it would have to do the moment a
 * Find vista exposed computed states.
 *
 * ## The two surfaces narrow differently, and that is canon's shape
 *
 * - **Find** applies the **lens only**. Canon's `displayedEndeavorsSelector`
 *   pipes `allEndeavors` through `vista.lens.apply(to:)` and nothing else: the
 *   query was already executed by the query client at fetch time. Re-applying it
 *   in memory would break Show Archived, because `everything`'s
 *   `includeArchived` is `false` and would strip closed rows *before* the lens
 *   could reveal them.
 * - **All Tasks** applies the query's **kinds / lists / predicates** and then
 *   the lens — exactly canon's `applyReprocess` steps 2 and 3, which likewise
 *   omit the query's status and archive terms for the same reason.
 *
 * That is why `@kro/core`'s `applyQuery` (which applies *every* term, including
 * `includeArchived`) is deliberately not used here: it is the fetch-side filter,
 * and this is the in-memory one.
 */
import {
  type Endeavor,
  type EndeavorCapabilities,
  type EndeavorGroupingCriteria,
  type EndeavorHost,
  type EndeavorKind,
  type EndeavorStatus,
  type EndeavorsVista,
  EndeavorsVistas,
  applyLens,
  endeavorHosts,
  endeavorKinds,
  endeavorStatuses,
  lensApplyingSnapshot,
  makeEndeavorsLensSnapshot,
  matchesEndeavorPredicate,
  resolveEndeavorCapabilities,
  vistaWithLens,
} from '@kro/core'
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../library/store'
import type { EndeavorRowAdapter } from './FindAdapters'
import { endeavorRowAdapters } from './FindAdapters'
import type { FindException } from './FindException'
import type { EndeavorRowGroup } from './FindGrouping'
import { groupEndeavors, limitGroups } from './FindGrouping'
import type { EndeavorIntent } from './FindOperations'
import type {
  FindEmptyState,
  FindLensState,
  FindState,
  FindSurfaceState,
  TasksVistaSelection,
} from './FindState'

const selectFindSlice = (state: RootState): FindState => state.find

const selectFindSurface = createSelector(
  [selectFindSlice],
  (slice): FindSurfaceState => slice.find,
)

const selectTasksSurface = createSelector(
  [selectFindSlice],
  (slice): FindSurfaceState => slice.tasks,
)

const selectTasksSelection = createSelector(
  [selectFindSlice],
  (slice): TasksVistaSelection => slice.tasksSelection,
)

/**
 * The instant every predicate is evaluated against.
 *
 * Before the first install there is nothing to classify, so the epoch stands in
 * — a constant, not a clock read, which is what keeps this tier of Selectors
 * pure. The pool is empty at that point, so no predicate ever sees it.
 */
const anchorOf = (surface: FindSurfaceState): Date =>
  surface.clockAnchor ?? new Date(0)

/** The registry vista a `.tasks*` selection names. */
const tasksVistaFor = (selection: TasksVistaSelection): EndeavorsVista => {
  switch (selection.kind) {
    case 'today':
      return EndeavorsVistas.tasksToday
    case 'list':
      return EndeavorsVistas.tasksForList(selection.listId)
    case 'search':
      return EndeavorsVistas.tasksForSearch(selection.query)
    default:
      return EndeavorsVistas.tasksDefault
  }
}

/**
 * Materialises the real vista: the registry's own defaults, carrying the user's
 * stored lens. `sort` and `exposes` survive untouched, so a saved preference can
 * never change which toggles a screen offers.
 */
const vistaCarrying = (
  base: EndeavorsVista,
  lens: FindLensState,
): EndeavorsVista =>
  vistaWithLens(
    base,
    lensApplyingSnapshot(base.lens, makeEndeavorsLensSnapshot(lens)),
  )

// ---------------------------------------------------------------------------
// Vistas and capabilities
// ---------------------------------------------------------------------------

export const selectFindVista = createSelector(
  [selectFindSurface],
  (surface): EndeavorsVista =>
    vistaCarrying(EndeavorsVistas.find, surface.lens),
)

export const selectTasksVista = createSelector(
  [selectTasksSurface, selectTasksSelection],
  (surface, selection): EndeavorsVista =>
    vistaCarrying(tasksVistaFor(selection), surface.lens),
)

/**
 * The Find vista's capabilities **after** flag gating.
 *
 * `resolveEndeavorCapabilities` drops every binding whose `requires` flag is
 * off, so the `viewDetail` tap simply does not exist until `endeavorDetail` is
 * enabled — canon's *"Operations gated by a feature flag the user doesn't have
 * are simply not shown"*, applied once, here, rather than per gesture in a view.
 */
export const selectFindCapabilities = createSelector(
  [selectFindVista, selectFindSurface],
  (vista, surface): EndeavorCapabilities =>
    resolveEndeavorCapabilities(vista.capabilities, (flag) =>
      surface.enabledFlags.includes(flag),
    ),
)

export const selectTasksCapabilities = createSelector(
  [selectTasksVista, selectTasksSurface],
  (vista, surface): EndeavorCapabilities =>
    resolveEndeavorCapabilities(vista.capabilities, (flag) =>
      surface.enabledFlags.includes(flag),
    ),
)

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export const selectIsFindLoading = createSelector(
  [selectFindSurface],
  (surface) => surface.load.kind === 'loading',
)

export const selectFindException = createSelector(
  [selectFindSurface],
  (surface): FindException | null =>
    surface.load.kind === 'failed' ? surface.load.exception : null,
)

export const selectIsTasksLoading = createSelector(
  [selectTasksSurface],
  (surface) => surface.load.kind === 'loading',
)

export const selectTasksException = createSelector(
  [selectTasksSurface],
  (surface): FindException | null =>
    surface.load.kind === 'failed' ? surface.load.exception : null,
)

/** True until the persisted lens has landed — canon's `isLoadingLens`. */
export const selectIsFindLensLoading = createSelector(
  [selectFindSurface],
  (surface) => !surface.isLensRestored,
)

// ---------------------------------------------------------------------------
// Filter chips
// ---------------------------------------------------------------------------

/**
 * The kinds the user is currently **showing** — the complement of the lens's
 * hidden set, which is what a chip's selected state renders from.
 */
export const selectFindSelectedKinds = createSelector(
  [selectFindSurface],
  (surface): readonly EndeavorKind[] =>
    endeavorKinds.filter((kind) => !surface.lens.hiddenKinds.includes(kind)),
)

export const selectFindSelectedHosts = createSelector(
  [selectFindSurface],
  (surface): readonly EndeavorHost[] =>
    endeavorHosts.filter((host) => !surface.lens.hiddenHosts.includes(host)),
)

export const selectFindSelectedStatuses = createSelector(
  [selectFindSurface],
  (surface): readonly EndeavorStatus[] =>
    endeavorStatuses.filter(
      (status) => !surface.lens.hiddenStatuses.includes(status),
    ),
)

export const selectFindShowArchived = createSelector(
  [selectFindSurface],
  (surface) => surface.lens.showArchived,
)

export const selectFindSearchQuery = createSelector(
  [selectFindSurface],
  (surface) => surface.lens.searchQuery,
)

/**
 * Canon's `noFiltersSelectedSelector`: the user has hidden **every** kind,
 * **every** host and **every** status, and archived display is off. The
 * displayed list short-circuits to empty in that case, and the surface says
 * "No Filters Selected" rather than "No Results".
 */
export const selectFindHasNoFiltersSelected = createSelector(
  [
    selectFindSelectedKinds,
    selectFindSelectedHosts,
    selectFindSelectedStatuses,
    selectFindShowArchived,
  ],
  (kinds, hosts, statuses, showArchived) =>
    kinds.length === 0 &&
    hosts.length === 0 &&
    statuses.length === 0 &&
    !showArchived,
)

/** Canon's `allKindsHiddenSelector` — every selectable kind is hidden. */
export const selectFindAreAllKindsHidden = createSelector(
  [selectFindSurface],
  (surface) => surface.lens.hiddenKinds.length === endeavorKinds.length,
)

// ---------------------------------------------------------------------------
// Find's displayed rows
// ---------------------------------------------------------------------------

/**
 * Canon's Find sort: `start ?? due` ascending, **nil dates trailing**. A row
 * with neither keeps its relative order against another such row.
 */
const findSortKey = (endeavor: Endeavor): number | null =>
  (endeavor.start ?? endeavor.due)?.getTime() ?? null

const sortForFind = (endeavors: readonly Endeavor[]): readonly Endeavor[] =>
  [...endeavors].sort((left, right) => {
    const leftKey = findSortKey(left)
    const rightKey = findSortKey(right)
    if (leftKey === null && rightKey === null) return 0
    if (leftKey === null) return 1
    if (rightKey === null) return -1
    return leftKey - rightKey
  })

/**
 * The Find list: lens-narrowed, then sorted. Short-circuits to empty when every
 * filter is off, which is what preserves canon's pre-migration semantics.
 */
export const selectFindRows = createSelector(
  [selectFindSurface, selectFindVista, selectFindHasNoFiltersSelected],
  (surface, vista, noFilters): readonly Endeavor[] => {
    if (noFilters) return []
    return sortForFind(
      applyLens(vista.lens, surface.endeavors, anchorOf(surface)),
    )
  },
)

/** The count the ellipsis menu's "Delete all visible (N)" label shows. */
export const selectFindVisibleCount = createSelector(
  [selectFindRows],
  (rows) => rows.length,
)

/** Exactly the ids a bulk operation applies to — "all **visible**". */
export const selectFindVisibleIds = createSelector(
  [selectFindRows],
  (rows): readonly string[] => rows.map((endeavor) => endeavor.id),
)

/** The rows, adapted against the flag-resolved capabilities (`#30` renders these). */
export const selectFindRowAdapters = createSelector(
  [selectFindRows, selectFindCapabilities],
  (rows, capabilities): readonly EndeavorRowAdapter[] =>
    endeavorRowAdapters(rows, capabilities),
)

/**
 * Which empty state Find is in — canon's `FindView.mainContent` branch order,
 * preserved exactly: no data at all, then no filters, then no search results,
 * then filtered-out.
 */
export const selectFindEmptyState = createSelector(
  [
    selectFindSurface,
    selectFindRows,
    selectFindHasNoFiltersSelected,
    selectFindSearchQuery,
  ],
  (surface, rows, noFilters, query): FindEmptyState | null => {
    if (surface.endeavors.length === 0) return { kind: 'noData' }
    if (noFilters) return { kind: 'noFilters' }
    if (rows.length > 0) return null
    if (query.length > 0) return { kind: 'noResults', query }
    return { kind: 'filteredOut' }
  },
)

// ---------------------------------------------------------------------------
// All Tasks' groups
// ---------------------------------------------------------------------------

/**
 * Canon's `applyReprocess` step 2 — the query's **kinds, lists and predicates**
 * applied in memory. Statuses, hosts and `includeArchived` are deliberately not
 * applied: they belong to the fetch, and applying `includeArchived` here would
 * hide archived rows before Show Archived could reveal them.
 */
const applyTasksQueryPostFilter = (
  vista: EndeavorsVista,
  endeavors: readonly Endeavor[],
  now: Date,
): readonly Endeavor[] =>
  endeavors.filter((endeavor) => {
    const { kinds, lists, predicates } = vista.query
    if (kinds !== null && kinds.size > 0 && !kinds.has(endeavor.kind)) {
      return false
    }
    if (lists !== null && lists.size > 0) {
      const listId = endeavor.list?.id
      if (listId === undefined || !lists.has(listId)) return false
    }
    if (predicates !== null && predicates.size > 0) {
      for (const predicate of predicates) {
        if (!matchesEndeavorPredicate(predicate, endeavor, now)) return false
      }
    }
    return true
  })

/** The narrowed task rows, before grouping. */
export const selectTasksRows = createSelector(
  [selectTasksSurface, selectTasksVista],
  (surface, vista): readonly Endeavor[] => {
    const now = anchorOf(surface)
    return applyLens(
      vista.lens,
      applyTasksQueryPostFilter(vista, surface.endeavors, now),
      now,
    )
  },
)

export const selectTasksGrouping = createSelector(
  [selectTasksSurface],
  (surface): EndeavorGroupingCriteria => surface.lens.grouping,
)

export const selectTasksExpandedGroupKey = createSelector(
  [selectTasksSurface],
  (surface): string | null => surface.expandedGroupKey,
)

export const selectTasksSearchQuery = createSelector(
  [selectTasksSurface],
  (surface) => surface.lens.searchQuery,
)

/**
 * The grouped, sorted, display-limited list.
 *
 * The limit is the vista's own `presentation.itemLimit` — 7 for every Tasks
 * variant — and it applies only while **no** group is expanded, which is canon's
 * rule: `applyReprocess` skips `limited(by:)` entirely once a group has focus.
 */
export const selectTasksGroups = createSelector(
  [selectTasksRows, selectTasksVista, selectTasksExpandedGroupKey],
  (rows, vista, expandedGroupKey): readonly EndeavorRowGroup[] =>
    limitGroups(
      groupEndeavors(rows, vista.lens.grouping),
      vista.presentation.itemLimit,
      expandedGroupKey,
    ),
)

/** Every group's rows, adapted — one adapter per visible row. */
export const selectTasksGroupAdapters = createSelector(
  [selectTasksGroups, selectTasksCapabilities],
  (
    groups,
    capabilities,
  ): readonly {
    readonly group: EndeavorRowGroup
    readonly rows: readonly EndeavorRowAdapter[]
  }[] =>
    groups.map((group) => ({
      group,
      rows: endeavorRowAdapters(group.endeavors, capabilities),
    })),
)

/** Which empty state All Tasks is in. Same branch order as Find's. */
export const selectTasksEmptyState = createSelector(
  [selectTasksSurface, selectTasksRows, selectTasksSearchQuery],
  (surface, rows, query): FindEmptyState | null => {
    if (surface.endeavors.length === 0) return { kind: 'noData' }
    if (rows.length > 0) return null
    if (query.length > 0) return { kind: 'noResults', query }
    return { kind: 'filteredOut' }
  },
)

/**
 * Canon's `expectedHeadingSelector`: the caller's override, then the scoped
 * list's title, then the live search, then the generic label.
 */
export const selectTasksHeading = createSelector(
  [selectFindSlice, selectTasksSearchQuery],
  (slice, query): string => {
    if (slice.tasksCustomTitle !== null) return slice.tasksCustomTitle
    if (slice.tasksSelection.kind === 'list') {
      const { listTitle } = slice.tasksSelection
      if (listTitle !== null) return listTitle
    }
    if (query.length > 0) return `Searching: "${query}"`
    return 'Tasks'
  },
)

/**
 * Canon's `expectedTitleSelector` — the macOS navigation subtitle. Empty string
 * for an unscoped, unfiltered vista, which is canon's own "no subtitle" value.
 */
export const selectTasksTitle = createSelector(
  [selectFindSlice, selectTasksVista, selectTasksSearchQuery],
  (slice, vista, query): string => {
    if (slice.tasksSelection.kind === 'list') return 'List'
    if (query.length > 0) return 'Search'
    const predicates = vista.query.predicates
    if (predicates !== null && predicates.size > 0) return 'Tasks'
    return ''
  },
)

// ---------------------------------------------------------------------------
// Intents
// ---------------------------------------------------------------------------

/** Every cross-feature request awaiting its owner, oldest first. */
export const selectFindPendingIntents = createSelector(
  [selectFindSlice],
  (slice): readonly EndeavorIntent[] => slice.intents,
)

/** The next request to hand over, or `null` when the queue is empty. */
export const selectFindNextIntent = createSelector(
  [selectFindPendingIntents],
  (intents): EndeavorIntent | null => intents[0] ?? null,
)
