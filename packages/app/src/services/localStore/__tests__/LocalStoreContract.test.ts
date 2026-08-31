/**
 * **The stub-vs-live contract suite.** One set of assertions, run twice: once
 * against the IndexedDB binding (under `fake-indexeddb`) and once against the
 * in-memory stub.
 *
 * This is the file that makes the `RC-33` pair worth having. A stub that
 * *approximately* behaves like the live store is worse than no stub at all: a
 * feature suite passes against it and the feature breaks in the browser. Every
 * assertion below is therefore written once, against the `LocalStore` port, and
 * `describe.each` supplies the two implementations — so a divergence fails the
 * suite for exactly one of them and names which.
 *
 * Note what it does **not** do: it never reaches into `IDBDatabase` or into the
 * stub's `Map`. Anything only one implementation can answer belongs in that
 * implementation's own suite (`KroDatabase.test.ts` for the schema ladder,
 * `WebStorageStores.test.ts` for the `localStorage` encoding), not here.
 */
import {
  type EndeavorRecord,
  type LocalStore,
  makeEndeavorsLensSnapshot,
} from '@kro/core'
import {
  MOCK_RECORD_NOW_MILLIS,
  deferRecordMocks,
  endeavorRecordMocks,
  performanceRecordMocks,
  projectRecordMocks,
  userProfileRecordMocks,
} from '@kro/core/mocks'
import { persistedRunningSessionMocks } from '@kro/core/mocks'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeInMemoryLocalStore } from '../InMemoryLocalStore'
import { makeLiveLocalStore } from '../liveLocalStore'
import { signOutWipe } from '../signOutWipe'
import { makeMemoryWebStorage } from '../WebStorageStores'

let databaseCounter = 0

const implementations: readonly [string, () => LocalStore][] = [
  [
    'IndexedDB (fake-indexeddb)',
    () => {
      databaseCounter += 1
      return makeLiveLocalStore({
        indexedDB: new IDBFactory(),
        webStorage: makeMemoryWebStorage(),
        databaseName: `kro-contract-${databaseCounter}`,
      })
    },
  ],
  ['in-memory stub', () => makeInMemoryLocalStore()],
]

