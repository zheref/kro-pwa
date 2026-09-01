import {
  type KeyValueStore,
  type LocalStore,
  type PerformanceRecord,
  performanceRecordFromPerform,
} from '@kro/core'
import { rewardMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import {
  type AppStore,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import { userDidTapClaim } from '../EarnFeature'
import { earnFixturePerformances } from '../EarnMocks'
import {
  addRewardThunk,
  addSuggestionThunk,
  claimRewardThunk,
  deleteRewardThunk,
  loadEarnCatalogThunk,
  loadEarnPreferencesThunk,
} from '../EarnProducer'
import {
  readClaimedRewardIds,
  readRewardsCatalog,
  writeClaimedRewardIds,
  writeRewardsCatalog,
} from '../EarnRewardsStorage'
import { selectCurrentPoints, selectLockedRewards } from '../EarnSelectors'

const storeWith = (localStore: LocalStore): AppStore =>
  makeStore({ ...stubbedThunkExtra, localStore })

/** Wraps a `KeyValueStore` so a suite can make `set` fail after N successful calls. */
const instrumentPreferences = (
  preferences: KeyValueStore,
  failSetAfter: number,
): KeyValueStore => {
  let sets = 0
  return {
    ...preferences,
    set: (key, value) => {
      sets += 1
      if (sets > failSetAfter) throw new Error('disk full')
      preferences.set(key, value)
    },
  }
}

const performanceRecords = (): readonly PerformanceRecord[] =>
  earnFixturePerformances.map((perform) =>
    performanceRecordFromPerform(perform, { endeavorId: 'e-1', nowMillis: 0 }),
  )

describe('loadEarnPreferencesThunk', () => {
  it('reads the declared defaults when nothing is stored', async () => {
    const store = storeWith(makeInMemoryLocalStore())
    const result = await store.dispatch(loadEarnPreferencesThunk()).unwrap()
    expect(result).toEqual({
      ok: true,
      value: { defaultRewardThreshold: 100, pointsFormula: 'slidingScale' },
    })
  })

  it('reads a seeded threshold and formula', async () => {
    const store = storeWith(
      makeInMemoryLocalStore({
        preferences: {
          'kro:earn.defaultRewardThreshold': 250,
          'kro:earn.pointsFormula': 'legacy',
        },
      }),
    )
    const result = await store.dispatch(loadEarnPreferencesThunk()).unwrap()
    expect(result).toEqual({
      ok: true,
      value: { defaultRewardThreshold: 250, pointsFormula: 'legacy' },
    })
  })

  it('reports a typed failure when the store cannot be read', async () => {
    const localStore = makeInMemoryLocalStore()
    const broken: LocalStore = {
      ...localStore,
      preferences: {
        ...localStore.preferences,
        get: () => {
          throw new Error('unavailable')
        },
      },
    }
    const result = await storeWith(broken)
      .dispatch(loadEarnPreferencesThunk())
      .unwrap()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('preferencesLoadFailed')
  })
})

describe('loadEarnCatalogThunk', () => {
  it('reads an empty snapshot with nothing seeded', async () => {
    const result = await storeWith(makeInMemoryLocalStore())
      .dispatch(loadEarnCatalogThunk())
      .unwrap()
    expect(result).toEqual({
      ok: true,
      value: { rewards: [], claimedRewardIds: [], performances: [] },
    })
  })

  it('reads the seeded catalog, claimed set and performances together', async () => {
    const localStore = makeInMemoryLocalStore({
      performances: performanceRecords(),
    })
    writeRewardsCatalog(localStore.preferences, [rewardMocks.bobaTea])
    writeClaimedRewardIds(localStore.preferences, [rewardMocks.bobaTea.id])

    const result = await storeWith(localStore)
      .dispatch(loadEarnCatalogThunk())
      .unwrap()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.rewards).toEqual([rewardMocks.bobaTea])
      expect(result.value.claimedRewardIds).toEqual([rewardMocks.bobaTea.id])
      expect(result.value.performances).toHaveLength(
        earnFixturePerformances.length,
      )
    }
  })

  it('reports a typed failure when the performances read fails', async () => {
    const localStore = makeInMemoryLocalStore()
    const broken: LocalStore = {
      ...localStore,
      performances: {
        ...localStore.performances,
        all: async () => {
          throw new Error('database unavailable')
        },
      },
    }
    const result = await storeWith(broken)
      .dispatch(loadEarnCatalogThunk())
      .unwrap()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('catalogLoadFailed')
  })

  it(
    'drops a claimed id that no longer names a reward in the catalog — the id-reuse ' +
      'hazard a Copilot round flagged (a later reward minted with a stale claimed id ' +
      'must not install as pre-claimed)',
    async () => {
      const localStore = makeInMemoryLocalStore()
      writeRewardsCatalog(localStore.preferences, [rewardMocks.movieNight])
      writeClaimedRewardIds(localStore.preferences, [
        rewardMocks.bobaTea.id,
        rewardMocks.movieNight.id,
      ])

      const result = await storeWith(localStore)
        .dispatch(loadEarnCatalogThunk())
        .unwrap()
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.claimedRewardIds).toEqual([
          rewardMocks.movieNight.id,
        ])
      }
    },
  )
})

