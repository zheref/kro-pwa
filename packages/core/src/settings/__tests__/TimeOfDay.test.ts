import { describe, expect, it } from 'vitest'
import {
  MINUTES_PER_DAY,
  isSameTimeOfDay,
  makeTimeOfDay,
  timeOfDayFromMinutesFromMidnight,
  timeOfDayMinutesFromMidnight,
} from '../TimeOfDay'

describe('makeTimeOfDay', () => {
  it('keeps a plain working-hours start unchanged', () => {
    expect(makeTimeOfDay(9, 0)).toEqual({ hour: 9, minute: 0 })
  })

  it('clamps an hour past midnight down to 23 rather than wrapping it to 1', () => {
    expect(makeTimeOfDay(25, 30)).toEqual({ hour: 23, minute: 30 })
  })

  it('clamps a negative hour and an over-long minute up and down to the day', () => {
    expect(makeTimeOfDay(-4, 90)).toEqual({ hour: 0, minute: 59 })
  })
})

describe('minutes from midnight', () => {
  it('stores 09:00 as 540 — the working-hours-start default', () => {
    expect(timeOfDayMinutesFromMidnight(makeTimeOfDay(9, 0))).toBe(540)
  })

  it('stores 17:00 as 1020 and 08:00 as 480 — the other two canon defaults', () => {
    expect(timeOfDayMinutesFromMidnight(makeTimeOfDay(17, 0))).toBe(1020)
    expect(timeOfDayMinutesFromMidnight(makeTimeOfDay(8, 0))).toBe(480)
  })

  it('reads back every minute of the day it wrote', () => {
    for (let minutes = 0; minutes < MINUTES_PER_DAY; minutes += 37) {
      const time = timeOfDayFromMinutesFromMidnight(minutes)
      expect(timeOfDayMinutesFromMidnight(time)).toBe(minutes)
    }
  })

  it('wraps a stored value past midnight back into the same day', () => {
    expect(timeOfDayFromMinutesFromMidnight(MINUTES_PER_DAY)).toEqual({
      hour: 0,
      minute: 0,
    })
    expect(timeOfDayFromMinutesFromMidnight(MINUTES_PER_DAY + 90)).toEqual({
      hour: 1,
      minute: 30,
    })
  })

  it('wraps a negative stored value forwards, where a bare % would leave it negative', () => {
    expect(timeOfDayFromMinutesFromMidnight(-60)).toEqual({
      hour: 23,
      minute: 0,
    })
  })
})

describe('isSameTimeOfDay', () => {
  it('matches two independently-built 08:00 values', () => {
    expect(
      isSameTimeOfDay(
        makeTimeOfDay(8, 0),
        timeOfDayFromMinutesFromMidnight(480),
      ),
    ).toBe(true)
  })

  it('separates times that differ by a minute', () => {
    expect(isSameTimeOfDay(makeTimeOfDay(8, 0), makeTimeOfDay(8, 1))).toBe(
      false,
    )
  })

  it('separates times that differ by an hour', () => {
    expect(isSameTimeOfDay(makeTimeOfDay(8, 0), makeTimeOfDay(9, 0))).toBe(
      false,
    )
  })
})
