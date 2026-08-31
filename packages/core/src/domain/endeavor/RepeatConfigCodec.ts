/**
 * The `RepeatConfig` JSON codec — the cross-platform data contract.
 *
 * A recurrence rule written by KroApple must decode here, and a rule written
 * here must decode in KroApple and KroAndroid. So the encoded shape is not a
 * design decision: it is whatever Swift's `Codable` conformance in
 * `KroCore/Model/Endeavor/Endeavor.swift` produces.
 *
 * `RepeatConfig` itself uses the **synthesized** conformance, so its keys are
 * its stored property names, `base` and `everyOther`. `Base` has a
 * hand-written one keyed by `type` / `weekdays` / `day` / `month`, writing
 * only the keys its case carries:
 *
 * ```json
 * { "base": { "type": "daily" },                                  "everyOther": 1 }
 * { "base": { "type": "weekly",  "weekdays": ["monday","friday"] }, "everyOther": 2 }
 * { "base": { "type": "monthly", "day": 15 },                      "everyOther": 1 }
 * { "base": { "type": "yearly",  "day": 3, "month": 7 },           "everyOther": 1 }
 * ```
 *
 * Note `month` is a **number** — canon encodes `month.rawValue` (`UInt8`), not
 * the case name — while `weekdays` are the lowercase day **names**, because
 * `WeekDay`'s raw value is a `String`.
 *
 * Decoding returns a `Result` (`RC-7`) rather than throwing: a malformed rule
 * is a data condition a caller must handle, not a crash. Every failure is a
 * member of the closed `RepeatConfigException` union (`RC-8`), and
 * `repeatConfigExceptionCopy` is closed with `assertNever` (`RC-9`), so adding
 * a failure mode is a compile error until its copy is written.
 */
import { assertNever } from '../../library/assertNever'
import { type Exception, exception } from '../../library/exception'
import { type Result, err, ok } from '../../library/result'
import { type Month, monthFromRawValue } from '../shared/Month'
import { type WeekDay, weekDayFromRawValue } from '../shared/WeekDay'
import {
  type RepeatBase,
  type RepeatConfig,
  RepeatBaseType,
  makeRepeatConfig,
} from './RepeatConfig'

// MARK: - Exceptions

export type RepeatConfigException =
  | Exception<'notAnObject'>
  | Exception<'missingBase'>
  | Exception<'unknownBaseType'>
  | Exception<'missingField'>
  | Exception<'invalidWeekday'>
  | Exception<'invalidMonth'>
  | Exception<'invalidDay'>
  | Exception<'invalidEveryOther'>

export const RepeatConfigExceptions = {
  notAnObject: (): RepeatConfigException =>
    exception('notAnObject', 'A repeat rule must be a JSON object.', false),

  missingBase: (): RepeatConfigException =>
    exception('missingBase', "A repeat rule has no 'base'.", false),

  unknownBaseType: (found: string): RepeatConfigException =>
    exception(
      'unknownBaseType',
      `Unknown repeat base type '${found}' — expected daily, weekly, monthly or yearly.`,
      false,
    ),

  missingField: (field: string, baseType: string): RepeatConfigException =>
    exception(
      'missingField',
      `A '${baseType}' repeat rule requires '${field}'.`,
      false,
    ),

  invalidWeekday: (found: string): RepeatConfigException =>
    exception('invalidWeekday', `'${found}' is not a weekday.`, false),

  invalidMonth: (found: unknown): RepeatConfigException =>
    exception(
      'invalidMonth',
      `'${String(found)}' is not a month number in 1…12.`,
      false,
    ),

  invalidDay: (found: unknown): RepeatConfigException =>
    exception('invalidDay', `'${String(found)}' is not a day number.`, false),

  invalidEveryOther: (found: unknown): RepeatConfigException =>
    exception(
      'invalidEveryOther',
      `'${String(found)}' is not a whole 'every other' multiplier.`,
      false,
    ),
}

/** User-facing copy per failure kind, closed with `assertNever` (`RC-9`). */
export const repeatConfigExceptionCopy = (
  value: RepeatConfigException,
): string => {
  switch (value.kind) {
    case 'notAnObject':
      return 'That repeat rule is not in a shape we understand.'
    case 'missingBase':
      return 'That repeat rule does not say how often it repeats.'
    case 'unknownBaseType':
      return 'That repeat rule uses a recurrence we do not support yet.'
    case 'missingField':
      return 'That repeat rule is missing part of its schedule.'
    case 'invalidWeekday':
      return 'That repeat rule names a day of the week we do not recognise.'
    case 'invalidMonth':
      return 'That repeat rule names a month we do not recognise.'
    case 'invalidDay':
      return 'That repeat rule names a day of the month we do not recognise.'
    case 'invalidEveryOther':
      return 'That repeat rule repeats on an interval we do not understand.'
    default:
      return assertNever(value)
  }
}

// MARK: - Encoding

/** The encoded form of `RepeatBase` — canon's `Base.encode(to:)` output. */
export type EncodedRepeatBase = {
  readonly type: string
  readonly weekdays?: readonly string[]
  readonly day?: number
  readonly month?: number
}

/** The encoded form of `RepeatConfig` — canon's synthesized `Codable` output. */
export interface EncodedRepeatConfig {
  readonly base: EncodedRepeatBase
  readonly everyOther: number
}

/** `Base.encode(to:)` — writes only the keys the case carries. */
export const encodeRepeatBase = (base: RepeatBase): EncodedRepeatBase => {
  switch (base.type) {
    case 'daily':
      return { type: RepeatBaseType.daily }
    case 'weekly':
      return { type: RepeatBaseType.weekly, weekdays: base.weekdays }
    case 'monthly':
      return { type: RepeatBaseType.monthly, day: base.day }
    case 'yearly':
      return { type: RepeatBaseType.yearly, day: base.day, month: base.month }
    default:
      return assertNever(base)
  }
}

