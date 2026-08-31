import { describe, expect, it } from 'vitest'
import { PLAN_REFERENCE_DAY, planAt } from '../PlanMocks'
import {
  TIMELINE_SLOT_SECONDS,
  isOnTheHourSlot,
  nearestTimelineSlot,
  quickCreateDraftAt,
  quickCreateDraftForSlot,
  timelineSlotCount,
  timelineSlotHeightMultiple,
  timelineSlotHeightMultiples,
  timelineSlotStart,
} from '../TimelineSlots'

const day = PLAN_REFERENCE_DAY

describe('timelineSlotCount', () => {
  it('covers a full day with 96 quarter-hour slots', () => {
    expect(timelineSlotCount({ start: 0, endExclusive: 24 })).toBe(96)
  })

  it('covers the Waking band (6–24) with 72', () => {
    expect(timelineSlotCount({ start: 6, endExclusive: 24 })).toBe(72)
  })

  it('covers the Business band (8–20) with 48', () => {
    expect(timelineSlotCount({ start: 8, endExclusive: 20 })).toBe(48)
  })

  it('yields no slots for an empty or reversed band', () => {
    expect(timelineSlotCount({ start: 12, endExclusive: 12 })).toBe(0)
    expect(timelineSlotCount({ start: 20, endExclusive: 8 })).toBe(0)
  })
})

describe('timelineSlotHeightMultiple — catchment edges', () => {
  it('gives the first mark only its trailing half, since nothing precedes it', () => {
    expect(timelineSlotHeightMultiple(0, 96)).toBe(0.5)
  })

  it('gives the last mark one and a half, absorbing the rest of the day', () => {
    expect(timelineSlotHeightMultiple(95, 96)).toBe(1.5)
  })

  it('gives every interior mark exactly one slot, straddling it', () => {
    expect(timelineSlotHeightMultiple(1, 96)).toBe(1)
    expect(timelineSlotHeightMultiple(48, 96)).toBe(1)
    expect(timelineSlotHeightMultiple(94, 96)).toBe(1)
  })

  it('gives a single-slot band the whole canvas rather than half of it', () => {
    expect(timelineSlotHeightMultiple(0, 1)).toBe(1)
  })
})

describe('timelineSlotHeightMultiples', () => {
  it('sums to the slot count, so the targets cover the canvas exactly', () => {
    for (const count of [2, 48, 72, 96]) {
      const total = timelineSlotHeightMultiples(count).reduce(
        (sum, value) => sum + value,
        0,
      )
      expect(total).toBeCloseTo(count, 10)
    }
  })

  it('straddles every interior mark — half a slot either side of it', () => {
    const multiples = timelineSlotHeightMultiples(96)
    // Cumulative top edge of each target, in slot units.
    let top = 0
    const tops = multiples.map((height) => {
      const current = top
      top += height
      return current
    })
    // Interior mark `i` sits at `i` slots down; its target spans [i-0.5, i+0.5).
    for (let index = 1; index <= 94; index += 1) {
      expect(tops[index]).toBeCloseTo(index - 0.5, 10)
    }
  })

  it('starts the first target at the top of the canvas', () => {
    expect(timelineSlotHeightMultiples(96)[0]).toBe(0.5)
  })

  it('produces nothing for a zero or negative count', () => {
    expect(timelineSlotHeightMultiples(0)).toEqual([])
    expect(timelineSlotHeightMultiples(-3)).toEqual([])
  })
})

