/**
 * The Day Progress slice (`RC-1`, `RC-24`) — the web port of canon's
 * `KroUI/DayProgress/DayProgressView.swift` (`docs/Features/DayProgress.md`).
 *
 * One lifecycle field (`load`), never parallel `isLoading`/`exception`
 * optionals (`UZF-9`). `today` is stamped by `onDayProgressRequested`, so
 * every Selector derives "today" from state rather than from a clock.
 */
import type { Endeavor } from '@kro/core'
import { type PayloadAction, createSlice } from '@reduxjs/toolkit'
import {
  type DayProgressException,
  DayProgressExceptions,
} from './DayProgressException'
import { loadDayProgressThunk } from './DayProgressProducer'
import {
  withDayProgressClockTicked,
  withDayProgressFailed,
  withDayProgressLoaded,
  withDayProgressLoading,
  withDayProgressRequested,
  withDaySelected,
  withWeekPaged,
} from './DayProgressShifters'

export type DayProgressLoad =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'loaded'; readonly endeavors: readonly Endeavor[] }
  | { readonly kind: 'failed'; readonly exception: DayProgressException }

export interface DayProgressState {
  /** Start of the day the screen was opened on; `null` before it is. */
  readonly today: Date | null
  /** Start of the selected day; `null` before the screen is opened. */
  readonly selectedDay: Date | null
  /** 0 = the week ending today; negative = earlier weeks. */
  readonly weekOffset: number
  readonly load: DayProgressLoad
}

export const initialDayProgressState: DayProgressState = {
  today: null,
  selectedDay: null,
  weekOffset: 0,
  load: { kind: 'idle' },
}

export const dayProgressSlice = createSlice({
  name: 'dayProgress',
  initialState: initialDayProgressState,
  reducers: {
    onDayProgressRequested(state, action: PayloadAction<{ today: Date }>) {
      Object.assign(
        state,
        withDayProgressRequested(state, action.payload.today),
      )
    },
    /** The Page's one-minute tick; rolls an open pane over at midnight. */
    onDayProgressClockTicked(state, action: PayloadAction<{ now: Date }>) {
      Object.assign(
        state,
        withDayProgressClockTicked(state, action.payload.now),
      )
    },
    userDidSelectDay(state, action: PayloadAction<{ day: Date }>) {
      Object.assign(state, withDaySelected(state, action.payload.day))
    },
    userDidTapPreviousWeek(state) {
      Object.assign(state, withWeekPaged(state, -1))
    },
    userDidTapNextWeek(state) {
      Object.assign(state, withWeekPaged(state, 1))
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDayProgressThunk.pending, (state) => {
        Object.assign(state, withDayProgressLoading(state))
      })
      .addCase(loadDayProgressThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(state, withDayProgressLoaded(state, result.value))
        } else {
          Object.assign(state, withDayProgressFailed(state, result.error))
        }
      })
      .addCase(loadDayProgressThunk.rejected, (state, action) => {
        // Cancellation is the one silent exit (`UZF-14`).
        if (action.meta.aborted) return
        Object.assign(
          state,
          withDayProgressFailed(
            state,
            DayProgressExceptions.unknown(
              action.error.message ?? 'Unknown error',
            ),
          ),
        )
      })
  },
})

export const {
  onDayProgressClockTicked,
  onDayProgressRequested,
  userDidSelectDay,
  userDidTapPreviousWeek,
  userDidTapNextWeek,
} = dayProgressSlice.actions
