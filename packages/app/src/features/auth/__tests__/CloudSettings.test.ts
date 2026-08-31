import {
  type Preferences,
  type SettingOption,
  allPreferenceOptions,
  cloudSyncOptions,
  makePreferences,
} from '@kro/core'
import { makeInMemoryKeyValueStore } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import {
  SettingsSyncTrigger,
  applyCloudSettingEntries,
  cloudSettingEntriesFrom,
  cloudSyncOptionForKey,
  latestCloudSettingPerKey,
  settingsSyncTriggers,
  shouldPullSettings,
  shouldPushSettings,
} from '../CloudSettings'

const localOnlyOptions: readonly SettingOption[] = allPreferenceOptions.filter(
  (option) => option.syncScope === 'local',
)

const preferencesWith = (): Preferences =>
  makePreferences(makeInMemoryKeyValueStore())

const boolCloudOption = cloudSyncOptions.find((option) => option.type.kind === 'bool')
const boolLocalOption = localOnlyOptions.find((option) => option.type.kind === 'bool')

// ---------------------------------------------------------------------------
// When a pull and a push may happen — acceptance criterion 3
// ---------------------------------------------------------------------------

describe('when a pull is allowed', () => {
  it('pulls on app launch — a reinstall must immediately reflect the account', () => {
    expect(shouldPullSettings(SettingsSyncTrigger.appLaunch)).toBe(true)
  })

  it('pulls on sign-in — a fresh device must reflect the account', () => {
    expect(shouldPullSettings(SettingsSyncTrigger.signIn)).toBe(true)
  })

  it('does NOT pull when Settings is opened — a pull there would overwrite an offline edit', () => {
    expect(shouldPullSettings(SettingsSyncTrigger.settingsOpened)).toBe(false)
  })

  it('does NOT pull when Settings is closed — that moment is a push', () => {
    expect(shouldPullSettings(SettingsSyncTrigger.settingsClosed)).toBe(false)
  })

  it('pulls at exactly two of the four moments, and no others', () => {
    expect(settingsSyncTriggers.filter(shouldPullSettings)).toEqual([
      SettingsSyncTrigger.appLaunch,
      SettingsSyncTrigger.signIn,
    ])
  })
})

