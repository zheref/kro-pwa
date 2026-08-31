/**
 * Find/Tasks Shifters (`RC-4`, `RC-19`) — every state transition the two
 * browsing surfaces make, as pure `with…(state, args) => FindState` functions.
 *
 * No clock, no store, no service: where a transition needs the current instant
 * it takes one as an argument, which is what makes an archived-row or
 * computed-state case a plain unit test rather than a mocked global.
 *
 * ## Reconcile once, at install
 *
 * `withEndeavorsInstalled` is the **only** place source reconciliation runs on
 * this surface, and it runs before anything narrows or groups — `#12`'s
 * call-order contract, and the same shape `#16`'s `withEndeavorsInstalled`
 * settled on. The Producer therefore hands the reducer the **raw** stored list;
 * reconciling in both places would be two passes, and reconciling later could
 * never repair a stale row because the lens would already have dropped the
 * fresh evidence that proves it stale.
 *
 * ## Surface-scoped, by argument
 *
 * Every shifter takes the surface it acts on, and `withSurface` is the one
 * lifter that writes it back. The per-surface transitions themselves are
 * written against `FindSurfaceState`, so a test can exercise them without
 * building the whole slice.
 */
import {
  type Endeavor,
  EndeavorStatus,
  makeReconciliationContext,
  reconcile,
} from '@kro/core'
import type { EndeavorIntent, FindSurface } from './FindOperations'
import type { FindException } from './FindException'
import type {
  FindFilterToggle,
  FindLensState,
  FindState,
  FindSurfaceState,
  TasksVistaSelection,
} from './FindState'
import { lensDefaultsForTasksSelection } from './FindState'

// ---------------------------------------------------------------------------
// The lifter
// ---------------------------------------------------------------------------

/** Writes one surface back into the slice. The only path that does. */
export function withSurface(
  state: FindState,
  surface: FindSurface,
  next: FindSurfaceState,
): FindState {
  return surface === 'find' ? { ...state, find: next } : { ...state, tasks: next }
}

/** Reads the surface a transition is about. */
export const surfaceOf = (
  state: FindState,
  surface: FindSurface,
): FindSurfaceState => (surface === 'find' ? state.find : state.tasks)

const mapSurface = (
  state: FindState,
  surface: FindSurface,
  change: (current: FindSurfaceState) => FindSurfaceState,
): FindState => withSurface(state, surface, change(surfaceOf(state, surface)))

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * One concern: the surface mounted. Stamps the clock it will classify against
 * and the flags its capability gating reads, and arms the lens restore.
 *
 * `isLensRestored` goes **false** rather than staying whatever it was: a
 * remount asks for the saved lens again, and until it lands the surface must
 * not present a filter-driven empty state it cannot yet justify.
 */
export function withFindViewLoaded(
  state: FindState,
  args: {
    readonly surface: FindSurface
    readonly now: Date
    readonly enabledFlags: readonly string[]
  },
): FindState {
  return mapSurface(state, args.surface, (current) => ({
    ...current,
    clockAnchor: args.now,
    enabledFlags: [...args.enabledFlags],
    isLensRestored: false,
  }))
}

/**
 * One concern: the persisted lens snapshot came back.
 *
 * `null` means there was none — the vista's own defaults stand, which is the
 * restore path's documented behaviour rather than an error. A restore that
 * lands **after** the user has already touched a filter is dropped: canon's
 * *"their live choice wins — don't overwrite it with stale saved prefs"*, which
 * `isLensRestored` is the flag for.
 */
export function withLensSnapshotRestored(
  state: FindState,
  args: {
    readonly surface: FindSurface
    readonly lens: FindLensState | null
  },
): FindState {
  return mapSurface(state, args.surface, (current) => {
    if (current.isLensRestored) return current
    return {
      ...current,
      isLensRestored: true,
      lens: args.lens ?? current.lens,
    }
  })
}

/** One concern: a read is in flight, so any prior exception is cleared. */
export function withFetchStarted(
  state: FindState,
  args: { readonly surface: FindSurface },
): FindState {
  return mapSurface(state, args.surface, (current) => ({
    ...current,
    load: { kind: 'loading' },
  }))
}

/**
 * `applyFetchedEndeavors` — install ONE reconciled snapshot atomically.
 *
 * The rows land un-narrowed; the query and the lens are Selector-side, so the
 * "no data at all" and "everything is filtered out" empty states stay
 * distinguishable. The clock anchor moves with the install so the two are never
 * a step apart.
 */
