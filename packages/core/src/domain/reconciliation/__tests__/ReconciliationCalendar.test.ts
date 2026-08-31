import { describe, expect, it } from 'vitest'
import {
  clockTimeKey,
  clockTimesEqual,
  systemCalendar,
  utcCalendar,
} from '../ReconciliationCalendar'

describe('the UTC calendar', () => {
  it('reads a clock time in UTC', () => {
    expect(
      utcCalendar.clockTimeOf(new Date(Date.UTC(2026, 7, 26, 7, 30, 15))),
    ).toEqual({ hour: 7, minute: 30, second: 15 })
  })

  it('calls two instants on one UTC day the same day', () => {
    expect(
      utcCalendar.isSameDay(
        new Date(Date.UTC(2026, 7, 26, 0, 0, 0)),
        new Date(Date.UTC(2026, 7, 26, 23, 59, 59)),
      ),
    ).toBe(true)
  })

  it('calls instants either side of UTC midnight different days', () => {
    expect(
      utcCalendar.isSameDay(
        new Date(Date.UTC(2026, 7, 26, 23, 59, 59)),
        new Date(Date.UTC(2026, 7, 27, 0, 0, 0)),
      ),
    ).toBe(false)
  })

  it('does not confuse the same day-of-month in another month', () => {
    expect(
      utcCalendar.isSameDay(
        new Date(Date.UTC(2026, 7, 26, 12)),
        new Date(Date.UTC(2026, 8, 26, 12)),
      ),
    ).toBe(false)
  })

  it('does not confuse the same date in another year', () => {
    expect(
      utcCalendar.isSameDay(
        new Date(Date.UTC(2026, 7, 26, 12)),
        new Date(Date.UTC(2027, 7, 26, 12)),
      ),
    ).toBe(false)
  })
})

describe('the system calendar', () => {
  it('reads a clock time in the host’s local zone', () => {
    const local = new Date(2026, 7, 26, 7, 30, 15)
    expect(systemCalendar.clockTimeOf(local)).toEqual({
      hour: 7,
      minute: 30,
      second: 15,
    })
  })

  it('calls two instants on one local day the same day', () => {
    expect(
      systemCalendar.isSameDay(
        new Date(2026, 7, 26, 0, 0, 0),
        new Date(2026, 7, 26, 23, 59, 59),
      ),
    ).toBe(true)
  })

  it('separates two adjacent local days', () => {
    expect(
      systemCalendar.isSameDay(
        new Date(2026, 7, 26, 23, 59, 59),
        new Date(2026, 7, 27, 0, 0, 0),
      ),
    ).toBe(false)
  })
})

describe('clock times as comparable values', () => {
  it('compares equal only when all three components match', () => {
    const base = { hour: 7, minute: 0, second: 0 }
    expect(clockTimesEqual(base, { hour: 7, minute: 0, second: 0 })).toBe(true)
    expect(clockTimesEqual(base, { hour: 7, minute: 0, second: 1 })).toBe(false)
    expect(clockTimesEqual(base, { hour: 8, minute: 0, second: 0 })).toBe(false)
  })

  it('zero-pads its key so components cannot run together', () => {
    // Without padding, 1:05:00 and 10:50:0 could produce colliding keys.
    expect(clockTimeKey({ hour: 1, minute: 5, second: 0 })).toBe('01:05:00')
    expect(clockTimeKey({ hour: 10, minute: 50, second: 0 })).toBe('10:50:00')
    expect(clockTimeKey({ hour: 1, minute: 5, second: 0 })).not.toBe(
      clockTimeKey({ hour: 10, minute: 50, second: 0 }),
    )
  })

  it('keys midnight distinctly from noon', () => {
    expect(clockTimeKey({ hour: 0, minute: 0, second: 0 })).not.toBe(
      clockTimeKey({ hour: 12, minute: 0, second: 0 }),
    )
  })
})
