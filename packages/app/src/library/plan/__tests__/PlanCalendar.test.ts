import { describe, expect, it } from 'vitest'
import {
  addingPlanDays,
  isSamePlanDay,
  planDateAdding,
  planDayDistance,
  planDayFromKey,
  planDayKey,
  planSecondsBetween,
  roundHalfAwayFromZero,
  startOfNextPlanDay,
  startOfPlanDay,
} from '../PlanCalendar'

describe('startOfPlanDay', () => {
  it('returns local midnight for a moment mid-afternoon', () => {
    const midnight = startOfPlanDay(new Date(2026, 5, 18, 15, 32, 11, 456))
    expect(midnight.getFullYear()).toBe(2026)
    expect(midnight.getMonth()).toBe(5)
    expect(midnight.getDate()).toBe(18)
    expect(midnight.getHours()).toBe(0)
    expect(midnight.getMilliseconds()).toBe(0)
  })

  it('is idempotent — a midnight is already the start of its own day', () => {
    const once = startOfPlanDay(new Date(2026, 5, 18, 23, 59, 59, 999))
    expect(startOfPlanDay(once).getTime()).toBe(once.getTime())
  })

  it('does not roll a late-evening moment into the following day', () => {
    expect(startOfPlanDay(new Date(2026, 5, 18, 23, 59)).getDate()).toBe(18)
  })
})

describe('addingPlanDays', () => {
  it('crosses a month boundary onto the first of the next month', () => {
    const next = addingPlanDays(new Date(2026, 5, 30, 12), 1)
    expect(next.getMonth()).toBe(6)
    expect(next.getDate()).toBe(1)
  })

  it('steps backwards across a year boundary', () => {
    const previous = addingPlanDays(new Date(2026, 0, 1, 9), -1)
    expect(previous.getFullYear()).toBe(2025)
    expect(previous.getMonth()).toBe(11)
    expect(previous.getDate()).toBe(31)
  })

  it('lands on midnight whatever time of day it started from', () => {
    expect(addingPlanDays(new Date(2026, 5, 18, 17, 45), 3).getHours()).toBe(0)
  })

  it('returns the same midnight for an offset of zero', () => {
    const day = new Date(2026, 5, 18, 8, 15)
    expect(addingPlanDays(day, 0).getTime()).toBe(startOfPlanDay(day).getTime())
  })
})

describe('startOfNextPlanDay', () => {
  it('is the exclusive upper bound of the day it is asked about', () => {
    const day = new Date(2026, 5, 18, 6)
    expect(startOfNextPlanDay(day).getDate()).toBe(19)
  })

  it('rolls the last day of February onto the first of March', () => {
    const march = startOfNextPlanDay(new Date(2026, 1, 28, 22))
    expect(march.getMonth()).toBe(2)
    expect(march.getDate()).toBe(1)
  })

  it('is always later than the start of its own day', () => {
    const day = new Date(2026, 5, 18, 6)
    expect(startOfNextPlanDay(day).getTime()).toBeGreaterThan(
      startOfPlanDay(day).getTime(),
    )
  })
})

describe('isSamePlanDay', () => {
  it('holds for two moments on the same calendar day', () => {
    expect(
      isSamePlanDay(new Date(2026, 5, 18, 0, 0), new Date(2026, 5, 18, 23, 59)),
    ).toBe(true)
  })

  it('fails one minute either side of midnight', () => {
    expect(
      isSamePlanDay(new Date(2026, 5, 18, 23, 59), new Date(2026, 5, 19, 0, 1)),
    ).toBe(false)
  })

  it('does not confuse the same day-of-month in different months', () => {
    expect(isSamePlanDay(new Date(2026, 4, 18), new Date(2026, 5, 18))).toBe(
      false,
    )
  })
})

describe('planDayDistance', () => {
  it('counts whole days forward across a week', () => {
    expect(
      planDayDistance(new Date(2026, 5, 18, 23), new Date(2026, 5, 25, 1)),
    ).toBe(7)
  })

  it('is negative when the target day precedes the origin', () => {
    expect(planDayDistance(new Date(2026, 5, 18), new Date(2026, 5, 15))).toBe(
      -3,
    )
  })

  it('is zero for two moments on the same day', () => {
    expect(
      planDayDistance(new Date(2026, 5, 18, 1), new Date(2026, 5, 18, 22)),
    ).toBe(0)
  })
})

describe('planDayKey', () => {
  it('renders a local-time YYYY-MM-DD with zero padding', () => {
    expect(planDayKey(new Date(2026, 0, 5, 13, 12))).toBe('2026-01-05')
  })

  it('keys a late-evening moment to its own day, not the next one in UTC', () => {
    expect(planDayKey(new Date(2026, 5, 18, 23, 30))).toBe('2026-06-18')
  })

  it('keys an early-morning moment to its own day, not the previous one', () => {
    expect(planDayKey(new Date(2026, 5, 18, 0, 30))).toBe('2026-06-18')
  })

  it('sorts lexicographically in chronological order', () => {
    const keys = [
      planDayKey(new Date(2026, 10, 2)),
      planDayKey(new Date(2026, 0, 31)),
      planDayKey(new Date(2026, 1, 1)),
    ]
    expect([...keys].sort()).toEqual(['2026-01-31', '2026-02-01', '2026-11-02'])
  })
})

describe('planDayFromKey', () => {
  it('round-trips a key written by planDayKey', () => {
    const day = startOfPlanDay(new Date(2026, 5, 18, 14))
    expect(planDayFromKey(planDayKey(day))?.getTime()).toBe(day.getTime())
  })

  it('rejects a string that is not a day key at all', () => {
    expect(planDayFromKey('not-a-day')).toBeNull()
  })

  it('rejects a date that does not exist rather than rolling it forward', () => {
    expect(planDayFromKey('2026-02-31')).toBeNull()
  })
})

describe('roundHalfAwayFromZero', () => {
  it('rounds a positive half up, matching Swift Double.rounded()', () => {
    expect(roundHalfAwayFromZero(0.5)).toBe(1)
  })

  it('rounds a negative half away from zero — where Math.round would not', () => {
    expect(roundHalfAwayFromZero(-0.5)).toBe(-1)
    expect(Math.round(-0.5)).toBe(-0)
  })

  it('is symmetric under negation, so dragging up and down snap alike', () => {
    for (const value of [0.1, 0.5, 0.9, 1.5, 2.4999, 3.5]) {
      expect(roundHalfAwayFromZero(-value)).toBe(-roundHalfAwayFromZero(value))
    }
  })

  it('leaves a whole number alone', () => {
    expect(roundHalfAwayFromZero(-4)).toBe(-4)
  })
})

describe('planDateAdding / planSecondsBetween', () => {
  it('adds a quarter hour', () => {
    const base = new Date(2026, 5, 18, 9, 0)
    expect(planDateAdding(base, 900).getMinutes()).toBe(15)
  })

  it('subtracts when the interval is negative', () => {
    const base = new Date(2026, 5, 18, 9, 0)
    expect(planDateAdding(base, -1800).getHours()).toBe(8)
  })

  it('is the inverse of planSecondsBetween', () => {
    const base = new Date(2026, 5, 18, 9, 0)
    const later = planDateAdding(base, 5400)
    expect(planSecondsBetween(base, later)).toBe(5400)
    expect(planSecondsBetween(later, base)).toBe(-5400)
  })
})
