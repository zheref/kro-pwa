import type { Endeavor } from '@kro/core'
import { EndeavorKind, makeEndeavor } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { addingPlanDays, planDayKey, startOfPlanDay } from '../PlanCalendar'
import {
  emptyPlanDayCache,
  partitionPlanDayBuffer,
  planCachePreservingDayAcrossMidnight,
  planCacheReplacing,
  planCacheWithRescheduled,
  planDayCacheEntry,
  planEventsForDay,
  planPreloadDays,
  planPreloadWindow,
} from '../PlanDayCache'
import { PLAN_REFERENCE_DAY, planAt } from '../PlanMocks'

const today = startOfPlanDay(PLAN_REFERENCE_DAY)
const todayKey = planDayKey(today)
const yesterday = addingPlanDays(today, -1)
const tomorrow = addingPlanDays(today, 1)

const at = (day: Date, hour: number, id: string): Endeavor =>
  makeEndeavor({
    id,
    title: id,
    kind: EndeavorKind.calendarEvent,
    start: new Date(day.getTime() + hour * 3_600_000),
    duration: 3600,
  })

describe('planPreloadWindow', () => {
  it('spans three days back to three days forward, half-open', () => {
    const window = planPreloadWindow(today)
    expect(window.start.getTime()).toBe(addingPlanDays(today, -3).getTime())
    expect(window.end.getTime()).toBe(addingPlanDays(today, 4).getTime())
  })

  it('covers exactly seven whole days', () => {
    const window = planPreloadWindow(today)
    const days = (window.end.getTime() - window.start.getTime()) / 86_400_000
    expect(days).toBe(7)
  })

  it('honours a narrower radius when one is given', () => {
    const window = planPreloadWindow(today, 1)
    expect(window.start.getTime()).toBe(addingPlanDays(today, -1).getTime())
    expect(window.end.getTime()).toBe(addingPlanDays(today, 2).getTime())
  })

  it('centres on the day, not on the moment within it', () => {
    expect(planPreloadWindow(planAt(23, 59))).toEqual(
      planPreloadWindow(planAt(0)),
    )
  })
})

describe('planPreloadDays', () => {
  it('lists the seven days the window covers, ascending', () => {
    const days = planPreloadDays(today).map(planDayKey)
    expect(days).toHaveLength(7)
    expect(days[0]).toBe(planDayKey(addingPlanDays(today, -3)))
    expect(days[3]).toBe(todayKey)
    expect(days[6]).toBe(planDayKey(addingPlanDays(today, 3)))
  })

  it('always contains the centre day itself', () => {
    expect(planPreloadDays(today).map(planDayKey)).toContain(todayKey)
  })

  it('shrinks with the radius', () => {
    expect(planPreloadDays(today, 1)).toHaveLength(3)
  })
})

describe('partitionPlanDayBuffer — the authoritative day is filtered out', () => {
  const events = [
    at(yesterday, 10, 'yesterday-a'),
    at(today, 9, 'today-a'),
    at(today, 14, 'today-b'),
    at(tomorrow, 15, 'tomorrow-a'),
  ]

  it('never files an event onto the authoritative day, however many arrive', () => {
    const cache = partitionPlanDayBuffer(events, { excludingDayKey: todayKey })
    expect(cache[todayKey]).toBeUndefined()
  })

  it('keeps every other day, grouped by its own key', () => {
    const cache = partitionPlanDayBuffer(events, { excludingDayKey: todayKey })
    expect(cache[planDayKey(yesterday)]?.map((e) => e.id)).toEqual([
      'yesterday-a',
    ])
    expect(cache[planDayKey(tomorrow)]?.map((e) => e.id)).toEqual([
      'tomorrow-a',
    ])
  })

  it('drops an endeavor with no start — the buffer is start-indexed', () => {
    const untimed = makeEndeavor({
      id: 'untimed',
      title: 'Someday',
      kind: EndeavorKind.task,
    })
    const cache = partitionPlanDayBuffer([untimed], {
      excludingDayKey: todayKey,
    })
    expect(Object.keys(cache)).toEqual([])
  })

  it('keeps every day when nothing is authoritative yet', () => {
    const cache = partitionPlanDayBuffer(events, { excludingDayKey: null })
    expect(cache[todayKey]?.map((e) => e.id)).toEqual(['today-a', 'today-b'])
  })
})

describe('planDayCacheEntry', () => {
  const cache = partitionPlanDayBuffer([at(tomorrow, 15, 'tomorrow-a')], {
    excludingDayKey: todayKey,
  })

  it('returns the day’s events when the buffer has them', () => {
    expect(planDayCacheEntry(cache, tomorrow).map((e) => e.id)).toEqual([
      'tomorrow-a',
    ])
  })

  it('returns an empty list for a day the buffer never covered', () => {
    expect(planDayCacheEntry(cache, addingPlanDays(today, 10))).toEqual([])
  })

  it('never falls back to the authoritative array', () => {
    expect(planDayCacheEntry(cache, today)).toEqual([])
  })
})

describe('planEventsForDay — a selection, never a merge', () => {
  const authoritativeEvents = [at(today, 9, 'authoritative')]
  const cache = partitionPlanDayBuffer(
    [at(today, 11, 'stale-today'), at(tomorrow, 15, 'buffered-tomorrow')],
    { excludingDayKey: null },
  )

  it('prefers the authoritative array for the day it holds', () => {
    expect(
      planEventsForDay({
        day: today,
        authoritativeDayKey: todayKey,
        authoritativeEvents,
        cache,
      }).map((e) => e.id),
    ).toEqual(['authoritative'])
  })

  it('reads the buffer for any other day', () => {
    expect(
      planEventsForDay({
        day: tomorrow,
        authoritativeDayKey: todayKey,
        authoritativeEvents,
        cache,
      }).map((e) => e.id),
    ).toEqual(['buffered-tomorrow'])
  })

  it('reads the buffer when nothing is authoritative yet', () => {
    expect(
      planEventsForDay({
        day: today,
        authoritativeDayKey: null,
        authoritativeEvents,
        cache,
      }).map((e) => e.id),
    ).toEqual(['stale-today'])
  })
})

