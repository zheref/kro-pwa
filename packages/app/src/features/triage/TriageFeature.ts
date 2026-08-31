/**
 * The Triage slice (`RC-1`, `RC-2`, `RC-24`, `RC-36`) — the port of canon's
 * `TriageFeature` (`Kro/Application/Triage/`), the four triage arms of
 * `MainFeature` that consume its delegate, and the durable save
 * `MainProducer.producePersistTriagedEndeavorEffect` performs.
 *
 * Canon splits this in two because iOS composes features by presentation:
 * `TriageFeature` owns the form and emits a `TriageDecision` up a delegate
 * chain, and `MainFeature` — which owns the endeavor pool — applies and
 * persists it. There is no Main slice on this stack (the pool is read per
 * surface and reconciled once), so the two halves collapse into **one** slice:
 * one form, one decision, one save. Splitting them here would mean a slice that
 * emits a decision nothing in the store can act on — and `RC-20` forbids the
 * other slice reaching in to do it.
 *
 * ## Two lifecycles, two discriminated fields
 *
 * `load` is the form's (did the session open?), `save` is the decision's (did
 * it reach disk?). They are genuinely different operations — a save failure
 * must not blank the form, and opening the next row must not inherit the last
 * row's sync notice — so each is **one** discriminated union (`RC-24`,
 * `UZF-9`), rather than the pair being flattened into booleans that could
 * describe "saving while failed".
 *
 * ## The clock never comes from here
 *
 * No reducer, Shifter or Selector reads `Date.now()`. Canon's
 * `@Dependency(\.date) var date` is the same injection by another name: every
 * event that needs the current instant carries `now`, which is what makes
 * "Schedule seeds one week out" and "EoW crosses into next Saturday" plain unit
 * tests rather than fake-timer setups.
 */
import type { EisenhowerQuadrant } from '@kro/core'
import { type PayloadAction, createSlice } from '@reduxjs/toolkit'
import type { TriageException } from './TriageException'
import { TriageExceptions } from './TriageException'
import type { TriageExpiryPreset } from './TriageExpiry'
import { openTriageThunk, saveTriageDecisionThunk } from './TriageProducer'
import type { TriagePushOutcome } from './TriageSave'
import {
  withDueDatePicked,
  withDurationPicked,
  withEffortRatingTapped,
  withException,
  withExpiryPicked,
  withExpiryPresetTapped,
  withFetchStarted,
  withOutcomeCleared,
  withOutcomeRaised,
  withQuadrantPicked,
  withRewardPointsPicked,
  withRewardPointsStepped,
  withSaveFailed,
  withSaveStarted,
  withSaved,
  withSessionOpened,
  withShareSheetDismissed,
  withValueRatingTapped,
} from './TriageShifters'
import type {
  TriageOutcome,
  TriageRewardStepDirection,
  TriageSession,
} from './TriageState'

/** The form's own lifecycle (`RC-24`, `UZF-9`). */
export type TriageLoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'loaded' }
  | { readonly kind: 'failed'; readonly exception: TriageException }

/**
 * The decision's lifecycle.
 *
 * `saved` carries the **push outcome**, not a second success flag: a decision
 * that reached disk but not its remote host is still saved, and canon says so
 * by carrying the persisted endeavor through `.remoteSyncFailed(_, persisted:)`
 * rather than reporting a failure of the save. `failed` is reachable only from
 * a local-store failure — *"the only case where the triage decision truly
 * wasn't captured"*.
 */
export type TriageSaveState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'saving' }
  | {
      readonly kind: 'saved'
      readonly push: TriagePushOutcome
      readonly savedAt: Date
    }
  | { readonly kind: 'failed'; readonly exception: TriageException }

export interface TriageState {
  readonly load: TriageLoadState
  readonly save: TriageSaveState
  /** The open Triage session, or `null` when the screen is not mounted. */
  readonly session: TriageSession | null
  /** The one-shot the shell performs, then acknowledges (`RC-17`). */
  readonly outcome: TriageOutcome | null
  /** The instant the slice last classified against — never a clock read. */
  readonly clockAnchor: Date | null
}

export const initialTriageState: TriageState = {
  load: { kind: 'idle' },
  save: { kind: 'idle' },
  session: null,
  outcome: null,
  clockAnchor: null,
}

