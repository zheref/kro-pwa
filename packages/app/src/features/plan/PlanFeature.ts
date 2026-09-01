/**
 * The Plan slice (`RC-1`, `RC-2`, `RC-23`, `RC-36`) — the port of
 * `Kro/Application/Plan/PlanFeature.swift`'s reducer.
 *
 * `State` lives in the sibling `PlanState.ts` under `RC-1`'s own size clause.
 * Selectors, Shifters and Producers live in their own suffixed files; this one
 * owns the **events** and the arms that route them.
 *
 * ## Names encode intent, never mechanism (`RC-2`)
 *
 * `on…` for a lifecycle signal, `userDid…` for user intent, `child…Delegated…`
 * for a child talking back. There is no `fetchPlanDay` action — the effect is a
 * Producer thunk whose type string is itself an event name, and whose three
 * lifecycle phases are the one completion event (`UZF-3`).
 *
 * ## Where this reducer deliberately differs from canon's
 *
 * - **Two day-step actions became one.** Canon has `userDidTapPreviousDay` and
 *   `userDidTapNextDay`; here one `userDidStepDay({ days })` carries both
 *   directions, because the two arms were byte-identical apart from a sign and
 *   the direction is the arm's own boundary case.
 * - **No `userDidTapRefresh` arm.** Canon's arm guards `!isRefreshing`, flips
 *   the flag and returns an effect. On this stack the flag is raised by
 *   `loadPlanDayThunk.pending` from the reason it was dispatched with, so a
 *   separate arm would set it twice; the guard is `selectCanRefreshPlan`, which
 *   the surface reads before dispatching.
 * - **Edit mode is slice state, not view state.** Canon keeps the drag
 *   bookkeeping in SwiftUI `@State`. `RC-4` forbids the equivalent `useState`
 *   here, and the reflow preview means every other card's position depends on
 *   the draft, so it is genuinely feature state. The rules are in
 *   `PlanEditSession`; these arms only route to them.
 */
import { type PayloadAction, createSlice } from '@reduxjs/toolkit'
import type { EisenhowerQuadrant } from '@kro/core'
import { addingPlanDays, planDayKey } from './PlanCalendar'
import {
  type TimelineDragHandle,
  applyTimelineDrag,
  beginTimelineDrag,
  beginTimelineEdit,
  commitTimelineEdit,
  endTimelineDrag,
} from './PlanEditSession'
import { PlanExceptions } from './PlanException'
import { resolveIntoQuadrant } from './PlanMatrix'
import type { PlanViewMode } from './PlanNavigation'
import {
  loadPlanDayThunk,
  loadPlanMatrixThunk,
  preloadPlanDaysThunk,
} from './PlanProducer'
import {
  withEditCommitApplied,
  withEditSession,
  withMatrixResolvedEndeavor,
  withPlanClockAdvanced,
  withPlanDayLoadFailed,
  withPlanDayLoadStarted,
  withPlanDayLoaded,
  withPlanMatrixLoad,
  withPlanPreloadInstalled,
  withPlanPreloadSettled,
  withPlanPreloadStarted,
  withPlanViewLoaded,
  withPlanVisibility,
  withPlanVisibilityToggled,
  withQuickCreateDraft,
  withSelectedDay,
} from './PlanShifters'
import type {
  PlanState,
  PlanVisibility,
  PlanVisibilityToggle,
} from './PlanState'
import { PlanLoadReason, initialPlanState } from './PlanState'
import { quickCreateDraftAt, quickCreateDraftForSlot } from './TimelineSlots'

export type { PlanState } from './PlanState'
export { initialPlanState } from './PlanState'

