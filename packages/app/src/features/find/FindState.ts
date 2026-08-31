/**
 * `FindState` — the shape behind **both** vista-browsing surfaces: Find (the
 * `.find` vista) and All Tasks (`.tasksDefault` / `.tasksToday` /
 * `.tasksForList(listId)` / `.tasksForSearch(query)`).
 *
 * Split out of `FindFeature.ts` under `RC-1`'s size clause, exactly as
 * `PlanState.ts` is.
 *
 * ## Why one slice carries two surfaces
 *
 * Canon has two Features because TCA composes one store per screen. Here they
 * are one slice **with two instances of the same surface state**, because
 * after the vista migration the two screens differ only in which vista is
 * installed and which controls the vista `exposes` — the fetch, the lens, the
 * search, the grouping, the capability wiring and the row adapter are the same
 * code. Two slices would have been two copies of it, which is the `RC-32`
 * failure ("a missing child feature or a missing Producer split") read
 * backwards: the split would be the duplication.
 *
 * They stay **two independent instances** rather than one shared surface,
 * because Find's filter chips and All Tasks' grouping are different user
 * choices over different vistas: a search typed into Find must not appear in
 * All Tasks, and each vista persists its own lens snapshot under its own id.
 *
 * ## The lens is stored flat, and materialised in a Selector
 *
 * `EndeavorsLens` carries `ReadonlySet`s, which are not serialisable and would
 * trip the store's `serializableCheck`. State therefore holds the same eight
 * user-mutable fields as plain arrays — the same arrangement `PlanState`
 * arrived at — and `selectFindVista` / `selectTasksVista` materialise the real
 * vista on top of the registry's defaults. `sort` and `exposes` are never
 * stored, exactly as `lensApplyingSnapshot` refuses to restore them.
 *
 * ## One lifecycle field, with the pool beside it
 *
 * `load` is the single discriminated lifecycle (`RC-24`, `UZF-9`). The rows sit
 * **beside** it rather than inside its `loaded` case, because canon keeps the
 * fetched set usable through a failed refresh (`FindProducer`: *"On hard
 * failure the existing data is kept"*) — a `loaded`-carries-the-data union
 * could not represent "showing the last good list, and the refresh just
 * failed" without throwing the list away.
 */
import type {
  Endeavor,
  EndeavorComputedState,
  EndeavorGroupingCriteria,
  EndeavorHost,
  EndeavorKind,
  EndeavorStatus,
} from '@kro/core'
import { EndeavorsVistas } from '@kro/core'
import type { FindException } from './FindException'
import type { EndeavorIntent } from './FindOperations'

/** The one lifecycle field (`RC-24`, `UZF-9`). */
export type FindLoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'loaded' }
  | { readonly kind: 'failed'; readonly exception: FindException }

/** The persisted, user-mutable half of a vista's lens, in plain form. */
export interface FindLensState {
  readonly hiddenKinds: readonly EndeavorKind[]
  readonly hiddenHosts: readonly EndeavorHost[]
  readonly hiddenStatuses: readonly EndeavorStatus[]
  readonly hiddenComputedStates: readonly EndeavorComputedState[]
  readonly hiddenCalendarIds: readonly string[]
  readonly searchQuery: string
  readonly showArchived: boolean
  readonly grouping: EndeavorGroupingCriteria
}

/** One filter toggle, by axis — the shape every chip dispatches. */
export type FindFilterToggle =
  | { readonly axis: 'kind'; readonly value: EndeavorKind }
  | { readonly axis: 'host'; readonly value: EndeavorHost }
  | { readonly axis: 'status'; readonly value: EndeavorStatus }
  | { readonly axis: 'computedState'; readonly value: EndeavorComputedState }
  | { readonly axis: 'calendar'; readonly value: string }

/**
 * Which `.tasks*` vista the All Tasks surface is currently installed with.
 *
 * The registry's two parameterized entries are functions, so the *parameter*
 * lives here and the vista is rebuilt from it — storing the built vista would
 * put `Set`s in state and would pin a snapshot of the registry taken at mount.
 */
export type TasksVistaSelection =
  | { readonly kind: 'default' }
  | { readonly kind: 'today' }
  | {
      readonly kind: 'list'
      readonly listId: string
      /** The list's display title — canon's `selectedList.title`. */
      readonly listTitle: string | null
    }
  /** `.tasksForSearch(query)` — the seed goes into the lens, not the query. */
  | { readonly kind: 'search'; readonly query: string }

/** One browsing surface's whole state. Two of these exist per store. */
export interface FindSurfaceState {
  readonly load: FindLoadState
  /**
   * The reconciled snapshot, installed in one pass. Not narrowed: the query and
   * the lens are applied by the Selectors, so the "empty because there is no
   * data" and "empty because of a filter" states stay tellable apart.
   */
  readonly endeavors: readonly Endeavor[]
  /**
   * The instant the snapshot was installed at. The lens's computed-state terms
   * and the query's predicates are evaluated against it, so a Selector never
   * has to read a clock (`RC-5`).
   */
  readonly clockAnchor: Date | null
  /**
   * False between mount and the persisted lens landing. Canon's `isLoadingLens`
   * inverted: it lets a surface suppress a filter-driven empty hint until the
   * user's saved filters are actually in place, and it is what makes a late
   * restore lose to a filter the user has already touched.
   */
  readonly isLensRestored: boolean
  /**
   * The feature flags enabled at install, cached so capability gating is a pure
   * read. Canon caches `isEndeavorDetailEnabled` at `.onViewLoaded` for exactly
   * this reason: *"so the tap→Detail row binding can be flag-gated without a
   * Selector reaching into `@Dependency`"*.
   */
  readonly enabledFlags: readonly string[]
  /**
   * The one group shown in full; `null` means every group is clipped to the
   * vista's `itemLimit`. Canon's `currentFocusGroup`, by key.
   */
  readonly expandedGroupKey: string | null
  readonly lens: FindLensState
}

