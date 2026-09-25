import { describe, expect, it } from 'vitest'
import {
  dayProgressSubtitle,
  durationPill,
  outcomeLabel,
  timeRange,
  weekdayAccessibleName,
  weekdayLetter,
} from '../dayProgressFormat'

const thursday = new Date(2026, 8, 24)
const at = (h: number, m: number) => new Date(2026, 8, 24, h, m)

describe('dayProgressSubtitle', () => {
  it('today reads "Today · Thu, Sep 24"', () => {
    expect(dayProgressSubtitle('today', thursday)).toBe('Today · Thu, Sep 24')
  })

  it('yesterday is prefixed', () => {
    expect(dayProgressSubtitle('yesterday', thursday)).toBe(
      'Yesterday · Thu, Sep 24',
    )
  })

  it('any other day is the full date, in the requested locale', () => {
    expect(dayProgressSubtitle('other', thursday)).toBe(
      'Thursday, September 24',
    )
    expect(dayProgressSubtitle('other', thursday, 'es-ES')).toContain('24')
  })
})

describe('weekday labels', () => {
  it('a narrow letter and a spoken full date', () => {
    expect(weekdayLetter(thursday)).toBe('T')
    expect(weekdayAccessibleName(thursday)).toBe('Thursday, September 24')
  })

  it('follows the locale', () => {
    expect(weekdayLetter(thursday, 'fr-FR')).toBe('J')
  })

  it('Sunday is S', () => {
    expect(weekdayLetter(new Date(2026, 8, 20))).toBe('S')
  })
})

describe('timeRange', () => {
  it('reads "9:00 – 9:45" without a day period', () => {
    expect(timeRange(at(9, 0), at(9, 45))).toBe('9:00 – 9:45')
  })

  it('an afternoon range drops PM too', () => {
    expect(timeRange(at(11, 0), at(12, 35))).toBe('11:00 – 12:35')
  })

  it('a 24-hour locale keeps its own clock', () => {
    expect(timeRange(at(14, 0), at(14, 20), 'de-DE')).toBe('14:00 – 14:20')
  })
})

describe('durationPill', () => {
  it('no timer', () => expect(durationPill(null)).toBe('No timer'))
  it('minutes under an hour', () => expect(durationPill(2700)).toBe('45m'))
  it('hours and minutes', () => {
    expect(durationPill(5700)).toBe('1h 35m')
    expect(durationPill(3600)).toBe('1h 0m')
  })
})

describe('outcomeLabel', () => {
  it('complete', () => expect(outcomeLabel('complete')).toBe('Complete'))
  it('aborted', () => expect(outcomeLabel('aborted')).toBe('Aborted'))
  it('finished', () =>
    expect(outcomeLabel('finished')).toBe('Session finished'))
})
