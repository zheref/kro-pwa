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
import { PLAN_REFERENCE_DAY, planAt } from '../../../features/plan/PlanMocks'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { stubbedThunkExtra } from '../../store'
import { addingPlanDays, startOfPlanDay } from '../PlanCalendar'
import { planHostsFor } from '../PlanHostSources'

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
