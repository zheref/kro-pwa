import { describe, expect, it } from 'vitest'
import {
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
  dateAddingSeconds,
  hoursInSeconds,
  isSameCalendarDay,
  isWithinLast,
  isWithinNext,
  minutesInSeconds,
  secondsBetween,
} from '../TimeInterval'

const NOW = new Date(2026, 0, 15, 9, 0, 0)

describe('unit constants', () => {
  it('counts a minute as 60 seconds', () => {
    expect(SECONDS_PER_MINUTE).toBe(60)
  })

  it('counts an hour as 3600 seconds', () => {
    expect(SECONDS_PER_HOUR).toBe(3600)
  })

  it('counts a day as 86400 seconds', () => {
    expect(SECONDS_PER_DAY).toBe(86_400)
  })
})

describe('hoursInSeconds / minutesInSeconds', () => {
  it('converts canon 48.hours to 172800', () => {
    expect(hoursInSeconds(48)).toBe(172_800)
  })

  it('converts canon 25.minutes to 1500', () => {
    expect(minutesInSeconds(25)).toBe(1500)
  })

  it('handles fractional counts without rounding', () => {
    expect(hoursInSeconds(1.5)).toBe(5400)
  })
})

describe('secondsBetween', () => {
  it('is positive when the second instant is later', () => {
    expect(secondsBetween(NOW, new Date(2026, 0, 15, 9, 25, 0))).toBe(1500)
  })

  it('is negative when the second instant is earlier, as Foundation is', () => {
    expect(secondsBetween(NOW, new Date(2026, 0, 15, 8, 30, 0))).toBe(-1800)
  })

  it('is zero for the same instant', () => {
    expect(secondsBetween(NOW, new Date(NOW.getTime()))).toBe(0)
  })
})

describe('dateAddingSeconds', () => {
  it('advances by the given number of seconds', () => {
    expect(dateAddingSeconds(NOW, 1800)).toEqual(
      new Date(2026, 0, 15, 9, 30, 0),
    )
  })

  it('accepts a negative interval and goes backwards', () => {
    expect(dateAddingSeconds(NOW, -3600)).toEqual(
      new Date(2026, 0, 15, 8, 0, 0),
    )
  })

  it('never mutates the date it was given', () => {
    const original = new Date(NOW.getTime())
    dateAddingSeconds(original, 9999)
    expect(original.getTime()).toBe(NOW.getTime())
  })
})

describe('isWithinLast', () => {
  it('accepts an instant inside the window', () => {
    expect(
      isWithinLast(new Date(2026, 0, 14, 12, 0, 0), hoursInSeconds(48), NOW),
    ).toBe(true)
  })

  it('rejects an instant older than the window', () => {
    expect(
      isWithinLast(new Date(2026, 0, 12, 8, 0, 0), hoursInSeconds(48), NOW),
    ).toBe(false)
  })

  it('rejects a future instant — the window looks backwards only', () => {
    expect(
      isWithinLast(new Date(2026, 0, 15, 10, 0, 0), hoursInSeconds(48), NOW),
    ).toBe(false)
  })

  it('includes both boundaries', () => {
    expect(isWithinLast(NOW, hoursInSeconds(48), NOW)).toBe(true)
    expect(
      isWithinLast(new Date(2026, 0, 13, 9, 0, 0), hoursInSeconds(48), NOW),
    ).toBe(true)
  })
})

describe('isWithinNext', () => {
  it('accepts an instant inside the window', () => {
    expect(
      isWithinNext(new Date(2026, 0, 16, 9, 0, 0), hoursInSeconds(72), NOW),
    ).toBe(true)
  })

  it('rejects an instant beyond the window', () => {
    expect(
      isWithinNext(new Date(2026, 0, 20, 9, 0, 0), hoursInSeconds(72), NOW),
    ).toBe(false)
  })

  it('rejects a past instant — the window looks forwards only', () => {
    expect(
      isWithinNext(new Date(2026, 0, 14, 9, 0, 0), hoursInSeconds(72), NOW),
    ).toBe(false)
  })
})

describe('isSameCalendarDay', () => {
  it('is true for two moments on the same local day', () => {
    expect(
      isSameCalendarDay(
        new Date(2026, 0, 15, 0, 1, 0),
        new Date(2026, 0, 15, 23, 59, 0),
      ),
    ).toBe(true)
  })

  it('is false one minute either side of midnight', () => {
    expect(
      isSameCalendarDay(
        new Date(2026, 0, 15, 23, 59, 0),
        new Date(2026, 0, 16, 0, 1, 0),
      ),
    ).toBe(false)
  })

  it('is false for the same day number in a different month or year', () => {
    expect(
      isSameCalendarDay(
        new Date(2026, 0, 15, 9, 0, 0),
        new Date(2026, 1, 15, 9, 0, 0),
      ),
    ).toBe(false)
    expect(
      isSameCalendarDay(
        new Date(2026, 0, 15, 9, 0, 0),
        new Date(2025, 0, 15, 9, 0, 0),
      ),
    ).toBe(false)
  })
})
