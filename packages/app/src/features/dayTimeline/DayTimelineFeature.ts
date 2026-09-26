/**
 * The Day Timeline slice (`RC-1`, `RC-24`) — the web port of canon's
 * `macReadOnlyTimeline` (`MainScreen.swift`): the Plan canvas for TODAY, read
 * only, shown in the desktop detail pane when Plan has nothing selected.
 *
 * One lifecycle field (`load`), never parallel `isLoading`/`exception`
 * optionals (`UZF-9`). `now` is stamped by `onViewLoaded` and refreshed by
 * `onClockTicked`, so every Selector derives "today" from state, never from a
 * clock.
 */
import type { Endeavor } from '@kro/core'
import { type PayloadAction, createSlice } from '@reduxjs/toolkit'
import type { PlanDayKey } from '../../library/plan/PlanCalendar'
import {
  type DayTimelineException,
  DayTimelineExceptions,
} from './DayTimelineException'
import { loadDayTimelineThunk } from './DayTimelineProducer'
import {
  withClockStamped,
  withDayTimelineFailed,
  withDayTimelineLoaded,
  withDayTimelineLoading,
} from './DayTimelineShifters'

export type DayTimelineLoad =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'loaded'
      readonly dayKey: PlanDayKey
      readonly events: readonly Endeavor[]
    }
  | { readonly kind: 'failed'; readonly exception: DayTimelineException }

export interface DayTimelineState {
  /** The wall clock as last stamped; `null` before the pane is opened. */
  readonly now: Date | null
  readonly load: DayTimelineLoad
}

export const initialDayTimelineState: DayTimelineState = {
  now: null,
  load: { kind: 'idle' },
}

export const dayTimelineSlice = createSlice({
  name: 'dayTimeline',
  initialState: initialDayTimelineState,
  reducers: {
    onViewLoaded(state, action: PayloadAction<{ now: Date }>) {
      Object.assign(state, withClockStamped(state, action.payload.now))
    },
    onClockTicked(state, action: PayloadAction<{ now: Date }>) {
      Object.assign(state, withClockStamped(state, action.payload.now))
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDayTimelineThunk.pending, (state) => {
        Object.assign(state, withDayTimelineLoading(state))
      })
      .addCase(loadDayTimelineThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(
            state,
            withDayTimelineLoaded(
              state,
              result.value.dayKey,
              result.value.events,
            ),
          )
        } else {
          Object.assign(state, withDayTimelineFailed(state, result.error))
        }
      })
      .addCase(loadDayTimelineThunk.rejected, (state, action) => {
        // Cancellation is the one silent exit (`UZF-14`).
        if (action.meta.aborted) return
        Object.assign(
          state,
          withDayTimelineFailed(
            state,
            DayTimelineExceptions.unknown(
              action.error.message ?? 'Unknown error',
            ),
          ),
        )
      })
  },
})

export const { onViewLoaded, onClockTicked } = dayTimelineSlice.actions
