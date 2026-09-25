/**
 * Day Progress Selectors (`RC-5`, `UZF-11`).
 *
 * Every "today" here is `state.today`, stamped when the screen was requested —
 * never `Date.now()`. The rings reuse `DoRings`' semantics, evaluated for the
 * SELECTED day instead of the current one (both functions only compare
 * calendar days against the instant they are handed).
 *
 * The input is typed as the one slice these read rather than the whole
 * `RootState`, so a suite can hand in `{ dayProgress: … }` without building
 * every other feature's state; `RootState` is assignable to it.
 */
import { type Endeavor, isSameCalendarDay } from '@kro/core'
import { createSelector } from '@reduxjs/toolkit'
import { type DoRing, habitsRing, tasksRing } from '../../library/rings/DoRings'
import type { DayProgressException } from './DayProgressException'
import type { DayProgressState } from './DayProgressFeature'
import {
  type DayProgressActivity,
  MINIMUM_WEEK_OFFSET,
  activitiesOnDay,
  addDays,
  weekDays,
} from './DayProgressRules'

export interface DayProgressRoot {
  readonly dayProgress: DayProgressState
}

const selectSlice = (state: DayProgressRoot): DayProgressState =>
  state.dayProgress

const NO_ENDEAVORS: readonly Endeavor[] = []

const selectLoadedEndeavors = createSelector(
  [selectSlice],
  (slice): readonly Endeavor[] =>
    slice.load.kind === 'loaded' ? slice.load.endeavors : NO_ENDEAVORS,
)

/** Both rings for one day; `null` means the ring is absent, not empty. */
export interface DayProgressRings {
  readonly habits: DoRing | null
  readonly tasks: DoRing | null
}

const ringsFor = (
  endeavors: readonly Endeavor[],
  day: Date,
): DayProgressRings => ({
  habits: habitsRing(endeavors, day),
  tasks: tasksRing({ tasks: endeavors, reminders: [] }, day),
})

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export const selectIsDayProgressLoading = createSelector(
  [selectSlice],
  (slice) => slice.load.kind === 'loading' || slice.load.kind === 'idle',
)

export const selectDayProgressException = createSelector(
  [selectSlice],
  (slice): DayProgressException | null =>
    slice.load.kind === 'failed' ? slice.load.exception : null,
)

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export type DayRelation = 'today' | 'yesterday' | 'other'

export const selectSelectedDay = createSelector(
  [selectSlice],
  (slice) => slice.selectedDay,
)

export const selectSelectedDayRelation = createSelector(
  [selectSlice],
  (slice): DayRelation => {
    if (slice.today === null || slice.selectedDay === null) return 'today'
    if (isSameCalendarDay(slice.selectedDay, slice.today)) return 'today'
    if (isSameCalendarDay(slice.selectedDay, addDays(slice.today, -1))) {
      return 'yesterday'
    }
    return 'other'
  },
)

// ---------------------------------------------------------------------------
// Weekday lane
// ---------------------------------------------------------------------------

export interface DayProgressWeekCell {
  readonly day: Date
  readonly isToday: boolean
  readonly isSelected: boolean
  readonly rings: DayProgressRings
}

export const selectWeekCells = createSelector(
  [selectSlice, selectLoadedEndeavors],
  (slice, endeavors): readonly DayProgressWeekCell[] => {
    const { today, selectedDay } = slice
    if (today === null) return []
    return weekDays(today, slice.weekOffset).map((day) => ({
      day,
      isToday: isSameCalendarDay(day, today),
      isSelected: selectedDay !== null && isSameCalendarDay(day, selectedDay),
      rings: ringsFor(endeavors, day),
    }))
  },
)

export const selectCanPageToPreviousWeek = createSelector(
  [selectSlice],
  (slice) => slice.today !== null && slice.weekOffset > MINIMUM_WEEK_OFFSET,
)

export const selectCanPageToNextWeek = createSelector(
  [selectSlice],
  (slice) => slice.today !== null && slice.weekOffset < 0,
)

// ---------------------------------------------------------------------------
// Hero + activity
// ---------------------------------------------------------------------------

export const selectSelectedDayRings = createSelector(
  [selectSlice, selectLoadedEndeavors],
  (slice, endeavors): DayProgressRings =>
    slice.selectedDay === null
      ? { habits: null, tasks: null }
      : ringsFor(endeavors, slice.selectedDay),
)

const NO_ACTIVITY: readonly DayProgressActivity[] = []

export const selectSelectedDayActivity = createSelector(
  [selectSlice, selectLoadedEndeavors],
  (slice, endeavors): readonly DayProgressActivity[] =>
    slice.selectedDay === null
      ? NO_ACTIVITY
      : activitiesOnDay(endeavors, slice.selectedDay),
)
