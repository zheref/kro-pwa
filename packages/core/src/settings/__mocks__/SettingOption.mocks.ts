/**
 * `SettingOption` fixtures (`RC-13`).
 *
 * The spread is three convenient, one neutral, three inconvenient. These are
 * **synthetic** descriptors on purpose — they use `test.*` keys rather than
 * canon's, so a test exercising the codec or the validity predicates cannot
 * accidentally pin canon's table. The canon table has its own snapshot test,
 * and that is the only place it is asserted.
 */
import { pointsFormulas } from '../../domain/session/PointsFormula'
import type { SettingOption } from '../SettingOption'
import {
  SettingConsumption,
  SettingSyncScope,
  boolSetting,
  daysSetSetting,
  enumerationSetting,
  intSetting,
  makeSettingOption,
  stringSetting,
  timeOfDaySetting,
} from '../SettingOption'
import { MONDAY_TO_FRIDAY_BITMASK } from '../WeekDayBitmask'

export const settingOptionMocks = {
  // ---------------------------------------------------------------- convenient

  /** The plain happy path: a cloud-scoped boolean with a default. */
  cloudToggle: makeSettingOption({
    key: 'test.cloudToggle',
    type: boolSetting,
    glyph: 'flame',
    defaultValue: true,
  }),

  /** A device-local boolean — the sync-scope counterpart of the above. */
  localToggle: makeSettingOption({
    key: 'test.localToggle',
    type: boolSetting,
    glyph: 'hand.tap',
    defaultValue: false,
    syncScope: SettingSyncScope.local,
  }),

  /** A whole-number option — a duration in minutes. */
  duration: makeSettingOption({
    key: 'test.duration',
    type: intSetting,
    glyph: 'timer',
    defaultValue: 25,
  }),

  // ------------------------------------------------------------------- neutral

  /** A picker over a real canon case list, so the raw values are plausible. */
  picker: makeSettingOption({
    key: 'test.picker',
    type: enumerationSetting(pointsFormulas),
    glyph: 'function',
    defaultValue: 'slidingScale',
  }),

  // -------------------------------------------------------------- inconvenient

  /**
   * **No default.** Reading it unset resolves `null`, which is the one case
   * every typed accessor's fallback exists for.
   */
  noDefault: makeSettingOption({
    key: 'test.noDefault',
    type: stringSetting,
    glyph: null,
    defaultValue: null,
    consumption: SettingConsumption.declared,
  }),

  /** A time of day at the very top of the day — 23:59, minute 1439. */
  lateTime: makeSettingOption({
    key: 'test.lateTime',
    type: timeOfDaySetting,
    glyph: 'sunset',
    defaultValue: 23 * 60 + 59,
  }),

  /**
   * A weekday set whose default is a bitmask — the type whose stored form is
   * least like its domain form, and the one a naive codec gets wrong.
   */
  workdays: makeSettingOption({
    key: 'test.workdays',
    type: daysSetSetting,
    glyph: 'calendar',
    defaultValue: MONDAY_TO_FRIDAY_BITMASK,
  }),
} satisfies Record<string, SettingOption>

/** Every fixture, for suites asserting a property across the whole spread. */
export const allSettingOptionMocks: readonly SettingOption[] =
  Object.values(settingOptionMocks)
