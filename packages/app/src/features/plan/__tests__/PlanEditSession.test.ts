import type { Endeavor } from '@kro/core'
import { EndeavorKind, EndeavorStatus, makeEndeavor } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { PLAN_REFERENCE_NOW, planAt, planDayFixtures } from '../PlanMocks'
import {
  type TimelineEditSession,
  applyTimelineDrag,
  beginTimelineDrag,
  beginTimelineEdit,
  canEditTimelineEvent,
  commitTimelineEdit,
  endTimelineDrag,
  isPastTimelineEvent,
  snapTimelineDelta,
  timelineEditPreview,
  timelineEditableEnd,
  timelineEventsWithEditPreview,
} from '../PlanEditSession'

const now = PLAN_REFERENCE_NOW

/** The 09:00–13:00 offsite from the nested fixture — future at `now` (09:40). */
const offsite = planDayFixtures.longBlockWithShortOverlaps[0] as Endeavor

const finished = makeEndeavor({
  id: 'finished',
  title: 'Breakfast',
  kind: EndeavorKind.calendarEvent,
  status: EndeavorStatus.planned,
  start: planAt(7),
  duration: 1800,
})

const durationless = makeEndeavor({
  id: 'durationless',
  title: 'All-hands',
  kind: EndeavorKind.calendarEvent,
  status: EndeavorStatus.planned,
  start: planAt(14),
  duration: null,
})

const undated = makeEndeavor({
  id: 'undated',
  title: 'Someday',
  kind: EndeavorKind.task,
  status: EndeavorStatus.pending,
})

/** One hour of drag = 60px at the default 60px/hour scale. */
const HOUR_PX = 60

describe('isPastTimelineEvent', () => {
  it('calls an event that finished before now past', () => {
    expect(isPastTimelineEvent(finished, now)).toBe(true)
  })

  it('does not call an event still running past', () => {
    expect(isPastTimelineEvent(offsite, now)).toBe(false)
  })

  it('treats an event ending exactly now as past, matching canon’s <=', () => {
    const endingNow = makeEndeavor({
      id: 'ending-now',
      title: 'Wrap up',
      kind: EndeavorKind.calendarEvent,
      start: planAt(9),
      duration: 40 * 60,
    })
    expect(isPastTimelineEvent(endingNow, now)).toBe(true)
  })

  it('never calls an endeavor with no start past — it is not on the canvas', () => {
    expect(isPastTimelineEvent(undated, now)).toBe(false)
  })
})

describe('canEditTimelineEvent — past events are read-only', () => {
  it('allows a future event to be armed', () => {
    expect(canEditTimelineEvent(durationless, now)).toBe(true)
  })

  it('refuses a finished event, so history cannot be dragged', () => {
    expect(canEditTimelineEvent(finished, now)).toBe(false)
  })

  it('refuses an endeavor with no start time', () => {
    expect(canEditTimelineEvent(undated, now)).toBe(false)
  })
})

describe('timelineEditableEnd', () => {
  it('reads start + duration when both exist', () => {
    expect(timelineEditableEnd(offsite)?.getTime()).toBe(planAt(13).getTime())
  })

  it('falls back to an hour when a grabbed block has no duration', () => {
    expect(timelineEditableEnd(durationless)?.getTime()).toBe(planAt(15).getTime())
  })

  it('has no end for an endeavor with no start', () => {
    expect(timelineEditableEnd(undated)).toBeNull()
  })
})

describe('beginTimelineEdit', () => {
  it('arms a future event with both drafts still unset', () => {
    const session = beginTimelineEdit(offsite, now)
    expect(session?.endeavorId).toBe('nested-long')
    expect(session?.draftStart).toBeNull()
    expect(session?.draftEnd).toBeNull()
    expect(session?.drag).toBeNull()
  })

  it('refuses a past event outright', () => {
    expect(beginTimelineEdit(finished, now)).toBeNull()
  })

  it('captures the fallback end for a block with no duration', () => {
    expect(beginTimelineEdit(durationless, now)?.originalEnd.getTime()).toBe(
      planAt(15).getTime(),
    )
  })
})

