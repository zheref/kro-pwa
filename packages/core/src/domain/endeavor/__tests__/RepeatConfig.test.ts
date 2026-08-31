import { describe, expect, it } from 'vitest'
import { Month } from '../../shared/Month'
import { WeekDay } from '../../shared/WeekDay'
import {
  RepeatBaseType,
  dailyBase,
  makeRepeatConfig,
  monthlyBase,
  repeatBaseTypes,
  weeklyBase,
  yearlyBase,
} from '../RepeatConfig'

describe('RepeatBaseType canon parity', () => {
  it('has canon’s four base types in declaration order', () => {
    expect(repeatBaseTypes).toEqual(['daily', 'weekly', 'monthly', 'yearly'])
  })

  it('uses the case name as the raw value', () => {
    expect(RepeatBaseType.yearly).toBe('yearly')
  })

  it('lists every declared member exactly once', () => {
    expect(new Set(repeatBaseTypes).size).toBe(repeatBaseTypes.length)
  })
})

describe('base constructors', () => {
  it('builds a daily base with no payload', () => {
    expect(dailyBase()).toEqual({ type: 'daily' })
  })

  it('builds a weekly base carrying its weekdays', () => {
    expect(weeklyBase([WeekDay.tuesday, WeekDay.thursday])).toEqual({
      type: 'weekly',
      weekdays: ['tuesday', 'thursday'],
    })
  })

  it('builds monthly and yearly bases carrying their day (and month)', () => {
    expect(monthlyBase(9)).toEqual({ type: 'monthly', day: 9 })
    expect(yearlyBase(25, Month.december)).toEqual({
      type: 'yearly',
      day: 25,
      month: 12,
    })
  })

  it('discriminates every base on `type`, so a switch can narrow', () => {
    const bases = [
      dailyBase(),
      weeklyBase([]),
      monthlyBase(1),
      yearlyBase(1, Month.january),
    ]
    expect(bases.map((base) => base.type)).toEqual(repeatBaseTypes)
  })
})

describe('makeRepeatConfig', () => {
  it('defaults `everyOther` to canon’s 1', () => {
    expect(makeRepeatConfig(dailyBase()).everyOther).toBe(1)
  })

  it('keeps an explicit multiplier', () => {
    expect(makeRepeatConfig(dailyBase(), 3).everyOther).toBe(3)
  })

  it('keeps the base it was handed, unchanged', () => {
    const base = weeklyBase([WeekDay.sunday])
    expect(makeRepeatConfig(base, 2).base).toBe(base)
  })
})
