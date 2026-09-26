/**
 * `DayTimelinePage` render tests mirroring `DayTimelinePage.stories.tsx`
 * (`RC-11`) — a real store, the real mount dispatch and the real Producer.
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider } from '../../../../library/StoreProvider'
import { PLAN_REFERENCE_NOW, planDayFixtures } from '../../../plan/PlanMocks'
import { DAY_TIMELINE_TICK_MS, DayTimelinePage } from '../DayTimelinePage'
import {
  makeDayTimelineStore,
  makeFailingDayTimelineStore,
} from './dayTimelinePageStores'

// `Date` and intervals are faked so "today" is Plan's reference day and the
// minute tick can be driven; promises still resolve.
beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['Date', 'setInterval', 'clearInterval'],
    now: PLAN_REFERENCE_NOW,
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('DayTimelinePage', () => {
  it("Typical: loads today's events into a read-only canvas", async () => {
    render(
      <StoreProvider
        store={makeDayTimelineStore(planDayFixtures.longBlockWithShortOverlaps)}
      >
        <DayTimelinePage />
      </StoreProvider>,
    )
    expect(await screen.findAllByTestId('plan-timeline-block')).toHaveLength(3)
    expect(
      screen.getByTestId('plan-timeline-blocks').hasAttribute('inert'),
    ).toBe(true)
  })

  it('EmptyStore: the grid and the now line, nothing else', async () => {
    const store = makeDayTimelineStore()
    render(
      <StoreProvider store={store}>
        <DayTimelinePage />
      </StoreProvider>,
    )
    await vi.waitFor(() =>
      expect(store.getState().dayTimeline.load.kind).toBe('loaded'),
    )
    expect(screen.getByTestId('plan-timeline-now')).toBeTruthy()
    expect(screen.queryAllByTestId('plan-timeline-block')).toHaveLength(0)
  })

  it('Failed: the one-line failure sentence', async () => {
    render(
      <StoreProvider store={makeFailingDayTimelineStore('flags unavailable')}>
        <DayTimelinePage />
      </StoreProvider>,
    )
    expect(
      (await screen.findByTestId('day-timeline-failure')).textContent,
    ).toBe("Couldn't load today's timeline.")
  })

  it('moves the now line every minute', async () => {
    const store = makeDayTimelineStore()
    render(
      <StoreProvider store={store}>
        <DayTimelinePage />
      </StoreProvider>,
    )
    const before = store.getState().dayTimeline.now?.getTime() ?? 0
    act(() => {
      vi.advanceTimersByTime(DAY_TIMELINE_TICK_MS)
    })
    expect(store.getState().dayTimeline.now?.getTime()).toBe(
      before + DAY_TIMELINE_TICK_MS,
    )
  })
})
