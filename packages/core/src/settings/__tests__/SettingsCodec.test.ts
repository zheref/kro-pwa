import { describe, expect, it } from 'vitest'
import { WeekDay } from '../../domain/shared/WeekDay'
import { settingOptionMocks } from '../__mocks__/SettingOption.mocks'
import { decodeSettingValue, encodeSettingValue } from '../SettingsCodec'
import {
  planDayViewRangeOption,
  timezoneOption,
  workingDaysOption,
  workingHoursStartOption,
} from '../SettingOptions'
import { makeTimeOfDay } from '../TimeOfDay'

describe('encodeSettingValue', () => {
  it('flattens a clock time to minutes from midnight before it is stored', () => {
    expect(
      encodeSettingValue(workingHoursStartOption, makeTimeOfDay(9, 30)),
    ).toBe(570)
  })

  it('packs a weekday list to its bitmask before it is stored', () => {
    expect(
      encodeSettingValue(workingDaysOption, [WeekDay.saturday, WeekDay.sunday]),
    ).toBe(96)
  })

  it('passes an already-stored primitive straight through', () => {
    expect(encodeSettingValue(settingOptionMocks.cloudToggle, false)).toBe(
      false,
    )
    expect(encodeSettingValue(settingOptionMocks.duration, 45)).toBe(45)
    expect(encodeSettingValue(settingOptionMocks.picker, 'legacy')).toBe(
      'legacy',
    )
  })

  it('truncates a fractional duration rather than storing a float', () => {
    expect(encodeSettingValue(settingOptionMocks.duration, 25.9)).toBe(25)
  })

  it('refuses a value of the wrong shape instead of persisting it', () => {
    expect(encodeSettingValue(settingOptionMocks.cloudToggle, 'yes')).toBeNull()
    expect(encodeSettingValue(settingOptionMocks.duration, true)).toBeNull()
    expect(
      encodeSettingValue(workingHoursStartOption, 'nine o clock'),
    ).toBeNull()
  })
})

describe('decodeSettingValue', () => {
  it('returns the stored value when it matches the option type', () => {
    expect(decodeSettingValue(settingOptionMocks.duration, 45)).toBe(45)
    expect(decodeSettingValue(settingOptionMocks.cloudToggle, false)).toBe(
      false,
    )
  })

  it('falls back to the declared default when the key was never written', () => {
    expect(decodeSettingValue(settingOptionMocks.duration, null)).toBe(25)
    expect(decodeSettingValue(workingHoursStartOption, undefined)).toBe(540)
  })

  it('falls back to the default when a stored value has the wrong primitive, rather than coercing to false or zero', () => {
    expect(decodeSettingValue(settingOptionMocks.cloudToggle, 'true')).toBe(
      true,
    )
    expect(decodeSettingValue(settingOptionMocks.duration, 'twenty')).toBe(25)
  })

  it('resolves null for an option whose default is itself null', () => {
    expect(decodeSettingValue(timezoneOption, null)).toBeNull()
    expect(decodeSettingValue(settingOptionMocks.noDefault, null)).toBeNull()
  })

  it('reads a stored timezone back verbatim, and discards a non-string one', () => {
    expect(decodeSettingValue(timezoneOption, 'America/Bogota')).toBe(
      'America/Bogota',
    )
    expect(decodeSettingValue(timezoneOption, 42)).toBeNull()
  })

  it('reads a stored clock time back as its minute count, and rejects one that is not a number', () => {
    expect(decodeSettingValue(workingHoursStartOption, 450)).toBe(450)
    expect(decodeSettingValue(workingHoursStartOption, '450')).toBe(540)
    expect(decodeSettingValue(workingHoursStartOption, Number.NaN)).toBe(540)
  })

  it('truncates a fractional stored count rather than handing back a float', () => {
    expect(decodeSettingValue(settingOptionMocks.duration, 30.7)).toBe(30)
    expect(decodeSettingValue(workingHoursStartOption, 450.5)).toBe(450)
  })

  it('discards an enumeration raw value that names no case — canon keeps it, we do not', () => {
    expect(decodeSettingValue(planDayViewRangeOption, 'waking')).toBe('waking')
    expect(decodeSettingValue(planDayViewRangeOption, 'nocturnal')).toBe('full')
  })

  it('discards a weekday bitmask carrying an impossible bit', () => {
    expect(decodeSettingValue(workingDaysOption, 96)).toBe(96)
    expect(decodeSettingValue(workingDaysOption, 255)).toBe(31)
  })

  it('round-trips every mock option through encode and back', () => {
    const written = [
      [settingOptionMocks.cloudToggle, true],
      [settingOptionMocks.duration, 50],
      [settingOptionMocks.picker, 'legacy'],
      [settingOptionMocks.lateTime, makeTimeOfDay(23, 59)],
      [settingOptionMocks.workdays, [WeekDay.wednesday]],
    ] as const

    for (const [option, value] of written) {
      const encoded = encodeSettingValue(option, value)
      expect(encoded).not.toBeNull()
      expect(decodeSettingValue(option, encoded)).toBe(encoded)
    }
  })
})