describe.each(implementations)('LocalStore contract — %s', (_name, build) => {
  let store: LocalStore

  beforeEach(() => {
    store = build()
  })

  describe('endeavors', () => {
    it('reads back a row it just wrote', async () => {
      await store.endeavors.put(endeavorRecordMocks.plannedTask)
      expect(
        await store.endeavors.get(endeavorRecordMocks.plannedTask.id),
      ).toEqual(endeavorRecordMocks.plannedTask)
    })

    it('answers null for an id it has never seen', async () => {
      expect(await store.endeavors.get('nothing-here')).toBeNull()
    })

    it('replaces a row on a second put rather than duplicating it', async () => {
      await store.endeavors.put(endeavorRecordMocks.plannedTask)
      await store.endeavors.put({
        ...endeavorRecordMocks.plannedTask,
        title: 'Pay Mortgage (edited)',
      })
      const rows = await store.endeavors.all()
      expect(rows).toHaveLength(1)
      expect(rows[0]?.title).toBe('Pay Mortgage (edited)')
    })

    it('EXCLUDES a soft-deleted row from a normal read', async () => {
      await store.endeavors.put(endeavorRecordMocks.plannedTask)
      await store.endeavors.softDelete(
        endeavorRecordMocks.plannedTask.id,
        MOCK_RECORD_NOW_MILLIS,
      )
      expect(await store.endeavors.all()).toHaveLength(0)
    })

    it('RETAINS the soft-deleted row on disk, tombstone stamped', async () => {
      await store.endeavors.put(endeavorRecordMocks.plannedTask)
      await store.endeavors.softDelete(
        endeavorRecordMocks.plannedTask.id,
        MOCK_RECORD_NOW_MILLIS,
      )
      const kept = await store.endeavors.allIncludingRemoved()
      expect(kept).toHaveLength(1)
      expect(kept[0]?.deletedAtEpochMillis).toBe(MOCK_RECORD_NOW_MILLIS)
    })

    it('answers null from `get` for a soft-deleted id', async () => {
      await store.endeavors.put(endeavorRecordMocks.plannedTask)
      await store.endeavors.softDelete(
        endeavorRecordMocks.plannedTask.id,
        MOCK_RECORD_NOW_MILLIS,
      )
      expect(
        await store.endeavors.get(endeavorRecordMocks.plannedTask.id),
      ).toBeNull()
    })

    it('filters by owner, and treats `null` as every owner', async () => {
      await store.endeavors.put(endeavorRecordMocks.plannedTask)
      await store.endeavors.put(endeavorRecordMocks.syncedEvent)
      expect(await store.endeavors.allForOwner('user-ada')).toHaveLength(1)
      expect(await store.endeavors.allForOwner(null)).toHaveLength(2)
    })

    it('answers a pending-sync set of dirty, live rows only', async () => {
      await store.endeavors.put(endeavorRecordMocks.plannedTask)
      await store.endeavors.put(endeavorRecordMocks.syncedEvent)
      await store.endeavors.put(endeavorRecordMocks.deletedBlueprint)
      const pending = await store.endeavors.pendingSync(null)
      expect(pending.map((record) => record.id)).toEqual([
        endeavorRecordMocks.plannedTask.id,
      ])
    })

    it('takes a row out of the pending set once the server confirms it', async () => {
      await store.endeavors.put(endeavorRecordMocks.plannedTask)
      await store.endeavors.markSynced(
        endeavorRecordMocks.plannedTask.id,
        MOCK_RECORD_NOW_MILLIS,
      )
      expect(await store.endeavors.pendingSync(null)).toHaveLength(0)
    })

    it('counts anonymous rows and adopts them at sign-in', async () => {
      await store.endeavors.put(endeavorRecordMocks.syncedEvent)
      await store.endeavors.put(endeavorRecordMocks.bareDraft)
      expect(await store.endeavors.countAnonymous()).toBe(2)
      expect(
        await store.endeavors.adoptAnonymous(
          'user-grace',
          MOCK_RECORD_NOW_MILLIS,
        ),
      ).toBe(2)
      expect(await store.endeavors.countAnonymous()).toBe(0)
      expect(await store.endeavors.allForOwner('user-grace')).toHaveLength(2)
    })

    it('marks an adopted row dirty, so sign-in schedules its first push', async () => {
      await store.endeavors.put(endeavorRecordMocks.syncedEvent)
      await store.endeavors.adoptAnonymous('user-grace', MOCK_RECORD_NOW_MILLIS)
      expect(await store.endeavors.pendingSync('user-grace')).toHaveLength(1)
    })

    it('hard-removes a row on `remove`, tombstone or not', async () => {
      await store.endeavors.put(endeavorRecordMocks.plannedTask)
      await store.endeavors.remove(endeavorRecordMocks.plannedTask.id)
      expect(await store.endeavors.allIncludingRemoved()).toHaveLength(0)
    })

    it('empties the store on `clear`', async () => {
      await store.endeavors.put(endeavorRecordMocks.plannedTask)
      await store.endeavors.put(endeavorRecordMocks.syncedEvent)
      await store.endeavors.clear()
      expect(await store.endeavors.allIncludingRemoved()).toHaveLength(0)
    })

    it('keeps every column of a round-tripped row byte for byte', async () => {
      const original: EndeavorRecord = endeavorRecordMocks.staleTourist
      await store.endeavors.put(original)
      const restored = await store.endeavors.get(original.id)
      expect(restored).toEqual(original)
    })
  })

  describe('projects', () => {
    it('reads back a project it wrote', async () => {
      await store.projects.put(projectRecordMocks.finances)
      expect(await store.projects.get(projectRecordMocks.finances.id)).toEqual(
        projectRecordMocks.finances,
      )
    })

    it('excludes a tombstoned project from a normal read', async () => {
      await store.projects.put(projectRecordMocks.finances)
      await store.projects.put(projectRecordMocks.archived)
      expect(await store.projects.all()).toHaveLength(1)
      expect(await store.projects.allIncludingRemoved()).toHaveLength(2)
    })

    it('soft-deletes rather than removing', async () => {
      await store.projects.put(projectRecordMocks.finances)
      await store.projects.softDelete(
        projectRecordMocks.finances.id,
        MOCK_RECORD_NOW_MILLIS,
      )
      expect(await store.projects.all()).toHaveLength(0)
      expect(await store.projects.allIncludingRemoved()).toHaveLength(1)
    })

    it('answers the dirty, live projects for the push sweep', async () => {
      await store.projects.put(projectRecordMocks.finances)
      await store.projects.put(projectRecordMocks.shared)
      expect(await store.projects.pendingSync()).toHaveLength(1)
    })
  })

  describe('defers', () => {
    it('reads back the defers of one endeavor', async () => {
      await store.defers.put(deferRecordMocks.neverSynced)
      const rows = await store.defers.forEndeavor(
        deferRecordMocks.neverSynced.endeavorId,
      )
      expect(rows).toEqual([deferRecordMocks.neverSynced])
    })

    it('does not leak another endeavor`s defers into that read', async () => {
      await store.defers.put(deferRecordMocks.neverSynced)
      expect(await store.defers.forEndeavor('some-other-endeavor')).toEqual([])
    })

    it('EXCLUDES a pending-deletion row from a normal read', async () => {
      await store.defers.put(deferRecordMocks.synced)
      await store.defers.put(deferRecordMocks.pendingDeletion)
      const endeavorId = deferRecordMocks.synced.endeavorId
      expect(await store.defers.forEndeavor(endeavorId)).toHaveLength(1)
      expect(
        await store.defers.forEndeavorIncludingRemoved(endeavorId),
      ).toHaveLength(2)
    })

    it('HARD-deletes a never-synced row, since the server never saw it', async () => {
      await store.defers.put(deferRecordMocks.neverSynced)
      const serverId = await store.defers.removeLocal(
        deferRecordMocks.neverSynced,
        MOCK_RECORD_NOW_MILLIS,
      )
      expect(serverId).toBeNull()
      expect(await store.defers.all()).toHaveLength(0)
    })

    it('FLAGS a synced row instead, and hands back the id to delete remotely', async () => {
      await store.defers.put(deferRecordMocks.synced)
      const serverId = await store.defers.removeLocal(
        deferRecordMocks.synced,
        MOCK_RECORD_NOW_MILLIS,
      )
      expect(serverId).toBe('defer-server-1')
      expect(await store.defers.all()).toHaveLength(0)
      expect(
        await store.defers.forEndeavorIncludingRemoved(
          deferRecordMocks.synced.endeavorId,
        ),
      ).toHaveLength(1)
    })

    it('drops the flagged row once the remote DELETE is confirmed', async () => {
      await store.defers.put(deferRecordMocks.synced)
      await store.defers.removeLocal(
        deferRecordMocks.synced,
        MOCK_RECORD_NOW_MILLIS,
      )
      await store.defers.confirmRemoved(deferRecordMocks.synced)
      expect(
        await store.defers.forEndeavorIncludingRemoved(
          deferRecordMocks.synced.endeavorId,
        ),
      ).toHaveLength(0)
    })

    it('sends never-pushed AND pending-deletion rows on the next sweep', async () => {
      await store.defers.put(deferRecordMocks.neverSynced)
      await store.defers.put(deferRecordMocks.synced)
      await store.defers.put(deferRecordMocks.pendingDeletion)
      expect(await store.defers.pendingSync()).toHaveLength(2)
    })

    it('UPDATES in place when only the reason changed — canon`s match tuple', async () => {
      await store.defers.put(deferRecordMocks.neverSynced)
      await store.defers.put({
        ...deferRecordMocks.neverSynced,
        reason: 'Courier delayed',
      })
      const rows = await store.defers.all()
      expect(rows).toHaveLength(1)
      expect(rows[0]?.reason).toBe('Courier delayed')
    })

    it('keeps two deferrals made at different moments apart', async () => {
      await store.defers.put(deferRecordMocks.neverSynced)
      await store.defers.put(deferRecordMocks.synced)
      expect(await store.defers.all()).toHaveLength(2)
    })
  })

  describe('performances', () => {
    it('reads back the performances of one endeavor', async () => {
      await store.performances.put(performanceRecordMocks.withFragments)
      expect(
        await store.performances.forEndeavor(
          performanceRecordMocks.withFragments.endeavorId,
        ),
      ).toEqual([performanceRecordMocks.withFragments])
    })

    it('excludes a pending-deletion performance from a normal read', async () => {
      await store.performances.put(performanceRecordMocks.withFragments)
      await store.performances.put(performanceRecordMocks.pendingDeletion)
      expect(await store.performances.all()).toHaveLength(1)
    })

    it('preserves the session-fragment JSON column exactly', async () => {
      await store.performances.put(performanceRecordMocks.withFragments)
      const rows = await store.performances.all()
      expect(rows[0]?.sessionFragmentsJson).toBe(
        performanceRecordMocks.withFragments.sessionFragmentsJson,
      )
    })

    it('UPDATES in place when only the fragments changed', async () => {
      await store.performances.put(performanceRecordMocks.withFragments)
      await store.performances.put({
        ...performanceRecordMocks.withFragments,
        sessionFragmentsJson: '[]',
      })
      expect(await store.performances.all()).toHaveLength(1)
    })

    it('flags a synced performance and returns its server id', async () => {
      await store.performances.put(performanceRecordMocks.withFragments)
      expect(
        await store.performances.removeLocal(
          performanceRecordMocks.withFragments,
          MOCK_RECORD_NOW_MILLIS,
        ),
      ).toBe('performance-server-1')
    })

    it('hard-deletes a never-pushed performance', async () => {
      await store.performances.put(performanceRecordMocks.aborted)
      expect(
        await store.performances.removeLocal(
          performanceRecordMocks.aborted,
          MOCK_RECORD_NOW_MILLIS,
        ),
      ).toBeNull()
      expect(await store.performances.all()).toHaveLength(0)
    })
  })

  describe('user profile', () => {
    it('reads back the cached profile by id', async () => {
      await store.userProfiles.put(userProfileRecordMocks.typical)
      expect(
        await store.userProfiles.get(userProfileRecordMocks.typical.id),
      ).toEqual(userProfileRecordMocks.typical)
    })

    it('answers the current profile without needing to know its id', async () => {
      await store.userProfiles.put(userProfileRecordMocks.typical)
      expect(await store.userProfiles.current()).toEqual(
        userProfileRecordMocks.typical,
      )
    })

    it('answers null when nobody is signed in', async () => {
      expect(await store.userProfiles.current()).toBeNull()
    })

    it('replaces the profile wholesale rather than merging', async () => {
      await store.userProfiles.put(userProfileRecordMocks.typical)
      await store.userProfiles.put({
        ...userProfileRecordMocks.typical,
        name: 'Ada L.',
      })
      expect((await store.userProfiles.current())?.name).toBe('Ada L.')
    })
  })

  describe('lens snapshots', () => {
    const snapshot = makeEndeavorsLensSnapshot({
      hiddenKinds: ['habit'],
      searchQuery: 'passport',
      showArchived: true,
    })

    it('reads back a snapshot per vista', async () => {
      await store.lensSnapshots.write('do', snapshot)
      expect(await store.lensSnapshots.read('do')).toEqual(snapshot)
    })

    it('keeps two vistas` snapshots apart', async () => {
      await store.lensSnapshots.write('do', snapshot)
      await store.lensSnapshots.write('plan', makeEndeavorsLensSnapshot())
      expect((await store.lensSnapshots.read('plan'))?.searchQuery).toBe('')
    })

    it('answers null for a vista that has never been saved', async () => {
      expect(await store.lensSnapshots.read('never-opened')).toBeNull()
    })

    it('clears one vista without touching the others', async () => {
      await store.lensSnapshots.write('do', snapshot)
      await store.lensSnapshots.write('plan', snapshot)
      await store.lensSnapshots.clear('do')
      expect(await store.lensSnapshots.read('do')).toBeNull()
      expect(await store.lensSnapshots.read('plan')).not.toBeNull()
    })

    it('clears every vista on clearAll', async () => {
      await store.lensSnapshots.write('do', snapshot)
      await store.lensSnapshots.write('plan', snapshot)
      await store.lensSnapshots.clearAll()
      expect(await store.lensSnapshots.read('plan')).toBeNull()
    })
  })

  describe('preferences and the running-session anchor', () => {
    it('reads back each preference primitive as its own type', async () => {
      store.preferences.set('kro:theme', 'dark')
      store.preferences.set('kro:session.defaultDuration', 1500)
      store.preferences.set('kro:haptics', true)
      expect(store.preferences.get('kro:theme')).toBe('dark')
      expect(store.preferences.get('kro:session.defaultDuration')).toBe(1500)
      expect(store.preferences.get('kro:haptics')).toBe(true)
    })

    it('answers null for an unset key', () => {
      expect(store.preferences.get('kro:never-set')).toBeNull()
    })

    it('lists the keys actually present', () => {
      store.preferences.set('kro:theme', 'dark')
      store.preferences.set('debug.ff.now', true)
      expect([...store.preferences.keys()].sort()).toEqual([
        'debug.ff.now',
        'kro:theme',
      ])
    })

    it('writes and re-reads the running-session anchor', async () => {
      await store.runningSessionAnchor.write(
        persistedRunningSessionMocks.runningPomodoro,
      )
      expect(await store.runningSessionAnchor.read()).toEqual(
        persistedRunningSessionMocks.runningPomodoro,
      )
    })

    it('answers null when no session is running', async () => {
      expect(await store.runningSessionAnchor.read()).toBeNull()
    })

    it('replaces the anchor whole on the next phase transition', async () => {
      await store.runningSessionAnchor.write(
        persistedRunningSessionMocks.runningPomodoro,
      )
      await store.runningSessionAnchor.write(
        persistedRunningSessionMocks.pausedAfterTwoRuns,
      )
      expect((await store.runningSessionAnchor.read())?.phase).toBe('paused')
    })

    it('clears the anchor when the session ends', async () => {
      await store.runningSessionAnchor.write(
        persistedRunningSessionMocks.runningPomodoro,
      )
      await store.runningSessionAnchor.clear()
      expect(await store.runningSessionAnchor.read()).toBeNull()
    })
  })

  describe('the sign-out wipe', () => {
    const seedEverything = async () => {
      await store.endeavors.put(endeavorRecordMocks.plannedTask)
      await store.projects.put(projectRecordMocks.finances)
      await store.defers.put(deferRecordMocks.neverSynced)
      await store.performances.put(performanceRecordMocks.withFragments)
      await store.userProfiles.put(userProfileRecordMocks.typical)
      await store.lensSnapshots.write('do', makeEndeavorsLensSnapshot())
      await store.runningSessionAnchor.write(
        persistedRunningSessionMocks.runningPomodoro,
      )
      store.preferences.set('kro:theme', 'dark')
      store.preferences.set('kro:legacy.removedInV2', true)
      store.preferences.set('debug.ff.now', true)
      store.preferences.set('debug.ff.habits', false)
    }

    it('empties EVERY object store', async () => {
      await seedEverything()
      await signOutWipe(store)
      expect(await store.endeavors.allIncludingRemoved()).toHaveLength(0)
      expect(await store.projects.allIncludingRemoved()).toHaveLength(0)
      expect(await store.defers.all()).toHaveLength(0)
      expect(await store.performances.all()).toHaveLength(0)
      expect(await store.userProfiles.current()).toBeNull()
      expect(await store.lensSnapshots.read('do')).toBeNull()
    })

    it('removes every `kro:` preference, stale keys included', async () => {
      await seedEverything()
      await signOutWipe(store)
      expect(store.preferences.get('kro:theme')).toBeNull()
      expect(store.preferences.get('kro:legacy.removedInV2')).toBeNull()
    })

    it('PRESERVES every `debug.ff.*` override', async () => {
      await seedEverything()
      await signOutWipe(store)
      expect(store.preferences.get('debug.ff.now')).toBe(true)
      expect(store.preferences.get('debug.ff.habits')).toBe(false)
    })

    it('clears the running session, which is account data', async () => {
      await seedEverything()
      await signOutWipe(store)
      expect(await store.runningSessionAnchor.read()).toBeNull()
    })

    it('reports what it removed and what it kept', async () => {
      await seedEverything()
      const report = await signOutWipe(store)

      // Both keys the test wrote under `kro:` are reported as removed. The
      // list is asserted by containment rather than by equality because the
      // two implementations legitimately differ on ONE entry: the live binding
      // keeps the running-session anchor in the same `localStorage`, so
      // `kro:session.running` is a preference key there and a separate slot in
      // the stub. The anchor being cleared either way is asserted above; what
      // this case is about is that the report names what it did.
      expect(report.preferenceKeys).toContain('kro:theme')
      expect(report.preferenceKeys).toContain('kro:legacy.removedInV2')
      expect(
        report.preferenceKeys.filter((key) => key.startsWith('debug.ff.')),
      ).toEqual([])

      expect([...report.preservedKeys].sort()).toEqual([
        'debug.ff.habits',
        'debug.ff.now',
      ])
      expect(report.clearedStores.length).toBeGreaterThan(0)
    })

    it('is idempotent — signing out twice is not an error', async () => {
      await seedEverything()
      await signOutWipe(store)
      const second = await signOutWipe(store)
      expect(second.preferenceKeys).toEqual([])
      expect(store.preferences.get('debug.ff.now')).toBe(true)
    })

    it('is a no-op on a store that was never written to', async () => {
      const report = await signOutWipe(store)
      expect(report.preferenceKeys).toEqual([])
      expect(await store.endeavors.all()).toHaveLength(0)
    })
  })
})
