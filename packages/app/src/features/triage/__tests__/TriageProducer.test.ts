import {
  EisenhowerQuadrant,
  EndeavorStatus,
  type LocalStore,
  type Result,
  ShareOutcome,
  isRecordDirty,
  pendingSyncRecords,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  type AppStore,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import {
  type ShareService,
  makeStubbedShareService,
} from '../../../services/platform/share/ShareService'
import { selectTriageShareNotice } from '../TriageSelectors'
import type { TriageException } from '../TriageException'
import {
  TRIAGE_MOCK_NOW,
  triageEndeavorFixtures,
  triageFixtureRecords,
  triageMockAt,
} from '../TriageMocks'
import {
  type TriageSaveResult,
  openTriageThunk,
  saveTriageDecisionThunk,
  shareTriageBlurbThunk,
} from '../TriageProducer'
import type { TriageDecision } from '../TriageRules'
import { TRIAGE_RETRIES_PUSH_AUTOMATICALLY } from '../TriageSave'
import type { TriageSessionSeed } from '../TriageState'

/** Every suite here goes through `makeStore(extra)`, and never the network. */
const storeWith = (localStore: LocalStore): AppStore =>
  makeStore({ ...stubbedThunkExtra, localStore })

const seeded = () =>
  makeInMemoryLocalStore({ endeavors: triageFixtureRecords() })

/** Narrows a resolved `Result`, failing the test rather than returning null. */
const resolvedValue = <T>(payload: unknown): T => {
  const result = payload as Result<T, TriageException>
  if (!result.ok) {
    throw new Error(
      `expected ok, got ${result.error.kind}: ${result.error.message}`,
    )
  }
  return result.value
}

const errorOf = (payload: unknown): TriageException => {
  const result = payload as Result<unknown, TriageException>
  if (result.ok) throw new Error('expected a failure')
  return result.error
}

const decisionFor = (
  endeavorId: string,
  overrides: Partial<TriageDecision> = {},
): TriageDecision => ({
  endeavorId,
  quadrant: EisenhowerQuadrant.decide,
  durationSeconds: null,
  dueDate: triageMockAt(24, 10),
  rewardPoints: 20,
  value: 3,
  effort: 1,
  expiryDate: triageMockAt(24, 11),
  ...overrides,
})

// ---------------------------------------------------------------------------
// Opening a session
// ---------------------------------------------------------------------------

describe('openTriageThunk', () => {
  it('reads the endeavor and the local day it will search for gaps', async () => {
    const store = storeWith(seeded())

    const dispatched = await store.dispatch(
      openTriageThunk({
        endeavorId: triageEndeavorFixtures.unscheduledTask.id,
        now: TRIAGE_MOCK_NOW,
      }),
    )
    const seed = resolvedValue<TriageSessionSeed>(dispatched.payload)

    expect(seed.endeavor.id).toBe(triageEndeavorFixtures.unscheduledTask.id)
    expect(seed.busyIntervals.length).toBeGreaterThan(0)
  })

  it('excludes the endeavor being triaged from its own day’s blocks', async () => {
    const store = storeWith(seeded())

    const dispatched = await store.dispatch(
      openTriageThunk({
        endeavorId: triageEndeavorFixtures.calendarEvent.id,
        now: TRIAGE_MOCK_NOW,
      }),
    )
    const seed = resolvedValue<TriageSessionSeed>(dispatched.payload)

    // The event runs 14:00–15:00 on the mock day; it must not block itself.
    expect(
      seed.busyIntervals.some(
        (interval) =>
          interval.start.getTime() ===
          (triageEndeavorFixtures.calendarEvent.start as Date).getTime(),
      ),
    ).toBe(false)
  })

  it('carries canon’s parent-supplied seed straight through', async () => {
    const store = storeWith(seeded())
    const parentSeed = triageMockAt(17, 16, 30)

    const dispatched = await store.dispatch(
      openTriageThunk({
        endeavorId: triageEndeavorFixtures.unscheduledTask.id,
        now: TRIAGE_MOCK_NOW,
        nextFreeSlotToday: parentSeed,
      }),
    )

    expect(
      resolvedValue<TriageSessionSeed>(dispatched.payload).nextFreeSlotToday,
    ).toEqual(parentSeed)
  })

  it('writes NOTHING — entering triage never promotes and never persists', async () => {
    const localStore = seeded()
    const before = await localStore.endeavors.all()
    const store = storeWith(localStore)

    await store.dispatch(
      openTriageThunk({
        endeavorId: triageEndeavorFixtures.touristReminder.id,
        now: TRIAGE_MOCK_NOW,
      }),
    )

    expect(await localStore.endeavors.all()).toEqual(before)
    expect(store.getState().triage.session?.citizenshipAtEntry).not.toBe(
      'enhanced',
    )
  })

  it('fails with a typed exception when the row is gone', async () => {
    const store = storeWith(seeded())

    const dispatched = await store.dispatch(
      openTriageThunk({ endeavorId: 'gone', now: TRIAGE_MOCK_NOW }),
    )

    expect(errorOf(dispatched.payload).kind).toBe('endeavorNotFound')
  })

  it('resolves a failure rather than throwing when the store is unreadable', async () => {
    const broken = seeded()
    const store = storeWith({
      ...broken,
      endeavors: {
        ...broken.endeavors,
        all: async () => {
          throw new Error('IndexedDB is unavailable')
        },
      },
    })

    const dispatched = await store.dispatch(
      openTriageThunk({
        endeavorId: triageEndeavorFixtures.unscheduledTask.id,
        now: TRIAGE_MOCK_NOW,
      }),
    )

    expect(errorOf(dispatched.payload).kind).toBe('sessionLoadFailed')
  })
})

// ---------------------------------------------------------------------------
// The durable save — the ORDER is the proof
// ---------------------------------------------------------------------------

describe('saveTriageDecisionThunk — local first', () => {
  it('writes the decision to the local store', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)
    const target = triageEndeavorFixtures.unscheduledTask

    await store.dispatch(
      saveTriageDecisionThunk({
        decision: decisionFor(target.id),
        now: TRIAGE_MOCK_NOW,
      }),
    )

    const stored = await localStore.endeavors.get(target.id)
    expect(stored?.due).toEqual(triageMockAt(24, 10))
    expect(stored?.value).toBe(3)
    expect(stored?.sessionPoints).toBe(20)
    expect(stored?.expiry).toEqual(triageMockAt(24, 11))
  })

  it('writes the `triage` audit entry alongside the endeavor row', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)
    const target = triageEndeavorFixtures.unscheduledTask

    await store.dispatch(
      saveTriageDecisionThunk({
        decision: decisionFor(target.id),
        now: TRIAGE_MOCK_NOW,
      }),
    )

    const defers = await localStore.defers.forEndeavor(target.id)
    expect(defers).toHaveLength(1)
    expect(defers[0]?.reason).toBe('triage')
  })

  it('archives by closing the row, keeping it in history', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)
    const target = triageEndeavorFixtures.unscheduledTask

    await store.dispatch(
      saveTriageDecisionThunk({
        decision: decisionFor(target.id, {
          quadrant: EisenhowerQuadrant.delete,
          dueDate: null,
        }),
        now: TRIAGE_MOCK_NOW,
      }),
    )

    const stored = await localStore.endeavors.get(target.id)
    expect(stored?.status).toBe(EndeavorStatus.closed)
    expect(stored?.deletedAtEpochMillis).toBeNull()
  })

  it('schedules a HABIT, which the matrix-guarded helper would have dropped', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)
    const target = triageEndeavorFixtures.habit

    await store.dispatch(
      saveTriageDecisionThunk({
        decision: decisionFor(target.id),
        now: TRIAGE_MOCK_NOW,
      }),
    )

    const stored = await localStore.endeavors.get(target.id)
    expect(stored?.due).toEqual(triageMockAt(24, 10))
    expect(await localStore.defers.forEndeavor(target.id)).toHaveLength(1)
  })
})

