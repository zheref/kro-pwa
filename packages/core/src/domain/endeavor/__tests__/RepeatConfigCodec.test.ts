/**
 * Issue #7 acceptance criterion 3: "RepeatConfig round-trips through its codec
 * for all four bases."
 *
 * The suite proves three separate things, because a round-trip alone would not
 * catch a shape that is self-consistent but wrong:
 *
 *  1. the **encoded shape** is byte-for-byte what Swift's `Codable` writes
 *     (the literals below are the contract with KroApple and KroAndroid);
 *  2. every value survives `encode → JSON.stringify → JSON.parse → decode`;
 *  3. every malformed input produces a typed exception rather than a throw or
 *     a silently-wrong value.
 */
import { describe, expect, it } from 'vitest'
import { Month } from '../../shared/Month'
import { WeekDay } from '../../shared/WeekDay'
import {
  allRepeatConfigMocks,
  repeatConfigMocks,
} from '../__mocks__/EndeavorRelations.mocks'
import {
  dailyBase,
  makeRepeatConfig,
  monthlyBase,
  weeklyBase,
  yearlyBase,
} from '../RepeatConfig'
import {
  decodeRepeatBase,
  decodeRepeatConfig,
  encodeRepeatBase,
  encodeRepeatConfig,
  repeatConfigExceptionCopy,
} from '../RepeatConfigCodec'

/** `encode → stringify → parse → decode`, the full wire crossing. */
const roundTrip = (config: Parameters<typeof encodeRepeatConfig>[0]) =>
  decodeRepeatConfig(JSON.parse(JSON.stringify(encodeRepeatConfig(config))))

describe('encoded shape matches Swift’s Codable output', () => {
  it('writes a daily base as `{ type: "daily" }` and nothing else', () => {
    expect(encodeRepeatBase(dailyBase())).toEqual({ type: 'daily' })
  })

  it('writes a weekly base with the lowercase day NAMES', () => {
    expect(
      encodeRepeatBase(weeklyBase([WeekDay.monday, WeekDay.friday])),
    ).toEqual({
      type: 'weekly',
      weekdays: ['monday', 'friday'],
    })
  })

  it('writes a monthly base with just `day`', () => {
    expect(encodeRepeatBase(monthlyBase(15))).toEqual({
      type: 'monthly',
      day: 15,
    })
  })

  it('writes a yearly base with `month` as a NUMBER, not a name', () => {
    expect(encodeRepeatBase(yearlyBase(3, Month.july))).toEqual({
      type: 'yearly',
      day: 3,
      month: 7,
    })
  })

  it('nests the base under `base` alongside `everyOther`', () => {
    expect(encodeRepeatConfig(makeRepeatConfig(dailyBase(), 2))).toEqual({
      base: { type: 'daily' },
      everyOther: 2,
    })
  })

  it('serializes to the exact JSON KroApple writes', () => {
    expect(
      JSON.stringify(encodeRepeatConfig(makeRepeatConfig(dailyBase()))),
    ).toBe('{"base":{"type":"daily"},"everyOther":1}')
    expect(
      JSON.stringify(
        encodeRepeatConfig(makeRepeatConfig(yearlyBase(29, Month.february), 4)),
      ),
    ).toBe('{"base":{"type":"yearly","day":29,"month":2},"everyOther":4}')
  })
})

describe('round-trip — all four bases (AC 3)', () => {
  it('round-trips daily', () => {
    const config = makeRepeatConfig(dailyBase())
    expect(roundTrip(config)).toEqual({ ok: true, value: config })
  })

  it('round-trips weekly', () => {
    const config = makeRepeatConfig(
      weeklyBase([WeekDay.monday, WeekDay.wednesday, WeekDay.friday]),
      2,
    )
    expect(roundTrip(config)).toEqual({ ok: true, value: config })
  })

  it('round-trips monthly', () => {
    const config = makeRepeatConfig(monthlyBase(31), 3)
    expect(roundTrip(config)).toEqual({ ok: true, value: config })
  })

  it('round-trips yearly', () => {
    const config = makeRepeatConfig(yearlyBase(29, Month.february), 4)
    expect(roundTrip(config)).toEqual({ ok: true, value: config })
  })

  it('round-trips every fixture in the mock spread', () => {
    for (const config of allRepeatConfigMocks) {
      expect(roundTrip(config)).toEqual({ ok: true, value: config })
    }
  })

  it('round-trips a weekly rule with an empty weekday list', () => {
    const config = repeatConfigMocks.weeklyWithNoDays
    const decoded = roundTrip(config)
    expect(decoded.ok).toBe(true)
    expect(decoded.ok && decoded.value.base).toEqual({
      type: 'weekly',
      weekdays: [],
    })
  })

  it('round-trips every month number 1…12 without shifting by one', () => {
    for (let month = 1 as number; month <= 12; month += 1) {
      const config = makeRepeatConfig(yearlyBase(1, month as Month))
      const decoded = roundTrip(config)
      expect(decoded.ok && decoded.value.base).toEqual({
        type: 'yearly',
        day: 1,
        month,
      })
    }
  })
})

