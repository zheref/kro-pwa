import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FIRST_WEEKDAY,
  absoluteDateRange,
  monthDateRange,
  resolveDateRange,
  todayDateRange,
  weekDateRange,
} from '../DateRangeSpec'

/** Thu 15 Jan 2026, 09:00 local — the same anchor the endeavor fixtures use. */
const NOW = new Date(2026, 0, 15, 9, 0, 0)

describe('resolveDateRange — today', () => {
  it('a screen opening mid-morning gets midnight-to-midnight, not now-to-now', () => {
    const { start, end } = resolveDateRange(todayDateRange, NOW)
    expect(start).toEqual(new Date(2026, 0, 15, 0, 0, 0))
    expect(end).toEqual(new Date(2026, 0, 16, 0, 0, 0))
  })

  it('a query with no date constraint still resolves today, because a calendar client cannot fetch without a window', () => {
    expect(resolveDateRange(null, NOW)).toEqual(
      resolveDateRange(todayDateRange, NOW),
    )
  })

  it('the last second of the day still resolves that same day', () => {
    const lateNight = new Date(2026, 0, 15, 23, 59, 59)
    const { start, end } = resolveDateRange(todayDateRange, lateNight)
    expect(start).toEqual(new Date(2026, 0, 15, 0, 0, 0))
    expect(end).toEqual(new Date(2026, 0, 16, 0, 0, 0))
  })

  it('crosses a month boundary rather than clamping to the 31st', () => {
    const { start, end } = resolveDateRange(
      todayDateRange,
      new Date(2026, 0, 31, 18, 0, 0),
    )
    expect(start).toEqual(new Date(2026, 0, 31, 0, 0, 0))
    expect(end).toEqual(new Date(2026, 1, 1, 0, 0, 0))
  })
})

describe('resolveDateRange — week', () => {
  it('a Thursday anchor rolls back to the preceding Sunday by default', () => {
    expect(DEFAULT_FIRST_WEEKDAY).toBe(0)
    const { start, end } = resolveDateRange(weekDateRange(NOW), NOW)
    expect(start).toEqual(new Date(2026, 0, 11, 0, 0, 0))
    expect(end).toEqual(new Date(2026, 0, 18, 0, 0, 0))
  })

  it('a locale whose week starts on Monday shifts the window a day later', () => {
    const { start, end } = resolveDateRange(weekDateRange(NOW), NOW, {
      firstWeekday: 1,
    })
    expect(start).toEqual(new Date(2026, 0, 12, 0, 0, 0))
    expect(end).toEqual(new Date(2026, 0, 19, 0, 0, 0))
  })

  it('an anchor that is already the first weekday does not roll back a whole week', () => {
    const sunday = new Date(2026, 0, 11, 13, 30, 0)
    const { start } = resolveDateRange(weekDateRange(sunday), NOW)
    expect(start).toEqual(new Date(2026, 0, 11, 0, 0, 0))
  })

  it('ignores `now` entirely — the week is the anchor’s, not today’s', () => {
    const anchor = new Date(2025, 6, 4, 8, 0, 0)
    const { start, end } = resolveDateRange(weekDateRange(anchor), NOW)
    expect(start).toEqual(new Date(2025, 5, 29, 0, 0, 0))
    expect(end).toEqual(new Date(2025, 6, 6, 0, 0, 0))
  })
})

describe('resolveDateRange — month', () => {
  it('March 2026 spans 1 March to 1 April, month numbering being 1-based', () => {
    const { start, end } = resolveDateRange(monthDateRange(2026, 3), NOW)
    expect(start).toEqual(new Date(2026, 2, 1, 0, 0, 0))
    expect(end).toEqual(new Date(2026, 3, 1, 0, 0, 0))
  })

  it('December rolls into the next year rather than month 13', () => {
    const { start, end } = resolveDateRange(monthDateRange(2026, 12), NOW)
    expect(start).toEqual(new Date(2026, 11, 1, 0, 0, 0))
    expect(end).toEqual(new Date(2027, 0, 1, 0, 0, 0))
  })

  it('February of a leap year ends on 1 March all the same', () => {
    const { end } = resolveDateRange(monthDateRange(2028, 2), NOW)
    expect(end).toEqual(new Date(2028, 2, 1, 0, 0, 0))
  })
})

describe('resolveDateRange — absolute', () => {
  it('passes a well-ordered window through untouched', () => {
    const from = new Date(2026, 0, 10, 8, 0, 0)
    const to = new Date(2026, 0, 12, 8, 0, 0)
    expect(resolveDateRange(absoluteDateRange(from, to), NOW)).toEqual({
      start: from,
      end: to,
    })
  })

  it('normalizes reversed bounds to an empty window instead of fetching backwards', () => {
    const from = new Date(2_000_000)
    const to = new Date(1_000_000)
    expect(resolveDateRange(absoluteDateRange(from, to), NOW)).toEqual({
      start: from,
      end: from,
    })
  })

  it('treats a zero-length window as valid, not reversed', () => {
    const instant = new Date(2026, 0, 15, 12, 0, 0)
    expect(resolveDateRange(absoluteDateRange(instant, instant), NOW)).toEqual({
      start: instant,
      end: instant,
    })
  })
})

describe('resolveDateRange — purity', () => {
  it('never mutates the instants it was handed', () => {
    const anchor = new Date(2026, 0, 15, 9, 0, 0)
    const anchorMillis = anchor.getTime()
    const nowMillis = NOW.getTime()
    resolveDateRange(weekDateRange(anchor), NOW)
    resolveDateRange(todayDateRange, NOW)
    expect(anchor.getTime()).toBe(anchorMillis)
    expect(NOW.getTime()).toBe(nowMillis)
  })
})