describe('nearestTimelineSlot — rounds to the nearest quarter hour', () => {
  it('rounds 12:23 up to 12:30, the mark it is closest to', () => {
    const rounded = nearestTimelineSlot(planAt(12, 23))
    expect(rounded.getHours()).toBe(12)
    expect(rounded.getMinutes()).toBe(30)
  })

  it('rounds 12:07 down to 12:00 rather than flooring every press', () => {
    const rounded = nearestTimelineSlot(planAt(12, 7))
    expect(rounded.getMinutes()).toBe(0)
  })

  it('rounds an exact midpoint away from zero, matching canon', () => {
    const midpoint = new Date(planAt(12, 7).getTime() + 30_000)
    const rounded = nearestTimelineSlot(midpoint)
    expect(rounded.getMinutes()).toBe(15)
  })

  it('leaves a moment already on a mark untouched', () => {
    expect(nearestTimelineSlot(planAt(12, 45)).getTime()).toBe(
      planAt(12, 45).getTime(),
    )
  })

  it('keeps a late-evening moment on its own day rather than rolling to the next', () => {
    // 23:50 is nearer 23:45 than midnight when measured from the day's start,
    // which is the frame canon rounds in — so the ghost stays on this day.
    const rounded = nearestTimelineSlot(planAt(23, 50))
    expect(rounded.getDate()).toBe(planAt(0).getDate())
    expect(rounded.getHours()).toBe(23)
    expect(rounded.getMinutes()).toBe(45)
  })
})

describe('timelineSlotStart', () => {
  it('puts slot 0 of a full-day band at midnight', () => {
    expect(timelineSlotStart(0, day, 0).getTime()).toBe(planAt(0).getTime())
  })

  it('puts slot 0 of the Business band at 08:00, not at midnight', () => {
    expect(timelineSlotStart(0, day, 8).getTime()).toBe(planAt(8).getTime())
  })

  it('advances one quarter hour per slot from the top of the band', () => {
    expect(timelineSlotStart(4, day, 8).getTime()).toBe(planAt(9).getTime())
    expect(timelineSlotStart(1, day, 0).getTime()).toBe(planAt(0, 15).getTime())
  })

  it('clamps past the end of the day to the final slot, 23:45', () => {
    const clamped = timelineSlotStart(200, day, 0)
    expect(clamped.getHours()).toBe(23)
    expect(clamped.getMinutes()).toBe(45)
  })

  it('clamps a negative index to the start of the day', () => {
    expect(timelineSlotStart(-10, day, 0).getTime()).toBe(planAt(0).getTime())
  })
})

describe('quick-create drafts', () => {
  it('seeds an hour-long ghost at the pressed slot', () => {
    const draft = quickCreateDraftForSlot(4, day, 8)
    expect(draft.start.getTime()).toBe(planAt(9).getTime())
    expect(draft.durationSeconds).toBe(3600)
  })

  it('seeds from a moment by rounding to the nearest quarter hour first', () => {
    const draft = quickCreateDraftAt(planAt(12, 23))
    expect(draft.start.getMinutes()).toBe(30)
    expect(draft.durationSeconds).toBe(3600)
  })

  it('is always an hour long, whichever route seeded it', () => {
    expect(quickCreateDraftForSlot(0, day, 0).durationSeconds).toBe(
      quickCreateDraftAt(planAt(3, 3)).durationSeconds,
    )
  })
})

describe('isOnTheHourSlot', () => {
  it('exposes only the on-the-hour marks to assistive technology', () => {
    expect(isOnTheHourSlot(0)).toBe(true)
    expect(isOnTheHourSlot(4)).toBe(true)
  })

  it('hides the three quarter marks between hours', () => {
    expect(isOnTheHourSlot(1)).toBe(false)
    expect(isOnTheHourSlot(2)).toBe(false)
    expect(isOnTheHourSlot(3)).toBe(false)
  })

  it('exposes exactly one slot in four across a full day', () => {
    const exposed = Array.from({ length: 96 }, (_value, index) => index).filter(
      isOnTheHourSlot,
    )
    expect(exposed).toHaveLength(24)
  })
})

describe('TIMELINE_SLOT_SECONDS', () => {
  it('is one quarter hour, matching the edit-mode snap grain', () => {
    expect(TIMELINE_SLOT_SECONDS).toBe(900)
  })
})
