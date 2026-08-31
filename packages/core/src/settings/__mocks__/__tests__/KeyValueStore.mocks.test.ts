import { describe, expect, it } from 'vitest'
import { isPreferenceStorageKey } from '../../KeyValueStore'
import {
  makeInMemoryKeyValueStore,
  signOutContractStoreSeed,
} from '../KeyValueStore.mocks'

describe('the in-memory store stub', () => {
  it('starts empty when built with no seed', () => {
    expect(makeInMemoryKeyValueStore().keys()).toEqual([])
  })

  it('starts from its seed, which a suite can then mutate', () => {
    const store = makeInMemoryKeyValueStore({ 'kro:general.haptics': false })
    expect(store.get('kro:general.haptics')).toBe(false)
    store.set('kro:general.haptics', true)
    expect(store.snapshot()).toEqual({ 'kro:general.haptics': true })
  })

  it('gives each caller its own store, so one suite cannot leak keys into another', () => {
    const first = makeInMemoryKeyValueStore()
    const second = makeInMemoryKeyValueStore()
    first.set('kro:plan.listSort', 'title')
    expect(second.get('kro:plan.listSort')).toBeNull()
  })

  it('does not alias the seed object it was handed', () => {
    const seed = { 'kro:general.haptics': false }
    const store = makeInMemoryKeyValueStore(seed)
    store.set('kro:general.haptics', true)
    expect(seed['kro:general.haptics']).toBe(false)
  })
})

describe('the sign-out contract seed', () => {
  it('holds keys from both namespaces, which is what makes it a contract fixture', () => {
    const keys = Object.keys(signOutContractStoreSeed)
    expect(keys.some(isPreferenceStorageKey)).toBe(true)
    expect(keys.some((key) => !isPreferenceStorageKey(key))).toBe(true)
  })

  it('names two preferences and two flag overrides', () => {
    const keys = Object.keys(signOutContractStoreSeed)
    expect(keys.filter(isPreferenceStorageKey)).toHaveLength(2)
    expect(keys.filter((key) => key.startsWith('debug.ff.'))).toHaveLength(2)
  })

  it('seeds a value that differs from its option default, so a wipe is observable', () => {
    expect(signOutContractStoreSeed['kro:session.defaultDuration']).toBe(45)
    expect(signOutContractStoreSeed['kro:general.haptics']).toBe(false)
  })
})
