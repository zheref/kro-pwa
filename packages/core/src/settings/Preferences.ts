/**
 * `Preferences` + the typed accessors — canon
 * `KroCore/Domain/App/Preferences.swift` and
 * `KroCore/Domain/App/SettingsProvider+Typed.swift`, folded into one file
 * because they are one contract: canon splits them only because
 * `SettingsProvider` is a TCA `@DependencyClient` and `Preferences` is its
 * backing store, and this tier has neither.
 *
 * `makePreferences(store)` is the whole of canon's `Preferences.backed(by:)`
 * with `UserDefaults` swapped for the `KeyValueStore` port: namespace the key,
 * encode on write, decode-with-default on read, and wipe by prefix.
 *
 * The typed accessors are free functions rather than methods so a caller reads
 * `preferenceInt(preferences, sessionDefaultDurationOption)` — greppable per
 * option, and impossible to call without naming which store it reads.
 */
import type { WeekDay } from '../domain/shared/WeekDay'
import type { KeyValueStore } from './KeyValueStore'
import { isPreferenceStorageKey, preferenceStorageKey } from './KeyValueStore'
import type { SettingOption, SettingValue } from './SettingOption'
import type { SettingWriteValue } from './SettingsCodec'
import { decodeSettingValue, encodeSettingValue } from './SettingsCodec'
import type { TimeOfDay } from './TimeOfDay'
import { makeTimeOfDay, timeOfDayFromMinutesFromMidnight } from './TimeOfDay'
import { weekDaysFromBitmask } from './WeekDayBitmask'

export interface Preferences {
  /**
   * The option's stored value, or its declared default when unset. `null` only
   * for an option whose default is itself `null` (`general.timezone`,
   * `nowVisibleTypes`) — canon's `defaultValue: nil`.
   */
  read(option: SettingOption): SettingValue | null
  /**
   * Writes a value. A value that cannot be stored for the option's type is
   * **not written** and `write` reports `false`, rather than persisting a
   * shape a later read would have to discard.
   */
  write(option: SettingOption, value: SettingWriteValue): boolean
  /**
   * Removes every persisted preference in the `kro:` namespace — canon's
   * sign-out wipe. A `debug.ff.*` override is a different namespace and
   * survives; that is the point, not an accident (see `isPreferenceStorageKey`).
   */
  clearAll(): void
}

/** Builds a `Preferences` over any store satisfying the port. */
export const makePreferences = (store: KeyValueStore): Preferences => ({
  read: (option) =>
    decodeSettingValue(option, store.get(preferenceStorageKey(option.key))),

  write: (option, value) => {
    const encoded = encodeSettingValue(option, value)
    if (encoded === null) return false
    store.set(preferenceStorageKey(option.key), encoded)
    return true
  },

  clearAll: () => {
    for (const key of store.keys()) {
      if (isPreferenceStorageKey(key)) store.remove(key)
    }
  },
})

// ---------------------------------------------------------------------------
// Typed reads (`SettingsProvider+Typed`)
//
// Each falls back exactly as canon's does when the stored value is not of the
// expected shape: `false` / `""` / `0` / midnight / no days. Those fallbacks
// are only reachable for an option whose default is `null`, because
// `decodeSettingValue` has already substituted the default otherwise.
// ---------------------------------------------------------------------------

/** `func bool(_:) -> Bool`. */
export const preferenceBool = (
  preferences: Preferences,
  option: SettingOption,
): boolean => {
  const value = preferences.read(option)
  return typeof value === 'boolean' ? value : false
}

/** `func string(_:) -> String`. */
export const preferenceString = (
  preferences: Preferences,
  option: SettingOption,
): string => {
  const value = preferences.read(option)
  return typeof value === 'string' ? value : ''
}

/**
 * `func pick(_:) -> String` — a single choice from an `enumeration` option, as
 * its raw value. Canon aliases `string(_:)`; kept as its own name because the
 * call sites read differently and the alias is canon's own.
 */
export const preferencePick = (
  preferences: Preferences,
  option: SettingOption,
): string => preferenceString(preferences, option)

/** `func int(_:) -> Int`. */
export const preferenceInt = (
  preferences: Preferences,
  option: SettingOption,
): number => {
  const value = preferences.read(option)
  return typeof value === 'number' ? value : 0
}

/** `func time(_:) -> TimeOfDay` — minutes from midnight, back to a clock time. */
export const preferenceTime = (
  preferences: Preferences,
  option: SettingOption,
): TimeOfDay => {
  const value = preferences.read(option)
  return typeof value === 'number'
    ? timeOfDayFromMinutesFromMidnight(value)
    : makeTimeOfDay(0, 0)
}

/**
 * `func days(_:) -> Set<WeekDay>` — the stored bitmask, back to weekdays in
 * canon `allCases` order (see `weekDaysFromBitmask` for why an array).
 */
export const preferenceDays = (
  preferences: Preferences,
  option: SettingOption,
): readonly WeekDay[] => {
  const value = preferences.read(option)
  return typeof value === 'number' ? weekDaysFromBitmask(value) : []
}
