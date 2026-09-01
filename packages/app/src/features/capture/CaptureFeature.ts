/**
 * The Capture & Inbox slice (`RC-1`, `RC-2`, `RC-24`, `RC-36`) — the port of
 * canon's `EndeavorInputPrompt` draft, the capture-routing branch of
 * `MainFeature.userDidAddEndeavor`, `InboxFeature` and Main's
 * `scheduledForToday` / `userDidTapUndoScheduledForToday` /
 * `scheduledForTodayToastDidExpire` trio.
 *
 * Canon spreads this across three reducers because iOS composes features by
 * presentation: `MainFeature` owns the endeavor pool and the routing,
 * `InboxFeature` owns the sheet, and the prompt keeps its draft in SwiftUI
 * `@State`. On this stack the prompt has no store of its own and the Inbox is
 * not a child reducer, so the three collapse into **one** slice — one capture
 * flow, one pool, one `load` (`RC-32`'s "a god slice is a missing child
 * feature" cuts the other way here: splitting them would mean two slices
 * sharing one array, which `RC-20` forbids outright).
 *
 * ## The clock never comes from here
 *
 * No reducer, Shifter or Selector reads `Date.now()`. Every event that needs
 * the current instant carries `now`, every Producer takes it as an argument,
 * and the two timed behaviours — the post-capture routing delay and the ~8 s
 * Undo window — are **deadlines in state** compared against an injected
 * instant, never `setTimeout` in a reducer. That is what makes
 * "undo at 7.999 s works, at 8.001 s does not" a plain unit test.
 *
 * ## Why the pool sits beside `load`, not inside it
 *
 * `RC-24` requires one discriminated lifecycle field, so `load` is that field.
 * The endeavors sit **beside** it rather than in its `loaded` case for the same
 * reason Do keeps its day there: a failed capture must not throw away the
 * Inbox the user is looking at.
 */
import type { Endeavor } from '@kro/core'
import { type PayloadAction, createSlice } from '@reduxjs/toolkit'
import type { CaptureException } from './CaptureException'
import { CaptureExceptions } from './CaptureException'
import {
  applyInboxOperationThunk,
  loadCaptureContextThunk,
  scheduleForTodayThunk,
  submitCaptureThunk,
  undoScheduleForTodayThunk,
} from './CaptureProducer'
import {
  CaptureDestination,
  type CaptureDraft,
  type CaptureKind,
  type CaptureNavigationIntent,
  type CaptureRecurrence,
  type CaptureSchedulingSnapshot,
} from './CaptureRules'
import {
  withAddForTodayCancelled,
  withAddForTodayRequested,
  withAddForTodayTimeAdjusted,
  withCaptureCommitted,
  withContextLoaded,
  withDateCleared,
  withDatePicked,
  withDestinationSelected,
  withException,
  withFetchStarted,
  withInboxDismissed,
  withInboxOpened,
  withKindSelected,
  withOperationApplied,
  withPromptClosed,
  withPromptOpened,
  withRecurrencePicked,
  withRewardsPicked,
  withRouteDelivered,
  withSchedulingApplied,
  withSchedulingUndone,
  withTimeEditBegun,
  withTimeEditEnded,
  withTimePicked,
  withTitleEdited,
  withTriageRequestCleared,
  withTriageRequested,
  withUndoWindowChecked,
} from './CaptureShifters'

/** The one lifecycle field (`RC-24`, `UZF-9`). */
export type CaptureLoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'loaded' }
  | { readonly kind: 'failed'; readonly exception: CaptureException }

/** Which of the prompt's two time pickers an edit is about. */
export type CaptureTimeField = 'start' | 'end'

/** The three buttons canon's inline time panel offers, as one outcome. */
export type CaptureTimeEditOutcome = 'done' | 'discard' | 'clear'

/**
 * What a time picker looked like before it opened, so **Discard** can put it
 * back.
 *
 * Canon holds this in two `@State` pairs on the view
 * (`dueTimeSnapshot`/`hadTimeSnapshot`). It is logic, not presentation — the
 * *"is the picker showing"* booleans stay with #24 — so the snapshot lives here
 * and the picker's visibility does not.
 */
export interface CapturePickerSnapshot {
  readonly time: Date
  readonly wasSet: boolean
}

