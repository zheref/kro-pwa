/**
 * The pure conversions the preference controls sit on.
 */
import { WeekDay } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  ACCENT_SWATCH_COLOR,
  accentSwatchColor,
  deviceTimeZone,
  knownTimeZones,
  timeInputMinutes,
  timeInputValue,
  timeZoneLabel,
  weekDayLetter,
  weekDayName,
  weekDaysBitmaskHas,
  weekDaysBitmaskToggling,
} from '../settingsFormatting'

describe('minutes → the time input wire format', () => {
  it('renders canon 09:00 default with both fields padded', () => {
    expect(timeInputValue(9 * 60)).toBe('09:00')
  })

  it('renders a non-round time', () => {
    expect(timeInputValue(7 * 60 + 30)).toBe('07:30')
  })

  it('renders midnight as 00:00 rather than 24:00', () => {
    expect(timeInputValue(0)).toBe('00:00')
  })

  it('clamps a corrupt out-of-range value to the end of the day, never wrapping', () => {
    expect(timeInputValue(1500)).toBe('23:59')
    expect(timeInputValue(-30)).toBe('00:00')
  })
})

describe('the time input wire format → minutes', () => {
  it('reads a padded time', () => {
    expect(timeInputMinutes('17:00')).toBe(17 * 60)
  })

  it('reads an unpadded hour, which some browsers emit', () => {
    expect(timeInputMinutes('7:05')).toBe(7 * 60 + 5)
  })

  it('answers null for an empty field rather than writing midnight', () => {
    expect(timeInputMinutes('')).toBeNull()
  })

  it('answers null for an impossible time rather than clamping it into the store', () => {
    expect(timeInputMinutes('25:00')).toBeNull()
    expect(timeInputMinutes('12:75')).toBeNull()
  })
})

describe('the weekday chips', () => {
  it('labels a chip with canon single uppercase letter', () => {
    expect(weekDayLetter(WeekDay.monday)).toBe('M')
    expect(weekDayLetter(WeekDay.sunday)).toBe('S')
  })

  it('speaks the full capitalized name, as canon accessibility label does', () => {
    expect(weekDayName(WeekDay.wednesday)).toBe('Wednesday')
  })

  it('adds a day to the mask, and reports it present', () => {
    const withSaturday = weekDaysBitmaskToggling(0, WeekDay.saturday)

    expect(weekDaysBitmaskHas(withSaturday, WeekDay.saturday)).toBe(true)
    expect(weekDaysBitmaskHas(withSaturday, WeekDay.monday)).toBe(false)
  })

  it('removes a day already in the mask', () => {
    const both = weekDaysBitmaskToggling(
      weekDaysBitmaskToggling(0, WeekDay.monday),
      WeekDay.friday,
    )
    const withoutMonday = weekDaysBitmaskToggling(both, WeekDay.monday)

    expect(weekDaysBitmaskHas(withoutMonday, WeekDay.monday)).toBe(false)
    expect(weekDaysBitmaskHas(withoutMonday, WeekDay.friday)).toBe(true)
  })

  it('produces the same mask whatever order the days were pressed in', () => {
    const forwards = weekDaysBitmaskToggling(
      weekDaysBitmaskToggling(0, WeekDay.monday),
      WeekDay.thursday,
    )
    const backwards = weekDaysBitmaskToggling(
      weekDaysBitmaskToggling(0, WeekDay.thursday),
      WeekDay.monday,
    )

    expect(forwards).toBe(backwards)
  })

  it('reports nothing selected on an empty mask', () => {
    expect(weekDaysBitmaskHas(0, WeekDay.monday)).toBe(false)
  })
})

describe('the accent swatches', () => {
  it('maps every canon choice to a colour', () => {
    for (const choice of [
      'blue',
      'purple',
      'green',
      'orange',
      'pink',
      'graphite',
    ]) {
      expect(ACCENT_SWATCH_COLOR[choice]).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('maps graphite to canon Color(white: 0.4)', () => {
    expect(accentSwatchColor('graphite')).toBe('#666666')
  })

  it('falls back to a neutral for an unknown raw value rather than rendering nothing', () => {
    expect(accentSwatchColor('chartreuse')).toBe('#666666')
  })
})

describe('time zones', () => {
  it('offers a non-empty list', () => {
    expect(knownTimeZones().length).toBeGreaterThan(0)
  })

  it('offers IANA identifiers rather than offsets', () => {
    // `Intl.supportedValuesOf` answers `Etc/UTC` where the fallback answers
    // `UTC`, so the assertion is on the *shape* both agree on rather than on a
    // single identifier only one of them has.
    expect(knownTimeZones().some((zone) => zone.includes('/'))).toBe(true)
  })

  it('answers a device zone rather than an empty string', () => {
    expect(deviceTimeZone().length).toBeGreaterThan(0)
  })

  it('spaces an identifier underscores, as canon Picker does', () => {
    expect(timeZoneLabel('America/New_York')).toBe('America/New York')
  })
})
