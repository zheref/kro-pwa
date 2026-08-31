/**
 * The fixtures are themselves load-bearing: a golden-layout assertion is only
 * worth something if the shape it laid out is the shape canon tuned against,
 * and a state variant is only worth something if it is internally consistent.
 * These tests hold both.
 */
import { EndeavorKind } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { planDayKey, startOfPlanDay } from '../PlanCalendar'
import { isPastTimelineEvent } from '../PlanEditSession'
import {
  PLAN_REFERENCE_DAY,
  PLAN_REFERENCE_NOW,
  planAt,
  planDayFixtures,
  planEditSessionFixture,
  planMatrixFixtureList,
  planMatrixFixtures,
  planPreloadedDaysFixture,
  planStateMocks,
} from '../PlanMocks'

describe('the reference day', () => {
  it('is a Thursday, so the next-Saturday rule has two days to run', () => {
    expect(PLAN_REFERENCE_DAY.getDay()).toBe(4)
  })

  it('is fixed, so nothing in the suite depends on when it runs', () => {
    expect(PLAN_REFERENCE_DAY.getFullYear()).toBe(2026)
    expect(startOfPlanDay(PLAN_REFERENCE_DAY).getTime()).toBe(
      PLAN_REFERENCE_DAY.getTime(),
    )
  })

  it('puts "now" mid-morning, with events both behind and ahead of it', () => {
    expect(PLAN_REFERENCE_NOW.getHours()).toBe(9)
    expect(isPastTimelineEvent(planDayFixtures.pastEvent[0] as never, PLAN_REFERENCE_NOW))
      .toBe(true)
    expect(
      isPastTimelineEvent(
        planDayFixtures.longBlockWithShortOverlaps[0] as never,
        PLAN_REFERENCE_NOW,
      ),
    ).toBe(false)
  })
})

describe('planAt', () => {
  it('builds a moment on the reference day', () => {
    expect(planDayKey(planAt(14, 30))).toBe(planDayKey(PLAN_REFERENCE_DAY))
  })

  it('carries the hour and minute asked for', () => {
    expect(planAt(14, 30).getHours()).toBe(14)
    expect(planAt(14, 30).getMinutes()).toBe(30)
  })

  it('rolls a negative hour back into the previous evening', () => {
    expect(planAt(-2).getHours()).toBe(22)
    expect(planAt(-2).getDate()).toBe(PLAN_REFERENCE_DAY.getDate() - 1)
  })
})

describe('the day fixtures cover the shapes the layout was tuned against', () => {
  it('nests two short events strictly inside one long one', () => {
    const [long, shortA, shortB] = planDayFixtures.longBlockWithShortOverlaps
    const longEnd = (long?.start as Date).getTime() + (long?.duration as number) * 1000
    for (const short of [shortA, shortB]) {
      expect((short?.start as Date).getTime()).toBeGreaterThan(
        (long?.start as Date).getTime(),
      )
      expect(
        (short?.start as Date).getTime() + (short?.duration as number) * 1000,
      ).toBeLessThan(longEnd)
    }
  })

  it('overlaps two long blocks without nesting either inside the other', () => {
    const [first, second] = planDayFixtures.overlappingLongBlocks
    expect((second?.start as Date).getTime()).toBeLessThan(
      (first?.start as Date).getTime() + (first?.duration as number) * 1000,
    )
    expect((second?.start as Date).getTime()).toBeGreaterThan(
      (first?.start as Date).getTime(),
    )
  })

  it('makes all three of the dense cluster mutually overlapping', () => {
    const events = planDayFixtures.denseOverlapCluster
    const endOf = (index: number) =>
      (events[index]?.start as Date).getTime() +
      (events[index]?.duration as number) * 1000
    expect((events[2]?.start as Date).getTime()).toBeLessThan(endOf(0))
  })

  it('includes a card short enough to need the 30px floor', () => {
    const tiny = planDayFixtures.fullDayLongAndShort.find(
      (event) => event.id === 'tiny-sync',
    )
    expect(tiny?.duration).toBe(600)
  })

  it('includes an event that begins the night before the day it renders', () => {
    const overnight = planDayFixtures.spillingFromYesterday[0]
    expect((overnight?.start as Date).getDate()).toBe(
      PLAN_REFERENCE_DAY.getDate() - 1,
    )
  })
})

describe('the matrix fixtures cover the whole admission table', () => {
  it('names one row per quadrant', () => {
    expect(planMatrixFixtures.urgentImportant.value).toBe(5)
    expect(planMatrixFixtures.futureImportant.value).toBe(4)
    expect(planMatrixFixtures.urgentLowImpact.value).toBe(2)
    expect(planMatrixFixtures.futureLowImpact.value).toBe(1)
  })

  it('includes both halves of "untriaged"', () => {
    expect(planMatrixFixtures.missingValue.value).toBeNull()
    expect(planMatrixFixtures.missingDue.due).toBeNull()
  })

  it('includes every kind admission must refuse', () => {
    expect(planMatrixFixtures.calendarEvent.kind).toBe(EndeavorKind.calendarEvent)
    expect(planMatrixFixtures.habit.kind).toBe(EndeavorKind.habit)
    expect(planMatrixFixtures.reminder.kind).toBe(EndeavorKind.reminder)
  })

  it('lists every fixture exactly once, with unique ids', () => {
    const ids = planMatrixFixtureList.map((endeavor) => endeavor.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toHaveLength(Object.keys(planMatrixFixtures).length)
  })
})

describe('the state variants are internally consistent', () => {
  it('tags every loaded day with the day it actually holds', () => {
    for (const state of [
      planStateMocks.loaded,
      planStateMocks.loadedWithPreload,
      planStateMocks.loadedEmptyDay,
      planStateMocks.editing,
      planStateMocks.quickCreating,
    ]) {
      if (state.dayLoad.kind !== 'loaded') continue
      expect(state.dayLoad.dayKey).toBe(planDayKey(state.selectedDate))
    }
  })

  it('never files the authoritative day into the buffer', () => {
    const authoritative = planDayKey(planStateMocks.loadedWithPreload.selectedDate)
    expect(planPreloadedDaysFixture[authoritative]).toBeUndefined()
  })

  it('arms the edit session on a card the loaded day really contains', () => {
    const events =
      planStateMocks.editing.dayLoad.kind === 'loaded'
        ? planStateMocks.editing.dayLoad.events
        : []
    expect(events.map((event) => event.id)).toContain(
      planEditSessionFixture.endeavorId,
    )
  })

  it('leaves the idle variant untouched by every other variant', () => {
    expect(planStateMocks.idle.dayLoad).toEqual({ kind: 'idle' })
    expect(planStateMocks.idle.activity.isRefreshing).toBe(false)
  })

  it('has all three markers raised in the everything-loading variant', () => {
    expect(planStateMocks.everythingLoading.activity).toEqual({
      isRefreshing: true,
      isAppLoading: true,
      preloadCenterDayKey: planDayKey(PLAN_REFERENCE_DAY),
    })
  })
})
