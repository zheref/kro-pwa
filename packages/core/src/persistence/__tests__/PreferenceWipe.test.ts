import {
  FEATURE_FLAG_OVERRIDE_PREFIX,
  isFeatureFlagOverrideKey,
} from '../../flags/FeatureFlagOverrideStore'
import { describe, expect, it } from 'vitest'
import {
  PREFERENCES_NAMESPACE,
  isPreferenceStorageKey,
  preferenceStorageKey,
} from '../../settings/KeyValueStore'
import { makeInMemoryKeyValueStore } from '../../settings/__mocks__/KeyValueStore.mocks'
import { preferenceWipeKeys, wipePreferences } from '../PreferenceWipe'

const seeded = () =>
  makeInMemoryKeyValueStore({
    'kro:theme': 'dark',
    'kro:session.defaultDuration': 1500,
    'kro:legacy.removedInV2': true,
    'debug.ff.now': true,
    'debug.ff.habits': false,
    'next-themes': 'system',
  })

describe('the two namespaces this wipe is defined over', () => {
  it('are disjoint — no key can belong to both', () => {
    expect(FEATURE_FLAG_OVERRIDE_PREFIX.startsWith(PREFERENCES_NAMESPACE)).toBe(
      false,
    )
    expect(PREFERENCES_NAMESPACE.startsWith(FEATURE_FLAG_OVERRIDE_PREFIX)).toBe(
      false,
    )
  })

  it('classify a preference key one way and only one way', () => {
    const key = preferenceStorageKey('theme')
    expect(isPreferenceStorageKey(key)).toBe(true)
    expect(isFeatureFlagOverrideKey(key)).toBe(false)
  })

  it('classify an override key the mirror way', () => {
    const key = `${FEATURE_FLAG_OVERRIDE_PREFIX}now`
    expect(isFeatureFlagOverrideKey(key)).toBe(true)
    expect(isPreferenceStorageKey(key)).toBe(false)
  })
})

describe('wipePreferences — acceptance criterion 3, at the storage tier', () => {
  it('removes every `kro:` key', () => {
    const storage = seeded()
    wipePreferences(storage)
    expect(storage.keys().filter(isPreferenceStorageKey)).toEqual([])
  })

  it('removes a key an OLDER build wrote, whose option no longer exists', () => {
    // A loop over the declared options would miss this, and it would outlive
    // the account that wrote it on a shared device.
    const storage = seeded()
    expect(wipePreferences(storage)).toContain('kro:legacy.removedInV2')
  })

  it('PRESERVES every `debug.ff.*` override', () => {
    const storage = seeded()
    wipePreferences(storage)
    expect(storage.get('debug.ff.now')).toBe(true)
    expect(storage.get('debug.ff.habits')).toBe(false)
  })

  it('leaves keys belonging to other libraries alone', () => {
    const storage = seeded()
    wipePreferences(storage)
    expect(storage.get('next-themes')).toBe('system')
  })

  it('reports exactly what it removed, so a caller can log it', () => {
    expect([...wipePreferences(seeded())].sort()).toEqual([
      'kro:legacy.removedInV2',
      'kro:session.defaultDuration',
      'kro:theme',
    ])
  })

  it('is idempotent — a second sign-out removes nothing', () => {
    const storage = seeded()
    wipePreferences(storage)
    expect(wipePreferences(storage)).toEqual([])
  })

  it('is a no-op on empty storage', () => {
    expect(wipePreferences(makeInMemoryKeyValueStore())).toEqual([])
  })

  it('honours an INJECTED predicate rather than the constant it imports', () => {
    const storage = seeded()
    const removed = wipePreferences(storage, (key) =>
      key.startsWith('next-themes'),
    )
    expect(removed).toEqual(['next-themes'])
    expect(storage.get('kro:theme')).toBe('dark')
  })

  it('computes the key list without removing anything', () => {
    const storage = seeded()
    expect(preferenceWipeKeys(storage)).toHaveLength(3)
    expect(storage.get('kro:theme')).toBe('dark')
  })
})
