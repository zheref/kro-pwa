/**
 * Golden layout fixtures, ported from canon's `TimelineDayPreviewData` shapes.
 *
 * Every expectation below is the placement canon's sweep-line produces for the
 * same day, at the same 60px/hour scale. They are written out as literals
 * rather than recomputed by the code under test, because a golden that derives
 * itself from the implementation cannot catch the implementation changing.
 */
import { EndeavorKind, EndeavorStatus, makeEndeavor } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { PLAN_REFERENCE_DAY, planAt, planDayFixtures } from '../PlanMocks'
import type { PlacedEvent } from '../TimelineLayout'
import {
  placedEventWidthFraction,
  placedEventXFraction,
  timelinePlacements,
  timelinePointOffset,
} from '../TimelineLayout'

const on = PLAN_REFERENCE_DAY

/** The placement of one event, keyed for readable assertions. */
const summarise = (
  placements: ReturnType<typeof timelinePlacements>,
): Record<string, [number, number, number, number]> =>
  Object.fromEntries(
    placements.map((placement) => [
      placement.endeavor.id,
      [
        placement.yOffset,
        placement.height,
        placement.column,
        placement.columnCount,
      ],
    ]),
  )

describe('timelinePointOffset', () => {
  it('places 09:00 at 540px on a 60px/hour grid', () => {
    expect(timelinePointOffset(planAt(0), planAt(9), 60)).toBe(540)
  })

  it('places a half hour at half an hour-height', () => {
    expect(timelinePointOffset(planAt(0), planAt(0, 30), 60)).toBe(30)
  })

  it('clamps a moment before the origin to zero rather than going negative', () => {
    expect(timelinePointOffset(planAt(9), planAt(7), 60)).toBe(0)
  })
})

describe('timelinePlacements — golden fixtures', () => {
  it('lays a solo three-hour block full width from 09:00', () => {
    expect(
      summarise(timelinePlacements(planDayFixtures.longSoloBlock, { on })),
    ).toEqual({ 'solo-standup': [540, 180, 0, 1] })
  })

  it('gives a short event nested inside a long one its own column', () => {
    // Canon's sweep opens one cluster at 09:00 and widens every member of it to
    // two columns, so the 15-minute standup is independently interactive rather
    // than drawn on top of the offsite.
    expect(
      summarise(
        timelinePlacements(planDayFixtures.longBlockWithShortOverlaps, { on }),
      ),
    ).toEqual({
      'nested-long': [540, 240, 0, 2],
      'nested-short-a': [570, 30, 1, 2],
      'nested-short-b': [660, 30, 1, 2],
    })
  })

  it('reuses the freed column for a second nested short event', () => {
    const placements = timelinePlacements(
      planDayFixtures.longBlockWithShortOverlaps,
      { on },
    )
    const shortA = placements.find((p) => p.endeavor.id === 'nested-short-a')
    const shortB = placements.find((p) => p.endeavor.id === 'nested-short-b')
    expect(shortA?.column).toBe(shortB?.column)
  })

  it('splits two overlapping long blocks into two equal columns', () => {
    expect(
      summarise(
        timelinePlacements(planDayFixtures.overlappingLongBlocks, { on }),
      ),
    ).toEqual({
      'overlap-a': [600, 120, 0, 2],
      'overlap-b': [660, 120, 1, 2],
    })
  })

  it('widens a three-way overlap to three columns for every member', () => {
    expect(
      summarise(
        timelinePlacements(planDayFixtures.denseOverlapCluster, { on }),
      ),
    ).toEqual({
      'dense-a': [780, 60, 0, 3],
      'dense-b': [795, 60, 1, 3],
      'dense-c': [810, 60, 2, 3],
    })
  })

  it('keeps separated clusters at one column each and floors a 10-minute card', () => {
    expect(
      summarise(
        timelinePlacements(planDayFixtures.fullDayLongAndShort, { on }),
      ),
    ).toEqual({
      'morning-block': [480, 120, 0, 1],
      'tiny-sync': [900, 30, 0, 1],
      'evening-block': [960, 60, 0, 1],
    })
  })

  it('clamps an event running in from the previous night to the day it renders', () => {
    expect(
      summarise(
        timelinePlacements(planDayFixtures.spillingFromYesterday, { on }),
      ),
    ).toEqual({ 'overnight-run': [0, 180, 0, 1] })
  })

  it('renders nothing for an empty day', () => {
    expect(timelinePlacements(planDayFixtures.empty, { on })).toEqual([])
  })
})