/** `RepeatConfig.encode(to:)`. */
export const encodeRepeatConfig = (
  config: RepeatConfig,
): EncodedRepeatConfig => ({
  base: encodeRepeatBase(config.base),
  everyOther: config.everyOther,
})

// MARK: - Decoding

type JsonObject = Record<string, unknown>

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const decodeWeekdays = (
  raw: unknown,
): Result<readonly WeekDay[], RepeatConfigException> => {
  if (!Array.isArray(raw)) {
    return err(RepeatConfigExceptions.missingField('weekdays', 'weekly'))
  }
  const weekdays: WeekDay[] = []
  for (const entry of raw) {
    if (typeof entry !== 'string') {
      return err(RepeatConfigExceptions.invalidWeekday(String(entry)))
    }
    const weekday = weekDayFromRawValue(entry)
    if (weekday === null) {
      return err(RepeatConfigExceptions.invalidWeekday(entry))
    }
    weekdays.push(weekday)
  }
  return ok(weekdays)
}

/**
 * Decodes a day-of-month.
 *
 * **Range is deliberately not validated**, and this is the interesting half.
 * Canon decodes with a bare `try container.decode(Int.self, forKey: .day)` —
 * no bounds at all — so KroApple accepts `0`, `-5` and `99`. Rejecting them
 * here would make the web reader *stricter* than the writer on the other side
 * of the same wire: a row KroApple happily round-trips would fail to load on
 * the web, and the user would see the endeavor on their phone and not in the
 * browser. For a cross-platform data contract that asymmetry is worse than
 * carrying an odd number, and it is a one-way door — a decoder can always be
 * tightened later, but data already rejected is data already lost.
 *
 * What *is* rejected is the shape: a missing key, a non-number, or a
 * non-integer. Whether a rule can actually fire (day 31 in February, day 0
 * anywhere) is a question for the recurrence engine that expands these rules,
 * which is not this issue's scope. The tolerance is pinned by test so it reads
 * as a decision rather than an oversight.
 */
const decodeDay = (
  raw: unknown,
  baseType: string,
): Result<number, RepeatConfigException> => {
  if (raw === undefined) {
    return err(RepeatConfigExceptions.missingField('day', baseType))
  }
  if (typeof raw !== 'number' || !Number.isInteger(raw)) {
    return err(RepeatConfigExceptions.invalidDay(raw))
  }
  return ok(raw)
}

const decodeMonth = (raw: unknown): Result<Month, RepeatConfigException> => {
  if (raw === undefined) {
    return err(RepeatConfigExceptions.missingField('month', 'yearly'))
  }
  if (typeof raw !== 'number') {
    return err(RepeatConfigExceptions.invalidMonth(raw))
  }
  const month = monthFromRawValue(raw)
  if (month === null) {
    return err(RepeatConfigExceptions.invalidMonth(raw))
  }
  return ok(month)
}

/** `Base.init(from:)`. */
export const decodeRepeatBase = (
  raw: unknown,
): Result<RepeatBase, RepeatConfigException> => {
  if (!isJsonObject(raw)) return err(RepeatConfigExceptions.notAnObject())

  const type = raw.type
  if (typeof type !== 'string') {
    return err(RepeatConfigExceptions.unknownBaseType(String(type)))
  }

  switch (type) {
    case RepeatBaseType.daily:
      return ok({ type: 'daily' })

    case RepeatBaseType.weekly: {
      const weekdays = decodeWeekdays(raw.weekdays)
      if (!weekdays.ok) return weekdays
      return ok({ type: 'weekly', weekdays: weekdays.value })
    }

    case RepeatBaseType.monthly: {
      const day = decodeDay(raw.day, RepeatBaseType.monthly)
      if (!day.ok) return day
      return ok({ type: 'monthly', day: day.value })
    }

    case RepeatBaseType.yearly: {
      const day = decodeDay(raw.day, RepeatBaseType.yearly)
      if (!day.ok) return day
      const month = decodeMonth(raw.month)
      if (!month.ok) return month
      return ok({ type: 'yearly', day: day.value, month: month.value })
    }

    default:
      return err(RepeatConfigExceptions.unknownBaseType(type))
  }
}

/**
 * `RepeatConfig.init(from:)`.
 *
 * `everyOther` is tolerated as absent and falls back to canon's default of
 * `1` — a Swift value that never left its default still round-trips, and this
 * is the one place a decoder may fill in rather than fail.
 *
 * Its **range** is deliberately not validated either, for the reason spelled
 * out on `decodeDay`: canon's synthesized `Codable` reads a plain `Int`, so
 * `0` and negatives decode on the Swift side, and a stricter web reader would
 * drop rules the phone still shows. Only the shape — number, and whole — is
 * enforced. Pinned by test.
 */
export const decodeRepeatConfig = (
  raw: unknown,
): Result<RepeatConfig, RepeatConfigException> => {
  if (!isJsonObject(raw)) return err(RepeatConfigExceptions.notAnObject())
  if (raw.base === undefined) return err(RepeatConfigExceptions.missingBase())

  const base = decodeRepeatBase(raw.base)
  if (!base.ok) return base

  const rawEveryOther = raw.everyOther
  if (rawEveryOther === undefined) return ok(makeRepeatConfig(base.value))
  if (typeof rawEveryOther !== 'number' || !Number.isInteger(rawEveryOther)) {
    return err(RepeatConfigExceptions.invalidEveryOther(rawEveryOther))
  }

  return ok(makeRepeatConfig(base.value, rawEveryOther))
}
