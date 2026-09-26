import { describe, expect, it } from 'vitest'
import { DayTimelineExceptions } from '../DayTimelineException'
import {
  DAY_TIMELINE_MOCK_NOW,
  dayTimelineStateMocks,
} from '../DayTimelineMocks'
import {
  withClockStamped,
  withDayTimelineFailed,
  withDayTimelineLoaded,
  withDayTimelineLoading,
} from '../DayTimelineShifters'
import { planDayFixtures } from '../../plan/PlanMocks'

const later = new Date(DAY_TIMELINE_MOCK_NOW.getTime() + 60_000)

describe('withClockStamped', () => {
  it('stamps the first clock when the pane opens', () => {
    const next = withClockStamped(dayTimelineStateMocks.idle, later)
    expect(next.now).toBe(later)
    expect(next.load).toBe(dayTimelineStateMocks.idle.load)
  })

  it('moves the clock a minute on a tick, keeping the loaded day', () => {
    const next = withClockStamped(dayTimelineStateMocks.busyDay, later)
    expect(next.now?.getTime()).toBe(later.getTime())
    expect(next.load).toBe(dayTimelineStateMocks.busyDay.load)
  })

  it('the same instant twice is a no-op', () => {
    const state = dayTimelineStateMocks.busyDay
    expect(withClockStamped(state, new Date(DAY_TIMELINE_MOCK_NOW))).toBe(state)
  })
})

describe('withDayTimelineLoading', () => {
  it('an idle pane starts loading', () => {
    expect(withDayTimelineLoading(dayTimelineStateMocks.idle).load.kind).toBe(
      'loading',
    )
  })

  it('a midnight reload replaces yesterday with loading', () => {
    expect(
      withDayTimelineLoading(dayTimelineStateMocks.busyDay).load.kind,
    ).toBe('loading')
  })

  it('a retry after a failure clears the failure', () => {
    const next = withDayTimelineLoading(dayTimelineStateMocks.failed)
    expect(next.load).toEqual({ kind: 'loading' })
    expect(next.now).toBe(dayTimelineStateMocks.failed.now)
  })
})

describe('withDayTimelineLoaded', () => {
  it('installs the day and its events', () => {
    const next = withDayTimelineLoaded(
      dayTimelineStateMocks.loading,
      '2026-06-18',
      planDayFixtures.longSoloBlock,
    )
    expect(next.load).toEqual({
      kind: 'loaded',
      dayKey: '2026-06-18',
      events: planDayFixtures.longSoloBlock,
    })
  })

  it('an empty day is still loaded, not idle', () => {
    const next = withDayTimelineLoaded(
      dayTimelineStateMocks.loading,
      '2026-06-18',
      [],
    )
    expect(next.load.kind).toBe('loaded')
  })

  it('never touches the clock', () => {
    const next = withDayTimelineLoaded(
      dayTimelineStateMocks.loading,
      '2026-06-18',
      [],
    )
    expect(next.now).toBe(dayTimelineStateMocks.loading.now)
  })
})

describe('withDayTimelineFailed', () => {
  it('records the typed exception', () => {
    const failure = DayTimelineExceptions.loadFailed('x')
    const next = withDayTimelineFailed(dayTimelineStateMocks.loading, failure)
    expect(next.load).toEqual({ kind: 'failed', exception: failure })
  })

  it('a failure replaces a previously loaded day', () => {
    const next = withDayTimelineFailed(
      dayTimelineStateMocks.busyDay,
      DayTimelineExceptions.unknown('y'),
    )
    expect(next.load.kind).toBe('failed')
  })

  it('returns a new object, leaving the input untouched', () => {
    const state = dayTimelineStateMocks.loading
    const next = withDayTimelineFailed(
      state,
      DayTimelineExceptions.unknown('z'),
    )
    expect(next).not.toBe(state)
    expect(state.load.kind).toBe('loading')
  })
})
