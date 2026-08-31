/**
 * The Endeavor Detail slice (`RC-1`, `RC-2`, `RC-23`, `RC-36`) — the port of
 * `EndeavorDetailFeature` and the five children it presents
 * (`EndeavorEditFeature`, `EndeavorDurationFeature` and the four relation
 * features), folded into one slice because RTK has no store composition.
 *
 * `State` lives in the sibling `EndeavorDetailState.ts`; the matrix-driven
 * editing vocabulary, the read-surface cards, the duration profile and the
 * relation forms each own their own file.
 *
 * ## Entry points
 *
 * Another surface asks for Detail by dispatching `onDetailRequested` (or
 * `onEditRequested`) with the endeavor it already holds. That is the consumer
 * side of Find's `viewDetail` / `edit` intents: a slice never imports a sibling
 * slice (`RC-20`), so the hand-off is one event with a domain value in it, and
 * the container that sees both is the one that wires them.
 *
 * ## Where this reducer deliberately differs from canon's
 *
 * - **No `ownerUserId`.** Canon threads it into every local upsert for
 *   attribution. There is no auth session in this build (`#31`), and inventing a
 *   field nothing can fill would be a lie in `State`.
 * - **No host write-back fan-out.** Canon's Edit save fans out one effect per
 *   external host and aggregates them. There is no provider adapter here, so the
 *   save ends at the local upsert and the two host operations refuse explicitly.
 * - **Relations do not have a save button.** That is canon's shape, not a
 *   simplification: each add/remove commits on its own, so only Edit and
 *   Duration have a dirty baseline.
 */
import type { Endeavor, EndeavorField, EndeavorRelation } from '@kro/core'
import { isRelationEditable } from '@kro/core'
import { type PayloadAction, createSlice, isAnyOf } from '@reduxjs/toolkit'
import type { EndeavorFieldChange } from './EndeavorDetailEditing'
import { EndeavorDetailExceptions } from './EndeavorDetailException'
import {
  addDeferThunk,
  addPerformanceThunk,
  addShadowThunk,
  attachHostThunk,
  detachHostThunk,
  removeDeferThunk,
  removePerformanceThunk,
  removeShadowThunk,
  saveEndeavorThunk,
} from './EndeavorDetailProducer'
import {
  withDestinationDismissed,
  withDetailDismissed,
  withDetailPresented,
  withDurationBoundAdjusted,
  withDurationBoundToggled,
  withEditRequested,
  withFieldChanged,
  withFieldEditRequested,
  withRelationDraft,
  withRelationManagementRequested,
  withRelationUpdated,
  withSaveFailed,
  withSaveStarted,
  withSaveSucceeded,
} from './EndeavorDetailShifters'
import type { EndeavorDetailState } from './EndeavorDetailState'
import { initialEndeavorDetailState } from './EndeavorDetailState'
import type { DurationBound } from './EndeavorDuration'
import type { RelationDraft } from './EndeavorRelations'

export type { EndeavorDetailState } from './EndeavorDetailState'
export { initialEndeavorDetailState } from './EndeavorDetailState'

/** Every relation write resolves the same way, so one arm pair handles them all. */
const relationThunks = [
  addPerformanceThunk,
  removePerformanceThunk,
  addDeferThunk,
  removeDeferThunk,
  addShadowThunk,
  removeShadowThunk,
  attachHostThunk,
  detachHostThunk,
] as const

