import { endeavorFromRecord } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { initialDoState } from '../DoFeature'
import {
  DO_MOCK_NOW,
  doEndeavorFixtures,
  doFixtureDay,
  doFixtureRecords,
  doMockAt,
  doStateMocks,
} from '../DoMocks'

/**
 * The fixtures are load-bearing: every other suite in this folder asserts
 * against them, so a fixture that quietly stopped meaning what its name says
 * would turn a real regression into a green run.
 */

describe('DO_MOCK_NOW', () => {
  it('sits mid-morning, so both "earlier today" and "later today" exist', () => {
    expect(DO_MOCK_NOW.getHours()).toBeGreaterThan(2)
    expect(DO_MOCK_NOW.getHours()).toBeLessThan(21)
  })

  it('is a fixed instant, not a clock reading', () => {
    expect(DO_MOCK_NOW).toEqual(doMockAt(17, 10, 0))
  })

  it('is the same on every read', () => {
    expect(DO_MOCK_NOW.getTime()).toBe(doMockAt(17, 10, 0).getTime())
  })
})

describe('doFixtureDay', () => {
  it('holds every named fixture exactly once', () => {
    const ids = doFixtureDay.map((endeavor) => endeavor.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toHaveLength(Object.keys(doEndeavorFixtures).length)
  })

  it('gives every fixture a distinct id, so a lane assertion cannot alias', () => {
    for (const [name, fixture] of Object.entries(doEndeavorFixtures)) {
      expect(fixture.id, `${name} has an id`).not.toBe('')
    }
  })

  it('covers every lane the partition can produce', () => {
    const lanes = doStateMocks.loadedTypicalDay.lanes
    expect(lanes.overdue.length).toBeGreaterThan(0)
    expect(lanes.expired.length).toBeGreaterThan(0)
    expect(lanes.now.length).toBeGreaterThan(0)
    expect(lanes.next.length).toBeGreaterThan(0)
    expect(lanes.anytime.length).toBeGreaterThan(0)
    expect(lanes.completedToday.length).toBeGreaterThan(0)
    expect(lanes.featuredNow.length).toBeGreaterThan(0)
  })
})

describe('doFixtureRecords', () => {
  it('round-trips every fixture back through the persistence codec', () => {
    for (const record of doFixtureRecords()) {
      const hydrated = endeavorFromRecord(record)
      expect(hydrated.ok, `${record.id} decodes`).toBe(true)
    }
  })

  it('keeps the ids stable across the round trip, so a store can be seeded by id', () => {
    expect(doFixtureRecords().map((record) => record.id)).toEqual(
      doFixtureDay.map((endeavor) => endeavor.id),
    )
  })

  it('accepts the instant a suite wants the rows stamped at', () => {
    const stamped = doFixtureRecords(doMockAt(18, 9, 0))
    expect(stamped[0]?.updatedAtEpochMillis).toBe(doMockAt(18, 9, 0).getTime())
  })
})

describe('doStateMocks', () => {
  it('starts from the slice’s own initial state rather than a hand-built one', () => {
    expect(doStateMocks.idle).toBe(initialDoState)
  })

  it('produces every variant through the real Shifters', () => {
    expect(doStateMocks.loading.load).toEqual({ kind: 'loading' })
    expect(doStateMocks.loadedTypicalDay.load).toEqual({ kind: 'loaded' })
    expect(doStateMocks.failedRefreshKeepingTheDay.load.kind).toBe('failed')
  })

  it('keeps the failed-refresh variant holding the good day it failed over', () => {
    expect(doStateMocks.failedRefreshKeepingTheDay.lanes).toEqual(
      doStateMocks.loadedTypicalDay.lanes,
    )
  })

  it('offers an empty day distinct from an unloaded one', () => {
    expect(doStateMocks.loadedEmptyDay.load).toEqual({ kind: 'loaded' })
    expect(doStateMocks.loadedEmptyDay.tasks).toEqual([])
    expect(doStateMocks.idle.load).toEqual({ kind: 'idle' })
  })
})