describe('snapTimelineDelta', () => {
  it('quantises an hour of travel to four quarter-hour steps', () => {
    expect(snapTimelineDelta(HOUR_PX)).toBe(3600)
  })

  it('quantises upward travel symmetrically', () => {
    expect(snapTimelineDelta(-HOUR_PX)).toBe(-3600)
  })

  it('snaps a sub-grain nudge to nothing', () => {
    expect(snapTimelineDelta(3)).toBe(0)
  })

  it('rounds an exact half-grain away from zero in both directions', () => {
    // 7.5px = 7.5 minutes = half of one 15-minute snap.
    expect(snapTimelineDelta(7.5)).toBe(900)
    expect(snapTimelineDelta(-7.5)).toBe(-900)
  })
})

describe('top-handle drag — moves the start, never the end', () => {
  const armed = beginTimelineDrag(
    beginTimelineEdit(offsite, now) as TimelineEditSession,
    'start',
  )

  it('moves the start an hour later and leaves the end untouched', () => {
    const dragged = applyTimelineDrag(armed, { translationPx: HOUR_PX })
    expect(dragged.draftStart?.getTime()).toBe(planAt(10).getTime())
    expect(dragged.draftEnd).toBeNull()
  })

  it('moves the start earlier when the finger travels upward', () => {
    const dragged = applyTimelineDrag(armed, { translationPx: -HOUR_PX })
    expect(dragged.draftStart?.getTime()).toBe(planAt(8).getTime())
  })

  it('clamps to 15 minutes before the end rather than crossing it', () => {
    const dragged = applyTimelineDrag(armed, { translationPx: HOUR_PX * 6 })
    expect(dragged.draftStart?.getTime()).toBe(planAt(12, 45).getTime())
  })

  it('returns the very same session when the snapped position has not moved', () => {
    const first = applyTimelineDrag(armed, { translationPx: HOUR_PX })
    const again = applyTimelineDrag(first, { translationPx: HOUR_PX + 2 })
    expect(again).toBe(first)
  })
})

describe('bottom-handle drag — moves the end, never the start', () => {
  const armed = beginTimelineDrag(
    beginTimelineEdit(offsite, now) as TimelineEditSession,
    'end',
  )

  it('extends the end by an hour and leaves the start untouched', () => {
    const dragged = applyTimelineDrag(armed, { translationPx: HOUR_PX })
    expect(dragged.draftEnd?.getTime()).toBe(planAt(14).getTime())
    expect(dragged.draftStart).toBeNull()
  })

  it('shortens the event when the finger travels upward', () => {
    const dragged = applyTimelineDrag(armed, { translationPx: -HOUR_PX })
    expect(dragged.draftEnd?.getTime()).toBe(planAt(12).getTime())
  })

  it('clamps to 15 minutes after the start rather than inverting the event', () => {
    const dragged = applyTimelineDrag(armed, { translationPx: -HOUR_PX * 6 })
    expect(dragged.draftEnd?.getTime()).toBe(planAt(9, 15).getTime())
  })
})

describe('body drag — moves both edges, preserving duration', () => {
  const armed = beginTimelineDrag(
    beginTimelineEdit(offsite, now) as TimelineEditSession,
    'body',
  )

  it('shifts the whole block an hour later', () => {
    const dragged = applyTimelineDrag(armed, { translationPx: HOUR_PX })
    expect(dragged.draftStart?.getTime()).toBe(planAt(10).getTime())
    expect(dragged.draftEnd?.getTime()).toBe(planAt(14).getTime())
  })

  it('preserves duration exactly however far the block travels', () => {
    for (const translationPx of [-600, -60, 15, 300, 1200]) {
      const dragged = applyTimelineDrag(armed, { translationPx })
      const { start, end } = timelineEditPreview(dragged)
      expect(end.getTime() - start.getTime()).toBe(4 * 3600 * 1000)
    }
  })

  it('needs no minimum-duration clamp, because duration comes from the base', () => {
    const dragged = applyTimelineDrag(armed, { translationPx: HOUR_PX * 20 })
    const { start, end } = timelineEditPreview(dragged)
    expect(end.getTime() - start.getTime()).toBe(4 * 3600 * 1000)
  })
})

