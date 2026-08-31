/**
 * The session slice (`RC-1`, `RC-2`, `RC-24`, `RC-36`) — the port of
 * `SessionSetupFeature.swift`'s reducer, and the replacement engine for the
 * legacy `useSession` / `useSessionTimer` hooks (#22 mounts it).
 *
 * `State` and its initial value live in `SessionState.ts` (see that file's
 * header for why they are split out).
 *
 * ## Why so many transitions live in `extraReducers`, and in `.pending`
 *
 * `RC-36` keeps the two surfaces apart: `reducers` for synchronous,
 * locally-originated events, `extraReducers` for thunk lifecycle. Almost every
 * session intent *has* an effect — the anchor has to be written, a cue played,
 * the screen held — so almost every intent is a thunk, and its state change
 * belongs to that thunk's lifecycle.
 *
 * The unusual part is **which** lifecycle arm carries it: `.pending`, not
 * `.fulfilled`. RTK dispatches `.pending` synchronously inside `dispatch(...)`,
 * before the payload creator runs, so a transition applied there is atomic with
 * respect to every other dispatch. That is what makes the feature's two
 * exactly-once guarantees structural:
 *
 * - a countdown reaching zero is claimed by the first tick that observes it,
 *   and every later tick finds `conclusion.kind !== 'none'`;
 * - a recording is claimed by `recordSessionPerformanceThunk`'s `condition` +
 *   `.pending` pair, so a second dispatch aborts before its creator runs.
 *
 * The creator then only persists what state already holds, which is also why
 * the document on disk can never describe a different set of fragments from
 * the runtime.
 *
 * ## The sync `reducers` that remain
 *
 * The nine below are the intents with **no** effect at all: choosing a mode or
 * a duration before the session starts, opening and cancelling the two identity
 * editors, and dismissing the conclusion sheet. Each is one Shifter call.
 */
import { type PayloadAction, createSlice } from '@reduxjs/toolkit'
import {
  type FocusTimerMode,
  type TimeIntervalSeconds,
  resolveFinishEarlyOutcome,
  runningSessionElapsedDuration,
} from '@kro/core'
import { SessionExceptions } from './SessionException'
import { SessionOutcomeReason } from './SessionOutcome'
import {
  abortSessionThunk,
  advanceSessionThunk,
  endBreakThunk,
  finishSessionEarlyThunk,
  hydrateRunningSessionThunk,
  loadSessionPreferencesThunk,
  markEndeavorCompleteFromSessionThunk,
  pauseSessionThunk,
  prepareSessionLaunchThunk,
  recordSessionPerformanceThunk,
  resumeSessionThunk,
  startBreakThunk,
  startSessionThunk,
  syncSessionDocumentTitleThunk,
  updateSessionIdentityThunk,
} from './SessionProducer'
import { initialSessionState } from './SessionState'
import {
  withAnchorHydrated,
  withBreakEnded,
  withBreakFinished,
  withBreakStarted,
  withCompletedSessionsCount,
  withConclusionDismissed,
  withConclusionRecorded,
  withConclusionRecordingFailed,
  withConclusionRecordingStarted,
  withDisplayAdvanced,
  withEditedTitleChanged,
  withException,
  withIdentityApplied,
  withLaunchPrepared,
  withModeSelected,
  withPreferencesApplied,
  withSessionAborted,
  withSessionAwaitingResolution,
  withSessionClosed,
  withSessionLoadStarted,
  withSessionPaused,
  withSessionResumed,
  withSessionStartRefused,
  withSessionStarted,
  withSymbolPickerDismissed,
  withSymbolPickerPresented,
  withTargetDurationSelected,
  withTitleEditingCancelled,
  withTitleEditingStarted,
} from './SessionShifters'