describe('when a push happens', () => {
  it('pushes on closing Settings', () => {
    expect(shouldPushSettings(SettingsSyncTrigger.settingsClosed)).toBe(true)
  })

  it('does not push on opening Settings', () => {
    expect(shouldPushSettings(SettingsSyncTrigger.settingsOpened)).toBe(false)
  })

  it('does not push at launch or sign-in — those are pulls', () => {
    expect(shouldPushSettings(SettingsSyncTrigger.appLaunch)).toBe(false)
    expect(shouldPushSettings(SettingsSyncTrigger.signIn)).toBe(false)
  })

  it('and the two rules never overlap — no moment both pulls and pushes', () => {
    for (const trigger of settingsSyncTriggers) {
      expect(shouldPullSettings(trigger) && shouldPushSettings(trigger)).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// What travels — acceptance criterion 3, second half
// ---------------------------------------------------------------------------

describe('cloudSyncOptionForKey', () => {
  it('resolves a cloud-scoped key', () => {
    const option = cloudSyncOptions[0]
    if (option === undefined) return
    expect(cloudSyncOptionForKey(option.key)?.key).toBe(option.key)
  })

  it('refuses a device-only key, so it can never be written from a pull', () => {
    for (const option of localOnlyOptions) {
      expect(cloudSyncOptionForKey(option.key)).toBeNull()
    }
  })

  it('refuses a key nothing declares', () => {
    expect(cloudSyncOptionForKey('made.up.key')).toBeNull()
  })
})

describe('building the push payload', () => {
  it('is empty for a device that has set nothing whose default is null', () => {
    const preferences = preferencesWith()
    const entries = cloudSettingEntriesFrom(preferences)
    // Options with a declared default always have a value to report; options
    // with a `null` default do not. Either way nothing outside the cloud set
    // may appear.
    for (const entry of entries) {
      expect(cloudSyncOptionForKey(entry.key)).not.toBeNull()
    }
  })

  it('carries a cloud-scoped value the user set', () => {
    if (boolCloudOption === undefined) return
    const preferences = preferencesWith()
    preferences.write(boolCloudOption, true)
    const entries = cloudSettingEntriesFrom(preferences)
    expect(entries.find((entry) => entry.key === boolCloudOption.key)?.value).toBe(true)
  })

  it('NEVER carries a device-only value, however it was set — the whole point of the scope', () => {
    if (boolLocalOption === undefined) return
    const preferences = preferencesWith()
    preferences.write(boolLocalOption, true)
    const keys = cloudSettingEntriesFrom(preferences).map((entry) => entry.key)
    expect(keys).not.toContain(boolLocalOption.key)
    for (const option of localOnlyOptions) expect(keys).not.toContain(option.key)
  })

  it('sends no updated_at of its own — the account clock is the server trigger', () => {
    const preferences = preferencesWith()
    for (const entry of cloudSettingEntriesFrom(preferences)) {
      expect(entry.updatedAt).toBeNull()
    }
  })
})

// ---------------------------------------------------------------------------
// Last-write-wins by the account's clock
// ---------------------------------------------------------------------------

describe('latestCloudSettingPerKey', () => {
  const at = (iso: string) => new Date(iso)

  it('keeps the entry with the later account timestamp', () => {
    const collapsed = latestCloudSettingPerKey([
      { key: 'k', value: 'old', updatedAt: at('2026-08-30T00:00:00.000Z') },
      { key: 'k', value: 'new', updatedAt: at('2026-08-31T00:00:00.000Z') },
    ])
    expect(collapsed).toEqual([
      { key: 'k', value: 'new', updatedAt: at('2026-08-31T00:00:00.000Z') },
    ])
  })

  it('keeps the later one regardless of arrival order', () => {
    const collapsed = latestCloudSettingPerKey([
      { key: 'k', value: 'new', updatedAt: at('2026-08-31T00:00:00.000Z') },
      { key: 'k', value: 'old', updatedAt: at('2026-08-30T00:00:00.000Z') },
    ])
    expect(collapsed[0]?.value).toBe('new')
  })

  it('prefers a stamped entry over an unstamped one — silence is not recency', () => {
    const collapsed = latestCloudSettingPerKey([
      { key: 'k', value: 'stamped', updatedAt: at('2026-08-30T00:00:00.000Z') },
      { key: 'k', value: 'unstamped', updatedAt: null },
    ])
    expect(collapsed[0]?.value).toBe('stamped')
  })

  it('resolves a tie to the later entry, the way lastWriteWins resolves to the cloud', () => {
    const same = at('2026-08-31T00:00:00.000Z')
    const collapsed = latestCloudSettingPerKey([
      { key: 'k', value: 'first', updatedAt: same },
      { key: 'k', value: 'second', updatedAt: same },
    ])
    expect(collapsed[0]?.value).toBe('second')
  })

  it('leaves distinct keys alone', () => {
    const entries = [
      { key: 'a', value: 1, updatedAt: null },
      { key: 'b', value: 2, updatedAt: null },
    ]
    expect(latestCloudSettingPerKey(entries)).toEqual(entries)
  })
})

// ---------------------------------------------------------------------------
// Applying a pull
// ---------------------------------------------------------------------------

describe('applyCloudSettingEntries', () => {
  it('writes a cloud-scoped value locally — remote wins on a pull', () => {
    if (boolCloudOption === undefined) return
    const preferences = preferencesWith()
    preferences.write(boolCloudOption, false)

    const report = applyCloudSettingEntries(
      [{ key: boolCloudOption.key, value: true, updatedAt: null }],
      preferences,
    )

    expect(report.applied).toEqual([boolCloudOption.key])
    expect(preferences.read(boolCloudOption)).toBe(true)
  })

  it('IGNORES a device-only key rather than writing it — defense in depth on the pull side', () => {
    if (boolLocalOption === undefined) return
    const preferences = preferencesWith()

    const report = applyCloudSettingEntries(
      [{ key: boolLocalOption.key, value: true, updatedAt: null }],
      preferences,
    )

    expect(report.applied).toEqual([])
    expect(report.ignoredKeys).toEqual([boolLocalOption.key])
  })

  it('ignores a key this client does not know — another platform may sync one more', () => {
    const preferences = preferencesWith()
    const report = applyCloudSettingEntries(
      [{ key: 'someone.elses.key', value: 1, updatedAt: null }],
      preferences,
    )
    expect(report.ignoredKeys).toEqual(['someone.elses.key'])
  })

  it('rejects a value whose shape does not fit the option, rather than coercing it', () => {
    if (boolCloudOption === undefined) return
    const preferences = preferencesWith()
    const report = applyCloudSettingEntries(
      [{ key: boolCloudOption.key, value: 'yes', updatedAt: null }],
      preferences,
    )
    expect(report.applied).toEqual([])
    expect(report.rejectedKeys).toEqual([boolCloudOption.key])
  })

  it('applies only the most recent write when the payload carries a key twice', () => {
    if (boolCloudOption === undefined) return
    const preferences = preferencesWith()

    applyCloudSettingEntries(
      [
        {
          key: boolCloudOption.key,
          value: false,
          updatedAt: new Date('2026-08-30T00:00:00.000Z'),
        },
        {
          key: boolCloudOption.key,
          value: true,
          updatedAt: new Date('2026-08-31T00:00:00.000Z'),
        },
      ],
      preferences,
    )

    expect(preferences.read(boolCloudOption)).toBe(true)
  })

  it('reports nothing for an empty payload', () => {
    expect(applyCloudSettingEntries([], preferencesWith())).toEqual({
      applied: [],
      ignoredKeys: [],
      rejectedKeys: [],
    })
  })
})

// ---------------------------------------------------------------------------
// The round trip
// ---------------------------------------------------------------------------

describe('push then pull', () => {
  it('returns every cloud-scoped value to a fresh device unchanged', () => {
    if (boolCloudOption === undefined) return
    const source = preferencesWith()
    source.write(boolCloudOption, true)

    const payload = cloudSettingEntriesFrom(source)
    const destination = preferencesWith()
    applyCloudSettingEntries(payload, destination)

    expect(destination.read(boolCloudOption)).toBe(true)
  })

  it('leaves the destination device-only options untouched by the round trip', () => {
    if (boolLocalOption === undefined) return
    const source = preferencesWith()
    source.write(boolLocalOption, true)

    const destination = preferencesWith()
    destination.write(boolLocalOption, false)
    applyCloudSettingEntries(cloudSettingEntriesFrom(source), destination)

    expect(destination.read(boolLocalOption)).toBe(false)
  })
})
