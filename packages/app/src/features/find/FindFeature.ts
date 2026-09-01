/**
 * The Find slice (`RC-1`, `RC-2`, `RC-23`, `RC-36`) — the port of canon's
 * `FindFeature.swift` **and** `TasksFeature.swift`, which after the
 * EndeavorsVista migration are the same surface over two different vistas.
 *
 * `State` lives in the sibling `FindState.ts` under `RC-1`'s size clause.
 * Selectors, Shifters, the Adapter layer, the operations catalog and the
 * Producers each own their own file; this one owns the **events** and the arms
 * that route them.
 *
 * ## Names encode intent, never mechanism (`RC-2`)
 *
 * `on…` for a lifecycle signal, `userDid…` for user intent, `child…Delegated…`
 * for a child talking back. There is no `fetchEndeavors` action — the effect is
 * a Producer thunk whose type string is itself an event name, and whose three
 * lifecycle phases are the one completion event (`UZF-3`).
 *
 * ## Where this reducer deliberately differs from canon's
 *
 * - **One slice, two surfaces.** Canon has `FindFeature` and `TasksFeature`;
 *   here every arm carries the surface it acts on. See `FindState.ts` for why
 *   the split would have been the duplication.
 * - **Optimism is uniform.** Canon's Find removes/closes rows optimistically
 *   while canon's Tasks additionally flips a per-row `inActivity` spinner. There
 *   is no `inActivity` on this tier's `Endeavor` mutations path, so every local
 *   operation applies its effect optimistically in `.pending` — through the
 *   *same* `endeavorAfterOperation` the Producer persists — and the authoritative
 *   row lands on `.fulfilled`.
 * - **No `userDidTapRefresh` arm.** Canon guards a flag, flips it and returns an
 *   effect; here `.pending` raises `load` from the thunk itself, so a separate
 *   arm would set it twice.
 * - **Cross-feature actions are intents, not delegates.** Canon sends
 *   `.delegate(.startSession(…))` up to `MainFeature`. There is no parent store
 *   here and a slice may not import a sibling (`RC-20`), so they are parked as
 *   intent events and drained by `childIntentDelegatedConsumed`.
 */
import { type PayloadAction, createSlice } from '@reduxjs/toolkit'
import type { EndeavorGroupingCriteria } from '@kro/core'
import { FindExceptions } from './FindException'
import {
  type EndeavorOperationRequest,
  type FindSurface,
  endeavorAfterOperation,
  isRemovingOperation,
} from './FindOperations'
import {
  fetchFindEndeavorsThunk,
  performBulkOperationThunk,
  performEndeavorOperationThunk,
  restoreFindLensThunk,
} from './FindProducer'
import {
  withEndeavorReplaced,
  withEndeavorsInstalled,
  withFetchStarted,
  withFilterToggled,
  withFindException,
  withFindViewLoaded,
  withGroupExpanded,
  withGroupsCollapsed,
  withGrouping,
  withIntentConsumed,
  withIntentEnqueued,
  withLensSnapshotRestored,
  withRowsArchived,
  withRowsRemoved,
  withSearchQuery,
  withShowArchivedToggled,
  withTasksVistaSelected,
  surfaceOf,
} from './FindShifters'
import type {
  FindFilterToggle,
  FindState,
  TasksVistaSelection,
} from './FindState'
import { initialFindState } from './FindState'

export type { FindState } from './FindState'
export { initialFindState } from './FindState'

