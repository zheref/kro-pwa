/**
 * The wipe's behaviour against both store implementations is asserted in
 * `LocalStoreContract.test.ts`. What is left for here is the part that is not
 * about *a* store: the completeness claim (every declared object store is
 * emptied) and the injected-predicate seam that KC-IS-#11 will use.
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
import { makeInMemoryLocalStore } from '../InMemoryLocalStore'
import { type KroObjectStore, kroObjectStores } from '../KroDatabase'
import { signOutWipe } from '../signOutWipe'

const fullStore = () =>
  makeInMemoryLocalStore({
    endeavors: [endeavorRecordMocks.plannedTask],
    projects: [projectRecordMocks.finances],
    defers: [deferRecordMocks.neverSynced],
    performances: [performanceRecordMocks.withFragments],
    userProfiles: [userProfileRecordMocks.typical],
    runningSessionAnchor: persistedRunningSessionMocks.runningPomodoro,
    lensSnapshots: { do: makeEndeavorsLensSnapshot() },
    preferences: {
      'kro:theme': 'dark',
      'debug.ff.now': true,
      'next-themes': 'system',
    },
  })

describe('completeness — every store the schema declares is emptied', () => {
  it('reports what it CLEARED, and that set is the schema`s full list', async () => {
    // The report is built from the wipe's own call list, so this assertion is
    // the completeness guarantee: omitting a `clear()` for a newly declared
    // store fails here rather than producing a report that claims otherwise.
    const report = await signOutWipe(fullStore())
    expect([...report.clearedStores].sort()).toEqual(
      [...kroObjectStores].sort(),
    )
  })

  it('reports each store exactly once', async () => {
    const report = await signOutWipe(fullStore())
    expect(new Set(report.clearedStores).size).toBe(report.clearedStores.length)
  })

  it('leaves nothing behind in any of them', async () => {
    const store = fullStore()
    await signOutWipe(store)

    // One assertion per declared store, so adding a store to the schema
    // without clearing it fails here rather than surviving a sign-out.
    const remaining: Record<KroObjectStore, number> = {
      endeavors: (await store.endeavors.allIncludingRemoved()).length,
      projects: (await store.projects.allIncludingRemoved()).length,
      defers: (await store.defers.all()).length,
      performances: (await store.performances.all()).length,
      userProfiles: (await store.userProfiles.current()) === null ? 0 : 1,
      lensSnapshots: (await store.lensSnapshots.read('do')) === null ? 0 : 1,
    }
    for (const name of kroObjectStores) {
      expect(remaining[name]).toBe(0)
    }
  })

  it('clears the running-session anchor, which is not an object store', async () => {
    const store = fullStore()
    await signOutWipe(store)
    expect(await store.runningSessionAnchor.read()).toBeNull()
  })
})

describe('the preference half', () => {
  it('removes `kro:` keys and preserves `debug.ff.*`', async () => {
    const store = fullStore()
    await signOutWipe(store)
    expect(store.preferences.get('kro:theme')).toBeNull()
    expect(store.preferences.get('debug.ff.now')).toBe(true)
  })

  it('leaves keys another library owns alone', async () => {
    const store = fullStore()
    await signOutWipe(store)
    expect(store.preferences.get('next-themes')).toBe('system')
  })

  it('reports the preserved keys, so the exception is visible not implied', async () => {
    const report = await signOutWipe(fullStore())
    expect([...report.preservedKeys].sort()).toEqual([
      'debug.ff.now',
      'next-themes',
    ])
  })
})

describe('the injected predicate — the KC-IS-#11 handoff seam', () => {
  it('honours a predicate that names a different namespace', async () => {
    const store = fullStore()
    const report = await signOutWipe(store, (key) =>
      key.startsWith('next-themes'),
    )
    expect(report.preferenceKeys).toEqual(['next-themes'])
    expect(store.preferences.get('kro:theme')).toBe('dark')
  })

  it('still clears every object store, whatever the predicate says', async () => {
    const store = fullStore()
    await signOutWipe(store, () => false)
    expect(await store.endeavors.allIncludingRemoved()).toHaveLength(0)
  })

  it('preserves everything when the predicate matches nothing', async () => {
    const store = fullStore()
    const report = await signOutWipe(store, () => false)
    expect(report.preferenceKeys).toEqual([])
    expect(report.preservedKeys).toHaveLength(3)
  })
})
