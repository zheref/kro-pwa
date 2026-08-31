/**
 * Producers are dispatched for real against a stubbed `LocalStore` injected
 * through `ThunkExtra` — never a mocked `fetch`, never the live bindings
 * (`RC-54`, `RC-35`). The assertions are on the resolved `Result`, because a
 * Producer's contract is what it resolves, not what it leaves in state.
 */
import type { Endeavor, EndeavorRecord } from '@kro/core'
import {
  EndeavorHost,
  EndeavorKind,
  FeatureFlagState,
  FeatureFlags,
  endeavorRecordFromEndeavor,
  makeEndeavor,
  makeHardcodedFeatureFlagService,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { makeStore, stubbedThunkExtra } from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { addingPlanDays, planDayKey, startOfPlanDay } from '../PlanCalendar'
import { PLAN_REFERENCE_DAY, planAt } from '../PlanMocks'
import {
  loadPlanDayThunk,
  loadPlanMatrixThunk,
  planHostsFor,
  preloadPlanDaysThunk,
  updateEventTimeThunk,
} from '../PlanProducer'
import { PlanLoadReason } from '../PlanState'

const today = startOfPlanDay(PLAN_REFERENCE_DAY)
const tomorrow = addingPlanDays(today, 1)

const event = (id: string, start: Date, durationSeconds = 3600): Endeavor =>
  makeEndeavor({
    id,
    title: id,
    kind: EndeavorKind.calendarEvent,
    start,
    duration: durationSeconds,
    hostedBy: [EndeavorHost.local],
  })

const recordOf = (endeavor: Endeavor): EndeavorRecord =>
  endeavorRecordFromEndeavor(endeavor, { now: PLAN_REFERENCE_DAY })

const storeWith = (records: readonly EndeavorRecord[] = []) => {
  const localStore = makeInMemoryLocalStore({ endeavors: records })
  return {
    localStore,
    store: makeStore({ ...stubbedThunkExtra, localStore }),
  }
}

const failingStore = (message: string) => {
  const base = makeInMemoryLocalStore()
  return makeStore({
    ...stubbedThunkExtra,
    localStore: {
      ...base,
      endeavors: {
        ...base.endeavors,
        all: async () => {
          throw new Error(message)
        },
        put: async () => {
          throw new Error(message)
        },
      },
    },
  })
}

describe('planHostsFor', () => {
  it('fans out over the on-device store and Google Calendar', () => {
    // KC-IS-#33 added the second host. The Google adapter arrives already
    // built, from `ThunkExtra` — a feature file may not import a Service
    // (`RC-6`), so the composition root adapts it.
    const hosts = planHostsFor({
      ...stubbedThunkExtra,
      localStore: makeInMemoryLocalStore(),
    })
    expect(hosts.map((host) => host.id)).toEqual([
      EndeavorHost.local,
      EndeavorHost.googleCalendar,
    ])
  })

  it('contributes nothing from Google while it is disconnected', async () => {
    // The default stubbed binding is disconnected, which is what a user who
    // has never connected sees: an empty contribution, not a failure.
    const hosts = planHostsFor({
      ...stubbedThunkExtra,
      localStore: makeInMemoryLocalStore(),
    })
    const google = hosts.find((host) => host.id === EndeavorHost.googleCalendar)
    expect(await google?.fetchRange({ start: today, end: tomorrow })).toEqual([])
  })

  it('drops the Google host entirely when its flag is disabled (UZF-22)', () => {
    // `googleCalendarIntegration` is ENABLED at `statusQuo` — canon ships the
    // integration on — so this is the kill-switch path, not a rollout gate.
    const flags = makeHardcodedFeatureFlagService()
    flags.change(FeatureFlags.googleCalendarIntegration, FeatureFlagState.disabled)
    const hosts = planHostsFor({
      ...stubbedThunkExtra,
      localStore: makeInMemoryLocalStore(),
      featureFlags: flags,
    })
    expect(hosts.map((host) => host.id)).toEqual([EndeavorHost.local])
  })

  it('gives every host the same range-request shape', () => {
    const hosts = planHostsFor({
      ...stubbedThunkExtra,
      localStore: makeInMemoryLocalStore(),
    })
    expect(typeof hosts[0]?.fetchRange).toBe('function')
  })

  it('builds its hosts from the injected store, never a module import', async () => {
    const seeded = makeInMemoryLocalStore({
      endeavors: [recordOf(event('seeded', planAt(9)))],
    })
    const [host] = planHostsFor({
      ...stubbedThunkExtra,
      localStore: seeded,
    })
    const events = await host?.fetchRange({ start: today, end: tomorrow })
    expect(events?.map((e) => e.id)).toEqual(['seeded'])
  })
})

describe('loadPlanDayThunk', () => {
  it('resolves the selected day’s events, tagged with the day and the reason', async () => {
    const { store } = storeWith([
      recordOf(event('today-a', planAt(9))),
      recordOf(event('next-week', addingPlanDays(today, 7))),
    ])
    const result = await store
      .dispatch(loadPlanDayThunk({ day: today, reason: PlanLoadReason.manual }))
      .unwrap()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.dayKey).toBe(planDayKey(today))
      expect(result.value.reason).toBe(PlanLoadReason.manual)
      expect(result.value.events.map((e) => e.id)).toEqual(['today-a'])
    }
  })

  it('resolves an empty day rather than treating "nothing" as a failure', async () => {
    const { store } = storeWith()
    const result = await store
      .dispatch(loadPlanDayThunk({ day: today, reason: PlanLoadReason.appWide }))
      .unwrap()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.events).toEqual([])
  })

  it('never rejects — a failing host degrades to an empty best-effort answer', async () => {
    const store = failingStore('store closed')
    const result = await store
      .dispatch(loadPlanDayThunk({ day: today, reason: PlanLoadReason.manual }))
      .unwrap()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.events).toEqual([])
  })
})

