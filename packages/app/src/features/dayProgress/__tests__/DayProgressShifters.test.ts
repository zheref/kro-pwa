import { describe, expect, it } from 'vitest'
import { DayProgressExceptions } from '../DayProgressException'
import {
  DAY_PROGRESS_MOCK_TODAY as today,
  dayProgressStateMocks as mocks,
} from '../DayProgressMocks'
import { MINIMUM_WEEK_OFFSET, addDays } from '../DayProgressRules'
import {
  withDayProgressFailed,
  withDayProgressLoaded,
  withDayProgressRequested,
  withDaySelected,
  withWeekPaged,
} from '../DayProgressShifters'

describe('withDayProgressRequested', () => {
  it('opening the screen selects the start of today and starts loading', () => {
    const next = withDayProgressRequested(
      mocks.idle,
      new Date(2026, 8, 24, 15, 42),
    )
    expect(next.today).toEqual(today)
    expect(next.selectedDay).toEqual(today)
    expect(next.load.kind).toBe('loading')
  })

  it('reopening from an earlier week resets to week 0', () => {
    const next = withDayProgressRequested(mocks.earlierWeek, today)
    expect(next.weekOffset).toBe(0)
    expect(next.selectedDay).toEqual(today)
  })

  it('reopening after a failure clears the failure', () => {
    expect(withDayProgressRequested(mocks.failed, today).load.kind).toBe(
      'loading',
    )
  })
})

describe('withDaySelected', () => {
  it('tapping yesterday selects it and stays on week 0', () => {
    const next = withDaySelected(mocks.busyDay, addDays(today, -1))
    expect(next.selectedDay).toEqual(addDays(today, -1))
    expect(next.weekOffset).toBe(0)
  })

  it('a day in an earlier week moves the lane to it', () => {
    const next = withDaySelected(mocks.busyDay, addDays(today, -8))
    expect(next.weekOffset).toBe(-1)
  })

  it('a future day, or a screen never opened, is a no-op', () => {
    expect(withDaySelected(mocks.busyDay, addDays(today, 1))).toBe(
      mocks.busyDay,
    )
    expect(withDaySelected(mocks.idle, today)).toBe(mocks.idle)
  })
})

describe('withWeekPaged', () => {
  it('paging back selects the last day of the earlier week', () => {
    const next = withWeekPaged(mocks.busyDay, -1)
    expect(next.weekOffset).toBe(-1)
    expect(next.selectedDay).toEqual(addDays(today, -7))
  })

  it('paging forward past the current week is a no-op', () => {
    expect(withWeekPaged(mocks.busyDay, 1)).toBe(mocks.busyDay)
  })

  it('paging back past the loaded window is a no-op', () => {
    const atFloor = { ...mocks.busyDay, weekOffset: MINIMUM_WEEK_OFFSET }
    expect(withWeekPaged(atFloor, -1)).toBe(atFloor)
    expect(withWeekPaged(mocks.idle, -1)).toBe(mocks.idle)
  })
})

describe('withDayProgressLoaded / withDayProgressFailed', () => {
  it('a load installs the endeavors', () => {
    const endeavors =
      mocks.busyDay.load.kind === 'loaded' ? mocks.busyDay.load.endeavors : []
    const next = withDayProgressLoaded(mocks.loading, endeavors)
    expect(next.load).toEqual({ kind: 'loaded', endeavors })
  })

  it('an empty load is still loaded, not failed', () => {
    expect(withDayProgressLoaded(mocks.loading, []).load.kind).toBe('loaded')
  })

  it('a failure replaces a loaded day', () => {
    const failure = DayProgressExceptions.loadFailed('x')
    expect(withDayProgressFailed(mocks.busyDay, failure).load).toEqual({
      kind: 'failed',
      exception: failure,
    })
  })
})
