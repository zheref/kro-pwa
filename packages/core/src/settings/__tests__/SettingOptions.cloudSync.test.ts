/**
 * `cloudSyncOptions` — acceptance criterion 2 of #11: *"`cloudSyncOptions` =
 * exactly the cloud-scoped subset; appearance/haptics/keepScreenAwake/
 * soundOnEnd/milestoneHaptics stay local."*
 *
 * Canon's own suite (`KroTests/Domain/UserSettingCodecTests.swift`) checks this
 * with three spot assertions — no local key is present, three representative
 * cloud keys are, the integration toggles are not. Those are ported below, and
 * then tightened into an **exact set equality**: a spot check cannot catch a
 * new `local` option leaking in, and this set is the boundary that decides what
 * leaves the device.
 */
import { describe, expect, it } from 'vitest'
import { SettingSyncScope } from '../SettingOption'
import {
  allPreferenceOptions,
  appearanceOption,
  appleCalendarOption,
  appleRemindersOption,
  cloudSyncOptions,
  earnMilestoneHapticsOption,
  earnPointsFormulaOption,
  hapticsOption,
  nowVisibleTypesOption,
  sessionDefaultDurationOption,
  sessionKeepScreenAwakeOption,
  sessionSoundOnEndOption,
  timezoneOption,
} from '../SettingOptions'

const keysOf = (options: readonly { readonly key: string }[]) =>
  new Set(options.map((option) => option.key))

describe('the cloud-sync subset', () => {
  it('is exactly the cloud-scoped preferences — not a superset, not a sample', () => {
    const expected = allPreferenceOptions.filter(
      (option) => option.syncScope === SettingSyncScope.cloud,
    )
    expect(cloudSyncOptions).toEqual(expected)
    expect(cloudSyncOptions).toHaveLength(29)
  })

  it('excludes every device-local option, so nothing device-shaped reaches the account', () => {
    const localKeys = keysOf([
      appearanceOption,
      hapticsOption,
      earnMilestoneHapticsOption,
      sessionKeepScreenAwakeOption,
      sessionSoundOnEndOption,
    ])
    const syncedKeys = keysOf(cloudSyncOptions)
    for (const key of localKeys) expect(syncedKeys.has(key)).toBe(false)
  })

  it('includes the representative cloud options canon names', () => {
    const syncedKeys = keysOf(cloudSyncOptions)
    expect(syncedKeys.has(timezoneOption.key)).toBe(true)
    expect(syncedKeys.has(sessionDefaultDurationOption.key)).toBe(true)
    expect(syncedKeys.has(earnPointsFormulaOption.key)).toBe(true)
  })

  it('excludes the integration toggles and the Do visibility filter — device state, not preferences', () => {
    const syncedKeys = keysOf(cloudSyncOptions)
    expect(syncedKeys.has(appleCalendarOption.key)).toBe(false)
    expect(syncedKeys.has(appleRemindersOption.key)).toBe(false)
    expect(syncedKeys.has(nowVisibleTypesOption.key)).toBe(false)
  })

  it('excludes them despite their cloud sync scope — membership is decided by allPreferenceOptions', () => {
    // The three carry canon's implicit `cloud` default, and are still out of
    // the sync set. A reader that assumed "scope decides" would be wrong here.
    expect(appleCalendarOption.syncScope).toBe(SettingSyncScope.cloud)
    expect(nowVisibleTypesOption.syncScope).toBe(SettingSyncScope.cloud)
    expect(keysOf(allPreferenceOptions).has(appleCalendarOption.key)).toBe(
      false,
    )
  })

  it('adds up: 34 preferences = 29 synced + 5 local', () => {
    const local = allPreferenceOptions.filter(
      (option) => option.syncScope === SettingSyncScope.local,
    )
    expect(cloudSyncOptions.length + local.length).toBe(
      allPreferenceOptions.length,
    )
    expect(local).toHaveLength(5)
  })
})
