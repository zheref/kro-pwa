/**
 * Day Progress Shifters (`RC-4`, `UZF-10`) — pure `with…(state, args)`
 * functions returning a brand-new state. None reads a clock: `today` arrives
 * in `onDayProgressRequested`'s payload and is carried in state from there.
 */
import type { Endeavor } from '@kro/core'
import type { DayProgressException } from './DayProgressException'
import type { DayProgressState } from './DayProgressFeature'
import {
  DAYS_PER_WEEK,
  addDays,
  clampWeekOffset,
  startOfDay,
} from './DayProgressRules'

/** Opening the screen: back to today, week 0, and a fresh load. */
export const withDayProgressRequested = (
  state: DayProgressState,
  today: Date,
): DayProgressState => {
  const day = startOfDay(today)
  return {
    ...state,
    today: day,
    selectedDay: day,
    weekOffset: 0,
    load: { kind: 'loading' },
  }
}

/**
 * Selecting a day. A day after `today` is refused (the lane never offers one),
 * and the week offset follows the day so the lane keeps showing it.
 */
export const withDaySelected = (
  state: DayProgressState,
  day: Date,
): DayProgressState => {
  if (state.today === null) return state
  const selected = startOfDay(day)
  if (selected.getTime() > state.today.getTime()) return state
  const daysBack = Math.round(
    (state.today.getTime() - selected.getTime()) / 86_400_000,
  )
  return {
    ...state,
    selectedDay: selected,
    weekOffset: clampWeekOffset(-Math.floor(daysBack / DAYS_PER_WEEK)),
  }
}

/**
 * Paging the lane by `delta` weeks, clamped to the loaded window and to the
 * current week. The selection moves to the last day of the new week, so the
 * hero and activity list always describe a day that is on screen.
 */
export const withWeekPaged = (
  state: DayProgressState,
  delta: number,
): DayProgressState => {
  if (state.today === null) return state
  const weekOffset = clampWeekOffset(state.weekOffset + delta)
  if (weekOffset === state.weekOffset) return state
  return {
    ...state,
    weekOffset,
    selectedDay: addDays(state.today, weekOffset * DAYS_PER_WEEK),
  }
}

export const withDayProgressLoaded = (
  state: DayProgressState,
  endeavors: readonly Endeavor[],
): DayProgressState => ({ ...state, load: { kind: 'loaded', endeavors } })

export const withDayProgressFailed = (
  state: DayProgressState,
  exception: DayProgressException,
): DayProgressState => ({ ...state, load: { kind: 'failed', exception } })

/** A load in flight: the one lifecycle field goes to `loading`, nothing else. */
export const withDayProgressLoading = (
  state: DayProgressState,
): DayProgressState =>
  state.load.kind === 'loading'
    ? state
    : { ...state, load: { kind: 'loading' } }

/**
 * The clock ticked. Within the same calendar day — or before the screen was
 * opened — nothing changes (the same state is returned, so no re-render and
 * no reload). Across midnight the pane rolls to the new day exactly as a
 * fresh open would: today and the selection move forward, back to week 0.
 */
export const withDayProgressClockTicked = (
  state: DayProgressState,
  now: Date,
): DayProgressState => {
  if (state.today === null) return state
  const day = startOfDay(now)
  if (day.getTime() === state.today.getTime()) return state
  return { ...state, today: day, selectedDay: day, weekOffset: 0 }
}
