import { describe, expect, it } from 'vitest'
import {
  APPLE_REFERENCE_EPOCH_SECONDS,
  appleTimeIntervalFromDate,
  dateFromAppleTimeInterval,
  dateFromEpochMillis,
  epochMillisFromDate,
} from '../EpochMillis'

describe('epochMillisFromDate — the watermark every row is compared by', () => {
  it('agrees with Swift for the Unix epoch itself', () => {
    expect(epochMillisFromDate(new Date(0))).toBe(0)
  })

  it('agrees with Swift for a stamp taken mid-2026', () => {
    // 2026-01-15T09:00:00Z, the instant the shared fixtures are anchored to.
    const instant = new Date(Date.UTC(2026, 0, 15, 9, 0, 0))
    expect(epochMillisFromDate(instant)).toBe(1_768_467_600_000)
  })

  it('carries a pre-epoch instant as a negative, not as a wrapped value', () => {
    const birthDate = new Date(Date.UTC(1815, 11, 10))
    expect(epochMillisFromDate(birthDate)).toBeLessThan(0)
    expect(dateFromEpochMillis(epochMillisFromDate(birthDate))).toEqual(
      birthDate,
    )
  })

  it('round-trips every instant a Date can hold, to the millisecond', () => {
    for (const instant of [
      new Date(0),
      new Date(Date.UTC(2026, 7, 31, 4, 33, 12, 501)),
      new Date(Date.UTC(1970, 0, 1, 0, 0, 0, 1)),
    ]) {
      expect(dateFromEpochMillis(epochMillisFromDate(instant))).toEqual(instant)
    }
  })
})

describe('Apple reference epoch — the sessionFragments encoding', () => {
  it('places 2001-01-01T00:00:00Z at exactly zero, as Swift does', () => {
    const referenceDate = new Date(Date.UTC(2001, 0, 1, 0, 0, 0))
    expect(appleTimeIntervalFromDate(referenceDate)).toBe(0)
  })

  it('is 978_307_200 seconds after the Unix epoch', () => {
    expect(appleTimeIntervalFromDate(new Date(0))).toBe(
      -APPLE_REFERENCE_EPOCH_SECONDS,
    )
  })

  it('produces the number Swift writes for a known session start', () => {
    // Swift: Date(timeIntervalSince1970: 1_768_467_600).timeIntervalSinceReferenceDate
    const instant = new Date(Date.UTC(2026, 0, 15, 9, 0, 0))
    expect(appleTimeIntervalFromDate(instant)).toBe(790_160_400)
  })

  it('round-trips a fractional-second instant without drift', () => {
    const instant = new Date(Date.UTC(2026, 0, 15, 9, 0, 0, 250))
    expect(
      dateFromAppleTimeInterval(appleTimeIntervalFromDate(instant)),
    ).toEqual(instant)
  })

  it('is NOT the Unix epoch — the mistake this constant exists to prevent', () => {
    const instant = new Date(Date.UTC(2026, 0, 15, 9, 0, 0))
    expect(appleTimeIntervalFromDate(instant)).not.toBe(
      instant.getTime() / 1000,
    )
  })
})