describe('addRewardThunk', () => {
  const draft = {
    title: 'Boba Tea',
    glyph: '🧋',
    pointsRequired: 80,
    notes: null,
  }

  it('persists the new reward under a caller-minted id', async () => {
    const localStore = makeInMemoryLocalStore()
    const result = await storeWith(localStore)
      .dispatch(
        addRewardThunk({ draft, id: 'new-1', now: new Date(2026, 2, 17) }),
      )
      .unwrap()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.reward.id).toBe('new-1')
    expect(readRewardsCatalog(localStore.preferences).map((r) => r.id)).toEqual(
      ['new-1'],
    )
  })

  it('rejects a blank title without touching storage', async () => {
    const localStore = makeInMemoryLocalStore()
    const result = await storeWith(localStore)
      .dispatch(
        addRewardThunk({
          draft: { ...draft, title: '   ' },
          id: 'new-1',
          now: new Date(2026, 2, 17),
        }),
      )
      .unwrap()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('blankTitle')
    expect(readRewardsCatalog(localStore.preferences)).toEqual([])
  })

  it('reports a typed failure and leaves the catalog untouched when the write fails', async () => {
    const localStore = makeInMemoryLocalStore()
    const broken: LocalStore = {
      ...localStore,
      preferences: instrumentPreferences(localStore.preferences, 0),
    }
    const result = await storeWith(broken)
      .dispatch(
        addRewardThunk({ draft, id: 'new-1', now: new Date(2026, 2, 17) }),
      )
      .unwrap()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('addRewardFailed')
    expect(readRewardsCatalog(broken.preferences)).toEqual([])
  })
})

describe('addSuggestionThunk', () => {
  it('persists the suggestion under a fresh id and timestamp', async () => {
    const localStore = makeInMemoryLocalStore()
    const now = new Date(2026, 2, 17)
    const result = await storeWith(localStore)
      .dispatch(
        addSuggestionThunk({
          suggestion: rewardMocks.bobaTea,
          id: 'copy-1',
          now,
        }),
      )
      .unwrap()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.reward.id).toBe('copy-1')
      expect(result.value.reward.dateAdded).toEqual(now)
      expect(result.value.reward.title).toBe(rewardMocks.bobaTea.title)
    }
  })

  it('prepends ahead of any existing catalog rows', async () => {
    const localStore = makeInMemoryLocalStore()
    writeRewardsCatalog(localStore.preferences, [rewardMocks.movieNight])
    await storeWith(localStore)
      .dispatch(
        addSuggestionThunk({
          suggestion: rewardMocks.bobaTea,
          id: 'copy-1',
          now: new Date(2026, 2, 17),
        }),
      )
      .unwrap()
    expect(readRewardsCatalog(localStore.preferences).map((r) => r.id)).toEqual(
      ['copy-1', rewardMocks.movieNight.id],
    )
  })

  it('reports a typed failure when the write fails', async () => {
    const localStore = makeInMemoryLocalStore()
    const broken: LocalStore = {
      ...localStore,
      preferences: instrumentPreferences(localStore.preferences, 0),
    }
    const result = await storeWith(broken)
      .dispatch(
        addSuggestionThunk({
          suggestion: rewardMocks.bobaTea,
          id: 'copy-1',
          now: new Date(2026, 2, 17),
        }),
      )
      .unwrap()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('addRewardFailed')
  })
})