export function withEndeavorsInstalled(
  state: FindState,
  args: {
    readonly surface: FindSurface
    readonly endeavors: readonly Endeavor[]
    readonly now: Date
  },
): FindState {
  const context = makeReconciliationContext({ now: args.now })
  const reconciled = reconcile(args.endeavors, context)
  return mapSurface(state, args.surface, (current) => ({
    ...current,
    load: { kind: 'loaded' },
    endeavors: reconciled,
    clockAnchor: args.now,
  }))
}

/**
 * One concern: something failed.
 *
 * The installed rows are untouched — canon *"keeps the existing data"* on a
 * hard fetch failure, which is why `load` is a field beside the pool rather
 * than the container of it.
 */
export function withFindException(
  state: FindState,
  args: {
    readonly surface: FindSurface
    readonly exception: FindException
  },
): FindState {
  return mapSurface(state, args.surface, (current) => ({
    ...current,
    load: { kind: 'failed', exception: args.exception },
  }))
}

// ---------------------------------------------------------------------------
// Lens
// ---------------------------------------------------------------------------

const toggleIn = <T>(values: readonly T[], value: T): readonly T[] =>
  values.includes(value)
    ? values.filter((existing) => existing !== value)
    : [...values, value]

/**
 * One concern: one filter chip flipped. Canon's `applyKindToggled` /
 * `applyHostToggled` / `applyStatusToggled` over the lens's hidden sets — a
 * chip the user *deselects* is what lands in a hidden set.
 *
 * Touching a filter also settles the restore race: the choice is now the
 * user's, so a late snapshot must not overwrite it.
 */
export function withFilterToggled(
  state: FindState,
  args: {
    readonly surface: FindSurface
    readonly toggle: FindFilterToggle
  },
): FindState {
  return mapSurface(state, args.surface, (current) => {
    const { lens } = current
    const { toggle } = args
    const next: FindLensState =
      toggle.axis === 'kind'
        ? { ...lens, hiddenKinds: toggleIn(lens.hiddenKinds, toggle.value) }
        : toggle.axis === 'host'
          ? { ...lens, hiddenHosts: toggleIn(lens.hiddenHosts, toggle.value) }
          : toggle.axis === 'status'
            ? {
                ...lens,
                hiddenStatuses: toggleIn(lens.hiddenStatuses, toggle.value),
              }
            : toggle.axis === 'computedState'
              ? {
                  ...lens,
                  hiddenComputedStates: toggleIn(
                    lens.hiddenComputedStates,
                    toggle.value,
                  ),
                }
              : {
                  ...lens,
                  hiddenCalendarIds: toggleIn(
                    lens.hiddenCalendarIds,
                    toggle.value,
                  ),
                }
    return { ...current, lens: next, isLensRestored: true }
  })
}

/** One concern: the Archived chip flipped. Canon's `applyShowArchivedToggled`. */
export function withShowArchivedToggled(
  state: FindState,
  args: { readonly surface: FindSurface },
): FindState {
  return mapSurface(state, args.surface, (current) => ({
    ...current,
    lens: { ...current.lens, showArchived: !current.lens.showArchived },
    isLensRestored: true,
  }))
}

/**
 * One concern: the search field changed.
 *
 * Canon persists the query with the rest of the lens, so a returning user finds
 * the search they left. It is stored verbatim; the case fold happens in
 * `lensPredicate`, where the comparison does.
 */
export function withSearchQuery(
  state: FindState,
  args: { readonly surface: FindSurface; readonly query: string },
): FindState {
  return mapSurface(state, args.surface, (current) => ({
    ...current,
    lens: { ...current.lens, searchQuery: args.query },
    isLensRestored: true,
  }))
}

/**
 * One concern: the grouping picker changed.
 *
 * The expanded group is released with it: a key minted under "by status" names
 * nothing under "by due section", and leaving it set would clip every group
 * against a focus that no longer exists.
 */