describe('saveTriageDecisionThunk — a failed push leaves a retriable state', () => {
  it('reports the decision as saved even though nothing was pushed', async () => {
    const store = storeWith(seeded())
    const target = triageEndeavorFixtures.unscheduledTask

    const dispatched = await store.dispatch(
      saveTriageDecisionThunk({
        decision: decisionFor(target.id),
        now: TRIAGE_MOCK_NOW,
      }),
    )
    const result = resolvedValue<TriageSaveResult>(dispatched.payload)

    expect(result.endeavor.due).toEqual(triageMockAt(24, 10))
    expect(store.getState().triage.save.kind).toBe('saved')
  })

  it('leaves the stored row DIRTY, so the next push sweep carries it', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)
    const target = triageEndeavorFixtures.unscheduledTask

    await store.dispatch(
      saveTriageDecisionThunk({
        decision: decisionFor(target.id),
        now: TRIAGE_MOCK_NOW,
      }),
    )

    const stored = await localStore.endeavors.get(target.id)
    expect(stored).not.toBeNull()
    expect(isRecordDirty(stored as NonNullable<typeof stored>)).toBe(true)
    expect(
      pendingSyncRecords([stored as NonNullable<typeof stored>]),
    ).toHaveLength(1)
  })

  it('schedules no retry of its own — canon’s gap, ported as a gap', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)
    const target = triageEndeavorFixtures.unscheduledTask

    await store.dispatch(
      saveTriageDecisionThunk({
        decision: decisionFor(target.id),
        now: TRIAGE_MOCK_NOW,
      }),
    )
    const afterSave = await localStore.endeavors.get(target.id)

    // Nothing else runs: the row is exactly as the save left it.
    await Promise.resolve()
    expect(await localStore.endeavors.get(target.id)).toEqual(afterSave)
    expect(TRIAGE_RETRIES_PUSH_AUTOMATICALLY).toBe(false)
  })
})

