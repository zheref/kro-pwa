/**
 * Acceptance criterion 3 of #11: *"a `debug.ff.` override wins and survives
 * sign-out."*
 *
 * "Survives sign-out" is asserted against the **real wipe predicate**
 * (`isPreferenceStorageKey`) and the real `Preferences.clearAll`, not against a
 * re-stated rule: the guarantee is that the two namespaces do not overlap, and
 * the only way to prove that is to run one namespace's wipe over a store
 * holding both.
 */
import { describe, expect, it } from 'vitest'
import {
  makeInMemoryKeyValueStore,
  signOutContractStoreSeed,
} from '../../settings/__mocks__/KeyValueStore.mocks'
import { isPreferenceStorageKey } from '../../settings/KeyValueStore'
import { makePreferences } from '../../settings/Preferences'
import { FeatureFlags } from '../FeatureFlag'
import { FeatureFlagState } from '../FeatureFlagAssignment'
import {
  FEATURE_FLAG_OVERRIDE_PREFIX,
  applyPersistedOverrides,
  featureFlagOverrideKey,
  isFeatureFlagOverrideKey,
  makeFeatureFlagOverrideStore,
  overridesAsAssignments,
  setFeatureFlagOverride,
} from '../FeatureFlagOverrideStore'
import { makeHardcodedFeatureFlagService } from '../FeatureFlagService'

describe('the override namespace', () => {
  it('keys an override under debug.ff., exactly as canon persists it', () => {
    expect(FEATURE_FLAG_OVERRIDE_PREFIX).toBe('debug.ff.')
    expect(featureFlagOverrideKey('sessionBreak')).toBe('debug.ff.sessionBreak')
  })

  it('recognizes its own keys and not a preference key', () => {
    expect(isFeatureFlagOverrideKey('debug.ff.matrix')).toBe(true)
    expect(isFeatureFlagOverrideKey('kro:general.haptics')).toBe(false)
  })

  it('never collides with the preferences namespace', () => {
    expect(isPreferenceStorageKey(featureFlagOverrideKey('matrix'))).toBe(false)
  })
})

describe('the override store', () => {
  it('records an override and reads it back', () => {
    const store = makeFeatureFlagOverrideStore(makeInMemoryKeyValueStore())
    expect(store.isOverridden('sessionBreak')).toBe(false)
    store.set('sessionBreak', true)
    expect(store.isOverridden('sessionBreak')).toBe(true)
    expect(store.all()).toEqual([{ name: 'sessionBreak', isEnabled: true }])
  })

  it('records an override to off, which is distinct from having no override', () => {
    const store = makeFeatureFlagOverrideStore(makeInMemoryKeyValueStore())
    store.set('session', false)
    expect(store.isOverridden('session')).toBe(true)
    expect(store.all()).toEqual([{ name: 'session', isEnabled: false }])
  })

  it('forgets one override without touching the others', () => {
    const store = makeFeatureFlagOverrideStore(makeInMemoryKeyValueStore())
    store.set('sessionBreak', true)
    store.set('matrix', true)
    store.remove('sessionBreak')
    expect(store.all()).toEqual([{ name: 'matrix', isEnabled: true }])
  })

  it('clears every override and nothing else, when a tester resets', () => {
    const backing = makeInMemoryKeyValueStore(signOutContractStoreSeed)
    makeFeatureFlagOverrideStore(backing).removeAll()
    expect(new Set(backing.keys())).toEqual(
      new Set(['kro:session.defaultDuration', 'kro:general.haptics']),
    )
  })

  it('lists overrides name-sorted, as the Debug flag list renders them', () => {
    const store = makeFeatureFlagOverrideStore(makeInMemoryKeyValueStore())
    store.set('triage', false)
    store.set('matrix', true)
    store.set('board', true)
    expect(store.all().map((override) => override.name)).toEqual([
      'board',
      'matrix',
      'triage',
    ])
  })

  it('reads a corrupted value as an override to off, never as a crash', () => {
    const backing = makeInMemoryKeyValueStore({ 'debug.ff.matrix': 'yes' })
    expect(makeFeatureFlagOverrideStore(backing).all()).toEqual([
      { name: 'matrix', isEnabled: false },
    ])
  })
})

describe('applying persisted overrides', () => {
  it('turns them into the assignment layer a service is constructed with', () => {
    expect(
      overridesAsAssignments([{ name: 'sessionBreak', isEnabled: true }]),
    ).toEqual([
      { flag: FeatureFlags.sessionBreak, state: FeatureFlagState.enabled },
    ])
  })

  it('skips an override naming a flag no build declares any more', () => {
    expect(
      overridesAsAssignments([
        { name: 'legacyOnboardingCarousel', isEnabled: true },
        { name: 'matrix', isEnabled: true },
      ]),
    ).toEqual([{ flag: FeatureFlags.matrix, state: FeatureFlagState.enabled }])
  })

  it('makes the override win over the ship baseline once applied', () => {
    const service = makeHardcodedFeatureFlagService()
    expect(service.isEnabled(FeatureFlags.sessionBreak)).toBe(false)
    applyPersistedOverrides(service, [
      { name: 'sessionBreak', isEnabled: true },
    ])
    expect(service.isEnabled(FeatureFlags.sessionBreak)).toBe(true)
  })

  it('writes and applies in one gesture through setFeatureFlagOverride', () => {
    const backing = makeInMemoryKeyValueStore()
    const store = makeFeatureFlagOverrideStore(backing)
    const service = makeHardcodedFeatureFlagService()

    setFeatureFlagOverride(service, store, FeatureFlags.habits, true)

    expect(service.isEnabled(FeatureFlags.habits)).toBe(true)
    expect(backing.get('debug.ff.habits')).toBe(true)
  })

  it('turns a shipped feature off the same way, and records that it did', () => {
    const backing = makeInMemoryKeyValueStore()
    const store = makeFeatureFlagOverrideStore(backing)
    const service = makeHardcodedFeatureFlagService()

    setFeatureFlagOverride(service, store, FeatureFlags.triage, false)

    expect(service.isEnabled(FeatureFlags.triage)).toBe(false)
    expect(backing.get('debug.ff.triage')).toBe(false)
    expect(store.isOverridden('triage')).toBe(true)
  })
})

describe('an override across a sign-out', () => {
  it('is still persisted after the preferences wipe has run', () => {
    const backing = makeInMemoryKeyValueStore(signOutContractStoreSeed)
    const overrides = makeFeatureFlagOverrideStore(backing)

    makePreferences(backing).clearAll()

    expect(overrides.all()).toEqual([
      { name: 'matrix', isEnabled: false },
      { name: 'sessionBreak', isEnabled: true },
    ])
  })

  it('still wins over the baseline when the service is rebuilt after sign-out', () => {
    const backing = makeInMemoryKeyValueStore(signOutContractStoreSeed)
    makePreferences(backing).clearAll()

    const service = makeHardcodedFeatureFlagService({
      overrides: overridesAsAssignments(
        makeFeatureFlagOverrideStore(backing).all(),
      ),
    })

    expect(service.isEnabled(FeatureFlags.sessionBreak)).toBe(true)
    expect(service.isEnabled(FeatureFlags.matrix)).toBe(false)
  })

  it('is the preferences that were cleared, not the overrides — both halves of the contract', () => {
    const backing = makeInMemoryKeyValueStore(signOutContractStoreSeed)
    makePreferences(backing).clearAll()
    expect(backing.keys().every(isFeatureFlagOverrideKey)).toBe(true)
    expect(backing.keys()).toHaveLength(2)
  })
})
