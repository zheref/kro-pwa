import { describe, expect, it } from 'vitest'
import type { DayTimelineState } from '../DayTimelineFeature'
import {
  DAY_TIMELINE_MOCK_NOW,
  dayTimelineStateMocks,
} from '../DayTimelineMocks'
import {
  selectDayTimelineDay,
  selectDayTimelineDayKey,
  selectDayTimelineEvents,
  selectDayTimelineFailureCopy,
  selectDayTimelineNow,
  selectDayTimelinePlacements,
} from '../DayTimelineSelectors'

const root = (dayTimeline: DayTimelineState) => ({ dayTimeline })
const FULL = { start: 0, endExclusive: 24 }
const BUSINESS = { start: 8, endExclusive: 20 }

describe('selectDayTimelineNow / Day / DayKey', () => {
  it('today starts at midnight of the stamped clock', () => {
    const state = root(dayTimelineStateMocks.busyDay)
    expect(selectDayTimelineNow(state)).toBe(DAY_TIMELINE_MOCK_NOW)
    expect(selectDayTimelineDay(state)?.getHours()).toBe(0)
    expect(selectDayTimelineDayKey(state)).toBe('2026-06-18')
  })

  it('a tick within the same day keeps the same Date instance', () => {
    const first = selectDayTimelineDay(root(dayTimelineStateMocks.busyDay))
    const ticked = selectDayTimelineDay(
      root({
        ...dayTimelineStateMocks.busyDay,
        now: new Date(DAY_TIMELINE_MOCK_NOW.getTime() + 60_000),
      }),
    )
    expect(ticked).toBe(first)
  })

  it('an unopened pane has no day', () => {
    const state = root(dayTimelineStateMocks.idle)
    expect(selectDayTimelineNow(state)).toBeNull()
    expect(selectDayTimelineDay(state)).toBeNull()
    expect(selectDayTimelineDayKey(state)).toBeNull()
  })
})

describe('selectDayTimelineEvents', () => {
  it('is chronological by start, then title', () => {
    const titles = selectDayTimelineEvents(
      root(dayTimelineStateMocks.busyDay),
    ).map((event) => event.title)
    expect(titles).toEqual(['Offsite', 'Standup', 'One-on-one'])
  })

  it('shows nothing for a loaded day that is no longer today', () => {
    expect(
      selectDayTimelineEvents(root(dayTimelineStateMocks.staleDay)),
    ).toEqual([])
  })

  it('is empty while loading or failed', () => {
    expect(
      selectDayTimelineEvents(root(dayTimelineStateMocks.loading)),
    ).toEqual([])
    expect(selectDayTimelineEvents(root(dayTimelineStateMocks.failed))).toEqual(
      [],
    )
  })
})

describe('selectDayTimelinePlacements', () => {
  it('places every event of a busy day in its own column', () => {
    const placements = selectDayTimelinePlacements(
      root(dayTimelineStateMocks.busyDay),
      FULL,
    )
    expect(placements).toHaveLength(3)
    expect(placements[0]?.yOffset).toBe(9 * 60)
  })

  it('anchors offsets to the band, like the Plan tab', () => {
    const placements = selectDayTimelinePlacements(
      root(dayTimelineStateMocks.busyDay),
      BUSINESS,
    )
    expect(placements[0]?.yOffset).toBe(60)
  })

  it('is empty before the pane has a day', () => {
    expect(
      selectDayTimelinePlacements(root(dayTimelineStateMocks.idle), FULL),
    ).toEqual([])
  })
})

describe('selectDayTimelineFailureCopy', () => {
  it('a failed read yields the domain sentence', () => {
    expect(
      selectDayTimelineFailureCopy(root(dayTimelineStateMocks.failed)),
    ).toBe("Couldn't load today's timeline.")
  })

  it('a loaded day has no failure', () => {
    expect(
      selectDayTimelineFailureCopy(root(dayTimelineStateMocks.busyDay)),
    ).toBeNull()
  })

  it('an idle pane has no failure', () => {
    expect(
      selectDayTimelineFailureCopy(root(dayTimelineStateMocks.idle)),
    ).toBeNull()
  })
})