export const triageSlice = createSlice({
  name: 'triage',
  initialState: initialTriageState,
  reducers: {
    // --- the form --------------------------------------------------------

    /**
     * User intent: a quadrant tile.
     *
     * Three connected invariants fan out from one tap (canon's
     * `applyQuadrantSelected`), which is why this is one Shifter and not three
     * assignments: the due-date seed, the expiry seed that rides on it, and the
     * value bump for the Important row.
     */
    userDidSelectQuadrant(
      state,
      action: PayloadAction<{ quadrant: EisenhowerQuadrant; now: Date }>,
    ) {
      Object.assign(
        state,
        withQuadrantPicked(state, action.payload.quadrant, action.payload.now),
      )
    },

    /**
     * User intent: a duration chip. `null` is always a no-op — *"once the user
     * picks a chip the value can be changed to another chip but not reverted to
     * undefined"*.
     */
    userDidSelectDuration(
      state,
      action: PayloadAction<{ minutes: number | null }>,
    ) {
      Object.assign(state, withDurationPicked(state, action.payload.minutes))
    },

    /** User intent: the scheduled-date picker moved, or Clear. */
    userDidSelectDueDate(state, action: PayloadAction<{ date: Date | null }>) {
      Object.assign(state, withDueDatePicked(state, action.payload.date))
    },

    /** User intent: the stepper's minus or plus control. */
    userDidStepRewardPoints(
      state,
      action: PayloadAction<{ direction: TriageRewardStepDirection }>,
    ) {
      Object.assign(
        state,
        withRewardPointsStepped(state, action.payload.direction),
      )
    },

    /** User intent: a reward value set outright (keyboard entry). Clamped. */
    userDidSelectRewardPoints(
      state,
      action: PayloadAction<{ points: number }>,
    ) {
      Object.assign(state, withRewardPointsPicked(state, action.payload.points))
    },

    /**
     * User intent: a rocket. Tapping the current rating clears it; any other
     * step selects it — and a rating of 3 or more promotes the quadrant into
     * the Important row.
     */
    userDidTapValueRating(state, action: PayloadAction<{ rating: number }>) {
      Object.assign(state, withValueRatingTapped(state, action.payload.rating))
    },

    /**
     * User intent: a fire. Same tap-to-clear rule, and an **increase**
     * multiplies the reward by the same ratio.
     */
    userDidTapEffortRating(state, action: PayloadAction<{ rating: number }>) {
      Object.assign(state, withEffortRatingTapped(state, action.payload.rating))
    },

    /**
     * User intent: the always-on expiry picker moved, or Clear.
     *
     * Clearing while a scheduled date is in place **snaps back** to scheduled
     * + 1h rather than becoming `null`. The reducer is what makes the invariant
     * true; the View's hidden Clear button only keeps the UI honest about it.
     */
    userDidSelectExpiry(state, action: PayloadAction<{ date: Date | null }>) {
      Object.assign(state, withExpiryPicked(state, action.payload.date))
    },

    /**
     * User intent: an expiry preset pill. Snaps expiry to the computed moment;
     * *"tapping a preset that matches the current picker value is a no-op"*.
     */
    userDidTapExpiryPreset(
      state,
      action: PayloadAction<{ preset: TriageExpiryPreset }>,
    ) {
      Object.assign(state, withExpiryPresetTapped(state, action.payload.preset))
    },

    // --- the bottom action row -------------------------------------------

    /** User intent: **Complete Triage** / **Complete Only**. */
    userDidTapConfirm(state) {
      Object.assign(state, withOutcomeRaised(state, 'completed'))
    },

    /** User intent: **Start Now** — Prioritize only. */
    userDidTapStartNow(state) {
      Object.assign(state, withOutcomeRaised(state, 'startNow'))
    },

    /** User intent: **Share** — Delegate only. Keeps the screen mounted. */
    userDidTapShare(state) {
      Object.assign(state, withOutcomeRaised(state, 'shared'))
    },

    /** User intent: **Archive** — Archive only. */
    userDidTapArchive(state) {
      Object.assign(state, withOutcomeRaised(state, 'archived'))
    },

    /** User intent: the back chevron or the edge swipe. Discards everything. */
    userDidTapCancel(state) {
      Object.assign(state, withOutcomeRaised(state, 'dismissed'))
    },

    /** User intent: the dark-launched inline **Edit** affordance. */
    userDidTapEdit(state) {
      Object.assign(state, withOutcomeRaised(state, 'editRequested'))
    },

    /** Lifecycle: the shell performed the one-shot, so it is spent. */
    onTriageOutcomeConsumed(state) {
      Object.assign(state, withOutcomeCleared(state))
    },

    /**
     * Lifecycle: the system share sheet closed.
     *
     * Canon pops the Triage child *here* rather than on the Share tap — *"when
     * the user dismisses the share sheet the triage child pops, returning to
     * the inbox list"* — so this is the moment a Delegate triage's session
     * ends.
     */
    onShareSheetDismissed(state) {
      Object.assign(state, withShareSheetDismissed(state))
    },
  },
  extraReducers: (builder) => {
    builder
      // --- opening the session -------------------------------------------
      .addCase(openTriageThunk.pending, (state) => {
        Object.assign(state, withFetchStarted(state))
      })
      .addCase(openTriageThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(state, withSessionOpened(state, result.value))
        } else {
          Object.assign(state, withException(state, result.error))
        }
      })
      .addCase(openTriageThunk.rejected, (state, action) => {
        // Cancellation is the one silent exit (`UZF-14`).
        if (action.meta.aborted) return
        Object.assign(
          state,
          withException(
            state,
            TriageExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // --- the durable save ----------------------------------------------
      // A `.pending` arm exists here (unlike capture's submit) because the save
      // outlives its form: the screen has already popped, so "saving" is the
      // only thing the status surface has left to show.
      .addCase(saveTriageDecisionThunk.pending, (state) => {
        Object.assign(state, withSaveStarted(state))
      })
      .addCase(saveTriageDecisionThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(state, withSaved(state, result.value))
        } else {
          Object.assign(state, withSaveFailed(state, result.error))
        }
      })
      .addCase(saveTriageDecisionThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withSaveFailed(
            state,
            TriageExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })
  },
})

export const {
  onShareSheetDismissed,
  onTriageOutcomeConsumed,
  userDidSelectDueDate,
  userDidSelectDuration,
  userDidSelectExpiry,
  userDidSelectQuadrant,
  userDidSelectRewardPoints,
  userDidStepRewardPoints,
  userDidTapArchive,
  userDidTapCancel,
  userDidTapConfirm,
  userDidTapEdit,
  userDidTapEffortRating,
  userDidTapExpiryPreset,
  userDidTapShare,
  userDidTapStartNow,
  userDidTapValueRating,
} = triageSlice.actions
