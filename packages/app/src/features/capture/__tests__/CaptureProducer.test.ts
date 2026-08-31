import {
  type DeferRecord,
  EndeavorKind,
  EndeavorOperation,
  EndeavorStatus,
  type LocalStore,
  type Result,
  featureFlagOverrideKey,
  isRecordSoftDeleted,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  type AppStore,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import type { CaptureException } from '../CaptureException'
import {
  CAPTURE_MOCK_NOW,
  captureDraftFixtures,
  captureEndeavorFixtures,
  captureFixtureRecords,
  captureMockAt,
} from '../CaptureMocks'
import {
  type CaptureContext,
  type CaptureOperationOutcome,
  type CaptureScheduling,
  applyInboxOperationThunk,
  loadCaptureContextThunk,
  scheduleForTodayThunk,
  submitCaptureThunk,
  undoScheduleForTodayThunk,
} from '../CaptureProducer'
import {
  CaptureDestination,
  LAST_USED_DESTINATION_KEY,
  schedulingSnapshotOf,
} from '../CaptureRules'

/** Every suite here goes through `makeStore(extra)`, and never the network. */
const storeWith = (localStore: LocalStore): AppStore =>
  makeStore({ ...stubbedThunkExtra, localStore })

const seeded = () =>
  makeInMemoryLocalStore({ endeavors: captureFixtureRecords() })

/** Narrows a resolved `Result`, failing the test rather than returning `null`. */
const valueOf = <T>(payload: unknown): T => {
  const result = payload as Result<T, CaptureException>
  if (!result.ok) {
    throw new Error(`expected ok, got ${result.error.kind}: ${result.error.message}`)
  }
  return result.value
}

const errorOf = (payload: unknown): CaptureException => {
  const result = payload as Result<unknown, CaptureException>
  if (result.ok) throw new Error('expected a failure')
  return result.error
}

// ---------------------------------------------------------------------------
// loadCaptureContextThunk
// ---------------------------------------------------------------------------

describe('loadCaptureContextThunk', () => {
  it('reads every stored endeavor the Inbox may show', async () => {
    const store = storeWith(seeded())
    const action = await store.dispatch(
      loadCaptureContextThunk({ now: CAPTURE_MOCK_NOW }),
    )

    const context = valueOf<CaptureContext>(action.payload)
    expect(context.endeavors.map((value) => value.id)).toContain('fresh-task')
    expect(context.now).toEqual(CAPTURE_MOCK_NOW)
  })

  it('offers only On Device on a fresh install', async () => {
    const store = storeWith(seeded())
    const action = await store.dispatch(
      loadCaptureContextThunk({ now: CAPTURE_MOCK_NOW }),
    )

    const context = valueOf<CaptureContext>(action.payload)
    expect(context.availableDestinations).toEqual([CaptureDestination.local])
    expect(context.lastUsedDestination).toBe(CaptureDestination.local)
  })

  it('offers Kro Cloud when a persisted debug override turns hosting on', async () => {
    const localStore = seeded()
    localStore.preferences.set(featureFlagOverrideKey('supabaseHosting'), true)

    const store = storeWith(localStore)
    const action = await store.dispatch(
      loadCaptureContextThunk({ now: CAPTURE_MOCK_NOW }),
    )

    expect(
      valueOf<CaptureContext>(action.payload).availableDestinations,
    ).toContain(CaptureDestination.kroCloud)
  })

  it('resolves an exception rather than throwing when the store is unreadable', async () => {
    const localStore = seeded()
    const broken: LocalStore = {
      ...localStore,
      defers: {
        ...localStore.defers,
        all: () => Promise.reject(new Error('database closed')),
      },
    }

    const store = storeWith(broken)
    const action = await store.dispatch(
      loadCaptureContextThunk({ now: CAPTURE_MOCK_NOW }),
    )

    expect(errorOf(action.payload).kind).toBe('contextLoadFailed')
  })

  it('skips a row that cannot be decoded rather than emptying the Inbox', async () => {
    const [first, ...rest] = captureFixtureRecords()
    if (first === undefined) throw new Error('the fixtures are empty')
    const corrupt = { ...first, kind: 'nonsense' as EndeavorKind }

    const store = storeWith(
      makeInMemoryLocalStore({ endeavors: [corrupt, ...rest] }),
    )
    const action = await store.dispatch(
      loadCaptureContextThunk({ now: CAPTURE_MOCK_NOW }),
    )

    const context = valueOf<CaptureContext>(action.payload)
    expect(context.endeavors.map((value) => value.id)).not.toContain(first.id)
    expect(context.endeavors.length).toBe(rest.length)
  })
})

// ---------------------------------------------------------------------------
// submitCaptureThunk
// ---------------------------------------------------------------------------

describe('submitCaptureThunk', () => {
  it('writes the captured task to the store', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)

    await store.dispatch(
      submitCaptureThunk({
        draft: captureDraftFixtures.titledTask,
        id: 'new-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )

    const stored = await localStore.endeavors.get('new-task')
    expect(stored?.title).toBe('Write the retro')
    expect(stored?.createdAt).toEqual(CAPTURE_MOCK_NOW)
  })

  it('writes an event with a start and a duration, never a due date', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)

    await store.dispatch(
      submitCaptureThunk({
        draft: {
          ...captureDraftFixtures.completeEvent,
          time: captureMockAt(17, 14, 0),
          endTime: captureMockAt(17, 15, 0),
        },
        id: 'new-event',
        now: CAPTURE_MOCK_NOW,
      }),
    )

    const stored = await localStore.endeavors.get('new-event')
    expect(stored?.kind).toBe(EndeavorKind.calendarEvent)
    expect(stored?.start).toEqual(captureMockAt(17, 14, 0))
    expect(stored?.duration).toBe(3600)
    expect(stored?.due).toBeNull()
  })

  it('remembers the hosting destination outside the kro: namespace', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)

    await store.dispatch(
      submitCaptureThunk({
        draft: {
          ...captureDraftFixtures.titledTask,
          destination: CaptureDestination.kroCloud,
        },
        id: 'new-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )

    expect(localStore.preferences.get(LAST_USED_DESTINATION_KEY)).toBe(
      'kroCloud',
    )
    expect(localStore.preferences.get('kro:lastEndeavorHostingDestination')).toBeNull()
  })

  it('refuses an event that is missing a boundary, and writes nothing', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)

    const action = await store.dispatch(
      submitCaptureThunk({
        draft: captureDraftFixtures.eventMissingBothTimes,
        id: 'never-captured',
        now: CAPTURE_MOCK_NOW,
      }),
    )

    expect(errorOf(action.payload).kind).toBe('invalidCapture')
    expect(await localStore.endeavors.get('never-captured')).toBeNull()
  })

  it('resolves a failure rather than throwing when the write is rejected', async () => {
    const localStore = seeded()
    const broken: LocalStore = {
      ...localStore,
      endeavors: {
        ...localStore.endeavors,
        put: () => Promise.reject(new Error('quota exceeded')),
      },
    }

    const store = storeWith(broken)
    const action = await store.dispatch(
      submitCaptureThunk({
        draft: captureDraftFixtures.titledTask,
        id: 'new-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )

    expect(errorOf(action.payload).kind).toBe('captureFailed')
  })

  it('still reports success when only the destination memory could not be written', async () => {
    const localStore = seeded()
    const forgetful: LocalStore = {
      ...localStore,
      preferences: {
        ...localStore.preferences,
        set: () => {
          throw new Error('storage is full')
        },
      },
    }

    const store = storeWith(forgetful)
    const action = await store.dispatch(
      submitCaptureThunk({
        draft: captureDraftFixtures.titledTask,
        id: 'new-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )

    expect(valueOf<{ endeavor: { id: string } }>(action.payload).endeavor.id).toBe(
      'new-task',
    )
    expect(await localStore.endeavors.get('new-task')).not.toBeNull()
  })

  it('does not remember a destination the capture never reached', async () => {
    const localStore = seeded()
    const broken: LocalStore = {
      ...localStore,
      endeavors: {
        ...localStore.endeavors,
        put: () => Promise.reject(new Error('quota exceeded')),
      },
    }

    const store = storeWith(broken)
    await store.dispatch(
      submitCaptureThunk({
        draft: {
          ...captureDraftFixtures.titledTask,
          destination: CaptureDestination.kroCloud,
        },
        id: 'new-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )

    expect(localStore.preferences.get(LAST_USED_DESTINATION_KEY)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// scheduleForTodayThunk
// ---------------------------------------------------------------------------

describe('scheduleForTodayThunk', () => {
  const scheduledAt = captureMockAt(17, 10, 15)

  it('moves the row’s due date to the chosen slot on disk', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)

    await store.dispatch(
      scheduleForTodayThunk({
        endeavorId: 'fresh-task',
        scheduledAt,
        now: CAPTURE_MOCK_NOW,
      }),
    )

    expect((await localStore.endeavors.get('fresh-task'))?.due).toEqual(
      scheduledAt,
    )
  })

  it('writes the audit row that says why it moved', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)

    await store.dispatch(
      scheduleForTodayThunk({
        endeavorId: 'fresh-task',
        scheduledAt,
        now: CAPTURE_MOCK_NOW,
      }),
    )

    const rows: readonly DeferRecord[] =
      await localStore.defers.forEndeavor('fresh-task')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.reason).toBe('addForToday')
    expect(rows[0]?.target).toEqual(scheduledAt)
  })

  it('snapshots what the row looked like before, for the undo', async () => {
    const store = storeWith(seeded())
    const action = await store.dispatch(
      scheduleForTodayThunk({
        endeavorId: 'fresh-task',
        scheduledAt,
        now: CAPTURE_MOCK_NOW,
      }),
    )

    expect(valueOf<CaptureScheduling>(action.payload).snapshot).toEqual(
      schedulingSnapshotOf(captureEndeavorFixtures.freshTask, scheduledAt),
    )
  })

  it('reports a row that is no longer there', async () => {
    const store = storeWith(seeded())
    const action = await store.dispatch(
      scheduleForTodayThunk({
        endeavorId: 'gone',
        scheduledAt,
        now: CAPTURE_MOCK_NOW,
      }),
    )

    expect(errorOf(action.payload).kind).toBe('endeavorNotFound')
  })

  it('schedules a habit, whose due date the shared editor would refuse', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)

    await store.dispatch(
      scheduleForTodayThunk({
        endeavorId: 'unscheduled-habit',
        scheduledAt,
        now: CAPTURE_MOCK_NOW,
      }),
    )

    expect((await localStore.endeavors.get('unscheduled-habit'))?.due).toEqual(
      scheduledAt,
    )
  })
})

// ---------------------------------------------------------------------------
// undoScheduleForTodayThunk
// ---------------------------------------------------------------------------

describe('undoScheduleForTodayThunk', () => {
  const scheduledAt = captureMockAt(17, 10, 15)

  const scheduled = async () => {
    const localStore = seeded()
    const store = storeWith(localStore)
    const action = await store.dispatch(
      scheduleForTodayThunk({
        endeavorId: 'fresh-task',
        scheduledAt,
        now: CAPTURE_MOCK_NOW,
      }),
    )
    return {
      localStore,
      store,
      snapshot: valueOf<CaptureScheduling>(action.payload).snapshot,
    }
  }

  it('restores an unscheduled row to unscheduled on disk', async () => {
    const { localStore, store, snapshot } = await scheduled()

    await store.dispatch(
      undoScheduleForTodayThunk({ snapshot, now: CAPTURE_MOCK_NOW }),
    )

    expect((await localStore.endeavors.get('fresh-task'))?.due).toBeNull()
  })

  it('removes the audit row the scheduling wrote', async () => {
    const { localStore, store, snapshot } = await scheduled()

    await store.dispatch(
      undoScheduleForTodayThunk({ snapshot, now: CAPTURE_MOCK_NOW }),
    )

    expect(await localStore.defers.forEndeavor('fresh-task')).toHaveLength(0)
  })

  it('reports a row that was deleted while the toast was up', async () => {
    const { localStore, store, snapshot } = await scheduled()
    await localStore.endeavors.remove('fresh-task')

    const action = await store.dispatch(
      undoScheduleForTodayThunk({ snapshot, now: CAPTURE_MOCK_NOW }),
    )

    expect(errorOf(action.payload).kind).toBe('endeavorNotFound')
  })

  it('resolves a failure rather than throwing when the write is rejected', async () => {
    const { localStore, snapshot } = await scheduled()
    const broken: LocalStore = {
      ...localStore,
      endeavors: {
        ...localStore.endeavors,
        put: () => Promise.reject(new Error('quota exceeded')),
      },
    }

    const store = storeWith(broken)
    const action = await store.dispatch(
      undoScheduleForTodayThunk({ snapshot, now: CAPTURE_MOCK_NOW }),
    )

    expect(errorOf(action.payload).kind).toBe('undoFailed')
  })

  it('restores a row that had a prior due date to exactly that date', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)
    const action = await store.dispatch(
      scheduleForTodayThunk({
        endeavorId: 'scheduled-task',
        scheduledAt,
        now: CAPTURE_MOCK_NOW,
      }),
    )
    const snapshot = valueOf<CaptureScheduling>(action.payload).snapshot

    await store.dispatch(
      undoScheduleForTodayThunk({ snapshot, now: CAPTURE_MOCK_NOW }),
    )

    expect((await localStore.endeavors.get('scheduled-task'))?.due).toEqual(
      captureEndeavorFixtures.scheduledTask.due,
    )
  })
})

// ---------------------------------------------------------------------------
// applyInboxOperationThunk
// ---------------------------------------------------------------------------

describe('applyInboxOperationThunk', () => {
  it('closes a row swiped complete and stamps when it was done', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)

    const action = await store.dispatch(
      applyInboxOperationThunk({
        operation: EndeavorOperation.markComplete,
        endeavorId: 'fresh-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )

    expect(
      valueOf<CaptureOperationOutcome>(action.payload).endeavor?.status,
    ).toBe(EndeavorStatus.closed)
    const stored = await localStore.endeavors.get('fresh-task')
    expect(stored?.completed).toEqual(CAPTURE_MOCK_NOW)
  })

  it('soft-deletes a row swiped delete, so the removal can still sync', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)

    const action = await store.dispatch(
      applyInboxOperationThunk({
        operation: EndeavorOperation.delete,
        endeavorId: 'fresh-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )

    expect(valueOf<CaptureOperationOutcome>(action.payload).endeavor).toBeNull()
    expect(await localStore.endeavors.get('fresh-task')).toBeNull()

    const tombstoned = (await localStore.endeavors.allIncludingRemoved()).find(
      (record) => record.id === 'fresh-task',
    )
    expect(tombstoned === undefined ? false : isRecordSoftDeleted(tombstoned)).toBe(
      true,
    )
  })

  it('refuses an operation another feature owns', async () => {
    const store = storeWith(seeded())
    const action = await store.dispatch(
      applyInboxOperationThunk({
        operation: EndeavorOperation.edit,
        endeavorId: 'fresh-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )

    expect(errorOf(action.payload).kind).toBe('unsupportedOperation')
  })

  it('reports a row that is no longer there', async () => {
    const store = storeWith(seeded())
    const action = await store.dispatch(
      applyInboxOperationThunk({
        operation: EndeavorOperation.markComplete,
        endeavorId: 'gone',
        now: CAPTURE_MOCK_NOW,
      }),
    )

    expect(errorOf(action.payload).kind).toBe('endeavorNotFound')
  })

  it('resolves a failure rather than throwing when the write is rejected', async () => {
    const localStore = seeded()
    const broken: LocalStore = {
      ...localStore,
      endeavors: {
        ...localStore.endeavors,
        put: () => Promise.reject(new Error('quota exceeded')),
      },
    }

    const store = storeWith(broken)
    const action = await store.dispatch(
      applyInboxOperationThunk({
        operation: EndeavorOperation.markComplete,
        endeavorId: 'fresh-task',
        now: CAPTURE_MOCK_NOW,
      }),
    )

    expect(errorOf(action.payload).kind).toBe('operationFailed')
  })
})