export const findSlice = createSlice({
  name: 'find',
  initialState: initialFindState,
  reducers: {
    /**
     * Lifecycle: one of the two surfaces mounted. Stamps the clock it will
     * classify against and the feature flags its capability gating reads —
     * canon caches the `endeavorDetail` flag at `.onViewLoaded` for exactly
     * this reason, so a Selector never reaches for a flag service.
     */
    onViewLoaded(
      state,
      action: PayloadAction<{
        surface: FindSurface
        now: Date
        enabledFlags: readonly string[]
      }>,
    ) {
      Object.assign(
        state,
        withFindViewLoaded(state as FindState, action.payload),
      )
    },

    /** User intent: All Tasks was pointed at a different `.tasks*` vista. */
    userDidSelectTasksVista(
      state,
      action: PayloadAction<{
        selection: TasksVistaSelection
        customTitle?: string | null
      }>,
    ) {
      Object.assign(
        state,
        withTasksVistaSelected(state as FindState, action.payload),
      )
    },

    /** User intent: the search field changed. Canon persists it with the lens. */
    userDidChangeSearchQuery(
      state,
      action: PayloadAction<{ surface: FindSurface; query: string }>,
    ) {
      Object.assign(state, withSearchQuery(state as FindState, action.payload))
    },

    /** User intent: one kind/host/status/calendar chip flipped. */
    userDidToggleFilter(
      state,
      action: PayloadAction<{ surface: FindSurface; toggle: FindFilterToggle }>,
    ) {
      Object.assign(
        state,
        withFilterToggled(state as FindState, action.payload),
      )
    },

    /** User intent: the Archived chip flipped. */
    userDidToggleShowArchived(
      state,
      action: PayloadAction<{ surface: FindSurface }>,
    ) {
      Object.assign(
        state,
        withShowArchivedToggled(state as FindState, action.payload),
      )
    },

    /** User intent: the grouping picker changed. */
    userDidSelectGrouping(
      state,
      action: PayloadAction<{
        surface: FindSurface
        grouping: EndeavorGroupingCriteria
      }>,
    ) {
      Object.assign(state, withGrouping(state as FindState, action.payload))
    },

    /**
     * User intent: a group's "Show all" was pressed, or its header tapped open.
     * Canon has `userDidTapExpand` and `userDidTapShowAll` land on the same
     * mutation; one arm carries both because the two are the same request.
     */
    userDidTapExpandGroup(
      state,
      action: PayloadAction<{ surface: FindSurface; groupKey: string }>,
    ) {
      Object.assign(
        state,
        withGroupExpanded(state as FindState, action.payload),
      )
    },

    /** User intent: the focused group was closed, re-clipping every group. */
    userDidTapCollapseGroups(
      state,
      action: PayloadAction<{ surface: FindSurface }>,
    ) {
      Object.assign(
        state,
        withGroupsCollapsed(state as FindState, action.payload),
      )
    },

    /**
     * A child talking back: the feature that owns an intent has handled it, so
     * the request leaves the queue. By id — two Start taps on two rows are two
     * intents, and draining by position would acknowledge the wrong one.
     */
    childIntentDelegatedConsumed(
      state,
      action: PayloadAction<{ intentId: number }>,
    ) {
      Object.assign(
        state,
        withIntentConsumed(state as FindState, action.payload),
      )
    },
  },

  extraReducers: (builder) => {
    builder
      // ------------------------------------------------------- the fetch
      .addCase(fetchFindEndeavorsThunk.pending, (state, action) => {
        Object.assign(
          state,
          withFetchStarted(state as FindState, {
            surface: action.meta.arg.surface,
          }),
        )
      })
      .addCase(fetchFindEndeavorsThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(
            state,
            withEndeavorsInstalled(state as FindState, {
              surface: result.value.surface,
              endeavors: result.value.endeavors,
              now: result.value.now,
            }),
          )
        } else {
          Object.assign(
            state,
            withFindException(state as FindState, {
              surface: action.meta.arg.surface,
              exception: result.error,
            }),
          )
        }
      })
      .addCase(fetchFindEndeavorsThunk.rejected, (state, action) => {
        // Cancellation is the only silent exit (`UZF-14`).
        if (action.meta.aborted) return
        Object.assign(
          state,
          withFindException(state as FindState, {
            surface: action.meta.arg.surface,
            exception: FindExceptions.unknown(
              action.error.message ?? 'Unknown error',
            ),
          }),
        )
      })

      // ------------------------------------------------ the lens restore
      .addCase(restoreFindLensThunk.fulfilled, (state, action) => {
        const result = action.payload
        Object.assign(
          state,
          withLensSnapshotRestored(state as FindState, {
            surface: action.meta.arg.surface,
            lens: result.ok ? result.value : null,
          }),
        )
      })
      .addCase(restoreFindLensThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        // A restore that cannot answer still has to *settle*: leaving the
        // surface waiting would suppress its filter-driven empty state forever.
        Object.assign(
          state,
          withLensSnapshotRestored(state as FindState, {
            surface: action.meta.arg.surface,
            lens: null,
          }),
        )
      })

      // -------------------------------------------------- one operation
      .addCase(performEndeavorOperationThunk.pending, (state, action) => {
        const request: EndeavorOperationRequest = action.meta.arg
        if (isRemovingOperation(request.operation)) {
          Object.assign(
            state,
            withRowsRemoved(state as FindState, {
              surface: request.surface,
              endeavorIds: [request.endeavorId],
            }),
          )
          return
        }
        const surface = surfaceOf(state as FindState, request.surface)
        const target = surface.endeavors.find(
          (endeavor) => endeavor.id === request.endeavorId,
        )
        if (target === undefined) return
        Object.assign(
          state,
          withEndeavorReplaced(state as FindState, {
            surface: request.surface,
            endeavor: endeavorAfterOperation(target, request),
          }),
        )
      })
      .addCase(performEndeavorOperationThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (!result.ok) {
          Object.assign(
            state,
            withFindException(state as FindState, {
              surface: action.meta.arg.surface,
              exception: result.error,
            }),
          )
          return
        }
        const outcome = result.value
        switch (outcome.kind) {
          case 'mutated':
            Object.assign(
              state,
              withEndeavorReplaced(state as FindState, {
                surface: outcome.surface,
                endeavor: outcome.endeavor,
              }),
            )
            return
          case 'removed':
            Object.assign(
              state,
              withRowsRemoved(state as FindState, {
                surface: outcome.surface,
                endeavorIds: [outcome.endeavorId],
              }),
            )
            return
          default:
            Object.assign(
              state,
              withIntentEnqueued(state as FindState, {
                surface: outcome.surface,
                operation: outcome.operation,
                endeavorId: outcome.endeavorId,
              }),
            )
        }
      })
      .addCase(performEndeavorOperationThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withFindException(state as FindState, {
            surface: action.meta.arg.surface,
            exception: FindExceptions.unknown(
              action.error.message ?? 'Unknown error',
            ),
          }),
        )
      })

      // ------------------------------------- delete-all / archive-all
      .addCase(performBulkOperationThunk.pending, (state, action) => {
        const request = action.meta.arg
        Object.assign(
          state,
          request.operation === 'delete'
            ? withRowsRemoved(state as FindState, {
                surface: request.surface,
                endeavorIds: request.endeavorIds,
              })
            : withRowsArchived(state as FindState, {
                surface: request.surface,
                endeavorIds: request.endeavorIds,
              }),
        )
      })
      .addCase(performBulkOperationThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) return
        Object.assign(
          state,
          withFindException(state as FindState, {
            surface: action.meta.arg.surface,
            exception: result.error,
          }),
        )
      })
      .addCase(performBulkOperationThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withFindException(state as FindState, {
            surface: action.meta.arg.surface,
            exception: FindExceptions.unknown(
              action.error.message ?? 'Unknown error',
            ),
          }),
        )
      })
  },
})

export const {
  childIntentDelegatedConsumed,
  onViewLoaded,
  userDidChangeSearchQuery,
  userDidSelectGrouping,
  userDidSelectTasksVista,
  userDidTapCollapseGroups,
  userDidTapExpandGroup,
  userDidToggleFilter,
  userDidToggleShowArchived,
} = findSlice.actions