describe('saveTriageDecisionThunk — a local failure persists nothing', () => {
  it('surfaces the local failure as the one exception that loses the decision', async () => {
    const broken = seeded()
    const store = storeWith({
      ...broken,
      endeavors: {
        ...broken.endeavors,
        put: async () => {
          throw new Error('QuotaExceededError')
        },
      },
    })

    const dispatched = await store.dispatch(
      saveTriageDecisionThunk({
        decision: decisionFor(triageEndeavorFixtures.unscheduledTask.id),
        now: TRIAGE_MOCK_NOW,
      }),
    )

    expect(errorOf(dispatched.payload).kind).toBe('localSaveFailed')
  })

  it('leaves the stored endeavor exactly as it was — nothing half-applied', async () => {
    const broken = seeded()
    const target = triageEndeavorFixtures.unscheduledTask
    const before = await broken.endeavors.get(target.id)
    const store = storeWith({
      ...broken,
      endeavors: {
        ...broken.endeavors,
        put: async () => {
          throw new Error('QuotaExceededError')
        },
      },
    })

    await store.dispatch(
      saveTriageDecisionThunk({
        decision: decisionFor(target.id),
        now: TRIAGE_MOCK_NOW,
      }),
    )

    expect(await broken.endeavors.get(target.id)).toEqual(before)
  })

  it('writes no audit entry either — the defer row never lands alone', async () => {
    const broken = seeded()
    const target = triageEndeavorFixtures.unscheduledTask
    const store = storeWith({
      ...broken,
      endeavors: {
        ...broken.endeavors,
        put: async () => {
          throw new Error('QuotaExceededError')
        },
      },
    })

    await store.dispatch(
      saveTriageDecisionThunk({
        decision: decisionFor(target.id),
        now: TRIAGE_MOCK_NOW,
      }),
    )

    expect(await broken.defers.forEndeavor(target.id)).toHaveLength(0)
  })

  it('fails on a stale row id without touching the store', async () => {
    const localStore = seeded()
    const before = await localStore.endeavors.all()
    const store = storeWith(localStore)

    const dispatched = await store.dispatch(
      saveTriageDecisionThunk({
        decision: decisionFor('gone'),
        now: TRIAGE_MOCK_NOW,
      }),
    )

    expect(errorOf(dispatched.payload).kind).toBe('endeavorNotFound')
    expect(await localStore.endeavors.all()).toEqual(before)
  })
})

