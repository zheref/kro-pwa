/**
 * Validity predicates for preference values.
 *
 * Two different jobs, deliberately not one function:
 *
 * 1. **`isStorableSettingValue`** — is this primitive a legal value *for this
 *    option's type at all*? A `daysSet` bitmask with a bit above Sunday is not;
 *    an `enumeration` raw value naming no case is not. The codec already uses
 *    the same rule to decide whether to fall back to the default.
 * 2. **`isWorkingHoursRangeValid`** — the one *cross-field* rule canon has:
 *    the working day must end after it starts.
 *
 * The second is the whole of the "the section warns when the end time is not
 * after the start time" behaviour, and porting it as a **predicate only** is
 * deliberate: `docs/Features/Preferences.md` is explicit that the invalid state
 * is a warning, not a rejection — *"an inline warning appears while the values
 * persist as entered"*. So nothing here blocks a write. The Settings surface
 * (#32) renders the warning off this predicate; a version of this file that
 * refused the write would silently change the product.
 */
import { assertNever } from '../library/assertNever'
import type { SettingOption, SettingValue } from './SettingOption'
import type { TimeOfDay } from './TimeOfDay'
import { MINUTES_PER_DAY, timeOfDayMinutesFromMidnight } from './TimeOfDay'
import { isValidWeekDaysBitmask } from './WeekDayBitmask'

/** Whether `value` is a legal stored value for `option`. */
export const isStorableSettingValue = (
  option: SettingOption,
  value: SettingValue,
): boolean => {
  switch (option.type.kind) {
    case 'bool':
      return typeof value === 'boolean'
    case 'string':
      return typeof value === 'string'
    case 'enumeration':
      return typeof value === 'string' && option.type.cases.includes(value)
    case 'int':
      return typeof value === 'number' && Number.isInteger(value)
    case 'timeOfDay':
      return (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= 0 &&
        value < MINUTES_PER_DAY
      )
    case 'daysSet':
      return typeof value === 'number' && isValidWeekDaysBitmask(value)
    default:
      return assertNever(option.type)
  }
}

/**
 * Whether the working day ends after it starts, in minutes from midnight.
 *
 * Strictly after: canon's copy is "the section warns when the end time is **not
 * after** the start time", so an empty day (start == end) is invalid, not a
 * zero-length edge case to wave through.
 */
export const isWorkingHoursRangeValid = (
  startMinutes: number,
  endMinutes: number,
): boolean => endMinutes > startMinutes

/** The same rule over two `TimeOfDay` values. */
export const isWorkingHoursValid = (
  start: TimeOfDay,
  end: TimeOfDay,
): boolean =>
  isWorkingHoursRangeValid(
    timeOfDayMinutesFromMidnight(start),
    timeOfDayMinutesFromMidnight(end),
  )