describe('deleteRewardThunk', () => {
  it('removes the matching row from storage', async () => {
    const localStore = makeInMemoryLocalStore()
    writeRewardsCatalog(localStore.preferences, [
      rewardMocks.bobaTea,
      rewardMocks.movieNight,
    ])
    const result = await storeWith(localStore)
      .dispatch(deleteRewardThunk({ id: rewardMocks.bobaTea.id }))
      .unwrap()
    expect(result).toEqual({ ok: true, value: { id: rewardMocks.bobaTea.id } })
    expect(readRewardsCatalog(localStore.preferences)).toEqual([
      rewardMocks.movieNight,
    ])
  })

  it('succeeds as a no-op for an id not in the catalog', async () => {
    const localStore = makeInMemoryLocalStore()
    writeRewardsCatalog(localStore.preferences, [rewardMocks.bobaTea])
    const result = await storeWith(localStore)
      .dispatch(deleteRewardThunk({ id: 'ghost' }))
      .unwrap()
    expect(result.ok).toBe(true)
    expect(readRewardsCatalog(localStore.preferences)).toEqual([
      rewardMocks.bobaTea,
    ])
  })

  it('reports a typed failure and leaves storage untouched when the write fails', async () => {
    const localStore = makeInMemoryLocalStore()
    writeRewardsCatalog(localStore.preferences, [rewardMocks.bobaTea])
    const broken: LocalStore = {
      ...localStore,
      preferences: instrumentPreferences(localStore.preferences, 0),
    }
    const result = await storeWith(broken)
      .dispatch(deleteRewardThunk({ id: rewardMocks.bobaTea.id }))
      .unwrap()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('deleteRewardFailed')
    expect(readRewardsCatalog(broken.preferences)).toEqual([
      rewardMocks.bobaTea,
    ])
  })
})

describe('claimRewardThunk — the atomic one', () => {
  it('persists the claimed id', async () => {
    const localStore = makeInMemoryLocalStore()
    writeRewardsCatalog(localStore.preferences, [rewardMocks.bobaTea])
    const result = await storeWith(localStore)
      .dispatch(claimRewardThunk({ id: rewardMocks.bobaTea.id }))
      .unwrap()
    expect(result).toEqual({ ok: true, value: { id: rewardMocks.bobaTea.id } })
    expect(readClaimedRewardIds(localStore.preferences)).toEqual([
      rewardMocks.bobaTea.id,
    ])
  })

  it('is idempotent — claiming an already-claimed id does not duplicate it', async () => {
    const localStore = makeInMemoryLocalStore()
    writeRewardsCatalog(localStore.preferences, [rewardMocks.bobaTea])
    writeClaimedRewardIds(localStore.preferences, [rewardMocks.bobaTea.id])
    await storeWith(localStore)
      .dispatch(claimRewardThunk({ id: rewardMocks.bobaTea.id }))
      .unwrap()
    expect(readClaimedRewardIds(localStore.preferences)).toEqual([
      rewardMocks.bobaTea.id,
    ])
  })

  it(
    'refuses to claim an id absent from the persisted catalog — the "ghost claim" ' +
      'a second Copilot round flagged',
    async () => {
      const localStore = makeInMemoryLocalStore()
      const result = await storeWith(localStore)
        .dispatch(claimRewardThunk({ id: 'ghost-id' }))
        .unwrap()
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.kind).toBe('rewardNotFound')
      expect(readClaimedRewardIds(localStore.preferences)).toEqual([])
    },
  )

  it('a failed persist leaves the stored claimed set untouched (producer-level atomicity)', async () => {
    const localStore = makeInMemoryLocalStore()
    writeRewardsCatalog(localStore.preferences, [rewardMocks.bobaTea])
    const broken: LocalStore = {
      ...localStore,
      preferences: instrumentPreferences(localStore.preferences, 0),
    }
    const result = await storeWith(broken)
      .dispatch(claimRewardThunk({ id: rewardMocks.bobaTea.id }))
      .unwrap()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('claimRewardFailed')
    expect(readClaimedRewardIds(broken.preferences)).toEqual([])
  })

  it(
    'end-to-end: a failed claim leaves the balance and the catalog partition untouched ' +
      '(acceptance criterion 1 — atomically)',
    async () => {
      const localStore = makeInMemoryLocalStore({
        performances: performanceRecords(),
      })
      writeRewardsCatalog(localStore.preferences, [
        rewardMocks.bobaTea,
        rewardMocks.movieNight,
      ])
      const broken: LocalStore = {
        ...localStore,
        preferences: instrumentPreferences(localStore.preferences, 0),
      }
      const store = storeWith(broken)

      await store.dispatch(loadEarnCatalogThunk()).unwrap()
      const before = {
        balance: selectCurrentPoints(store.getState()),
        locked: selectLockedRewards(store.getState()).map((r) => r.id),
      }

      store.dispatch(userDidTapClaim({ rewardId: rewardMocks.bobaTea.id }))
      await store.dispatch(claimRewardThunk({ id: rewardMocks.bobaTea.id }))

      expect(selectCurrentPoints(store.getState())).toBe(before.balance)
      expect(selectLockedRewards(store.getState()).map((r) => r.id)).toEqual(
        before.locked,
      )
      // The confirm sheet stays open on the same reward, so the user can retry.
      expect(store.getState().earn.claimingRewardId).toBe(
        rewardMocks.bobaTea.id,
      )
    },
  )
})