export interface CapturePromptState {
  readonly draft: CaptureDraft
  readonly startEdit: CapturePickerSnapshot | null
  readonly endEdit: CapturePickerSnapshot | null
}

export interface CaptureInboxState {
  readonly isOpen: boolean
  /**
   * The endeavor in the **Just Created** slot. Set only by a capture-routed
   * presentation and dropped on dismiss, which is precisely how canon makes the
   * slot fire once per capture: `userDidTapOpenInbox` passes `nil`, so the same
   * endeavor is in Pending Triage the next time the sheet opens.
   */
  readonly justCreatedEndeavorId: string | null
}

/** The Add-for-Today popover: which row, and the time it currently offers. */
export interface CaptureAddForTodayState {
  readonly endeavorId: string
  readonly pickedTime: Date
}

/**
 * The Undo window as a state machine.
 *
 * `armed` carries everything the toast needs and everything the undo needs;
 * `expired` and `undone` carry nothing, because canon clears the snapshot in
 * both cases and a snapshot that outlives its window is an undo waiting to
 * apply itself to a row the user has since moved.
 */
export type CaptureUndoState =
  | { readonly kind: 'idle' }
  | {
      readonly kind: 'armed'
      readonly snapshot: CaptureSchedulingSnapshot
      readonly armedAt: Date
      readonly expiresAt: Date
    }
  | { readonly kind: 'expired' }
  | { readonly kind: 'undone' }

/**
 * A row's Triage button, raised for #25 to consume. Carries canon's seed —
 * `InboxFeature.nextFreeSlotToday` — computed at the moment of the tap, because
 * the gap depends on today's events as they stand right then.
 */
export interface CaptureTriageRequest {
  readonly endeavorId: string
  readonly nextFreeSlotToday: Date
}

export interface CaptureState {
  readonly load: CaptureLoadState

  /** Canon's `MainFeature.State.endeavors` — the pool both sections read. */
  readonly endeavors: readonly Endeavor[]

  /** The capture prompt, or `null` when it is closed. */
  readonly prompt: CapturePromptState | null

  /** `availableHostingDestinations` — what the picker may offer. */
  readonly availableDestinations: readonly CaptureDestination[]
  /** The restored `lastEndeavorHostingDestination`; the prompt's seed. */
  readonly lastUsedDestination: CaptureDestination

  readonly inbox: CaptureInboxState

  /** The one-shot the shell performs (`RC-17`: it, not this slice, navigates). */
  readonly navigation: CaptureNavigationIntent | null

  readonly addForToday: CaptureAddForTodayState | null
  readonly undo: CaptureUndoState
  readonly triageRequest: CaptureTriageRequest | null

  /** The instant the slice last classified against — never a clock read. */
  readonly clockAnchor: Date | null
}

export const initialCaptureState: CaptureState = {
  load: { kind: 'idle' },
  endeavors: [],
  prompt: null,
  availableDestinations: [CaptureDestination.local],
  lastUsedDestination: CaptureDestination.local,
  inbox: { isOpen: false, justCreatedEndeavorId: null },
  navigation: null,
  addForToday: null,
  undo: { kind: 'idle' },
  triageRequest: null,
  clockAnchor: null,
}