describe('preloadPlanDaysThunk', () => {
  it('resolves the seven-day window, tagged with the day it centred on', async () => {
    const { store } = storeWith([
      recordOf(event('in-window', addingPlanDays(today, 2))),
      recordOf(event('out-of-window', addingPlanDays(today, 9))),
    ])
    const result = await store
      .dispatch(preloadPlanDaysThunk({ center: today }))
      .unwrap()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.centerDayKey).toBe(planDayKey(today))
      expect(result.value.events.map((e) => e.id)).toEqual(['in-window'])
    }
  })

  it('includes the three days before the centre as well as the three after', async () => {
    const { store } = storeWith([
      recordOf(event('three-back', addingPlanDays(today, -3))),
      recordOf(event('three-forward', addingPlanDays(today, 3))),
      recordOf(event('four-back', addingPlanDays(today, -4))),
    ])
    const result = await store
      .dispatch(preloadPlanDaysThunk({ center: today }))
      .unwrap()
    if (result.ok) {
      expect(result.value.events.map((e) => e.id).sort()).toEqual([
        'three-back',
        'three-forward',
      ])
    }
  })

  it('resolves an empty window without failing', async () => {
    const { store } = storeWith()
    const result = await store
      .dispatch(preloadPlanDaysThunk({ center: today }))
      .unwrap()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.events).toEqual([])
  })
})

describe('loadPlanMatrixThunk', () => {
  it('resolves every stored row for the matrix to narrow', async () => {
    const { store } = storeWith([
      recordOf(event('a', planAt(9))),
      recordOf(event('b', addingPlanDays(today, 20))),
    ])
    const result = await store.dispatch(loadPlanMatrixThunk()).unwrap()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.map((e) => e.id).sort()).toEqual(['a', 'b'])
  })

  it('resolves an error rather than throwing when the store cannot be read', async () => {
    const store = failingStore('store closed')
    const result = await store.dispatch(loadPlanMatrixThunk()).unwrap()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('matrixLoadFailed')
  })

  it('resolves an empty set for an empty store', async () => {
    const { store } = storeWith()
    const result = await store.dispatch(loadPlanMatrixThunk()).unwrap()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toEqual([])
  })
})

describe('updateEventTimeThunk', () => {
  it('persists the rescheduled row and resolves it', async () => {
    const original = event('moving', planAt(9))
    const { store, localStore } = storeWith([recordOf(original)])

    const result = await store
      .dispatch(
        updateEventTimeThunk({
          endeavor: original,
          start: planAt(11),
          end: planAt(12),
          now: PLAN_REFERENCE_DAY,
        }),
      )
      .unwrap()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.start).toEqual(planAt(11))
      expect(result.value.duration).toBe(3600)
    }
    const stored = await localStore.endeavors.get('moving')
    expect(stored?.start).toEqual(planAt(11))
    expect(stored?.duration).toBe(3600)
  })

  it('stamps the write watermark from the injected clock, never Date.now()', async () => {
    const original = event('moving', planAt(9))
    const { store, localStore } = storeWith([recordOf(original)])
    const stampedAt = new Date(2026, 5, 18, 12, 0, 0)

    await store.dispatch(
      updateEventTimeThunk({
        endeavor: original,
        start: planAt(11),
        end: planAt(12),
        now: stampedAt,
      }),
    )
    const stored = await localStore.endeavors.get('moving')
    expect(stored?.updatedAtEpochMillis).toBe(stampedAt.getTime())
  })

  it('resolves an error rather than throwing when the write fails', async () => {
    const store = failingStore('QuotaExceededError')
    const result = await store
      .dispatch(
        updateEventTimeThunk({
          endeavor: event('moving', planAt(9)),
          start: planAt(11),
          end: planAt(12),
          now: PLAN_REFERENCE_DAY,
        }),
      )
      .unwrap()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toBe('QuotaExceededError')
  })
})