describe('beginTimelineDrag / endTimelineDrag', () => {
  const session = beginTimelineEdit(offsite, now) as TimelineEditSession

  it('captures the base from the original when no draft exists yet', () => {
    const armed = beginTimelineDrag(session, 'start')
    expect(armed.drag).toEqual({ handle: 'start', baseStart: planAt(9) })
  })

  it('is idempotent for the same handle — re-basing would reintroduce drift', () => {
    const armed = beginTimelineDrag(session, 'start')
    const dragged = applyTimelineDrag(armed, { translationPx: HOUR_PX })
    expect(beginTimelineDrag(dragged, 'start')).toBe(dragged)
  })

  it('re-bases from the draft when a different handle is grabbed', () => {
    const dragged = applyTimelineDrag(
      beginTimelineDrag(session, 'start'),
      { translationPx: HOUR_PX },
    )
    const regrabbed = beginTimelineDrag(endTimelineDrag(dragged), 'body')
    expect(regrabbed.drag).toEqual({
      handle: 'body',
      baseStart: planAt(10),
      baseDurationSeconds: 3 * 3600,
    })
  })

  it('releases the base on end, leaving the draft in place', () => {
    const dragged = applyTimelineDrag(
      beginTimelineDrag(session, 'body'),
      { translationPx: HOUR_PX },
    )
    const released = endTimelineDrag(dragged)
    expect(released.drag).toBeNull()
    expect(released.draftStart?.getTime()).toBe(planAt(10).getTime())
  })

  it('is a no-op to end a drag that never began', () => {
    expect(endTimelineDrag(session)).toBe(session)
  })

  it('ignores a drag frame arriving with no base captured', () => {
    expect(applyTimelineDrag(session, { translationPx: 120 })).toBe(session)
  })
})

describe('commitTimelineEdit', () => {
  const session = beginTimelineEdit(offsite, now) as TimelineEditSession

  it('writes the dragged times', () => {
    const dragged = applyTimelineDrag(
      beginTimelineDrag(session, 'body'),
      { translationPx: HOUR_PX },
    )
    expect(commitTimelineEdit(dragged)).toEqual({
      endeavorId: 'nested-long',
      start: planAt(10),
      end: planAt(14),
    })
  })

  it('commits nothing when the card was held but never moved', () => {
    expect(commitTimelineEdit(session)).toBeNull()
  })

  it('commits nothing when a drag returned the card to where it started', () => {
    const armed = beginTimelineDrag(session, 'body')
    const there = applyTimelineDrag(armed, { translationPx: HOUR_PX })
    const back = applyTimelineDrag(there, { translationPx: 0 })
    expect(commitTimelineEdit(back)).toBeNull()
  })
})

describe('timelineEventsWithEditPreview — live reflow', () => {
  const events = planDayFixtures.longBlockWithShortOverlaps

  it('substitutes the draft times so neighbours reflow before the commit', () => {
    const dragged = applyTimelineDrag(
      beginTimelineDrag(
        beginTimelineEdit(offsite, now) as TimelineEditSession,
        'body',
      ),
      { translationPx: HOUR_PX * 2 },
    )
    const previewed = timelineEventsWithEditPreview(events, dragged)
    const edited = previewed.find((event) => event.id === 'nested-long')
    expect(edited?.start?.getTime()).toBe(planAt(11).getTime())
    expect(edited?.duration).toBe(4 * 3600)
  })

  it('leaves every other event untouched', () => {
    const dragged = applyTimelineDrag(
      beginTimelineDrag(
        beginTimelineEdit(offsite, now) as TimelineEditSession,
        'body',
      ),
      { translationPx: HOUR_PX },
    )
    const previewed = timelineEventsWithEditPreview(events, dragged)
    expect(previewed.find((event) => event.id === 'nested-short-a')).toBe(
      events[1],
    )
  })

  it('returns the input untouched when nothing is being edited', () => {
    expect(timelineEventsWithEditPreview(events, null)).toBe(events)
  })

  it('never previews a card shorter than the 15-minute floor', () => {
    const squashed: TimelineEditSession = {
      endeavorId: 'nested-long',
      originalStart: planAt(9),
      originalEnd: planAt(13),
      draftStart: planAt(9),
      draftEnd: planAt(9),
      drag: null,
    }
    const previewed = timelineEventsWithEditPreview(events, squashed)
    expect(previewed.find((event) => event.id === 'nested-long')?.duration).toBe(900)
  })
})

