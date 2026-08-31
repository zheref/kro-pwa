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
import { weekDaysFromBitmask } from '../WeekDayBitmask'

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

  it('refuses a clock time whose fields are not real numbers', () => {
    expect(
      encodeSettingValue(workingHoursStartOption, {
        hour: Number.NaN,
        minute: 0,
      }),
    ).toBeNull()
    expect(
      encodeSettingValue(workingHoursStartOption, {
        hour: 9,
        minute: Number.POSITIVE_INFINITY,
      }),
    ).toBeNull()
  })

  it('refuses NaN and Infinity for every numeric option', () => {
    expect(
      encodeSettingValue(settingOptionMocks.duration, Number.NaN),
    ).toBeNull()
    expect(
      encodeSettingValue(workingDaysOption, Number.POSITIVE_INFINITY),
    ).toBeNull()
  })

  it('refuses an array of strings that are not weekdays, prototype keys included', () => {
    expect(
      // `'toString' in WeekDay` is true through the prototype chain; membership
      // is tested against the case list so it cannot encode to a mask of 0.
      encodeSettingValue(workingDaysOption, [
        'toString',
      ] as unknown as readonly WeekDay[]),
    ).toBeNull()
    expect(
      encodeSettingValue(workingDaysOption, [
        'funday',
      ] as unknown as readonly WeekDay[]),
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

  it('keeps a weekday bitmask carrying an impossible bit, leaving the domain to ignore it', () => {
    // Shape, not range: canon reads 255 back as all seven days rather than
    // discarding a real selection, and `weekDaysFromBitmask` does the same.
    // `isStorableSettingValue` is the stricter, editor-side check.
    expect(decodeSettingValue(workingDaysOption, 96)).toBe(96)
    expect(decodeSettingValue(workingDaysOption, 255)).toBe(255)
    expect(weekDaysFromBitmask(255)).toHaveLength(7)
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
