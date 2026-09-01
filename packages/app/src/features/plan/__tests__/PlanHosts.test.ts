import type { Endeavor, EndeavorRecord } from '@kro/core'
import {
  EndeavorHost,
  EndeavorKind,
  endeavorRecordFromEndeavor,
  makeEndeavor,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { addingPlanDays, startOfPlanDay } from '../PlanCalendar'
import {
  type PlanHost,
  endeavorsFromRecords,
  fetchPlanHostRange,
  makeLocalStorePlanHost,
  overlapsPlanHostRange,
} from '../PlanHosts'
import { PLAN_REFERENCE_DAY, planAt } from '../PlanMocks'

const today = startOfPlanDay(PLAN_REFERENCE_DAY)
const dayRange = { start: today, end: addingPlanDays(today, 1) }

const event = (id: string, start: Date, durationSeconds: number): Endeavor =>
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

describe('overlapsPlanHostRange', () => {
  it('includes an event sitting wholly inside the window', () => {
    expect(
      overlapsPlanHostRange(event('inside', planAt(9), 3600), dayRange),
    ).toBe(true)
  })

  it('includes an event that runs into the window from the night before', () => {
    expect(
      overlapsPlanHostRange(event('overnight', planAt(-2), 5 * 3600), dayRange),
    ).toBe(true)
  })

  it('includes an event that starts inside and runs past the end', () => {
    expect(
      overlapsPlanHostRange(event('spills', planAt(23), 5 * 3600), dayRange),
    ).toBe(true)
  })

  it('excludes an event that ends before the window opens', () => {
    expect(
      overlapsPlanHostRange(event('before', planAt(-5), 3600), dayRange),
    ).toBe(false)
  })

  it('excludes an event starting exactly at the exclusive end', () => {
    expect(
      overlapsPlanHostRange(
        event('tomorrow', addingPlanDays(today, 1), 3600),
        dayRange,
      ),
    ).toBe(false)
  })

  it('excludes an endeavor with no start — the timeline is start-driven', () => {
    const untimed = makeEndeavor({
      id: 'untimed',
      title: 'x',
      kind: EndeavorKind.task,
    })
    expect(overlapsPlanHostRange(untimed, dayRange)).toBe(false)
  })

  it('includes a zero-length event on the window’s opening instant', () => {
    // Deliberately one notch more permissive than the layout pass, which draws
    // nothing for a zero-extent card. A fetch that under-returns loses data.
    expect(overlapsPlanHostRange(event('instant', today, 0), dayRange)).toBe(
      true,
    )
  })
})

describe('endeavorsFromRecords', () => {
  it('decodes every well-formed row', () => {
    const records = [
      recordOf(event('a', planAt(9), 3600)),
      recordOf(event('b', planAt(11), 3600)),
    ]
    expect(endeavorsFromRecords(records).map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('skips a row whose kind cannot be decoded rather than emptying the day', () => {
    const broken = {
      ...recordOf(event('broken', planAt(9), 3600)),
      kind: 'nonsense',
    }
    const good = recordOf(event('good', planAt(11), 3600))
    expect(
      endeavorsFromRecords([broken as EndeavorRecord, good]).map((e) => e.id),
    ).toEqual(['good'])
  })

  it('returns nothing for no rows', () => {
    expect(endeavorsFromRecords([])).toEqual([])
  })
})

describe('makeLocalStorePlanHost', () => {
  it('identifies itself as the local host', () => {
    expect(makeLocalStorePlanHost(makeInMemoryLocalStore()).id).toBe(
      EndeavorHost.local,
    )
  })

  it('returns only the rows overlapping the requested window', async () => {
    const store = makeInMemoryLocalStore({
      endeavors: [
        recordOf(event('today-morning', planAt(9), 3600)),
        recordOf(event('today-evening', planAt(20), 3600)),
        recordOf(event('next-week', addingPlanDays(today, 7), 3600)),
      ],
    })
    const host = makeLocalStorePlanHost(store)
    const events = await host.fetchRange(dayRange)
    expect(events.map((e) => e.id).sort()).toEqual([
      'today-evening',
      'today-morning',
    ])
  })

  it('answers with nothing when the store is empty', async () => {
    const host = makeLocalStorePlanHost(makeInMemoryLocalStore())
    expect(await host.fetchRange(dayRange)).toEqual([])
  })

  it('widens with the window — a seven-day preload picks up neighbouring days', async () => {
    const store = makeInMemoryLocalStore({
      endeavors: [
        recordOf(event('today-morning', planAt(9), 3600)),
        recordOf(event('in-two-days', addingPlanDays(today, 2), 3600)),
      ],
    })
    const host = makeLocalStorePlanHost(store)
    const events = await host.fetchRange({
      start: addingPlanDays(today, -3),
      end: addingPlanDays(today, 4),
    })
    expect(events.map((e) => e.id).sort()).toEqual([
      'in-two-days',
      'today-morning',
    ])
  })
})

describe('fetchPlanHostRange — one range request per host', () => {
  const hostReturning = (
    id: EndeavorHost,
    events: readonly Endeavor[],
  ): PlanHost => ({
    id,
    fetchRange: async () => events,
  })

  const failingHost: PlanHost = {
    id: EndeavorHost.googleCalendar,
    fetchRange: async () => {
      throw new Error('network down')
    },
  }

  it('concatenates every host’s answer in host order', async () => {
    const events = await fetchPlanHostRange(
      [
        hostReturning(EndeavorHost.local, [event('local-a', planAt(9), 3600)]),
        hostReturning(EndeavorHost.supabase, [
          event('cloud-a', planAt(11), 3600),
        ]),
      ],
      dayRange,
    )
    expect(events.map((e) => e.id)).toEqual(['local-a', 'cloud-a'])
  })

  it('does not de-duplicate — reconciliation owns identity, not the fan-out', async () => {
    const duplicate = event('same-id', planAt(9), 3600)
    const events = await fetchPlanHostRange(
      [
        hostReturning(EndeavorHost.local, [duplicate]),
        hostReturning(EndeavorHost.supabase, [duplicate]),
      ],
      dayRange,
    )
    expect(events).toHaveLength(2)
  })

  it('lets one host fail without losing the others — best effort per host', async () => {
    const events = await fetchPlanHostRange(
      [
        failingHost,
        hostReturning(EndeavorHost.local, [event('local-a', planAt(9), 3600)]),
      ],
      dayRange,
    )
    expect(events.map((e) => e.id)).toEqual(['local-a'])
  })

  it('answers with nothing, not a rejection, when every host fails', async () => {
    await expect(fetchPlanHostRange([failingHost], dayRange)).resolves.toEqual(
      [],
    )
  })
})