export const planSlice = createSlice({
  name: 'plan',
  initialState: initialPlanState,
  reducers: {
    /**
     * Lifecycle: the surface mounted. Stamps the clock, the day it opens on,
     * and the `timelineQuickEventCreation` flag — canon caches the flag at
     * `.started` for the same reason, so a Selector never has to reach for a
     * flag service.
     */
    onViewLoaded(
      state,
      action: PayloadAction<{
        now: Date
        selectedDate: Date
        isQuickEventCreationEnabled: boolean
        enabledCapabilityFlags: readonly string[]
      }>,
    ) {
      Object.assign(
        state,
        withPlanViewLoaded(state as PlanState, action.payload),
      )
    },

    /** Lifecycle: the minute clock ticked. Carries the instant; never reads one. */
    onClockTicked(state, action: PayloadAction<{ now: Date }>) {
      Object.assign(
        state,
        withPlanClockAdvanced(state as PlanState, action.payload),
      )
    },

    /** Lifecycle: the two Plan preferences the timeline consumes arrived. */

    /**
     * Lifecycle: the persisted lens snapshot came back. `null` means there was
     * none — the vista's own defaults stand, which is the restore path's
     * documented behaviour rather than an error.
     */
    onLensSnapshotRestored(
      state,
      action: PayloadAction<{ visibility: PlanVisibility | null }>,
    ) {
      if (action.payload.visibility === null) return
      Object.assign(
        state,
        withPlanVisibility(state as PlanState, action.payload.visibility),
      )
    },

    /** User intent: a day was picked from the five-day picker. */
    userDidSelectDate(state, action: PayloadAction<{ date: Date }>) {
      Object.assign(state, withSelectedDay(state as PlanState, action.payload))
    },

    /** User intent: the previous/next day arrows. One arm, signed. */
    userDidStepDay(state, action: PayloadAction<{ days: number }>) {
      Object.assign(
        state,
        withSelectedDay(state as PlanState, {
          date: addingPlanDays(state.selectedDate, action.payload.days),
        }),
      )
    },

    /** User intent, single primitive field — the one mutation allowed inline. */
    userDidSelectViewMode(
      state,
      action: PayloadAction<{ mode: PlanViewMode }>,
    ) {
      state.viewMode = action.payload.mode
    },

    /**
     * User intent: an empty quarter-hour slot was pressed. Gated on the
     * `timelineQuickEventCreation` flag cached at `onViewLoaded`, and refused
     * while a card is in edit mode — canon disables the slot layer outright
     * then (`allowsHitTesting(editingEventID == nil)`).
     */
    userDidPressTimelineSlot(
      state,
      action: PayloadAction<{ index: number; startHour: number }>,
    ) {
      if (!state.isQuickEventCreationEnabled) return
      if (state.editSession !== null) return
      Object.assign(
        state,
        withQuickCreateDraft(
          state as PlanState,
          quickCreateDraftForSlot(
            action.payload.index,
            state.selectedDate,
            action.payload.startHour,
          ),
        ),
      )
    },

    /**
     * User intent: create an event at a moment rather than at a slot — the
     * accessibility action and the "Add for Today" hand-off. Rounds to the
     * nearest quarter hour, same as a press.
     */
    userDidRequestQuickCreateAt(
      state,
      action: PayloadAction<{ moment: Date }>,
    ) {
      if (!state.isQuickEventCreationEnabled) return
      if (state.editSession !== null) return
      Object.assign(
        state,
        withQuickCreateDraft(
          state as PlanState,
          quickCreateDraftAt(action.payload.moment),
        ),
      )
    },

    /**
     * The creation prompt closed — confirmed **or** dismissed — so the
     * uncommitted ghost is no longer warranted. A child talking back, which is
     * why it carries the `child…Delegated…` prefix rather than `userDid…`.
     */
    childCreationPromptDelegatedClose(state) {
      Object.assign(state, withQuickCreateDraft(state as PlanState, null))
    },

    /**
     * User intent: a card was held long enough to arm edit mode. Refused for a
     * past event — canon skips the long-press affordance for those entirely,
     * *"so the user can't accidentally reschedule history"* — and re-checked
     * here against the slice's own clock rather than trusting the caller.
     */
    userDidHoldEventBlock(
      state,
      action: PayloadAction<{ endeavorId: string }>,
    ) {
      const events = state.dayLoad.kind === 'loaded' ? state.dayLoad.events : []
      const endeavor = events.find(
        (candidate) => candidate.id === action.payload.endeavorId,
      )
      if (endeavor === undefined) return
      const session = beginTimelineEdit(endeavor, state.now)
      if (session === null) return
      Object.assign(state, withEditSession(state as PlanState, session))
    },

    /** User intent: a finger landed on a handle or the body. Captures the base. */
    userDidGrabEditHandle(
      state,
      action: PayloadAction<{ handle: TimelineDragHandle }>,
    ) {
      if (state.editSession === null) return
      Object.assign(
        state,
        withEditSession(
          state as PlanState,
          beginTimelineDrag(state.editSession, action.payload.handle),
        ),
      )
    },

    /**
     * User intent: the finger moved. `translationPx` is cumulative from
     * finger-down, never a per-frame delta — that is what makes the snap
     * drift-free, and passing a delta here would quietly reintroduce it.
     */
    userDidDragEditHandle(
      state,
      action: PayloadAction<{ translationPx: number; hourHeightPx?: number }>,
    ) {
      if (state.editSession === null) return
      Object.assign(
        state,
        withEditSession(
          state as PlanState,
          applyTimelineDrag(state.editSession, action.payload),
        ),
      )
    },

    /** User intent: the finger lifted. The draft survives; the base is released. */
    userDidReleaseEditHandle(state) {
      if (state.editSession === null) return
      Object.assign(
        state,
        withEditSession(state as PlanState, endTimelineDrag(state.editSession)),
      )
    },

    /**
     * User intent: a tap outside the editing card. Canon's commit gesture —
     * *"tapping anywhere outside the editing card commits the new times and
     * exits Edit Mode."* A session that never moved commits nothing and simply
     * disarms.
     */
    userDidTapOutsideEditingBlock(state) {
      if (state.editSession === null) return
      const commit = commitTimelineEdit(state.editSession)
      if (commit === null) {
        Object.assign(state, withEditSession(state as PlanState, null))
        return
      }
      Object.assign(
        state,
        withEditCommitApplied(state as PlanState, { commit }),
      )
    },

    /** User intent: leave edit mode without writing anything. */
    userDidDismissEditMode(state) {
      Object.assign(state, withEditSession(state as PlanState, null))
    },

    /**
     * User intent: an endeavor was assigned to a quadrant. The quadrant is
     * never stored — the resolution writes the due date and value that make the
     * derived classification come out as that quadrant, and every fetched copy
     * of the row is replaced together.
     */
    userDidAssignToQuadrant(
      state,
      action: PayloadAction<{
        endeavorId: string
        quadrant: EisenhowerQuadrant
      }>,
    ) {
      const pool = [
        ...(state.matrixLoad.kind === 'loaded'
          ? state.matrixLoad.endeavors
          : []),
        ...(state.dayLoad.kind === 'loaded' ? state.dayLoad.events : []),
      ]
      const endeavor = pool.find(
        (candidate) => candidate.id === action.payload.endeavorId,
      )
      if (endeavor === undefined) return
      Object.assign(
        state,
        withMatrixResolvedEndeavor(
          state as PlanState,
          resolveIntoQuadrant(endeavor, action.payload.quadrant, state.now),
        ),
      )
    },

    /** User intent: one visibility toggle in the lens sheet. */
    userDidToggleVisibility(
      state,
      action: PayloadAction<PlanVisibilityToggle>,
    ) {
      Object.assign(
        state,
        withPlanVisibilityToggled(state as PlanState, action.payload),
      )
    },
  },

  extraReducers: (builder) => {
    builder
      // ---------------------------------------------- authoritative day
      .addCase(loadPlanDayThunk.pending, (state, action) => {
        Object.assign(
          state,
          withPlanDayLoadStarted(state as PlanState, {
            dayKey: planDayKey(action.meta.arg.day),
            reason: action.meta.arg.reason,
          }),
        )
      })
      .addCase(loadPlanDayThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(
            state,
            withPlanDayLoaded(state as PlanState, {
              dayKey: result.value.dayKey,
              events: result.value.events,
              reason: result.value.reason,
            }),
          )
        } else {
          Object.assign(
            state,
            withPlanDayLoadFailed(state as PlanState, {
              dayKey: planDayKey(action.meta.arg.day),
              exception: result.error,
              reason: action.meta.arg.reason,
            }),
          )
        }
      })
      .addCase(loadPlanDayThunk.rejected, (state, action) => {
        // Cancellation is the only silent exit (`UZF-14`).
        if (action.meta.aborted) return
        Object.assign(
          state,
          withPlanDayLoadFailed(state as PlanState, {
            dayKey: planDayKey(action.meta.arg.day),
            exception: PlanExceptions.unknown(
              action.error.message ?? 'Unknown error',
            ),
            reason: action.meta.arg.reason,
          }),
        )
      })

      // ------------------------------------------------- read-ahead window
      .addCase(preloadPlanDaysThunk.pending, (state, action) => {
        Object.assign(
          state,
          withPlanPreloadStarted(state as PlanState, {
            centerDayKey: planDayKey(action.meta.arg.center),
          }),
        )
      })
      .addCase(preloadPlanDaysThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (!result.ok) {
          // Last-good-value: the buffer is untouched, only this window's own
          // marker settles. The window comes from the exception where it
          // carries one, and from the request otherwise — a failure that could
          // not name its window would leave the activity signal spinning.
          Object.assign(
            state,
            withPlanPreloadSettled(state as PlanState, {
              centerDayKey:
                result.error.kind === 'preloadFailed'
                  ? result.error.centerDayKey
                  : planDayKey(action.meta.arg.center),
            }),
          )
          return
        }
        const settled = withPlanPreloadSettled(state as PlanState, {
          centerDayKey: result.value.centerDayKey,
        })
        // A superseded window still settles its marker but must never install:
        // the user has moved on, and its days would describe the wrong week.
        if (result.value.centerDayKey !== planDayKey(state.selectedDate)) {
          Object.assign(state, settled)
          return
        }
        Object.assign(
          state,
          withPlanPreloadInstalled(settled, {
            centerDayKey: result.value.centerDayKey,
            events: result.value.events,
          }),
        )
      })
      .addCase(preloadPlanDaysThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withPlanPreloadSettled(state as PlanState, {
            centerDayKey: planDayKey(action.meta.arg.center),
          }),
        )
      })

      // ------------------------------------------------------- matrix rows
      .addCase(loadPlanMatrixThunk.pending, (state) => {
        Object.assign(
          state,
          withPlanMatrixLoad(state as PlanState, { kind: 'loading' }),
        )
      })
      .addCase(loadPlanMatrixThunk.fulfilled, (state, action) => {
        const result = action.payload
        Object.assign(
          state,
          withPlanMatrixLoad(
            state as PlanState,
            result.ok
              ? { kind: 'loaded', endeavors: result.value }
              : { kind: 'failed', exception: result.error },
          ),
        )
      })
      .addCase(loadPlanMatrixThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withPlanMatrixLoad(state as PlanState, {
            kind: 'failed',
            exception: PlanExceptions.unknown(
              action.error.message ?? 'Unknown error',
            ),
          }),
        )
      })
  },
})

export const {
  childCreationPromptDelegatedClose,
  onClockTicked,
  onLensSnapshotRestored,
  onViewLoaded,
  userDidAssignToQuadrant,
  userDidDismissEditMode,
  userDidDragEditHandle,
  userDidGrabEditHandle,
  userDidHoldEventBlock,
  userDidPressTimelineSlot,
  userDidReleaseEditHandle,
  userDidRequestQuickCreateAt,
  userDidSelectDate,
  userDidSelectViewMode,
  userDidStepDay,
  userDidTapOutsideEditingBlock,
  userDidToggleVisibility,
} = planSlice.actions

export { PlanLoadReason }
