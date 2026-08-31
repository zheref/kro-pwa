/**
 * What only the **stub** can be asked: that seeding works, that two stubs are
 * independent, and that the default `stubbedThunkExtra` binding is empty.
 *
 * The rules it shares with the live binding are asserted once in
 * `LocalStoreContract.test.ts`.
 */
import { makeEndeavorsLensSnapshot } from '@kro/core'
import {
  deferRecordMocks,
  endeavorRecordMocks,
  performanceRecordMocks,
  persistedRunningSessionMocks,
  projectRecordMocks,
  userProfileRecordMocks,
} from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import {
  makeInMemoryEndeavorStore,
  makeInMemoryLocalStore,
  makeInMemoryPreferenceStorage,
  stubbedLocalStore,
} from '../InMemoryLocalStore'

describe('seeding — a suite states the world at construction', () => {
  it('pre-loads endeavors', async () => {
    const store = makeInMemoryLocalStore({
      endeavors: [
        endeavorRecordMocks.plannedTask,
        endeavorRecordMocks.syncedEvent,
      ],
    })
    expect(await store.endeavors.all()).toHaveLength(2)
  })

  it('pre-loads every other store too', async () => {
    const store = makeInMemoryLocalStore({
      projects: [projectRecordMocks.finances],
      defers: [deferRecordMocks.neverSynced],
      performances: [performanceRecordMocks.withFragments],
      userProfiles: [userProfileRecordMocks.typical],
      preferences: { 'kro:theme': 'dark' },
      runningSessionAnchor: persistedRunningSessionMocks.runningPomodoro,
      lensSnapshots: { do: makeEndeavorsLensSnapshot({ searchQuery: 'x' }) },
    })
    expect(await store.projects.all()).toHaveLength(1)
    expect(await store.defers.all()).toHaveLength(1)
    expect(await store.performances.all()).toHaveLength(1)
    expect(await store.userProfiles.current()).not.toBeNull()
    expect(store.preferences.get('kro:theme')).toBe('dark')
    expect(await store.runningSessionAnchor.read()).not.toBeNull()
    expect((await store.lensSnapshots.read('do'))?.searchQuery).toBe('x')
  })

  it('honours a seeded tombstone — it is seeded, not filtered out', async () => {
    const store = makeInMemoryLocalStore({
      endeavors: [endeavorRecordMocks.deletedBlueprint],
    })
    expect(await store.endeavors.all()).toHaveLength(0)
    expect(await store.endeavors.allIncludingRemoved()).toHaveLength(1)
  })

  it('starts empty when nothing is seeded', async () => {
    const store = makeInMemoryLocalStore()
    expect(await store.endeavors.all()).toEqual([])
    expect(store.preferences.keys()).toEqual([])
  })
})

describe('isolation — one suite cannot see another`s fixtures', () => {
  it('gives each call its own rows', async () => {
    const first = makeInMemoryLocalStore()
    const second = makeInMemoryLocalStore()
    await first.endeavors.put(endeavorRecordMocks.plannedTask)
    expect(await second.endeavors.all()).toEqual([])
  })

  it('does not share a seed array with the store it seeded', async () => {
    const seed = [endeavorRecordMocks.plannedTask]
    const store = makeInMemoryEndeavorStore(seed)
    await store.put(endeavorRecordMocks.syncedEvent)
    expect(seed).toHaveLength(1)
  })

  it('leaves `stubbedLocalStore` empty, so a forgetful suite sees an empty app', async () => {
    expect(await stubbedLocalStore.endeavors.all()).toEqual([])
  })
})

describe('the stubbed preference storage', () => {
  it('stores values rather than their encoding', () => {
    const storage = makeInMemoryPreferenceStorage()
    storage.set('kro:duration', 1500)
    expect(storage.get('kro:duration')).toBe(1500)
  })

  it('removes a single key without touching the rest', () => {
    const storage = makeInMemoryPreferenceStorage({
      'kro:a': 1,
      'kro:b': 2,
    })
    storage.remove('kro:a')
    expect(storage.keys()).toEqual(['kro:b'])
  })

  it('answers null for a key that was never set', () => {
    expect(makeInMemoryPreferenceStorage().get('kro:nothing')).toBeNull()
  })
})