export function withGrouping(
  state: FindState,
  args: {
    readonly surface: FindSurface
    readonly grouping: FindLensState['grouping']
  },
): FindState {
  return mapSurface(state, args.surface, (current) => ({
    ...current,
    lens: { ...current.lens, grouping: args.grouping },
    expandedGroupKey: null,
    isLensRestored: true,
  }))
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

/**
 * One concern: a group was opened. Canon's `applyExpanded` — one focus group at
 * a time, and while one is focused the item limit is lifted from every group.
 */
export function withGroupExpanded(
  state: FindState,
  args: { readonly surface: FindSurface; readonly groupKey: string },
): FindState {
  return mapSurface(state, args.surface, (current) => ({
    ...current,
    expandedGroupKey: args.groupKey,
  }))
}

/** One concern: the focus was released. Canon's `applyCollapsed`. */
export function withGroupsCollapsed(
  state: FindState,
  args: { readonly surface: FindSurface },
): FindState {
  return mapSurface(state, args.surface, (current) => ({
    ...current,
    expandedGroupKey: null,
  }))
}

// ---------------------------------------------------------------------------
// The tasks vista selection
// ---------------------------------------------------------------------------

/**
 * One concern: All Tasks was pointed at a different vista.
 *
 * The lens resets to that vista's own defaults — `.tasksToday` groups by due
 * section where `.tasksDefault` groups by status, and carrying the previous
 * screen's grouping across would silently override the new vista's declaration.
 * The saved snapshot for the new id is restored right after, by its own event.
 */
export function withTasksVistaSelected(
  state: FindState,
  args: {
    readonly selection: TasksVistaSelection
    readonly customTitle?: string | null
  },
): FindState {
  return {
    ...state,
    tasksSelection: args.selection,
    tasksCustomTitle: args.customTitle ?? null,
    tasks: {
      ...state.tasks,
      lens: lensDefaultsForTasksSelection(args.selection),
      expandedGroupKey: null,
      isLensRestored: false,
    },
  }
}

// ---------------------------------------------------------------------------
// Row mutations
// ---------------------------------------------------------------------------

/**
 * One concern: rows left the surface.
 *
 * Canon's Find deletes optimistically — *"Optimistic removal … The next
 * appearance refetch reconciles with the authoritative store"* — so the row
 * goes before the write resolves and comes back only if the refetch says so.
 */
export function withRowsRemoved(
  state: FindState,
  args: {
    readonly surface: FindSurface
    readonly endeavorIds: readonly string[]
  },
): FindState {
  const removed = new Set(args.endeavorIds)
  return mapSurface(state, args.surface, (current) => ({
    ...current,
    endeavors: current.endeavors.filter(
      (endeavor) => !removed.has(endeavor.id),
    ),
  }))
}

/**
 * One concern: rows were archived.
 *
 * Canon marks them `closed` **in place** rather than removing them, *"so the
 * lens hides them immediately"* — which is also what makes them reappear the
 * moment the user turns Show Archived on, with no refetch.
 */
export function withRowsArchived(
  state: FindState,
  args: {
    readonly surface: FindSurface
    readonly endeavorIds: readonly string[]
  },
): FindState {
  const archived = new Set(args.endeavorIds)
  return mapSurface(state, args.surface, (current) => ({
    ...current,
    endeavors: current.endeavors.map((endeavor) =>
      archived.has(endeavor.id)
        ? { ...endeavor, status: EndeavorStatus.closed }
        : endeavor,
    ),
  }))
}

/**
 * One concern: one row was rewritten by a completed operation.
 *
 * A row that is no longer in the pool is left alone rather than appended: it
 * was deleted (or filtered out of the fetch) while the write was in flight, and
 * re-adding it would resurrect it.
 */
export function withEndeavorReplaced(
  state: FindState,
  args: { readonly surface: FindSurface; readonly endeavor: Endeavor },
): FindState {
  return mapSurface(state, args.surface, (current) => ({
    ...current,
    endeavors: current.endeavors.map((endeavor) =>
      endeavor.id === args.endeavor.id ? args.endeavor : endeavor,
    ),
  }))
}

// ---------------------------------------------------------------------------
// Intents
// ---------------------------------------------------------------------------

/**
 * One concern: a cross-feature request was raised.
 *
 * Two fields move together — the queue and the id counter — which is precisely
 * `RC-4`'s "an invariant between fields" test: an id issued twice would let a
 * consumer acknowledge the wrong request.
 */
export function withIntentEnqueued(
  state: FindState,
  args: {
    readonly surface: FindSurface
    readonly operation: EndeavorIntent['operation']
    readonly endeavorId: string
  },
): FindState {
  const intent: EndeavorIntent = {
    id: state.nextIntentId,
    operation: args.operation,
    endeavorId: args.endeavorId,
    surface: args.surface,
  }
  return {
    ...state,
    intents: [...state.intents, intent],
    nextIntentId: state.nextIntentId + 1,
  }
}

/**
 * One concern: the owner handled a request.
 *
 * By id, not "the first one": two taps on Start for two different rows are two
 * intents, and consuming by position would drop the wrong one if the second
 * owner answered first. An unknown id is a no-op, never an error — a consumer
 * acknowledging twice is harmless.
 */
export function withIntentConsumed(
  state: FindState,
  args: { readonly intentId: number },
): FindState {
  return {
    ...state,
    intents: state.intents.filter((intent) => intent.id !== args.intentId),
  }
}
