/**
 * Producers are dispatched for real against a stubbed `LocalStore` injected
 * through `ThunkExtra` — never a mocked `fetch`, never the live bindings
 * (`RC-54`, `RC-35`). The assertions are on the resolved `Result`, because a
 * Producer's contract is what it resolves, not what it leaves in state.
 */
import type { Endeavor, EndeavorRecord, FeatureFlagService } from '@kro/core'
import {
  EisenhowerQuadrant,
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
  persistQuadrantAssignmentsThunk,
  planHostsFor,
  preloadPlanDaysThunk,
  resolvePlanFlagsThunk,
  updateEventTimeThunk,
} from '../PlanProducer'
import { userDidAssignToQuadrant } from '../PlanFeature'
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
    expect(await google?.fetchRange({ start: today, end: tomorrow })).toEqual(
      [],
    )
  })

  it('drops the Google host entirely when its flag is disabled (UZF-22)', () => {
    // `googleCalendarIntegration` is ENABLED at `statusQuo` — canon ships the
    // integration on — so this is the kill-switch path, not a rollout gate.
    const flags = makeHardcodedFeatureFlagService()
    flags.change(
      FeatureFlags.googleCalendarIntegration,
      FeatureFlagState.disabled,
    )
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
      .dispatch(
        loadPlanDayThunk({ day: today, reason: PlanLoadReason.appWide }),
      )
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
    if (result.ok)
      expect(result.value.map((e) => e.id).sort()).toEqual(['a', 'b'])
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

/**
 * The flag resolver (KC-IS-#71 item 22).
 *
 * `onViewLoaded` takes both gates as arguments so no Selector ever reaches for
 * a flag Service; this is the Producer that supplies them. Four cases in the
 * `RC-54` shape: the shipping baseline, an override in each direction, and the
 * unreadable-service path.
 */
describe('resolvePlanFlagsThunk', () => {
  const resolveWith = async (featureFlags: FeatureFlagService) => {
    const store = makeStore({
      ...stubbedThunkExtra,
      localStore: makeInMemoryLocalStore(),
      featureFlags,
    })
    const action = await store.dispatch(resolvePlanFlagsThunk())
    const payload = resolvePlanFlagsThunk.fulfilled.match(action)
      ? action.payload
      : null
    if (payload === null || !payload.ok) throw new Error('did not resolve ok')
    return payload.value
  }

  it('reports the shipping baseline: quick-create on, Detail dark-launched', async () => {
    const resolved = await resolveWith(makeHardcodedFeatureFlagService())

    expect(resolved.isQuickEventCreationEnabled).toBe(true)
    // `endeavorDetail` is OFF at `statusQuo` while iOS dark-launches Detail, so
    // the row's `viewDetail` tap stays unoffered — which is what the labelled
    // `Open` control beside the gesture surface exists for.
    expect(resolved.enabledCapabilityFlags).toEqual([])
  })

  it('offers the Detail capability once its flag is turned on', async () => {
    const flags = makeHardcodedFeatureFlagService()
    flags.change(FeatureFlags.endeavorDetail, FeatureFlagState.enabled)

    const resolved = await resolveWith(flags)

    expect(resolved.enabledCapabilityFlags).toEqual([
      FeatureFlags.endeavorDetail.name,
    ])
  })

  it('takes the quick-create canvas away when its flag is turned off', async () => {
    const flags = makeHardcodedFeatureFlagService()
    flags.change(
      FeatureFlags.timelineQuickEventCreation,
      FeatureFlagState.disabled,
    )

    const resolved = await resolveWith(flags)

    expect(resolved.isQuickEventCreationEnabled).toBe(false)
  })

  it('resolves to "nothing enabled" when the flag service throws, never an error', async () => {
    const throwing: FeatureFlagService = {
      ...makeHardcodedFeatureFlagService(),
      isEnabled: () => {
        throw new Error('flag store unavailable')
      },
    }

    const resolved = await resolveWith(throwing)

    // A capability whose flag cannot be read is simply not offered: the surface
    // renders without the dark-launched gesture rather than refusing to render.
    expect(resolved).toEqual({
      isQuickEventCreationEnabled: false,
      enabledCapabilityFlags: [],
    })
  })
})

/**
 * `produceMatrixResolvedEffect`'s web counterpart (KC-IS-#71 item 20).
 *
 * The reducer had the assignment and nothing wrote it, so a quadrant move
 * survived until the next pool read and no further. These cases are about the
 * write: what lands on disk, that it is the row the slice resolved, and that a
 * missing row is skipped rather than failing the batch.
 */
describe('persistQuadrantAssignmentsThunk', () => {
  const admissible = (id: string): Endeavor =>
    makeEndeavor({
      id,
      title: id,
      kind: EndeavorKind.task,
      due: planAt(9),
      value: 1,
      hostedBy: [EndeavorHost.local],
    })

  /** A store whose matrix pool is loaded with `rows`. */
  const storeWithPool = async (rows: readonly Endeavor[]) => {
    const localStore = makeInMemoryLocalStore({
      endeavors: rows.map((row) => recordOf(row)),
    })
    const store = makeStore({ ...stubbedThunkExtra, localStore })
    await store.dispatch(loadPlanMatrixThunk())
    return { store, localStore }
  }

  it('writes the row the reducer resolved, not a second derivation', async () => {
    const { store, localStore } = await storeWithPool([admissible('a')])
    store.dispatch(
      userDidAssignToQuadrant({
        endeavorId: 'a',
        quadrant: EisenhowerQuadrant.prioritize,
      }),
    )
    const inState = (
      store.getState().plan.matrixLoad as { endeavors: readonly Endeavor[] }
    ).endeavors.find((row) => row.id === 'a')

    await store.dispatch(
      persistQuadrantAssignmentsThunk({
        endeavorIds: ['a'],
        now: PLAN_REFERENCE_DAY,
      }),
    )

    const stored = await localStore.endeavors.get('a')
    expect(stored?.value).toBe(inState?.value)
    expect(stored?.due?.getTime()).toBe(inState?.due?.getTime())
  })

  it('writes every id it was given, in one batch', async () => {
    const { store, localStore } = await storeWithPool([
      admissible('a'),
      admissible('b'),
    ])
    for (const id of ['a', 'b']) {
      store.dispatch(
        userDidAssignToQuadrant({
          endeavorId: id,
          quadrant: EisenhowerQuadrant.decide,
        }),
      )
    }

    const action = await store.dispatch(
      persistQuadrantAssignmentsThunk({
        endeavorIds: ['a', 'b'],
        now: PLAN_REFERENCE_DAY,
      }),
    )
    const payload = persistQuadrantAssignmentsThunk.fulfilled.match(action)
      ? action.payload
      : null

    expect(payload?.ok).toBe(true)
    if (payload?.ok)
      expect(payload.value.map((row) => row.id)).toEqual(['a', 'b'])
    expect(await localStore.endeavors.get('a')).toBeTruthy()
    expect(await localStore.endeavors.get('b')).toBeTruthy()
  })

  it('skips an id the pool no longer holds rather than failing the batch', async () => {
    const { store } = await storeWithPool([admissible('a')])

    const action = await store.dispatch(
      persistQuadrantAssignmentsThunk({
        endeavorIds: ['a', 'vanished'],
        now: PLAN_REFERENCE_DAY,
      }),
    )
    const payload = persistQuadrantAssignmentsThunk.fulfilled.match(action)
      ? action.payload
      : null

    // Filtered out by a lens, or removed between the pick and the confirm.
    // Neither is an error, and neither should cost the row that IS there.
    expect(payload?.ok).toBe(true)
    if (payload?.ok) expect(payload.value.map((row) => row.id)).toEqual(['a'])
  })

  it('resolves an error rather than throwing when the write fails', async () => {
    const broken = makeInMemoryLocalStore({
      endeavors: [recordOf(admissible('a'))],
    })
    const store = makeStore({ ...stubbedThunkExtra, localStore: broken })
    await store.dispatch(loadPlanMatrixThunk())
    store.dispatch(
      userDidAssignToQuadrant({
        endeavorId: 'a',
        quadrant: EisenhowerQuadrant.prioritize,
      }),
    )
    // Broken only AFTER the pool is loaded, so the failure is the write's.
    broken.endeavors.put = () => Promise.reject(new Error('QuotaExceededError'))

    const action = await store.dispatch(
      persistQuadrantAssignmentsThunk({
        endeavorIds: ['a'],
        now: PLAN_REFERENCE_DAY,
      }),
    )
    const payload = persistQuadrantAssignmentsThunk.fulfilled.match(action)
      ? action.payload
      : null

    expect(payload?.ok).toBe(false)
    if (payload?.ok === false) {
      expect(payload.error.message).toBe('QuotaExceededError')
    }
  })
})