export const captureSlice = createSlice({
  name: 'capture',
  initialState: initialCaptureState,
  reducers: {
    // --- the prompt ------------------------------------------------------

    /**
     * User intent: open the capture prompt on a kind.
     *
     * `initialStart` is the Plan timeline's press-to-create slot: with one the
     * draft opens already scheduled, without one it merely offers the quarter
     * hour nearest `now`.
     */
    userDidRequestCapture(
      state,
      action: PayloadAction<{
        kind: CaptureKind
        now: Date
        initialStart?: Date | null
      }>,
    ) {
      Object.assign(
        state,
        withPromptOpened(state, {
          kind: action.payload.kind,
          now: action.payload.now,
          initialStart: action.payload.initialStart ?? null,
        }),
      )
    },

    /** User intent: Discard. The draft is dropped whole; nothing is kept. */
    userDidDiscardCapture(state) {
      Object.assign(state, withPromptClosed(state))
    },

    userDidEditTitle(state, action: PayloadAction<{ title: string }>) {
      Object.assign(state, withTitleEdited(state, action.payload.title))
    },

    /**
     * User intent: a different kind chip. Canon closes every open editor on
     * this change, which here means dropping both picker snapshots — a
     * half-open start-time edit must not survive into a kind that has no
     * start time.
     */
    userDidSelectKind(state, action: PayloadAction<{ kind: CaptureKind }>) {
      Object.assign(state, withKindSelected(state, action.payload.kind))
    },

    userDidPickDate(state, action: PayloadAction<{ date: Date }>) {
      Object.assign(state, withDatePicked(state, action.payload.date))
    },

    /**
     * User intent: the date chip's Clear button (`KC-IS-#75`).
     *
     * The affordance canon's own date chip never offers — see `CaptureDraft`'s
     * `hasDate` doc in `CaptureRules.ts`. It is what lets a Task or Reminder
     * submit dateless, so it reaches Pending Triage.
     */
    userDidClearDate(state) {
      Object.assign(state, withDateCleared(state))
    },

    /**
     * User intent: a time picker opened. Canon snapshots the value **and marks
     * the time as set** on open, so the chip reads as committed while the wheel
     * is being turned; Discard is what puts both back.
     */
    userDidBeginTimeEdit(
      state,
      action: PayloadAction<{ field: CaptureTimeField }>,
    ) {
      Object.assign(state, withTimeEditBegun(state, action.payload.field))
    },

    userDidPickTime(
      state,
      action: PayloadAction<{ field: CaptureTimeField; time: Date }>,
    ) {
      Object.assign(
        state,
        withTimePicked(state, action.payload.field, action.payload.time),
      )
    },

    /** User intent: Done, Discard or Clear on the open time panel. */
    userDidEndTimeEdit(
      state,
      action: PayloadAction<{
        field: CaptureTimeField
        outcome: CaptureTimeEditOutcome
      }>,
    ) {
      Object.assign(
        state,
        withTimeEditEnded(state, action.payload.field, action.payload.outcome),
      )
    },

    userDidPickRewards(state, action: PayloadAction<{ points: number }>) {
      Object.assign(state, withRewardsPicked(state, action.payload.points))
    },

    userDidPickRecurrence(
      state,
      action: PayloadAction<{ recurrence: CaptureRecurrence }>,
    ) {
      Object.assign(
        state,
        withRecurrencePicked(state, action.payload.recurrence),
      )
    },

    userDidSelectDestination(
      state,
      action: PayloadAction<{ destination: CaptureDestination }>,
    ) {
      Object.assign(
        state,
        withDestinationSelected(state, action.payload.destination),
      )
    },

    // --- the Inbox -------------------------------------------------------

    /**
     * User intent: the Plan tab's Inbox affordance. Canon passes
     * `justCreatedEndeavor: nil` here — this is the "then drains" half of
     * *"Just Created fires exactly once per capture"*.
     */
    userDidTapOpenInbox(state) {
      Object.assign(state, withInboxOpened(state))
    },

    /** User intent: Done. Dismissing also drops the Just Created slot. */
    userDidDismissInbox(state) {
      Object.assign(state, withInboxDismissed(state))
    },

    /**
     * User intent: a row's Triage button. This slice raises the request with
     * canon's seed and stops there — the Triage rules are #25's.
     */
    userDidTapTriage(
      state,
      action: PayloadAction<{ endeavorId: string; now: Date }>,
    ) {
      Object.assign(
        state,
        withTriageRequested(
          state,
          action.payload.endeavorId,
          action.payload.now,
        ),
      )
    },

    /** Lifecycle: Triage was presented, so the one-shot is spent. */
    onTriageRequestConsumed(state) {
      Object.assign(state, withTriageRequestCleared(state))
    },

    // --- routing ---------------------------------------------------------

    /**
     * Lifecycle: the shell has waited out the intent's delay and performed it.
     *
     * A premature delivery is a **no-op**, not an early open: the deadline is
     * the contract, and honouring it here is what replaces canon's
     * `clock.sleep(.milliseconds(500))` without a timer Service.
     */
    onCaptureRouteDelivered(state, action: PayloadAction<{ now: Date }>) {
      Object.assign(state, withRouteDelivered(state, action.payload.now))
    },

    // --- Add for Today ---------------------------------------------------

    /**
     * User intent: a row's Add-for-Today button. The popover opens pre-filled
     * with the next quarter-hour slot *"so they can confirm with one tap"*.
     */
    userDidRequestAddForToday(
      state,
      action: PayloadAction<{ endeavorId: string; now: Date }>,
    ) {
      Object.assign(
        state,
        withAddForTodayRequested(
          state,
          action.payload.endeavorId,
          action.payload.now,
        ),
      )
    },

    userDidAdjustAddForTodayTime(state, action: PayloadAction<{ time: Date }>) {
      Object.assign(
        state,
        withAddForTodayTimeAdjusted(state, action.payload.time),
      )
    },

    userDidCancelAddForToday(state) {
      Object.assign(state, withAddForTodayCancelled(state))
    },

    // --- the Undo window -------------------------------------------------

    /**
     * Lifecycle: time has passed. Disarms the window once `now` reaches the
     * deadline — canon's `scheduledForTodayToastDidExpire`, driven by an
     * injected instant instead of the toast's own timer.
     */
    onUndoWindowTicked(state, action: PayloadAction<{ now: Date }>) {
      Object.assign(state, withUndoWindowChecked(state, action.payload.now))
    },
  },
  extraReducers: (builder) => {
    builder
      // --- the pool + the last-used destination --------------------------
      .addCase(loadCaptureContextThunk.pending, (state) => {
        Object.assign(state, withFetchStarted(state))
      })
      .addCase(loadCaptureContextThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(state, withContextLoaded(state, result.value))
        } else {
          Object.assign(state, withException(state, result.error))
        }
      })
      .addCase(loadCaptureContextThunk.rejected, (state, action) => {
        // Cancellation is the one silent exit (`UZF-14`).
        if (action.meta.aborted) return
        Object.assign(
          state,
          withException(
            state,
            CaptureExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // --- one capture ----------------------------------------------------
      // No `.pending` arm on purpose: the prompt stays exactly as the user
      // left it until the write lands, so a failed capture can be retried
      // without re-typing. Only the outcome has anything to say.
      .addCase(submitCaptureThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(
            state,
            withCaptureCommitted(state, {
              endeavor: result.value.endeavor,
              destination: result.value.destination,
              now: result.value.now,
            }),
          )
        } else {
          Object.assign(state, withException(state, result.error))
        }
      })
      .addCase(submitCaptureThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withException(
            state,
            CaptureExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // --- Add for Today --------------------------------------------------
      .addCase(scheduleForTodayThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(
            state,
            withSchedulingApplied(state, {
              endeavor: result.value.endeavor,
              snapshot: result.value.snapshot,
              now: result.value.now,
            }),
          )
        } else {
          Object.assign(state, withException(state, result.error))
        }
      })
      .addCase(scheduleForTodayThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withException(
            state,
            CaptureExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // --- Undo -----------------------------------------------------------
      .addCase(undoScheduleForTodayThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(
            state,
            withSchedulingUndone(state, result.value.endeavor),
          )
        } else {
          Object.assign(state, withException(state, result.error))
        }
      })
      .addCase(undoScheduleForTodayThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withException(
            state,
            CaptureExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // --- one row operation ----------------------------------------------
      .addCase(applyInboxOperationThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(
            state,
            withOperationApplied(state, {
              endeavorId: result.value.endeavorId,
              endeavor: result.value.endeavor,
            }),
          )
        } else {
          Object.assign(state, withException(state, result.error))
        }
      })
      .addCase(applyInboxOperationThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withException(
            state,
            CaptureExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })
  },
})

export const {
  onCaptureRouteDelivered,
  onTriageRequestConsumed,
  onUndoWindowTicked,
  userDidAdjustAddForTodayTime,
  userDidBeginTimeEdit,
  userDidCancelAddForToday,
  userDidClearDate,
  userDidDiscardCapture,
  userDidDismissInbox,
  userDidEditTitle,
  userDidEndTimeEdit,
  userDidPickDate,
  userDidPickRecurrence,
  userDidPickRewards,
  userDidPickTime,
  userDidRequestAddForToday,
  userDidRequestCapture,
  userDidSelectDestination,
  userDidSelectKind,
  userDidTapOpenInbox,
  userDidTapTriage,
} = captureSlice.actions