describe('decoding a rule written by KroApple', () => {
  it('accepts a literal Swift-encoded daily rule', () => {
    expect(
      decodeRepeatConfig(
        JSON.parse('{"base":{"type":"daily"},"everyOther":1}'),
      ),
    ).toEqual({ ok: true, value: makeRepeatConfig(dailyBase(), 1) })
  })

  it('accepts a literal Swift-encoded weekly rule', () => {
    expect(
      decodeRepeatConfig(
        JSON.parse(
          '{"base":{"type":"weekly","weekdays":["saturday","sunday"]},"everyOther":1}',
        ),
      ),
    ).toEqual({
      ok: true,
      value: makeRepeatConfig(weeklyBase([WeekDay.saturday, WeekDay.sunday])),
    })
  })

  it('defaults a missing `everyOther` to canon’s 1', () => {
    const decoded = decodeRepeatConfig({ base: { type: 'monthly', day: 5 } })
    expect(decoded).toEqual({
      ok: true,
      value: makeRepeatConfig(monthlyBase(5), 1),
    })
  })

  it('ignores keys the case does not use', () => {
    expect(
      decodeRepeatConfig({
        base: { type: 'daily', day: 9, weekdays: ['monday'] },
        everyOther: 1,
      }),
    ).toEqual({ ok: true, value: makeRepeatConfig(dailyBase()) })
  })
})

describe('wire tolerance matches canon, deliberately', () => {
  // Canon decodes `day` and `everyOther` as bare `Int`s with no bounds. A
  // stricter reader here would reject rules KroApple round-trips happily, so
  // the web would lose an endeavor the phone still shows. These assertions
  // exist so the tolerance reads as a decision, not an oversight — see the
  // notes on `decodeDay` and `decodeRepeatConfig`.

  it('accepts a day of 0, which no calendar has', () => {
    const decoded = decodeRepeatConfig({ base: { type: 'monthly', day: 0 } })
    expect(decoded).toEqual({
      ok: true,
      value: makeRepeatConfig(monthlyBase(0)),
    })
  })

  it('accepts a negative day and a day past the end of any month', () => {
    expect(decodeRepeatConfig({ base: { type: 'monthly', day: -5 } }).ok).toBe(
      true,
    )
    expect(decodeRepeatConfig({ base: { type: 'monthly', day: 99 } }).ok).toBe(
      true,
    )
  })

  it('accepts an everyOther of 0 and a negative one', () => {
    expect(
      decodeRepeatConfig({ base: { type: 'daily' }, everyOther: 0 }),
    ).toEqual({ ok: true, value: makeRepeatConfig(dailyBase(), 0) })
    expect(
      decodeRepeatConfig({ base: { type: 'daily' }, everyOther: -2 }),
    ).toEqual({ ok: true, value: makeRepeatConfig(dailyBase(), -2) })
  })

  it('still rejects the SHAPE — a non-number day or multiplier', () => {
    expect(
      decodeRepeatConfig({ base: { type: 'monthly', day: '15' } }).ok,
    ).toBe(false)
    expect(
      decodeRepeatConfig({ base: { type: 'daily' }, everyOther: 'two' }).ok,
    ).toBe(false)
  })

  it('still rejects a month outside 1…12, because Month IS a closed enum', () => {
    // The asymmetry is canon's: `month` decodes through `Month(rawValue:)`,
    // which fails outside its cases, while `day` is a plain `Int`.
    expect(
      decodeRepeatConfig({ base: { type: 'yearly', day: 1, month: 0 } }).ok,
    ).toBe(false)
  })

  it('round-trips an out-of-range day rather than mangling it', () => {
    const config = makeRepeatConfig(monthlyBase(0), 0)
    expect(roundTrip(config)).toEqual({ ok: true, value: config })
  })
})

