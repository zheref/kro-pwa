import { describe, expect, it } from 'vitest'
import {
  DO_SURFACE_MOCK_NOW,
  desktopDoLayout,
  doSurfaceMocks,
  doSurfaceProps,
  eventCardsOf,
  handheldDoLayout,
  laneCardsOf,
  remainingCountOf,
  ringsOf,
} from '../doSurfaceMocks'

/**
 * The fixtures are the evidence every story and render test rests on, so they
 * get their own guard: a projection that silently emptied would turn a dozen
 * assertions into vacuous truths without failing any of them.
 */
describe('the typical day actually populates the lanes it claims to', () => {
  it('fills Overdue, Due Soon, Expired, Next, Anytime and Completed Today', () => {
    const lanes = laneCardsOf(doSurfaceMocks.typicalDay)

    expect(lanes.overdue.length).toBeGreaterThan(0)
    expect(lanes.now.length).toBeGreaterThan(0)
    expect(lanes.expired.length).toBeGreaterThan(0)
    expect(lanes.next.length).toBeGreaterThan(0)
    expect(lanes.anytime.length).toBeGreaterThan(0)
    expect(lanes.completedToday.length).toBeGreaterThan(0)
  })

  it('fills the hero lane with an odd, hero-centred window', () => {
    const { featuredNow } = laneCardsOf(doSurfaceMocks.typicalDay)
    expect(featuredNow.length).toBeGreaterThanOrEqual(3)
    expect(featuredNow.length % 2).toBe(1)
  })

  it('carries a reminder and a calendar event, so both lanes render', () => {
    expect(doSurfaceMocks.typicalDay.reminders.length).toBeGreaterThan(0)
    const events = eventCardsOf(doSurfaceMocks.typicalDay)
    expect(events.allDay.length + events.timedGroups.length).toBeGreaterThan(0)
  })

  it('counts "N left today" over the five lanes canon counts, not seven', () => {
    const state = doSurfaceMocks.typicalDay
    expect(remainingCountOf(state)).toBe(
      state.lanes.overdue.length +
        state.lanes.expired.length +
        state.lanes.now.length +
        state.lanes.next.length +
        state.lanes.anytime.length,
    )
  })
})

describe('the empty day is genuinely empty', () => {
  it('draws no rings, because nothing was expected', () => {
    expect(ringsOf(doSurfaceMocks.emptyDay)).toEqual([])
  })

  it('reports the true global empty state rather than a filtered one', () => {
    expect(doSurfaceProps(doSurfaceMocks.emptyDay).hasNoEndeavors).toBe(true)
    expect(doSurfaceProps(doSurfaceMocks.typicalDay).hasNoEndeavors).toBe(false)
  })
})

describe('the two surfaces differ where canon says they differ', () => {
  it('expands the day title only at regular width', () => {
    expect(desktopDoLayout.usesExpandedDayTitle).toBe(true)
    expect(handheldDoLayout.usesExpandedDayTitle).toBe(false)
  })

  it('presents notifications inline only where there is room beside the day', () => {
    expect(desktopDoLayout.presentsNotificationsInline).toBe(true)
    expect(handheldDoLayout.presentsNotificationsInline).toBe(false)
  })

  it('pins both surfaces to the same instant, so a snapshot is deterministic', () => {
    expect(doSurfaceProps(doSurfaceMocks.typicalDay).now).toBe(
      DO_SURFACE_MOCK_NOW,
    )
    expect(doSurfaceProps(doSurfaceMocks.typicalDay, 'handheld').now).toBe(
      DO_SURFACE_MOCK_NOW,
    )
  })
})

describe('the failure fixture keeps the day it failed to refresh', () => {
  it('carries the exception copy and the lanes at once', () => {
    const props = doSurfaceProps(doSurfaceMocks.failedRefresh)
    expect(props.exceptionMessage).toContain("Couldn't refresh the Do screen")
    expect(props.lanes.overdue.length).toBeGreaterThan(0)
  })
})
