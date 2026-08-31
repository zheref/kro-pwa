import { describe, expect, it } from 'vitest'
import { Month, monthFromDate, monthFromRawValue, monthsOfYear } from '../Month'

describe('Month canon parity', () => {
  it('numbers the twelve months 1 through 12, as canon’s UInt8 raws do', () => {
    expect(monthsOfYear).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('anchors January at 1 and December at 12', () => {
    expect(Month.january).toBe(1)
    expect(Month.december).toBe(12)
  })

  it('names all twelve exactly once', () => {
    expect(Object.keys(Month)).toHaveLength(12)
    expect(new Set(monthsOfYear).size).toBe(12)
  })
})

describe('monthFromRawValue', () => {
  it('narrows a valid month number', () => {
    expect(monthFromRawValue(7)).toBe(Month.july)
  })

  it('rejects numbers outside 1…12', () => {
    expect(monthFromRawValue(0)).toBeNull()
    expect(monthFromRawValue(13)).toBeNull()
    expect(monthFromRawValue(-1)).toBeNull()
  })

  it('rejects a non-integer', () => {
    expect(monthFromRawValue(7.5)).toBeNull()
    expect(monthFromRawValue(Number.NaN)).toBeNull()
  })
})

describe('monthFromDate', () => {
  it('converts JavaScript’s 0-based January to canon’s 1', () => {
    expect(monthFromDate(new Date(2026, 0, 15))).toBe(Month.january)
  })

  it('converts JavaScript’s 11 to December', () => {
    expect(monthFromDate(new Date(2026, 11, 25))).toBe(Month.december)
  })

  it('agrees with monthFromRawValue across the whole year', () => {
    for (let index = 0; index < 12; index += 1) {
      expect(monthFromDate(new Date(2026, index, 1))).toBe(
        monthFromRawValue(index + 1),
      )
    }
  })
})
