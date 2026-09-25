/**
 * Sync reducer arms called directly on the slice reducer (`RC-12`); thunk
 * lifecycle arms driven through the real thunk against a stubbed store
 * (`RC-54`), plus the lifecycle actions applied to canned states.
 */
import { describe, expect, it } from 'vitest'
import { planDayFixtures, PLAN_REFERENCE_DAY } from '../../plan/PlanMocks'
import { ok, err } from '@kro/core'
import { DayTimelineExceptions } from '../DayTimelineException'
import {
  dayTimelineSlice,
  onClockTicked,
  onViewLoaded,
} from '../DayTimelineFeature'
import {
  DAY_TIMELINE_MOCK_NOW,
  dayTimelineStateMocks,
} from '../DayTimelineMocks'
import { loadDayTimelineThunk } from '../DayTimelineProducer'
import {
  makeDayTimelineStore,
  makeFailingDayTimelineStore,
} from './dayTimelineStores'

const reduce = dayTimelineSlice.reducer
const later = new Date(DAY_TIMELINE_MOCK_NOW.getTime() + 60_000)
const ARG = { day: PLAN_REFERENCE_DAY }

describe('onViewLoaded', () => {
  it('opening the pane stamps the clock', () => {
    const next = reduce(
      dayTimelineStateMocks.idle,
      onViewLoaded({ now: DAY_TIMELINE_MOCK_NOW }),
    )
    expect(next.now?.getTime()).toBe(DAY_TIMELINE_MOCK_NOW.getTime())
  })

  it('re-opening keeps an already-loaded day on screen', () => {
    const next = reduce(
      dayTimelineStateMocks.busyDay,
      onViewLoaded({ now: later }),
    )
    expect(next.load.kind).toBe('loaded')
    expect(next.now?.getTime()).toBe(later.getTime())
  })

  it('re-opening at the same instant changes nothing', () => {
    const next = reduce(
      dayTimelineStateMocks.busyDay,
      onViewLoaded({ now: new Date(DAY_TIMELINE_MOCK_NOW) }),
    )
    expect(next).toEqual(dayTimelineStateMocks.busyDay)
  })
})

describe('onClockTicked', () => {
  it('a minute passes and the now line moves', () => {
    const next = reduce(
      dayTimelineStateMocks.busyDay,
      onClockTicked({ now: later }),
    )
    expect(next.now?.getTime()).toBe(later.getTime())
  })

  it('a tick while loading keeps loading', () => {
    const next = reduce(
      dayTimelineStateMocks.loading,
      onClockTicked({ now: later }),
    )
    expect(next.load.kind).toBe('loading')
  })

  it('a tick never clears a failure', () => {
    const next = reduce(
      dayTimelineStateMocks.failed,
      onClockTicked({ now: later }),
    )
    expect(next.load.kind).toBe('failed')
  })
})

describe('loadDayTimelineThunk lifecycle', () => {
  it('happy: the store ends loaded with today', async () => {
    const store = makeDayTimelineStore(planDayFixtures.longSoloBlock)
    await store.dispatch(loadDayTimelineThunk(ARG))
    const { load } = store.getState().dayTimeline
    expect(load.kind).toBe('loaded')
    if (load.kind === 'loaded') expect(load.events).toHaveLength(1)
  })

  it('failure: the store ends failed with the typed exception', async () => {
    const store = makeFailingDayTimelineStore('nope')
    await store.dispatch(loadDayTimelineThunk(ARG))
    const { load } = store.getState().dayTimeline
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') expect(load.exception.kind).toBe('loadFailed')
  })

  it('edge: pending shows loading before the read lands', () => {
    const next = reduce(
      dayTimelineStateMocks.busyDay,
      loadDayTimelineThunk.pending('r', ARG),
    )
    expect(next.load.kind).toBe('loading')
  })

  it('fulfilled with ok installs the payload', () => {
    const next = reduce(
      dayTimelineStateMocks.loading,
      loadDayTimelineThunk.fulfilled(
        ok({ dayKey: '2026-06-18', events: [] }),
        'r',
        ARG,
      ),
    )
    expect(next.load).toEqual({
      kind: 'loaded',
      dayKey: '2026-06-18',
      events: [],
    })
  })

  it('fulfilled with err records the failure', () => {
    const failure = DayTimelineExceptions.loadFailed('x')
    const next = reduce(
      dayTimelineStateMocks.loading,
      loadDayTimelineThunk.fulfilled(err(failure), 'r', ARG),
    )
    expect(next.load).toEqual({ kind: 'failed', exception: failure })
  })

  it('rejected (defensive) degrades to unknown; an abort is silent', () => {
    const failed = reduce(
      dayTimelineStateMocks.loading,
      loadDayTimelineThunk.rejected(new Error('bug'), 'r', ARG),
    )
    expect(failed.load.kind).toBe('failed')
    if (failed.load.kind === 'failed') {
      expect(failed.load.exception.kind).toBe('unknown')
    }

    const aborted = loadDayTimelineThunk.rejected(null, 'r', ARG)
    const silent = reduce(dayTimelineStateMocks.loading, {
      ...aborted,
      meta: { ...aborted.meta, aborted: true },
    })
    expect(silent.load.kind).toBe('loading')
  })
})
