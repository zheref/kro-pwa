import { PerformResolution, makePerform, makePerformFragment } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  DAY_PROGRESS_MOCK_TODAY as today,
  makeDayProgressEndeavors,
} from '../DayProgressMocks'
import {
  MINIMUM_WEEK_OFFSET,
  activitiesOnDay,
  addDays,
  clampWeekOffset,
  performanceCompletionTime,
  performanceStartTime,
  startOfDay,
  weekDays,
  withinDayProgressWindow,
} from '../DayProgressRules'

const at = (h: number, m: number) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m)

describe('calendar helpers', () => {
  it('startOfDay drops the clock time', () => {
    expect(startOfDay(at(15, 20)).getTime()).toBe(today.getTime())
  })

  it('addDays crosses a month boundary by calendar day', () => {
    expect(addDays(new Date(2026, 8, 30), 1)).toEqual(new Date(2026, 9, 1))
  })

  it('clampWeekOffset refuses future weeks and weeks past the window', () => {
    expect(clampWeekOffset(1)).toBe(0)
    expect(clampWeekOffset(-2)).toBe(-2)
    expect(clampWeekOffset(-0)).toBe(0)
    expect(clampWeekOffset(-99)).toBe(MINIMUM_WEEK_OFFSET)
  })
})

describe('weekDays', () => {
  it('week 0 ends on today and never offers a future day', () => {
    const days = weekDays(at(10, 0), 0)
    expect(days).toHaveLength(7)
    expect(days[6]).toEqual(today)
    expect(days[0]).toEqual(addDays(today, -6))
  })

  it('an earlier week ends seven days before', () => {
    expect(weekDays(today, -1)[6]).toEqual(addDays(today, -7))
  })

  it('the lane is in ascending order', () => {
    const days = weekDays(today, -2)
    expect(days.map((d) => d.getTime())).toEqual(
      [...days].map((d) => d.getTime()).sort((a, b) => a - b),
    )
  })
})

describe('performance times', () => {
  it('a session belongs to the end of its last fragment', () => {
    const performance = makePerform({
      date: at(9, 0),
      duration: 600,
      resolution: PerformResolution.complete,
      completedAt: at(23, 0),
      sessionFragments: [
        makePerformFragment({ startedAt: at(9, 0), endedAt: at(9, 5) }),
        makePerformFragment({ startedAt: at(9, 10), endedAt: at(9, 15) }),
      ],
    })
    expect(performanceCompletionTime(performance)).toEqual(at(9, 15))
    expect(performanceStartTime(performance)).toEqual(at(9, 0))
  })

  it('an untimed completion belongs to its completion stamp', () => {
    const performance = makePerform({
      date: at(7, 0),
      duration: 0,
      resolution: PerformResolution.complete,
      completedAt: at(7, 30),
    })
    expect(performanceCompletionTime(performance)).toEqual(at(7, 30))
    expect(performanceStartTime(performance)).toEqual(at(7, 0))
  })

  it('with neither, it belongs to its start plus its duration', () => {
    const performance = makePerform({
      date: at(8, 0),
      duration: 1800,
      resolution: PerformResolution.aborted,
      sessionFragments: [makePerformFragment({ startedAt: at(8, 0) })],
    })
    expect(performanceCompletionTime(performance)).toEqual(at(8, 30))
  })
})

describe('withinDayProgressWindow', () => {
  const endeavors = makeDayProgressEndeavors(today)

  it('drops performances older than the 45-day window', () => {
    const trimmed = withinDayProgressWindow(endeavors, at(23, 0))
    expect(trimmed.find((e) => e.id === 'dp-ancient')?.performances).toEqual([])
  })

  it('keeps every endeavor, even without recent activity', () => {
    expect(withinDayProgressWindow(endeavors, at(23, 0))).toHaveLength(
      endeavors.length,
    )
  })

  it('drops performances after the passed-in now', () => {
    const trimmed = withinDayProgressWindow(endeavors, at(8, 0))
    expect(trimmed.find((e) => e.id === 'dp-blog')?.performances).toEqual([])
  })
})

describe('activitiesOnDay', () => {
  const endeavors = makeDayProgressEndeavors(today)

  it('lists the day across every endeavor, newest first', () => {
    const rows = activitiesOnDay(endeavors, today)
    expect(rows.map((r) => r.endeavorTitle)).toEqual([
      'Deep work block',
      '✍️ Write weekly blog',
      'Morning stretch',
    ])
  })

  it('an untimed completion has no timer; a session keeps its seconds', () => {
    const rows = activitiesOnDay(endeavors, today)
    expect(
      rows.find((r) => r.endeavorTitle === 'Morning stretch')?.timedSeconds,
    ).toBeNull()
    expect(rows[0]?.timedSeconds).toBe(5700)
  })

  it('a day with nothing recorded is empty', () => {
    expect(activitiesOnDay(endeavors, addDays(today, -3))).toEqual([])
  })
})