export interface FindState {
  /** The `.find` vista's surface. */
  readonly find: FindSurfaceState
  /** The All Tasks surface, over whichever `.tasks*` vista is selected. */
  readonly tasks: FindSurfaceState
  readonly tasksSelection: TasksVistaSelection
  /**
   * Canon's `TasksFeature.State.customTitle` — a caller-supplied heading
   * override. Kept beside the selection rather than inside it because it is
   * orthogonal to which vista is installed.
   */
  readonly tasksCustomTitle: string | null
  /**
   * Cross-feature requests awaiting their owner, oldest first. Drained by
   * `childIntentDelegatedConsumed`, never by a view flipping a flag.
   */
  readonly intents: readonly EndeavorIntent[]
  /** The next intent id. A counter, because a reducer has no clock. */
  readonly nextIntentId: number
}

/** Flattens a registry lens into the plain, storable subset. */
const lensStateOf = (lens: {
  readonly hiddenKinds: ReadonlySet<EndeavorKind>
  readonly hiddenHosts: ReadonlySet<EndeavorHost>
  readonly hiddenStatuses: ReadonlySet<EndeavorStatus>
  readonly hiddenComputedStates: ReadonlySet<EndeavorComputedState>
  readonly hiddenCalendarIds: ReadonlySet<string>
  readonly searchQuery: string
  readonly showArchived: boolean
  readonly grouping: EndeavorGroupingCriteria
}): FindLensState => ({
  hiddenKinds: [...lens.hiddenKinds],
  hiddenHosts: [...lens.hiddenHosts],
  hiddenStatuses: [...lens.hiddenStatuses],
  hiddenComputedStates: [...lens.hiddenComputedStates],
  hiddenCalendarIds: [...lens.hiddenCalendarIds],
  searchQuery: lens.searchQuery,
  showArchived: lens.showArchived,
  grouping: lens.grouping,
})

/**
 * The lens defaults each surface starts from, read from the registry rather
 * than restated — so a registry edit cannot silently disagree with the slice's
 * initial state.
 */
export const initialFindLens: FindLensState = lensStateOf(
  EndeavorsVistas.find.lens,
)

export const initialTasksLens: FindLensState = lensStateOf(
  EndeavorsVistas.tasksDefault.lens,
)

const emptySurface = (lens: FindLensState): FindSurfaceState => ({
  load: { kind: 'idle' },
  endeavors: [],
  clockAnchor: null,
  isLensRestored: false,
  enabledFlags: [],
  expandedGroupKey: null,
  lens,
})

export const initialFindSurfaceState: FindSurfaceState =
  emptySurface(initialFindLens)

export const initialTasksSurfaceState: FindSurfaceState =
  emptySurface(initialTasksLens)

export const initialFindState: FindState = {
  find: initialFindSurfaceState,
  tasks: initialTasksSurfaceState,
  tasksSelection: { kind: 'default' },
  tasksCustomTitle: null,
  intents: [],
  nextIntentId: 1,
}

/** The lens defaults for a given `.tasks*` selection. */
export const lensDefaultsForTasksSelection = (
  selection: TasksVistaSelection,
): FindLensState => {
  switch (selection.kind) {
    case 'today':
      return lensStateOf(EndeavorsVistas.tasksToday.lens)
    case 'list':
      return lensStateOf(EndeavorsVistas.tasksForList(selection.listId).lens)
    case 'search':
      return lensStateOf(EndeavorsVistas.tasksForSearch(selection.query).lens)
    default:
      return lensStateOf(EndeavorsVistas.tasksDefault.lens)
  }
}

/** The vista id a selection's lens snapshot is persisted under. */
export const tasksVistaIdFor = (selection: TasksVistaSelection): string => {
  switch (selection.kind) {
    case 'today':
      return EndeavorsVistas.tasksToday.id
    case 'list':
      return EndeavorsVistas.tasksForList(selection.listId).id
    case 'search':
      return EndeavorsVistas.tasksForSearch(selection.query).id
    default:
      return EndeavorsVistas.tasksDefault.id
  }
}

/**
 * Which empty state a surface is in. Canon's `FindView.mainContent` branches on
 * exactly these four, in this order, and they are different messages for
 * different reasons — telling them apart is the whole point of applying the
 * query and the lens as two stages.
 */
export type FindEmptyState =
  /** Nothing was fetched at all. "No Endeavors Yet". */
  | { readonly kind: 'noData' }
  /** Every kind, host and status is hidden and archived is off. "No Filters Selected". */
  | { readonly kind: 'noFilters' }
  /** A search is active and matched nothing. "No Results". */
  | { readonly kind: 'noResults'; readonly query: string }
  /** Rows exist, filters hid all of them. "Nothing Here". */
  | { readonly kind: 'filteredOut' }