describe('saveTriageDecisionThunk — the sync watermark', () => {
  it('preserves a prior confirmation rather than presenting the row as new', async () => {
    const target = triageEndeavorFixtures.unscheduledTask
    const rows = triageFixtureRecords().map((record) =>
      record.id === target.id
        ? { ...record, lastSyncedAtEpochMillis: 1_000 }
        : record,
    )
    const localStore = makeInMemoryLocalStore({ endeavors: rows })
    const store = storeWith(localStore)

    await store.dispatch(
      saveTriageDecisionThunk({
        decision: decisionFor(target.id),
        now: TRIAGE_MOCK_NOW,
      }),
    )

    const stored = await localStore.endeavors.get(target.id)
    expect(stored?.lastSyncedAtEpochMillis).toBe(1_000)
  })

  it('stamps the write time, which is what makes the row dirty again', async () => {
    const localStore = seeded()
    const store = storeWith(localStore)
    const target = triageEndeavorFixtures.unscheduledTask

    await store.dispatch(
      saveTriageDecisionThunk({
        decision: decisionFor(target.id),
        now: TRIAGE_MOCK_NOW,
      }),
    )

    const stored = await localStore.endeavors.get(target.id)
    expect(stored?.updatedAtEpochMillis).toBe(TRIAGE_MOCK_NOW.getTime())
  })

  it('keeps a previously-synced row retriable after a deferred push', async () => {
    const target = triageEndeavorFixtures.unscheduledTask
    const rows = triageFixtureRecords().map((record) =>
      record.id === target.id
        ? { ...record, lastSyncedAtEpochMillis: 1_000 }
        : record,
    )
    const localStore = makeInMemoryLocalStore({ endeavors: rows })
    const store = storeWith(localStore)

    await store.dispatch(
      saveTriageDecisionThunk({
        decision: decisionFor(target.id),
        now: TRIAGE_MOCK_NOW,
      }),
    )

    const stored = await localStore.endeavors.get(target.id)
    expect(isRecordDirty(stored as NonNullable<typeof stored>)).toBe(true)
  })
})

/**
 * The share hand-off, as a Producer (KC-IS-#71 item 18).
 *
 * It used to be a module the Page called directly with an injected gateway
 * prop. Now the Service arrives through `extra` and the outcome comes back in
 * the `Result`, which is what lets the reducer hold it and a story render every
 * case from a mock.
 */
describe('shareTriageBlurbThunk', () => {
  const storeSharing = (service: ShareService) =>
    makeStore({
      ...stubbedThunkExtra,
      localStore: makeInMemoryLocalStore(),
      shareService: service,
    })

  const outcomeOf = async (service: ShareService) => {
    const store = storeSharing(service)
    const action = await store.dispatch(
      shareTriageBlurbThunk({ text: 'hand this off' }),
    )
    const payload = shareTriageBlurbThunk.fulfilled.match(action)
      ? action.payload
      : null
    if (payload === null || !payload.ok) throw new Error('did not resolve ok')
    return { outcome: payload.value, store }
  }

  it('resolves what the Service reports, and records it on the slice', async () => {
    const service = makeStubbedShareService()
    const { outcome, store } = await outcomeOf(service)

    expect(outcome).toBe(ShareOutcome.shared)
    expect(store.getState().triage.shareOutcome).toBe(ShareOutcome.shared)
    expect(service.sharedTexts()).toEqual(['hand this off'])
  })

  it('carries the clipboard fallback through, so the surface can say so', async () => {
    const { outcome, store } = await outcomeOf(
      makeStubbedShareService({ canShare: false }),
    )

    expect(outcome).toBe(ShareOutcome.copied)
    expect(selectTriageShareNotice(store.getState())).toContain('clipboard')
  })

  it('reports unavailable when the platform offers neither capability', async () => {
    const { outcome, store } = await outcomeOf(
      makeStubbedShareService({ canShare: false, canWriteText: false }),
    )

    expect(outcome).toBe(ShareOutcome.unavailable)
    expect(selectTriageShareNotice(store.getState())).toContain(
      'could not be copied',
    )
  })

  it('resolves unavailable rather than throwing when the Service throws', async () => {
    // The Service is written not to throw; a Producer must not require its
    // caller to know which ones do not (`RC-7`).
    const throwing: ShareService = {
      isSupported: () => true,
      share: () => Promise.reject(new Error('boom')),
    }

    const { outcome } = await outcomeOf(throwing)

    expect(outcome).toBe(ShareOutcome.unavailable)
  })
})
