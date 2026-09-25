import { describe, expect, it } from 'vitest'
import type { DayProgressState } from '../DayProgressFeature'
import {
  DAY_PROGRESS_MOCK_TODAY as today,
  dayProgressStateMocks as mocks,
} from '../DayProgressMocks'
import { MINIMUM_WEEK_OFFSET, addDays } from '../DayProgressRules'
import {
  selectCanPageToNextWeek,
  selectCanPageToPreviousWeek,
  selectDayProgressException,
  selectIsDayProgressLoading,
  selectSelectedDay,
  selectSelectedDayActivity,
  selectSelectedDayRelation,
  selectSelectedDayRings,
  selectWeekCells,
} from '../DayProgressSelectors'

const root = (dayProgress: DayProgressState) => ({ dayProgress })

describe('lifecycle selectors', () => {
  it('loading while the read is in flight, and before the screen opens', () => {
    expect(selectIsDayProgressLoading(root(mocks.loading))).toBe(true)
    expect(selectIsDayProgressLoading(root(mocks.idle))).toBe(true)
  })

  it('not loading once loaded or failed', () => {
    expect(selectIsDayProgressLoading(root(mocks.busyDay))).toBe(false)
    expect(selectIsDayProgressLoading(root(mocks.failed))).toBe(false)
  })

  it('the exception only exists when failed', () => {
    expect(selectDayProgressException(root(mocks.failed))?.kind).toBe(
      'loadFailed',
    )
    expect(selectDayProgressException(root(mocks.busyDay))).toBeNull()
    expect(selectDayProgressException(root(mocks.idle))).toBeNull()
  })
})

describe('selectSelectedDayRelation', () => {
  it('today', () => {
    expect(selectSelectedDayRelation(root(mocks.busyDay))).toBe('today')
    expect(selectSelectedDay(root(mocks.busyDay))).toEqual(today)
  })

  it('yesterday', () => {
    expect(selectSelectedDayRelation(root(mocks.yesterday))).toBe('yesterday')
  })

  it('any earlier day is other; an unopened screen reads as today', () => {
    expect(selectSelectedDayRelation(root(mocks.earlierWeek))).toBe('other')
    expect(selectSelectedDayRelation(root(mocks.idle))).toBe('today')
  })
})

describe('selectWeekCells', () => {
  it('seven cells ending on today, today marked and selected', () => {
    const cells = selectWeekCells(root(mocks.busyDay))
    expect(cells).toHaveLength(7)
    expect(cells[6]).toMatchObject({ isToday: true, isSelected: true })
    expect(cells.filter((c) => c.isSelected)).toHaveLength(1)
  })

  it('each day carries its own rings', () => {
    const cells = selectWeekCells(root(mocks.busyDay))
    expect(cells[6]?.rings.tasks).toMatchObject({ expected: 3, completed: 1 })
    expect(cells[5]?.rings.tasks).toMatchObject({ expected: 1, completed: 1 })
  })

  it('an earlier week has no today; an unopened screen has no cells', () => {
    const cells = selectWeekCells(root(mocks.earlierWeek))
    expect(cells.some((c) => c.isToday)).toBe(false)
    expect(cells[6]?.day).toEqual(addDays(today, -7))
    expect(selectWeekCells(root(mocks.idle))).toEqual([])
  })
})

describe('week paging selectors', () => {
  it('on the current week: back yes, forward no', () => {
    expect(selectCanPageToPreviousWeek(root(mocks.busyDay))).toBe(true)
    expect(selectCanPageToNextWeek(root(mocks.busyDay))).toBe(false)
  })

  it('on an earlier week: forward yes', () => {
    expect(selectCanPageToNextWeek(root(mocks.earlierWeek))).toBe(true)
  })

  it('at the window floor or unopened: back no', () => {
    const floor = { ...mocks.busyDay, weekOffset: MINIMUM_WEEK_OFFSET }
    expect(selectCanPageToPreviousWeek(root(floor))).toBe(false)
    expect(selectCanPageToPreviousWeek(root(mocks.idle))).toBe(false)
  })
})

describe('selectSelectedDayRings', () => {
  it('a busy day has both rings', () => {
    const rings = selectSelectedDayRings(root(mocks.busyDay))
    expect(rings.habits).toMatchObject({ expected: 2, completed: 1 })
    expect(rings.tasks).toMatchObject({ expected: 3, completed: 1 })
  })

  it('a day without habits has no gold ring', () => {
    expect(selectSelectedDayRings(root(mocks.onlyTasks)).habits).toBeNull()
  })

  it('an empty or unopened day has neither ring', () => {
    expect(selectSelectedDayRings(root(mocks.emptyDay))).toEqual({
      habits: null,
      tasks: null,
    })
    expect(selectSelectedDayRings(root(mocks.idle)).tasks).toBeNull()
  })
})

describe('selectSelectedDayActivity', () => {
  it('today lists three performances, newest first', () => {
    const rows = selectSelectedDayActivity(root(mocks.busyDay))
    expect(rows.map((r) => r.resolution)).toEqual([
      'finished',
      'complete',
      'complete',
    ])
  })

  it('yesterday lists its own performances only', () => {
    const rows = selectSelectedDayActivity(root(mocks.yesterday))
    expect(rows.map((r) => r.endeavorTitle)).toEqual([
      'Buy groceries',
      'Deep work block',
    ])
  })

  it('an earlier week day, loading, or unopened is empty', () => {
    expect(selectSelectedDayActivity(root(mocks.earlierWeek))).toEqual([])
    expect(selectSelectedDayActivity(root(mocks.loading))).toEqual([])
    expect(selectSelectedDayActivity(root(mocks.idle))).toEqual([])
  })
})