export const endeavorDetailSlice = createSlice({
  name: 'endeavorDetail',
  initialState: initialEndeavorDetailState,
  reducers: {
    /** Lifecycle: another surface asked for Detail on an endeavor it holds. */
    onDetailRequested(state, action: PayloadAction<{ endeavor: Endeavor }>) {
      Object.assign(
        state,
        withDetailPresented(state as EndeavorDetailState, action.payload),
      )
    },

    /** Lifecycle: another surface asked for the full editor directly. */
    onEditRequested(
      state,
      action: PayloadAction<{ endeavor?: Endeavor }>,
    ) {
      Object.assign(
        state,
        withEditRequested(state as EndeavorDetailState, action.payload),
      )
    },

    /** User intent: the Done affordance. Detail closes; nothing survives it. */
    userDidTapDismiss(state) {
      Object.assign(state, withDetailDismissed(state as EndeavorDetailState))
    },

    /**
     * User intent: one Detail row was tapped to edit it. Refused for a field
     * the matrix marks non-editable for this kind — the defensive backstop
     * behind an affordance the read surface should already have rendered inert.
     */
    userDidTapField(state, action: PayloadAction<{ field: EndeavorField }>) {
      Object.assign(
        state,
        withFieldEditRequested(state as EndeavorDetailState, action.payload),
      )
    },

    /** User intent: a relation's manage affordance. Same matrix gate. */
    userDidTapManageRelation(
      state,
      action: PayloadAction<{ relation: EndeavorRelation }>,
    ) {
      Object.assign(
        state,
        withRelationManagementRequested(
          state as EndeavorDetailState,
          action.payload,
        ),
      )
    },

    /** User intent: the presented editor was closed without saving. */
    userDidDismissDestination(state) {
      Object.assign(
        state,
        withDestinationDismissed(state as EndeavorDetailState),
      )
    },

    /**
     * User intent: one field edit. Applied through the domain's guarded helper,
     * so a kind-irrelevant edit leaves the working copy identical and the draft
     * clean — the refusal is the matrix's.
     */
    userDidChangeField(
      state,
      action: PayloadAction<{ change: EndeavorFieldChange }>,
    ) {
      Object.assign(
        state,
        withFieldChanged(state as EndeavorDetailState, action.payload),
      )
    },

    /** User intent: a duration bound's switch flipped. */
    userDidToggleDurationBound(
      state,
      action: PayloadAction<{ bound: DurationBound; isEnabled: boolean }>,
    ) {
      Object.assign(
        state,
        withDurationBoundToggled(state as EndeavorDetailState, action.payload),
      )
    },

    /** User intent: a duration bound's number dialled. */
    userDidAdjustDurationBound(
      state,
      action: PayloadAction<{ bound: DurationBound; seconds: number }>,
    ) {
      Object.assign(
        state,
        withDurationBoundAdjusted(state as EndeavorDetailState, action.payload),
      )
    },

    /**
     * User intent: an add form opened, changed, or was cancelled (`null`).
     *
     * Refused where the relation is not editable for this kind, so a form the
     * matrix forbids cannot even be composed — the same gate the reducer's
     * manage-relation arm applies, and the same one the domain would apply at
     * the write.
     */
    userDidChangeRelationDraft(
      state,
      action: PayloadAction<{ draft: RelationDraft | null }>,
    ) {
      const endeavor = state.endeavor
      const draft = action.payload.draft
      if (
        draft !== null &&
        (endeavor === null ||
          !isRelationEditable(draft.relation, endeavor.kind))
      ) {
        return
      }
      Object.assign(
        state,
        withRelationDraft(state as EndeavorDetailState, action.payload),
      )
    },
  },

  extraReducers: (builder) => {
    builder
      // ------------------------------------------------------- the save
      .addCase(saveEndeavorThunk.pending, (state) => {
        Object.assign(state, withSaveStarted(state as EndeavorDetailState))
      })
      .addCase(saveEndeavorThunk.fulfilled, (state, action) => {
        const result = action.payload
        Object.assign(
          state,
          result.ok
            ? withSaveSucceeded(state as EndeavorDetailState, {
                saved: result.value,
              })
            : withSaveFailed(state as EndeavorDetailState, {
                exception: result.error,
              }),
        )
      })
      .addCase(saveEndeavorThunk.rejected, (state, action) => {
        // Cancellation is the only silent exit (`UZF-14`).
        if (action.meta.aborted) return
        Object.assign(
          state,
          withSaveFailed(state as EndeavorDetailState, {
            exception: EndeavorDetailExceptions.unknown(
              action.error.message ?? 'Unknown error',
            ),
          }),
        )
      })

      // ------------------------------------------------- relation writes
      //
      // Eight thunks, one set of matchers: every relation mutation commits on
      // its own and reports the refreshed endeavor, so a per-thunk arm set
      // would be eight copies of the same three lines. The failures differ
      // only in their exception, which the Producer has already typed.
      .addMatcher(isAnyOf(...relationThunks.map((thunk) => thunk.pending)), (state) => {
        Object.assign(state, withSaveStarted(state as EndeavorDetailState))
      })
      .addMatcher(
        isAnyOf(...relationThunks.map((thunk) => thunk.fulfilled)),
        (state, action) => {
          const result = action.payload
          Object.assign(
            state,
            result.ok
              ? withRelationUpdated(state as EndeavorDetailState, {
                  updated: result.value,
                })
              : withSaveFailed(state as EndeavorDetailState, {
                  exception: result.error,
                }),
          )
        },
      )
      .addMatcher(
        isAnyOf(...relationThunks.map((thunk) => thunk.rejected)),
        (state, action) => {
          if (action.meta.aborted) return
          Object.assign(
            state,
            withSaveFailed(state as EndeavorDetailState, {
              exception: EndeavorDetailExceptions.unknown(
                action.error.message ?? 'Unknown error',
              ),
            }),
          )
        },
      )
  },
})

export const {
  onDetailRequested,
  onEditRequested,
  userDidAdjustDurationBound,
  userDidChangeField,
  userDidChangeRelationDraft,
  userDidDismissDestination,
  userDidTapDismiss,
  userDidTapField,
  userDidTapManageRelation,
  userDidToggleDurationBound,
} = endeavorDetailSlice.actions
