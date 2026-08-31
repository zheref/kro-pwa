import { describe, expect, it } from 'vitest'
import { WeekDay, weekDayFromRawValue, weekDays } from '../WeekDay'

describe('WeekDay canon parity', () => {
  it('has exactly canon’s seven cases in declaration order', () => {
    expect(weekDays).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ])
  })

  it('uses the lowercase case name as the raw value, as Swift does', () => {
    expect(WeekDay.wednesday).toBe('wednesday')
    expect(WeekDay.sunday).toBe('sunday')
  })

  it('lists every declared member exactly once', () => {
    expect(new Set(weekDays).size).toBe(weekDays.length)
    expect(weekDays.length).toBe(Object.keys(WeekDay).length)
  })
})

describe('weekDayFromRawValue', () => {
  it('narrows a known raw value', () => {
    expect(weekDayFromRawValue('friday')).toBe(WeekDay.friday)
  })

  it('returns null for an unknown string', () => {
    expect(weekDayFromRawValue('caturday')).toBeNull()
  })

  it('is case-sensitive — the wire form is lowercase', () => {
    expect(weekDayFromRawValue('Monday')).toBeNull()
  })

  it('round-trips every case', () => {
    for (const day of weekDays) {
      expect(weekDayFromRawValue(day)).toBe(day)
    }
  })
})
