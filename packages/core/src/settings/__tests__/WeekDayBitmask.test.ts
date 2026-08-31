import { describe, expect, it } from 'vitest'
import { WeekDay, weekDays } from '../../domain/shared/WeekDay'
import {
  ALL_WEEK_DAYS_BITMASK,
  MONDAY_TO_FRIDAY_BITMASK,
  isValidWeekDaysBitmask,
  weekDayBit,
  weekDaysBitmask,
  weekDaysFromBitmask,
} from '../WeekDayBitmask'

describe('weekDayBit', () => {
  it('pins Monday at bit 0 through Sunday at bit 6 — the persisted format', () => {
    expect(weekDays.map(weekDayBit)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('gives every weekday a distinct bit', () => {
    expect(new Set(weekDays.map(weekDayBit)).size).toBe(7)
  })
})

describe('weekDaysBitmask', () => {
  it('packs Mon–Fri as 31 — the working-days default', () => {
    expect(MONDAY_TO_FRIDAY_BITMASK).toBe(31)
    expect(
      weekDaysBitmask([
        WeekDay.monday,
        WeekDay.tuesday,
        WeekDay.wednesday,
        WeekDay.thursday,
        WeekDay.friday,
      ]),
    ).toBe(31)
  })

  it('packs an empty week as 0 — a user who works no days', () => {
    expect(weekDaysBitmask([])).toBe(0)
  })

  it('packs the whole week as 127', () => {
    expect(ALL_WEEK_DAYS_BITMASK).toBe(127)
    expect(weekDaysBitmask(weekDays)).toBe(127)
  })

  it('is idempotent for a repeated day, as a set union is', () => {
    expect(weekDaysBitmask([WeekDay.monday, WeekDay.monday])).toBe(
      weekDaysBitmask([WeekDay.monday]),
    )
  })
})

describe('weekDaysFromBitmask', () => {
  it('unpacks the working-days default back to Monday through Friday, in order', () => {
    expect(weekDaysFromBitmask(31)).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
    ])
  })

  it('unpacks a weekend-only mask', () => {
    const mask = weekDaysBitmask([WeekDay.saturday, WeekDay.sunday])
    expect(weekDaysFromBitmask(mask)).toEqual(['saturday', 'sunday'])
  })

  it('unpacks an empty mask to no days at all', () => {
    expect(weekDaysFromBitmask(0)).toEqual([])
  })

  it('round-trips every possible weekday set', () => {
    for (let mask = 0; mask <= ALL_WEEK_DAYS_BITMASK; mask += 1) {
      expect(weekDaysBitmask(weekDaysFromBitmask(mask))).toBe(mask)
    }
  })

  it('ignores bits above Sunday rather than inventing an eighth day', () => {
    expect(weekDaysFromBitmask(0b1_0000001)).toEqual(['monday'])
  })
})

describe('isValidWeekDaysBitmask', () => {
  it('accepts every real weekday set', () => {
    expect(isValidWeekDaysBitmask(0)).toBe(true)
    expect(isValidWeekDaysBitmask(31)).toBe(true)
    expect(isValidWeekDaysBitmask(127)).toBe(true)
  })

  it('rejects a mask carrying a bit no weekday owns — a corrupt or future format', () => {
    expect(isValidWeekDaysBitmask(128)).toBe(false)
    expect(isValidWeekDaysBitmask(255)).toBe(false)
  })

  it('rejects a negative or fractional mask', () => {
    expect(isValidWeekDaysBitmask(-1)).toBe(false)
    expect(isValidWeekDaysBitmask(1.5)).toBe(false)
  })
})
