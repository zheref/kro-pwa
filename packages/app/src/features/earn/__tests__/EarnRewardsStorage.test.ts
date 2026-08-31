import { makeInMemoryKeyValueStore, rewardMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import {
  readClaimedRewardIds,
  readRewardsCatalog,
  writeClaimedRewardIds,
  writeRewardsCatalog,
} from '../EarnRewardsStorage'

describe('readRewardsCatalog / writeRewardsCatalog', () => {
  it('round-trips a catalog exactly', () => {
    const store = makeInMemoryKeyValueStore()
    writeRewardsCatalog(store, [rewardMocks.bobaTea, rewardMocks.movieNight])
    expect(readRewardsCatalog(store)).toEqual([rewardMocks.bobaTea, rewardMocks.movieNight])
  })

  it('reads an unset key as an empty catalog, never a throw', () => {
    expect(readRewardsCatalog(makeInMemoryKeyValueStore())).toEqual([])
  })

  it('treats a corrupt value as empty rather than fatal', () => {
    const store = makeInMemoryKeyValueStore({ 'kro:earn.rewards.catalog': 'not json' })
    expect(readRewardsCatalog(store)).toEqual([])
  })

  it('writes under the `kro:` namespace, so sign-out sweeps it', () => {
    const store = makeInMemoryKeyValueStore()
    writeRewardsCatalog(store, [rewardMocks.bobaTea])
    expect(store.keys().every((key) => key.startsWith('kro:'))).toBe(true)
  })

  it('replaces the whole array on a second write (canon: whole-catalog semantics)', () => {
    const store = makeInMemoryKeyValueStore()
    writeRewardsCatalog(store, [rewardMocks.bobaTea, rewardMocks.movieNight])
    writeRewardsCatalog(store, [rewardMocks.plain])
    expect(readRewardsCatalog(store)).toEqual([rewardMocks.plain])
  })
})

describe('readClaimedRewardIds / writeClaimedRewardIds', () => {
  it('round-trips a claimed set exactly', () => {
    const store = makeInMemoryKeyValueStore()
    writeClaimedRewardIds(store, [rewardMocks.bobaTea.id, rewardMocks.movieNight.id])
    expect(readClaimedRewardIds(store)).toEqual([
      rewardMocks.bobaTea.id,
      rewardMocks.movieNight.id,
    ])
  })

  it('reads an unset key as an empty set', () => {
    expect(readClaimedRewardIds(makeInMemoryKeyValueStore())).toEqual([])
  })

  it('drops a non-string entry rather than throwing on a malformed row', () => {
    const store = makeInMemoryKeyValueStore({
      'kro:earn.rewards.claimed': JSON.stringify(['ok-id', 42, null]),
    })
    expect(readClaimedRewardIds(store)).toEqual(['ok-id'])
  })
})
