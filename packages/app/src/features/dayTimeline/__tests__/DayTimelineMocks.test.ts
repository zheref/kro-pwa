/** The canned states every story and test of the read-only timeline reads. */
import { describe, expect, it } from 'vitest'
import { initialDayTimelineState } from '../DayTimelineFeature'
import {
  DAY_TIMELINE_MOCK_NOW,
  dayTimelineStateMocks,
} from '../DayTimelineMocks'

describe('dayTimelineStateMocks', () => {
  it('starts idle, exactly as the slice does before the pane opens', () => {
    expect(dayTimelineStateMocks.idle).toEqual(initialDayTimelineState)
  })

  it('stamps every opened state with the shared reference clock', () => {
    for (const key of ['loading', 'busyDay', 'emptyDay', 'failed'] as const) {
      expect(dayTimelineStateMocks[key].now).toEqual(DAY_TIMELINE_MOCK_NOW)
    }
  })

  it('keeps a busy day and an empty day on the same loaded day', () => {
    const busy = dayTimelineStateMocks.busyDay.load
    const empty = dayTimelineStateMocks.emptyDay.load
    expect(busy.kind).toBe('loaded')
    expect(empty.kind).toBe('loaded')
    if (busy.kind === 'loaded' && empty.kind === 'loaded') {
      expect(busy.events.length).toBeGreaterThan(0)
      expect(empty.events).toEqual([])
      expect(busy.dayKey).toBe(empty.dayKey)
    }
  })

  it('models the failed read as a typed exception, not a string', () => {
    const failed = dayTimelineStateMocks.failed.load
    expect(failed.kind).toBe('failed')
    if (failed.kind === 'failed')
      expect(typeof failed.exception.kind).toBe('string')
  })
})
