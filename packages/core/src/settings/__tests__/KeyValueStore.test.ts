import { describe, expect, it } from 'vitest'
import { FEATURE_FLAG_OVERRIDE_PREFIX } from '../../flags/FeatureFlagOverrideStore'
import { makeInMemoryKeyValueStore } from '../__mocks__/KeyValueStore.mocks'
import {
  PREFERENCES_NAMESPACE,
  isPreferenceStorageKey,
  preferenceStorageKey,
} from '../KeyValueStore'

describe('the preferences namespace', () => {
  it('prefixes a preference key with kro:, exactly as canon persists it', () => {
    expect(PREFERENCES_NAMESPACE).toBe('kro:')
    expect(preferenceStorageKey('session.defaultDuration')).toBe(
      'kro:session.defaultDuration',
    )
  })

  it('matches a key it wrote itself', () => {
    expect(
      isPreferenceStorageKey(preferenceStorageKey('general.haptics')),
    ).toBe(true)
  })

  it('does not match a debug flag override — the whole sign-out contract', () => {
    expect(
      isPreferenceStorageKey(`${FEATURE_FLAG_OVERRIDE_PREFIX}sessionBreak`),
    ).toBe(false)
  })

  it('does not match an unnamespaced key left by an older build', () => {
    expect(isPreferenceStorageKey('session.defaultDuration')).toBe(false)
  })
})

describe('a store satisfying the port', () => {
  it('reads back what it wrote, and null for a key it never saw', () => {
    const store = makeInMemoryKeyValueStore()
    store.set('kro:session.defaultDuration', 45)
    expect(store.get('kro:session.defaultDuration')).toBe(45)
    expect(store.get('kro:session.defaultBreakDuration')).toBeNull()
  })

  it('forgets a removed key rather than returning a stale value', () => {
    const store = makeInMemoryKeyValueStore({ 'kro:general.haptics': false })
    store.remove('kro:general.haptics')
    expect(store.get('kro:general.haptics')).toBeNull()
    expect(store.keys()).toEqual([])
  })

  it('lists every key it holds, across both namespaces', () => {
    const store = makeInMemoryKeyValueStore({
      'kro:general.haptics': false,
      'debug.ff.matrix': true,
    })
    expect(new Set(store.keys())).toEqual(
      new Set(['kro:general.haptics', 'debug.ff.matrix']),
    )
  })

  it('overwrites a key rather than appending a second entry for it', () => {
    const store = makeInMemoryKeyValueStore()
    store.set('kro:plan.dayViewRange', 'full')
    store.set('kro:plan.dayViewRange', 'business')
    expect(store.get('kro:plan.dayViewRange')).toBe('business')
    expect(store.keys()).toHaveLength(1)
  })
})
