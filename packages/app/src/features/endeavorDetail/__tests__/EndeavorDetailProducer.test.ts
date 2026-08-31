/**
 * Producers are dispatched for real against a stubbed `LocalStore` injected
 * through `ThunkExtra` (`RC-54`, `RC-35`). The assertions are on the resolved
 * `Result` and on what actually reached the store.
 */
import type { Endeavor, EndeavorRecord } from '@kro/core'
import {
  EndeavorHost,
  EndeavorKind,
  PerformResolution,
  endeavorRecordFromEndeavor,
  makeDefer,
  makePerform,
  makeShadow,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { makeStore } from '../../../library/store'
import { stubbedGreetingService } from '../../../services/greeting/GreetingService'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import {
  DETAIL_REFERENCE_NOW,
  allDetailEndeavorMocks,
  detailEndeavorMocks,
} from '../EndeavorDetailMocks'
import {
  addDeferThunk,
  addPerformanceThunk,
  addShadowThunk,
  attachHostThunk,
  detachHostThunk,
  removeDeferThunk,
  removePerformanceThunk,
  removeShadowThunk,
  saveEndeavorThunk,
} from '../EndeavorDetailProducer'

const recordsOf = (
  endeavors: readonly Endeavor[] = allDetailEndeavorMocks,
): readonly EndeavorRecord[] =>
  endeavors.map((endeavor) =>
    endeavorRecordFromEndeavor(endeavor, { now: DETAIL_REFERENCE_NOW }),
  )

const storeWith = (records: readonly EndeavorRecord[] = recordsOf()) => {
  const localStore = makeInMemoryLocalStore({ endeavors: records })
  return {
    localStore,
    store: makeStore({ greetingService: stubbedGreetingService, localStore }),
  }
}

const failingStore = () => {
  const base = makeInMemoryLocalStore({ endeavors: recordsOf() })
  return makeStore({
    greetingService: stubbedGreetingService,
    localStore: {
      ...base,
      endeavors: {
        ...base.endeavors,
        put: async () => {
          throw new Error('disk full')
        },
      },
    },
  })
}

const performance = makePerform({
  date: new Date(2026, 5, 18, 14, 0, 0),
  duration: 1500,
  resolution: PerformResolution.finished,
  wasCompletedInSession: true,
  rewardPoints: 5,
})

describe('saveEndeavorThunk persists the working copy locally', () => {
  it('writes the edited row and resolves the snapshot it wrote', async () => {
    const { store, localStore } = storeWith()
    const edited = { ...detailEndeavorMocks.task, title: 'Prepare the deck' }
    const result = await store
      .dispatch(saveEndeavorThunk({ endeavor: edited, now: DETAIL_REFERENCE_NOW }))
      .unwrap()

    expect(result.ok).toBe(true)
    expect((await localStore.endeavors.get(edited.id))?.title).toBe(
      'Prepare the deck',
    )
  })

  it('preserves the row’s sync watermark rather than resetting it', async () => {
    const localStore = makeInMemoryLocalStore({
      endeavors: [
        {
          ...endeavorRecordFromEndeavor(detailEndeavorMocks.task, {
            now: DETAIL_REFERENCE_NOW,
          }),
          lastSyncedAtEpochMillis: 1234,
        },
      ],
    })
    const store = makeStore({
      greetingService: stubbedGreetingService,
      localStore,
    })
    await store
      .dispatch(
        saveEndeavorThunk({
          endeavor: { ...detailEndeavorMocks.task, title: 'Renamed' },
          now: DETAIL_REFERENCE_NOW,
        }),
      )
      .unwrap()
    expect(
      (await localStore.endeavors.get(detailEndeavorMocks.task.id))
        ?.lastSyncedAtEpochMillis,
    ).toBe(1234)
  })

  it('resolves a typed failure rather than throwing when the write fails', async () => {
    const store = failingStore()
    const result = await store
      .dispatch(
        saveEndeavorThunk({
          endeavor: detailEndeavorMocks.task,
          now: DETAIL_REFERENCE_NOW,
        }),
      )
      .unwrap()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('localPersistenceFailed')
  })
})

describe('performances are a child table, plus the endeavor row', () => {
  it('writes both rows when the kind allows sessions', async () => {
    const { store, localStore } = storeWith()
    const result = await store
      .dispatch(
        addPerformanceThunk({
          endeavorId: detailEndeavorMocks.task.id,
          performance,
          now: DETAIL_REFERENCE_NOW,
        }),
      )
      .unwrap()

    expect(result.ok && result.value.performances).toHaveLength(1)
    expect(
      await localStore.performances.forEndeavor(detailEndeavorMocks.task.id),
    ).toHaveLength(1)
  })

  it('writes NOTHING when the matrix refuses sessions for the kind', async () => {
    const { store, localStore } = storeWith()
    const result = await store
      .dispatch(
        addPerformanceThunk({
          endeavorId: detailEndeavorMocks.event.id,
          performance,
          now: DETAIL_REFERENCE_NOW,
        }),
      )
      .unwrap()

    expect(result.ok && result.value.performances).toEqual([])
    expect(
      await localStore.performances.forEndeavor(detailEndeavorMocks.event.id),
    ).toEqual([])
  })

  it('removes the row the index names', async () => {
    const { store, localStore } = storeWith()
    await store
      .dispatch(
        addPerformanceThunk({
          endeavorId: detailEndeavorMocks.task.id,
          performance,
          now: DETAIL_REFERENCE_NOW,
        }),
      )
      .unwrap()
    const result = await store
      .dispatch(
        removePerformanceThunk({
          endeavorId: detailEndeavorMocks.task.id,
          index: 0,
          now: DETAIL_REFERENCE_NOW,
        }),
      )
      .unwrap()

    expect(result.ok && result.value.performances).toEqual([])
    expect(
      await localStore.performances.forEndeavor(detailEndeavorMocks.task.id),
    ).toEqual([])
  })

  it('is a no-op on an out-of-range index', async () => {
    const { store } = storeWith()
    const result = await store
      .dispatch(
        removePerformanceThunk({
          endeavorId: detailEndeavorMocks.task.id,
          index: 9,
          now: DETAIL_REFERENCE_NOW,
        }),
      )
      .unwrap()
    expect(result.ok && result.value.performances).toEqual([])
  })

  it('reports an endeavor that is no longer stored', async () => {
    const { store } = storeWith([])
    const result = await store
      .dispatch(
        addPerformanceThunk({
          endeavorId: 'ghost',
          performance,
          now: DETAIL_REFERENCE_NOW,
        }),
      )
      .unwrap()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('endeavorNotFound')
  })
})

describe('defers are a child table too — and never move `due`', () => {
  const entry = makeDefer({
    made: DETAIL_REFERENCE_NOW,
    reason: 'blocked',
    target: new Date(2026, 5, 20, 9, 0, 0),
  })

  it('appends the audit entry without touching the endeavor’s due date', async () => {
    const { store, localStore } = storeWith()
    const result = await store
      .dispatch(
        addDeferThunk({
          endeavorId: detailEndeavorMocks.task.id,
          entry,
          now: DETAIL_REFERENCE_NOW,
        }),
      )
      .unwrap()

    expect(result.ok && result.value.defers).toHaveLength(1)
    expect(result.ok && result.value.due).toEqual(detailEndeavorMocks.task.due)
    expect(
      await localStore.defers.forEndeavor(detailEndeavorMocks.task.id),
    ).toHaveLength(1)
  })

  it('writes nothing for a kind the matrix excludes from defers', async () => {
    const { store, localStore } = storeWith()
    await store
      .dispatch(
        addDeferThunk({
          endeavorId: detailEndeavorMocks.habit.id,
          entry,
          now: DETAIL_REFERENCE_NOW,
        }),
      )
      .unwrap()
    expect(
      await localStore.defers.forEndeavor(detailEndeavorMocks.habit.id),
    ).toEqual([])
  })

  it('removes an entry without undoing the due move it recorded', async () => {
    const { store } = storeWith()
    await store
      .dispatch(
        addDeferThunk({
          endeavorId: detailEndeavorMocks.task.id,
          entry,
          now: DETAIL_REFERENCE_NOW,
        }),
      )
      .unwrap()
    const result = await store
      .dispatch(
        removeDeferThunk({
          endeavorId: detailEndeavorMocks.task.id,
          index: 0,
          now: DETAIL_REFERENCE_NOW,
        }),
      )
      .unwrap()
    expect(result.ok && result.value.defers).toEqual([])
    expect(result.ok && result.value.due).toEqual(detailEndeavorMocks.task.due)
  })
})

describe('shadows embed on the endeavor row', () => {
  const shadow = makeShadow({
    originalTitle: 'Team sync',
    sourceIdentifier: 'gcal-42',
    kind: EndeavorKind.calendarEvent,
    source: EndeavorHost.googleCalendar,
  })

  it('adds one and persists it on the row itself', async () => {
    const { store, localStore } = storeWith()
    const result = await store
      .dispatch(
        addShadowThunk({
          endeavorId: detailEndeavorMocks.task.id,
          shadow,
          now: DETAIL_REFERENCE_NOW,
        }),
      )
      .unwrap()
    expect(result.ok && result.value.shadows).toHaveLength(1)
    expect(
      (await localStore.endeavors.get(detailEndeavorMocks.task.id))
        ?.shadowsJson,
    ).toBeTruthy()
  })

  it('removes one by index', async () => {
    const { store } = storeWith()
    const result = await store
      .dispatch(
        removeShadowThunk({
          endeavorId: detailEndeavorMocks.event.id,
          index: 0,
          now: DETAIL_REFERENCE_NOW,
        }),
      )
      .unwrap()
    expect(result.ok && result.value.shadows).toBeNull()
  })

  it('refuses the removal on a kind the matrix excludes from shadows', async () => {
    const { store } = storeWith()
    const result = await store
      .dispatch(
        removeShadowThunk({
          endeavorId: detailEndeavorMocks.habit.id,
          index: 0,
          now: DETAIL_REFERENCE_NOW,
        }),
      )
      .unwrap()
    expect(result.ok && result.value.shadows).toBeNull()
  })
})

describe('host attach/detach have no web binding, and say so', () => {
  it('refuses an attach with a reason the user can read', async () => {
    const { store } = storeWith()
    const result = await store
      .dispatch(
        attachHostThunk({
          endeavorId: detailEndeavorMocks.task.id,
          host: EndeavorHost.googleCalendar,
        }),
      )
      .unwrap()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('hostAdapterUnavailable')
      expect(result.error.message).toContain('not connected yet')
    }
  })

  it('refuses a detach symmetrically, rather than orphaning the provider copy', async () => {
    const { store } = storeWith()
    const result = await store
      .dispatch(
        detachHostThunk({
          endeavorId: detailEndeavorMocks.event.id,
          host: EndeavorHost.googleCalendar,
        }),
      )
      .unwrap()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('hostAdapterUnavailable')
  })

  it('names Apple’s providers as impossible rather than merely unwired', async () => {
    const { store } = storeWith()
    const result = await store
      .dispatch(
        attachHostThunk({
          endeavorId: detailEndeavorMocks.task.id,
          host: EndeavorHost.appleReminders,
        }),
      )
      .unwrap()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toContain('no web equivalent')
  })

  it('marks the refusal unrecoverable — retrying cannot help', async () => {
    const { store } = storeWith()
    const result = await store
      .dispatch(
        attachHostThunk({
          endeavorId: detailEndeavorMocks.task.id,
          host: EndeavorHost.outlookCalendar,
        }),
      )
      .unwrap()
    expect(result.ok === false && result.error.recoverable).toBe(false)
  })
})