/**
 * The property the drag-session base exists to guarantee.
 *
 * Canon: *"snapping is computed from a stable drag-session base captured the
 * moment the finger first lands, not from the current draft value — this avoids
 * accumulated rounding drift across a long drag."* Stated as a property: for
 * **any** sequence of cumulative translations, the session that results is the
 * one the final translation alone would have produced.
 */
describe('property: snapping from a stable base never drifts', () => {
  /**
   * A deterministic pseudo-random stream. A seeded generator rather than
   * `Math.random`, so a failure is reproducible and the suite never flakes.
   */
  const sequenceFrom = (seed: number, length: number): readonly number[] => {
    let state = seed
    return Array.from({ length }, () => {
      state = (state * 1_103_515_245 + 12_345) % 2_147_483_648
      // ±240px — four hours either way, well past the clamps.
      return ((state / 2_147_483_648) * 480 - 240)
    })
  }

  const handles = ['start', 'end', 'body'] as const

  for (const handle of handles) {
    it(`holds for a ${handle} drag under 40 arbitrary intermediate frames`, () => {
      for (let seed = 1; seed <= 25; seed += 1) {
        const session = beginTimelineDrag(
          beginTimelineEdit(offsite, now) as TimelineEditSession,
          handle,
        )
        const frames = sequenceFrom(seed, 40)
        const walked = frames.reduce(
          (current, translationPx) =>
            applyTimelineDrag(current, { translationPx }),
          session,
        )
        const final = frames[frames.length - 1] as number
        const direct = applyTimelineDrag(session, { translationPx: final })

        expect(timelineEditPreview(walked)).toEqual(timelineEditPreview(direct))
      }
    })
  }

  it('lands back exactly where it started when the finger returns to zero', () => {
    for (const handle of handles) {
      const session = beginTimelineDrag(
        beginTimelineEdit(offsite, now) as TimelineEditSession,
        handle,
      )
      const wandered = sequenceFrom(7, 30).reduce(
        (current, translationPx) => applyTimelineDrag(current, { translationPx }),
        session,
      )
      const returned = applyTimelineDrag(wandered, { translationPx: 0 })
      expect(timelineEditPreview(returned)).toEqual(timelineEditPreview(session))
      expect(commitTimelineEdit(returned)).toBeNull()
    }
  })

  it('never produces a preview below the 15-minute minimum, whatever the path', () => {
    for (const handle of ['start', 'end'] as const) {
      const session = beginTimelineDrag(
        beginTimelineEdit(offsite, now) as TimelineEditSession,
        handle,
      )
      for (const translationPx of sequenceFrom(13, 60)) {
        const dragged = applyTimelineDrag(session, { translationPx })
        const { start, end } = timelineEditPreview(dragged)
        expect(end.getTime() - start.getTime()).toBeGreaterThanOrEqual(900_000)
      }
    }
  })

  it('always lands on a quarter-hour boundary relative to the base', () => {
    const session = beginTimelineDrag(
      beginTimelineEdit(offsite, now) as TimelineEditSession,
      'body',
    )
    for (const translationPx of sequenceFrom(29, 60)) {
      const dragged = applyTimelineDrag(session, { translationPx })
      const offset =
        timelineEditPreview(dragged).start.getTime() - planAt(9).getTime()
      // `Math.abs` because a negative multiple leaves `-0`, which `Object.is`
      // distinguishes from `0` — a JavaScript detail, not a snapping one.
      expect(Math.abs(offset % 900_000)).toBe(0)
    }
  })
})
