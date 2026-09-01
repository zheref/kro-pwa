import {
  EndeavorHost,
  EndeavorKind,
  EndeavorStatus,
  makeEndeavor,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { DO_MOCK_NOW, doMockAt } from '../../DoMocks'
import { doLensFor, initialDoVisibility } from '../../DoRules'
import { eligibleDoEvents, groupDoEvents } from '../doEventLanes'

const lens = doLensFor(initialDoVisibility)

const event = (params: {
  id: string
  title?: string
  start: Date | null
  duration?: number | null
  status?: EndeavorStatus
}) =>
  makeEndeavor({
    id: params.id,
    title: params.title ?? params.id,
    kind: EndeavorKind.calendarEvent,
    status: params.status ?? EndeavorStatus.pending,
    start: params.start,
    duration: params.duration ?? null,
    hostedBy: [EndeavorHost.googleCalendar],
  })

const at = (hour: number, minute = 0) => doMockAt(17, hour, minute)

describe("eligibility — canon's four guards", () => {
  it('drops an event with no start, which cannot be placed on the day', () => {
    const events = [event({ id: 'no-start', start: null })]
    expect(eligibleDoEvents({ events, lens, now: DO_MOCK_NOW })).toEqual([])
  })

  it('drops a closed or skipped event, mirroring the old post-filter exactly', () => {
    const events = [
      event({ id: 'closed', start: at(9), status: EndeavorStatus.closed }),
      event({ id: 'skipped', start: at(9), status: EndeavorStatus.skipped }),
    ]
    expect(eligibleDoEvents({ events, lens, now: DO_MOCK_NOW })).toEqual([])
  })

  it('keeps a reviewing event, which canon never filtered out', () => {
    const events = [
      event({
        id: 'reviewing',
        start: at(9),
        status: EndeavorStatus.reviewing,
      }),
    ]
    expect(
      eligibleDoEvents({ events, lens, now: DO_MOCK_NOW }).map((e) => e.id),
    ).toEqual(['reviewing'])
  })

  it('drops an event that starts on another calendar day', () => {
    const events = [event({ id: 'tomorrow', start: doMockAt(18, 9) })]
    expect(eligibleDoEvents({ events, lens, now: DO_MOCK_NOW })).toEqual([])
  })

  it('drops every event once the Event kind is hidden', () => {
    const hidden = doLensFor({
      ...initialDoVisibility,
      hiddenKinds: [EndeavorKind.calendarEvent],
    })
    const events = [event({ id: 'visible-otherwise', start: at(9) })]
    expect(
      eligibleDoEvents({ events, lens: hidden, now: DO_MOCK_NOW }),
    ).toEqual([])
  })
})

describe('the all-day row', () => {
  it('takes every event with no duration, title-sorted', () => {
    const events = [
      event({ id: 'b', title: 'Birthday', start: at(0) }),
      event({ id: 'a', title: 'Anniversary', start: at(0) }),
      event({ id: 't', title: 'Timed', start: at(14), duration: 3600 }),
    ]
    const { allDay } = groupDoEvents({ events, lens, now: DO_MOCK_NOW })
    expect(allDay.map((e) => e.title)).toEqual(['Anniversary', 'Birthday'])
  })

  it('is empty when every event on the day is timed', () => {
    const events = [event({ id: 't', start: at(14), duration: 3600 })]
    expect(groupDoEvents({ events, lens, now: DO_MOCK_NOW }).allDay).toEqual([])
  })

  it('is empty for a day with no events at all', () => {
    expect(groupDoEvents({ events: [], lens, now: DO_MOCK_NOW })).toEqual({
      allDay: [],
      timedGroups: [],
    })
  })
})

describe('the timed columns', () => {
  it('drops a meeting that has already ended', () => {
    // 08:00 + 30min ends at 08:30; `now` is 10:00.
    const events = [event({ id: 'past', start: at(8), duration: 1800 })]
    expect(
      groupDoEvents({ events, lens, now: DO_MOCK_NOW }).timedGroups,
    ).toEqual([])
  })

  it('keeps a meeting that is running right now, and leads with it', () => {
    const events = [
      event({ id: 'later', start: at(14), duration: 3600 }),
      event({ id: 'ongoing', start: at(9, 30), duration: 3600 }),
    ]
    const { timedGroups } = groupDoEvents({ events, lens, now: DO_MOCK_NOW })
    expect(timedGroups.map((group) => group.map((e) => e.id))).toEqual([
      ['ongoing'],
      ['later'],
    ])
  })

  it('stacks two events that start in the same minute into one column', () => {
    const events = [
      event({ id: 'a', start: at(14), duration: 3600 }),
      event({ id: 'b', start: at(14), duration: 1800 }),
    ]
    const { timedGroups } = groupDoEvents({ events, lens, now: DO_MOCK_NOW })
    expect(timedGroups).toHaveLength(1)
    expect(timedGroups[0]?.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('drops a third concurrent event rather than growing the column', () => {
    const events = [
      event({ id: 'a', start: at(14), duration: 3600 }),
      event({ id: 'b', start: at(14), duration: 3600 }),
      event({ id: 'c', start: at(14), duration: 3600 }),
    ]
    const { timedGroups } = groupDoEvents({ events, lens, now: DO_MOCK_NOW })
    expect(timedGroups).toHaveLength(1)
    expect(timedGroups[0]).toHaveLength(2)
  })

  it('separates events one minute apart into two columns', () => {
    const events = [
      event({ id: 'a', start: at(14, 0), duration: 3600 }),
      event({ id: 'b', start: at(14, 1), duration: 3600 }),
    ]
    const { timedGroups } = groupDoEvents({ events, lens, now: DO_MOCK_NOW })
    expect(timedGroups.map((group) => group.map((e) => e.id))).toEqual([
      ['a'],
      ['b'],
    ])
  })

  it('orders upcoming events by start after the ongoing ones', () => {
    const events = [
      event({ id: 'evening', start: at(18), duration: 3600 }),
      event({ id: 'afternoon', start: at(14), duration: 3600 }),
      event({ id: 'ongoing', start: at(9, 45), duration: 3600 }),
    ]
    const { timedGroups } = groupDoEvents({ events, lens, now: DO_MOCK_NOW })
    expect(timedGroups.flat().map((e) => e.id)).toEqual([
      'ongoing',
      'afternoon',
      'evening',
    ])
  })
})
