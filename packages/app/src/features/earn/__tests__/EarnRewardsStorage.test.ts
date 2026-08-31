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

  it('skips a row whose pointsRequired overflows to a non-finite number', () => {
    // `1e400` is a syntactically valid JSON number that overflows to
    // `Infinity` on parse — the one way a non-finite value can genuinely
    // arrive through `JSON.parse` rather than `JSON.stringify` (which would
    // have already turned a real `NaN`/`Infinity` into `null`).
    const store = makeInMemoryKeyValueStore({
      'kro:earn.rewards.catalog':
        '[{"id":"r1","title":"x","glyph":"🎁","pointsRequired":1e400,"notes":null,"dateAddedEpochMillis":1000}]',
    })
    expect(readRewardsCatalog(store)).toEqual([])
  })

  it('skips a row with a negative pointsRequired', () => {
    const store = makeInMemoryKeyValueStore({
      'kro:earn.rewards.catalog':
        '[{"id":"r1","title":"x","glyph":"🎁","pointsRequired":-50,"notes":null,"dateAddedEpochMillis":1000}]',
    })
    expect(readRewardsCatalog(store)).toEqual([])
  })

  it('skips a row whose dateAddedEpochMillis overflows to a non-finite number', () => {
    const store = makeInMemoryKeyValueStore({
      'kro:earn.rewards.catalog':
        '[{"id":"r1","title":"x","glyph":"🎁","pointsRequired":100,"notes":null,"dateAddedEpochMillis":1e400}]',
    })
    expect(readRewardsCatalog(store)).toEqual([])
  })

  it('skips a row whose notes is neither a string nor null', () => {
    const store = makeInMemoryKeyValueStore({
      'kro:earn.rewards.catalog':
        '[{"id":"r1","title":"x","glyph":"🎁","pointsRequired":100,"notes":42,"dateAddedEpochMillis":1000}]',
    })
    expect(readRewardsCatalog(store)).toEqual([])
  })

  it('keeps every well-formed row alongside one malformed one, rather than blanking the whole catalog', () => {
    const good = JSON.stringify({
      id: rewardMocks.bobaTea.id,
      title: rewardMocks.bobaTea.title,
      glyph: rewardMocks.bobaTea.glyph,
      pointsRequired: rewardMocks.bobaTea.pointsRequired,
      notes: rewardMocks.bobaTea.notes,
      dateAddedEpochMillis: rewardMocks.bobaTea.dateAdded.getTime(),
    })
    const store = makeInMemoryKeyValueStore({
      'kro:earn.rewards.catalog': `[${good},{"id":"bad","pointsRequired":-1}]`,
    })
    expect(readRewardsCatalog(store)).toEqual([rewardMocks.bobaTea])
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