export const sessionSlice = createSlice({
  name: 'session',
  initialState: initialSessionState,
  reducers: {
    /** Canon's `userDidSelectMode` — ready phase only. */
    userDidSelectMode(state, action: PayloadAction<FocusTimerMode>) {
      Object.assign(state, withModeSelected(state, action.payload))
    },

    /**
     * Canon's `userDidSelectPreset` and `userDidAdjustDuration` folded into
     * one: both set the same field under the same guard, and a preset is just
     * a duration the dial happens to snap to.
     */
    userDidSelectTargetDuration(
      state,
      action: PayloadAction<TimeIntervalSeconds>,
    ) {
      Object.assign(state, withTargetDurationSelected(state, action.payload))
    },

    /** Canon's `userDidTapEditTitle` — the title itself is the tap target. */
    userDidTapEditTitle(state) {
      Object.assign(state, withTitleEditingStarted(state))
    },

    userDidChangeTitle(state, action: PayloadAction<string>) {
      Object.assign(state, withEditedTitleChanged(state, action.payload))
    },

    /** Canon's revert-on-empty / revert-on-unchanged path. */
    userDidCancelTitleEdit(state) {
      Object.assign(state, withTitleEditingCancelled(state))
    },

    /** Canon's `userDidTapSymbol` — refused during a break. */
    userDidTapSymbol(state) {
      Object.assign(state, withSymbolPickerPresented(state))
    },

    /** Canon's `userDidDismissSymbolPicker` — closes without touching identity. */
    userDidDismissSymbolPicker(state) {
      Object.assign(state, withSymbolPickerDismissed(state))
    },

    /**
     * The conclusion sheet was dismissed without picking — the pill stays,
     * carrying the Mark-complete affordance (`docs/Features/Session.md` flow 7).
     */
    userDidDismissConclusion(state) {
      Object.assign(state, withConclusionDismissed(state))
    },

    /**
     * "Start New" — canon's `userDidTapStartNew`. The anchor was already
     * cleared and the performance already recorded at conclusion, so this only
     * returns the runtime to `ready`; `now` is the caller's, as everywhere.
     */
    userDidTapStartNewSession(state, action: PayloadAction<{ now: Date }>) {
      Object.assign(state, withSessionClosed(state, action.payload.now))
    },
  },

  extraReducers: (builder) => {
    // -- Preferences ------------------------------------------------------
    builder
      .addCase(loadSessionPreferencesThunk.pending, (state) => {
        Object.assign(state, withSessionLoadStarted(state))
      })
      .addCase(loadSessionPreferencesThunk.fulfilled, (state, action) => {
        const result = action.payload
        Object.assign(
          state,
          result.ok
            ? withPreferencesApplied(state, result.value)
            : withException(state, result.error),
        )
      })
      .addCase(loadSessionPreferencesThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withException(
            state,
            SessionExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // -- Launch ---------------------------------------------------------
      .addCase(prepareSessionLaunchThunk.pending, (state) => {
        Object.assign(state, withSessionLoadStarted(state))
      })
      .addCase(prepareSessionLaunchThunk.fulfilled, (state, action) => {
        const result = action.payload
        Object.assign(
          state,
          result.ok
            ? withLaunchPrepared(state, result.value)
            : withException(state, result.error),
        )
      })
      .addCase(prepareSessionLaunchThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withException(
            state,
            SessionExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // -- Reload recovery -------------------------------------------------
      .addCase(hydrateRunningSessionThunk.pending, (state) => {
        Object.assign(state, withSessionLoadStarted(state))
      })
      .addCase(hydrateRunningSessionThunk.fulfilled, (state, action) => {
        const result = action.payload
        Object.assign(
          state,
          result.ok
            ? withAnchorHydrated(state, {
                ...result.value,
                now: action.meta.arg.now,
              })
            : withException(state, result.error),
        )
      })
      .addCase(hydrateRunningSessionThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withException(
            state,
            SessionExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // -- Start / pause / resume ------------------------------------------
      // Each `.pending` arm is the synchronous transition; the creator only
      // persists what it produced.
      .addCase(startSessionThunk.pending, (state, action) => {
        Object.assign(state, withSessionStarted(state, action.meta.arg.now))
      })
      .addCase(startSessionThunk.fulfilled, (state, action) => {
        const result = action.payload
        // A refused start rolls the optimistic `.pending` back to `ready`: the
        // one-session invariant is worth more than the optimism.
        if (!result.ok) {
          Object.assign(state, withSessionStartRefused(state, result.error))
        }
      })
      .addCase(startSessionThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withSessionStartRefused(
            state,
            SessionExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      .addCase(pauseSessionThunk.pending, (state, action) => {
        Object.assign(state, withSessionPaused(state, action.meta.arg.now))
      })
      .addCase(pauseSessionThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (!result.ok) Object.assign(state, withException(state, result.error))
      })
      .addCase(pauseSessionThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withException(
            state,
            SessionExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      .addCase(resumeSessionThunk.pending, (state, action) => {
        Object.assign(state, withSessionResumed(state, action.meta.arg.now))
      })
      .addCase(resumeSessionThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (!result.ok) Object.assign(state, withException(state, result.error))
      })
      .addCase(resumeSessionThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withException(
            state,
            SessionExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // -- The display tick --------------------------------------------------
      // The whole countdown-elapsed decision, including its exactly-once claim,
      // happens here — synchronously, before any creator runs.
      .addCase(advanceSessionThunk.pending, (state, action) => {
        Object.assign(state, withDisplayAdvanced(state, action.meta.arg.now))
      })
      .addCase(advanceSessionThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (!result.ok) {
          Object.assign(state, withException(state, result.error))
          return
        }
        // The break's cue and anchor clear are done; release its claim so the
        // next session starts from `none`.
        if (state.conclusion.kind === 'breakElapsed') {
          Object.assign(state, withBreakFinished(state))
        }
      })
      .addCase(advanceSessionThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withException(
            state,
            SessionExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // -- Finish early — the 30 % threshold decides which branch ------------
      .addCase(finishSessionEarlyThunk.pending, (state, action) => {
        const { now } = action.meta.arg
        const anchor = state.anchor
        if (anchor === null) return
        // #8's rule, consumed: exactly 30 % passes; below it does not; a
        // stopwatch always passes because it has no target to fall short of.
        // Elapsed is derived from the anchored fragments — never a counter.
        const outcome = resolveFinishEarlyOutcome({
          mode: state.mode,
          elapsedDuration: runningSessionElapsedDuration(anchor, now),
          targetDuration: state.targetDuration,
        })
        Object.assign(
          state,
          outcome.kind === 'awaitingResolution'
            ? withSessionAwaitingResolution(state, {
                now,
                reason: SessionOutcomeReason.finishedEarly,
              })
            : withSessionAborted(state, {
                now,
                reason: SessionOutcomeReason.belowThreshold,
              }),
        )
      })
      .addCase(finishSessionEarlyThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (!result.ok) Object.assign(state, withException(state, result.error))
      })
      .addCase(finishSessionEarlyThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withException(
            state,
            SessionExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // -- Abort --------------------------------------------------------------
      .addCase(abortSessionThunk.pending, (state, action) => {
        Object.assign(
          state,
          withSessionAborted(state, {
            now: action.meta.arg.now,
            reason: SessionOutcomeReason.aborted,
          }),
        )
      })
      .addCase(abortSessionThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (!result.ok) Object.assign(state, withException(state, result.error))
      })
      .addCase(abortSessionThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withException(
            state,
            SessionExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // -- Break --------------------------------------------------------------
      .addCase(startBreakThunk.pending, (state, action) => {
        Object.assign(state, withBreakStarted(state, action.meta.arg.now))
      })
      .addCase(startBreakThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (!result.ok) Object.assign(state, withException(state, result.error))
      })
      .addCase(startBreakThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withException(
            state,
            SessionExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      .addCase(endBreakThunk.pending, (state, action) => {
        Object.assign(state, withBreakEnded(state, action.meta.arg.now))
      })
      .addCase(endBreakThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (!result.ok) Object.assign(state, withException(state, result.error))
      })
      .addCase(endBreakThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withException(
            state,
            SessionExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // -- Recording — the second half of "exactly once" ----------------------
      .addCase(recordSessionPerformanceThunk.pending, (state) => {
        Object.assign(state, withConclusionRecordingStarted(state))
      })
      .addCase(recordSessionPerformanceThunk.fulfilled, (state, action) => {
        const result = action.payload
        Object.assign(
          state,
          result.ok
            ? withConclusionRecorded(state, result.value.performance)
            : withConclusionRecordingFailed(state, result.error),
        )
      })
      .addCase(recordSessionPerformanceThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withConclusionRecordingFailed(
            state,
            SessionExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // -- Complete Task ------------------------------------------------------
      .addCase(
        markEndeavorCompleteFromSessionThunk.pending,
        (state, action) => {
          Object.assign(state, withSessionClosed(state, action.meta.arg.now))
        },
      )
      .addCase(
        markEndeavorCompleteFromSessionThunk.fulfilled,
        (state, action) => {
          const result = action.payload
          if (!result.ok) {
            Object.assign(state, withException(state, result.error))
          }
        },
      )
      .addCase(
        markEndeavorCompleteFromSessionThunk.rejected,
        (state, action) => {
          Object.assign(
            state,
            withException(
              state,
              SessionExceptions.unknown(
                action.error.message ?? 'Unknown error',
              ),
            ),
          )
        },
      )

      // -- The document-title timer -------------------------------------------
      // The title itself carries no state (it is a Selector's output); only a
      // failure to publish it lands anywhere, so it does not disappear.
      .addCase(syncSessionDocumentTitleThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (!result.ok) Object.assign(state, withException(state, result.error))
      })
      .addCase(syncSessionDocumentTitleThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withException(
            state,
            SessionExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // -- Identity -----------------------------------------------------------
      .addCase(updateSessionIdentityThunk.fulfilled, (state, action) => {
        const result = action.payload
        Object.assign(
          state,
          result.ok
            ? withIdentityApplied(state, result.value)
            : withException(state, result.error),
        )
      })
      .addCase(updateSessionIdentityThunk.rejected, (state, action) => {
        Object.assign(
          state,
          withException(
            state,
            SessionExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })
  },
})

export const {
  userDidCancelTitleEdit,
  userDidChangeTitle,
  userDidDismissConclusion,
  userDidDismissSymbolPicker,
  userDidSelectMode,
  userDidSelectTargetDuration,
  userDidTapEditTitle,
  userDidTapStartNewSession,
  userDidTapSymbol,
} = sessionSlice.actions

/**
 * The tomato row is recomputed from storage after every recording, so the
 * counter a surface renders is the one the store would answer — never an
 * increment that could drift. Exported for `#22` to dispatch after a manual
 * refresh; the recording path applies it itself.
 */
export const applyCompletedSessionsCount = withCompletedSessionsCount