describe('timelinePlacements — scoping', () => {
  const untimed = makeEndeavor({
    id: 'untimed',
    title: 'Someday',
    kind: EndeavorKind.task,
    status: EndeavorStatus.pending,
  })

  const zeroLength = makeEndeavor({
    id: 'zero',
    title: 'Instant',
    kind: EndeavorKind.calendarEvent,
    start: planAt(10),
    duration: 0,
  })

  const tomorrow = makeEndeavor({
    id: 'tomorrow',
    title: 'Next day',
    kind: EndeavorKind.calendarEvent,
    start: new Date(planAt(10).getTime() + 86_400_000),
    duration: 3600,
  })

  it('drops an endeavor with no start time — the canvas is start-driven', () => {
    expect(timelinePlacements([untimed], { on })).toEqual([])
  })

  it('drops a zero-length event, which occupies no extent on the grid', () => {
    expect(timelinePlacements([zeroLength], { on })).toEqual([])
  })

  it('drops an event belonging to another day', () => {
    expect(timelinePlacements([tomorrow], { on })).toEqual([])
  })
})

describe('timelinePlacements — band anchoring', () => {
  it('measures offsets from the top of the rendered band, not from midnight', () => {
    const business = timelinePlacements(planDayFixtures.longSoloBlock, {
      on,
      startHour: 8,
    })
    expect(business[0]?.yOffset).toBe(60)
  })

  it('leaves a full-day band identical to an unspecified one', () => {
    expect(
      timelinePlacements(planDayFixtures.denseOverlapCluster, {
        on,
        startHour: 0,
      }),
    ).toEqual(timelinePlacements(planDayFixtures.denseOverlapCluster, { on }))
  })

  it('scales every offset and height with a different hour height', () => {
    const doubled = timelinePlacements(planDayFixtures.longSoloBlock, {
      on,
      hourHeightPx: 120,
    })
    expect(doubled[0]?.yOffset).toBe(1080)
    expect(doubled[0]?.height).toBe(360)
  })
})

describe('placedEventXFraction / placedEventWidthFraction', () => {
  const placements = timelinePlacements(
    planDayFixtures.longBlockWithShortOverlaps,
    { on },
  )
  const long = placements[0] as PlacedEvent
  const shortA = placements[1] as PlacedEvent

  it('puts the enclosing block at the left half of a two-column cluster', () => {
    expect(placedEventXFraction(long)).toBe(0)
    expect(placedEventWidthFraction(long)).toBe(0.5)
  })

  it('puts the nested short event in the right half', () => {
    expect(placedEventXFraction(shortA)).toBe(0.5)
    expect(placedEventWidthFraction(shortA)).toBe(0.5)
  })

  it('falls back to full width for a placement with no columns', () => {
    const degenerate: PlacedEvent = { ...long, column: 0, columnCount: 0 }
    expect(placedEventXFraction(degenerate)).toBe(0)
    expect(placedEventWidthFraction(degenerate)).toBe(1)
  })
})

describe('band anchoring — events relative to a late-starting band', () => {
  const preBand = makeEndeavor({
    id: 'pre-band',
    title: 'Early call',
    kind: EndeavorKind.calendarEvent,
    status: EndeavorStatus.planned,
    start: planAt(7),
    duration: 2 * 3600, // 07:00–09:00 against the 08:00 Business band
  })
  const beforeBand = makeEndeavor({
    id: 'before-band',
    title: 'Dawn run',
    kind: EndeavorKind.calendarEvent,
    status: EndeavorStatus.planned,
    start: planAt(6),
    duration: 3600, // ends 07:00, before the band opens
  })

  it('anchors a pre-band start at the band top with its visible height', () => {
    const placements = timelinePlacements([preBand], {
      on: PLAN_REFERENCE_DAY,
      startHour: 8,
    })
    expect(placements).toHaveLength(1)
    expect(placements[0]?.yOffset).toBe(0)
    expect(placements[0]?.height).toBe(60) // the one visible hour at 60px/h
  })

  it('does not place an event that ends before the band opens', () => {
    expect(
      timelinePlacements([beforeBand], {
        on: PLAN_REFERENCE_DAY,
        startHour: 8,
      }),
    ).toHaveLength(0)
  })
})
