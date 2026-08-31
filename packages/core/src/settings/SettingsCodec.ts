/**
 * The preference **codec** — canon `KroCore/Domain/App/Preferences.swift`,
 * `Preferences.backed(by:)`.
 *
 * Two pure functions sit either side of the store:
 *
 * - `encodeSettingValue` coerces a *domain* value to the primitive that
 *   persists — a `TimeOfDay` to minutes-from-midnight, a weekday list to a
 *   bitmask — which is canon's `write` closure.
 * - `decodeSettingValue` reads a raw stored value back, and **falls back to the
 *   option's default when the key is unset _or_ the stored value has the wrong
 *   primitive for its type**, which is canon's `read` closure. Canon's comment
 *   spells out why the second half matters: after a type migration or a
 *   corrupted store, coercing silently to `false`/`0` is worse than the
 *   declared default.
 *
 * Both are pure and take everything they need as arguments — no clock, no
 * store, no globals — so they are unit-testable without a persistence double
 * (`UZF-10`, and the #7/#8/#9 caller-supplies-everything precedent).
 */
import { WeekDay } from '../domain/shared/WeekDay'
import { assertNever } from '../library/assertNever'
import type { SettingOption, SettingValue } from './SettingOption'
import type { TimeOfDay } from './TimeOfDay'
import { timeOfDayMinutesFromMidnight } from './TimeOfDay'
import { isValidWeekDaysBitmask, weekDaysBitmask } from './WeekDayBitmask'

/**
 * What a caller may hand `encodeSettingValue`: the stored primitive itself, or
 * the domain type canon accepts for `timeOfDay` / `daysSet`.
 */
export type SettingWriteValue = SettingValue | TimeOfDay | readonly WeekDay[]

const isTimeOfDay = (value: SettingWriteValue): value is TimeOfDay =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  'hour' in value &&
  'minute' in value

const isWeekDayArray = (
  value: SettingWriteValue,
): value is readonly WeekDay[] =>
  Array.isArray(value) &&
  value.every((entry) => typeof entry === 'string' && entry in WeekDay)

/**
 * The `write` half. Returns `null` when `value` cannot be stored for `option` —
 * a `TimeOfDay` handed to a `bool`, say. Canon's Swift falls through to
 * `defaults.set(value, forKey:)` in that case and persists a garbage object;
 * refusing is the stricter behaviour a typed port can afford, and the caller
 * surfaces it rather than corrupting the store.
 */
export const encodeSettingValue = (
  option: SettingOption,
  value: SettingWriteValue,
): SettingValue | null => {
  switch (option.type.kind) {
    case 'timeOfDay':
      if (isTimeOfDay(value)) return timeOfDayMinutesFromMidnight(value)
      return typeof value === 'number' ? Math.trunc(value) : null
    case 'daysSet':
      if (isWeekDayArray(value)) return weekDaysBitmask(value)
      return typeof value === 'number' ? Math.trunc(value) : null
    case 'bool':
      return typeof value === 'boolean' ? value : null
    case 'string':
    case 'enumeration':
      return typeof value === 'string' ? value : null
    case 'int':
      return typeof value === 'number' ? Math.trunc(value) : null
    default:
      return assertNever(option.type)
  }
}

/**
 * The `read` half. `stored` is whatever the store returned for the option's
 * namespaced key — `null` when unset.
 *
 * The enumeration arm is stricter than canon's, and deliberately so: canon
 * checks only that the stored value is a `String`, so a raw value that no
 * longer names a case (a picker option removed in a later build) survives the
 * read and reaches a `switch` that cannot handle it. Here an unrecognized raw
 * value falls back to the declared default, which is the same recovery canon
 * already applies to every other wrong-shaped value. The PR names this.
 */
export const decodeSettingValue = (
  option: SettingOption,
  stored: unknown,
): SettingValue | null => {
  if (stored === null || stored === undefined) return option.defaultValue

  switch (option.type.kind) {
    case 'bool':
      return typeof stored === 'boolean' ? stored : option.defaultValue
    case 'string':
      return typeof stored === 'string' ? stored : option.defaultValue
    case 'enumeration':
      return typeof stored === 'string' && option.type.cases.includes(stored)
        ? stored
        : option.defaultValue
    case 'int':
      return typeof stored === 'number' && Number.isFinite(stored)
        ? Math.trunc(stored)
        : option.defaultValue
    case 'timeOfDay':
      return typeof stored === 'number' && Number.isFinite(stored)
        ? Math.trunc(stored)
        : option.defaultValue
    case 'daysSet':
      return typeof stored === 'number' && isValidWeekDaysBitmask(stored)
        ? stored
        : option.defaultValue
    default:
      return assertNever(option.type)
  }
}