describe('planCachePreservingDayAcrossMidnight', () => {
  const authoritativeEvents = [at(today, 9, 'today-standup')]

  it('files the day that just ended into the buffer under its own key', () => {
    const next = planCachePreservingDayAcrossMidnight({
      cache: emptyPlanDayCache,
      selectedDate: today,
      previousNow: planAt(23, 59),
      now: new Date(tomorrow.getTime() + 60_000),
      authoritativeEvents,
    })
    expect(next[todayKey]?.map((e) => e.id)).toEqual(['today-standup'])
  })

  it('does nothing while the clock stays inside one day', () => {
    const cache = emptyPlanDayCache
    expect(
      planCachePreservingDayAcrossMidnight({
        cache,
        selectedDate: today,
        previousNow: planAt(9),
        now: planAt(10),
        authoritativeEvents,
      }),
    ).toBe(cache)
  })

  it('does nothing when the user is already looking at another day', () => {
    const cache = emptyPlanDayCache
    expect(
      planCachePreservingDayAcrossMidnight({
        cache,
        selectedDate: tomorrow,
        previousNow: planAt(23, 59),
        now: new Date(tomorrow.getTime() + 60_000),
        authoritativeEvents,
      }),
    ).toBe(cache)
  })

  it('files only the events that really belong to the day that ended', () => {
    const next = planCachePreservingDayAcrossMidnight({
      cache: emptyPlanDayCache,
      selectedDate: today,
      previousNow: planAt(23, 59),
      now: new Date(tomorrow.getTime() + 60_000),
      authoritativeEvents: [
        at(today, 9, 'today-standup'),
        at(tomorrow, 9, 'tomorrow-leak'),
      ],
    })
    expect(next[todayKey]?.map((e) => e.id)).toEqual(['today-standup'])
  })
})

describe('planCacheWithRescheduled — one owner per occurrence', () => {
  const cache = partitionPlanDayBuffer(
    [at(tomorrow, 15, 'moving'), at(tomorrow, 17, 'staying')],
    { excludingDayKey: todayKey },
  )

  it('moves an event to the buffer entry for its new day', () => {
    const moved = at(addingPlanDays(today, 2), 9, 'moving')
    const next = planCacheWithRescheduled({
      cache,
      endeavor: moved,
      authoritativeDayKey: todayKey,
    })
    expect(next[planDayKey(tomorrow)]?.map((e) => e.id)).toEqual(['staying'])
    expect(
      next[planDayKey(addingPlanDays(today, 2))]?.map((e) => e.id),
    ).toEqual(['moving'])
  })

  it('drops it from the buffer entirely when it lands on the authoritative day', () => {
    const moved = at(today, 9, 'moving')
    const next = planCacheWithRescheduled({
      cache,
      endeavor: moved,
      authoritativeDayKey: todayKey,
    })
    expect(next[todayKey]).toBeUndefined()
    expect(
      Object.values(next)
        .flat()
        .map((e) => e.id),
    ).toEqual(['staying'])
  })

  it('removes an emptied day rather than leaving an empty array behind', () => {
    const onlyEvent = partitionPlanDayBuffer([at(tomorrow, 15, 'moving')], {
      excludingDayKey: todayKey,
    })
    const next = planCacheWithRescheduled({
      cache: onlyEvent,
      endeavor: at(today, 9, 'moving'),
      authoritativeDayKey: todayKey,
    })
    expect(Object.keys(next)).toEqual([])
  })

  it('drops an event that lost its start time', () => {
    const untimed = makeEndeavor({
      id: 'moving',
      title: 'moving',
      kind: EndeavorKind.calendarEvent,
    })
    const next = planCacheWithRescheduled({
      cache,
      endeavor: untimed,
      authoritativeDayKey: todayKey,
    })
    expect(
      Object.values(next)
        .flat()
        .map((e) => e.id),
    ).toEqual(['staying'])
  })
})

describe('planCacheReplacing', () => {
  const cache = partitionPlanDayBuffer(
    [at(tomorrow, 15, 'target'), at(tomorrow, 17, 'other')],
    { excludingDayKey: todayKey },
  )

  it('replaces the row wherever the buffer holds it', () => {
    const updated = {
      ...(cache[planDayKey(tomorrow)]?.[0] as Endeavor),
      value: 5,
    }
    const next = planCacheReplacing(cache, updated)
    expect(next[planDayKey(tomorrow)]?.[0]?.value).toBe(5)
  })

  it('leaves every other row untouched', () => {
    const updated = {
      ...(cache[planDayKey(tomorrow)]?.[0] as Endeavor),
      value: 5,
    }
    const next = planCacheReplacing(cache, updated)
    expect(next[planDayKey(tomorrow)]?.[1]?.id).toBe('other')
  })

  it('does not add a row the buffer never had — day membership is unchanged', () => {
    const stranger = at(tomorrow, 19, 'stranger')
    const next = planCacheReplacing(cache, stranger)
    expect(next[planDayKey(tomorrow)]?.map((e) => e.id)).toEqual([
      'target',
      'other',
    ])
  })
})