describe('decoding failures are typed, never thrown', () => {
  it('rejects a non-object', () => {
    const decoded = decodeRepeatConfig('daily')
    expect(decoded).toEqual({
      ok: false,
      error: expect.objectContaining({ kind: 'notAnObject' }),
    })
  })

  it('rejects an array, which is an object but not a record', () => {
    expect(decodeRepeatConfig([]).ok).toBe(false)
  })

  it('rejects a rule with no base', () => {
    expect(decodeRepeatConfig({ everyOther: 2 })).toEqual({
      ok: false,
      error: expect.objectContaining({ kind: 'missingBase' }),
    })
  })

  it('rejects an unknown base type', () => {
    expect(decodeRepeatConfig({ base: { type: 'hourly' } })).toEqual({
      ok: false,
      error: expect.objectContaining({ kind: 'unknownBaseType' }),
    })
  })

  it('rejects a weekly rule with no weekdays key', () => {
    expect(decodeRepeatConfig({ base: { type: 'weekly' } })).toEqual({
      ok: false,
      error: expect.objectContaining({ kind: 'missingField' }),
    })
  })

  it('rejects a weekday that names no case', () => {
    expect(
      decodeRepeatConfig({ base: { type: 'weekly', weekdays: ['caturday'] } }),
    ).toEqual({
      ok: false,
      error: expect.objectContaining({ kind: 'invalidWeekday' }),
    })
  })

  it('rejects a monthly rule with no day, and one whose day is not a number', () => {
    expect(decodeRepeatConfig({ base: { type: 'monthly' } })).toEqual({
      ok: false,
      error: expect.objectContaining({ kind: 'missingField' }),
    })
    expect(
      decodeRepeatConfig({ base: { type: 'monthly', day: '15' } }),
    ).toEqual({
      ok: false,
      error: expect.objectContaining({ kind: 'invalidDay' }),
    })
  })

  it('rejects a month outside 1…12', () => {
    expect(
      decodeRepeatConfig({ base: { type: 'yearly', day: 1, month: 13 } }),
    ).toEqual({
      ok: false,
      error: expect.objectContaining({ kind: 'invalidMonth' }),
    })
  })

  it('rejects a non-integer everyOther', () => {
    expect(
      decodeRepeatConfig({ base: { type: 'daily' }, everyOther: 1.5 }),
    ).toEqual({
      ok: false,
      error: expect.objectContaining({ kind: 'invalidEveryOther' }),
    })
  })

  it('reports the first failure for a base that is not an object', () => {
    expect(decodeRepeatBase(42)).toEqual({
      ok: false,
      error: expect.objectContaining({ kind: 'notAnObject' }),
    })
  })

  it('marks every failure unrecoverable — retrying will not fix bad data', () => {
    const failures = [
      decodeRepeatConfig('daily'),
      decodeRepeatConfig({ everyOther: 2 }),
      decodeRepeatConfig({ base: { type: 'hourly' } }),
    ]
    for (const failure of failures) {
      expect(failure.ok).toBe(false)
      if (!failure.ok) expect(failure.error.recoverable).toBe(false)
    }
  })
})

describe('repeatConfigExceptionCopy', () => {
  it('has non-empty copy for every failure kind', () => {
    const failures = [
      decodeRepeatConfig('daily'),
      decodeRepeatConfig({ everyOther: 1 }),
      decodeRepeatConfig({ base: { type: 'hourly' } }),
      decodeRepeatConfig({ base: { type: 'weekly' } }),
      decodeRepeatConfig({ base: { type: 'weekly', weekdays: ['nope'] } }),
      decodeRepeatConfig({ base: { type: 'yearly', day: 1, month: 99 } }),
      decodeRepeatConfig({ base: { type: 'monthly', day: null } }),
      decodeRepeatConfig({ base: { type: 'daily' }, everyOther: 'two' }),
    ]
    const kinds = new Set<string>()
    for (const failure of failures) {
      expect(failure.ok).toBe(false)
      if (failure.ok) continue
      kinds.add(failure.error.kind)
      expect(repeatConfigExceptionCopy(failure.error).length).toBeGreaterThan(0)
    }
    expect(kinds.size).toBe(8)
  })

  it('never leaks the developer-facing message as user copy', () => {
    const failure = decodeRepeatConfig({ base: { type: 'hourly' } })
    expect(failure.ok).toBe(false)
    if (failure.ok) return
    expect(repeatConfigExceptionCopy(failure.error)).not.toBe(
      failure.error.message,
    )
  })

  it('gives a distinct sentence to each of the eight kinds', () => {
    const failures = [
      decodeRepeatConfig('daily'),
      decodeRepeatConfig({ everyOther: 1 }),
      decodeRepeatConfig({ base: { type: 'hourly' } }),
      decodeRepeatConfig({ base: { type: 'weekly' } }),
      decodeRepeatConfig({ base: { type: 'weekly', weekdays: ['nope'] } }),
      decodeRepeatConfig({ base: { type: 'yearly', day: 1, month: 99 } }),
      decodeRepeatConfig({ base: { type: 'monthly', day: null } }),
      decodeRepeatConfig({ base: { type: 'daily' }, everyOther: 'two' }),
    ]
    const copies = failures.flatMap((failure) =>
      failure.ok ? [] : [repeatConfigExceptionCopy(failure.error)],
    )
    expect(new Set(copies).size).toBe(8)
  })
})
