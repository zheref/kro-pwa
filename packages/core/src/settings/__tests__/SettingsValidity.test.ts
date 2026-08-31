import { describe, expect, it } from 'vitest'
import { settingOptionMocks } from '../__mocks__/SettingOption.mocks'
import {
  isStorableSettingValue,
  isWorkingHoursRangeValid,
  isWorkingHoursValid,
} from '../SettingsValidity'
import { planDayViewRangeOption, workingDaysOption } from '../SettingOptions'
import { makeTimeOfDay } from '../TimeOfDay'

describe('isWorkingHoursRangeValid', () => {
  it('accepts a normal 09:00–17:00 working day', () => {
    expect(isWorkingHoursRangeValid(540, 1020)).toBe(true)
  })

  it('rejects a day that ends before it starts — the inline warning case', () => {
    expect(isWorkingHoursRangeValid(1020, 540)).toBe(false)
  })

  it('rejects a zero-length day, because canon warns when the end is *not after* the start', () => {
    expect(isWorkingHoursRangeValid(540, 540)).toBe(false)
  })

  it('accepts a one-minute day — short, but genuinely after', () => {
    expect(isWorkingHoursRangeValid(540, 541)).toBe(true)
  })

  it('reads the same over two clock times', () => {
    expect(isWorkingHoursValid(makeTimeOfDay(9, 0), makeTimeOfDay(17, 0))).toBe(
      true,
    )
    expect(isWorkingHoursValid(makeTimeOfDay(17, 0), makeTimeOfDay(9, 0))).toBe(
      false,
    )
  })
})

describe('isStorableSettingValue', () => {
  it('accepts a value matching its option type', () => {
    expect(isStorableSettingValue(settingOptionMocks.cloudToggle, true)).toBe(
      true,
    )
    expect(isStorableSettingValue(settingOptionMocks.duration, 25)).toBe(true)
    expect(
      isStorableSettingValue(settingOptionMocks.noDefault, 'anything'),
    ).toBe(true)
  })

  it('rejects a value of the wrong primitive for its type', () => {
    expect(isStorableSettingValue(settingOptionMocks.cloudToggle, 1)).toBe(
      false,
    )
    expect(isStorableSettingValue(settingOptionMocks.duration, '25')).toBe(
      false,
    )
  })

  it('accepts only raw values the picker actually offers', () => {
    expect(isStorableSettingValue(planDayViewRangeOption, 'business')).toBe(
      true,
    )
    expect(isStorableSettingValue(planDayViewRangeOption, 'nocturnal')).toBe(
      false,
    )
  })

  it('bounds a time of day to a single day, in minutes', () => {
    expect(isStorableSettingValue(settingOptionMocks.lateTime, 1439)).toBe(true)
    expect(isStorableSettingValue(settingOptionMocks.lateTime, 1440)).toBe(
      false,
    )
    expect(isStorableSettingValue(settingOptionMocks.lateTime, -1)).toBe(false)
  })

  it('bounds a weekday set to the seven real bits', () => {
    expect(isStorableSettingValue(workingDaysOption, 127)).toBe(true)
    expect(isStorableSettingValue(workingDaysOption, 128)).toBe(false)
  })

  it('rejects a fractional int, which a store could otherwise round on read', () => {
    expect(isStorableSettingValue(settingOptionMocks.duration, 25.5)).toBe(
      false,
    )
  })
})
