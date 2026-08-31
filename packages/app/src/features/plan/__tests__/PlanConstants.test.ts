/**
 * The constants module is pinned rather than exercised: its whole job is to
 * hold canon's numbers, so the test that matters is the one that fails when a
 * number drifts. Each expectation names the canon file it was read from.
 */
import { describe, expect, it } from 'vitest'
import {
  BLOCK_PRESS_MAX_DISTANCE_PX,
  BLOCK_RIPPLE_TIMING,
  BLOCK_RIPPLE_TIMING_MS,
  EDIT_MODE_HOLD_DURATION_MS,
  EDIT_MODE_HOLD_DURATION_SECONDS,
  EDIT_MODE_TRANSITION_SECONDS,
  SLOT_PRESS_DURATION_MS,
  SLOT_PRESS_DURATION_SECONDS,
  SLOT_PRESS_MAX_DISTANCE_PX,
  TIMELINE_DAY_PICKER_SPAN,
  TIMELINE_DAY_PICKER_VISIBLE_DAYS,
  TIMELINE_FALLBACK_EVENT_DURATION_SECONDS,
  TIMELINE_HOUR_HEIGHT_PX,
  TIMELINE_HOUR_LABEL_WIDTH_PX,
  TIMELINE_HORIZONTAL_INSET_PX,
  TIMELINE_MINIMUM_CARD_HEIGHT_PX,
  TIMELINE_MINIMUM_DURATION_SECONDS,
  TIMELINE_PRELOAD_RADIUS_DAYS,
  TIMELINE_SLOTS_PER_HOUR,
  TIMELINE_SLOT_DEFAULT_DURATION_MINUTES,
  TIMELINE_SLOT_DEFAULT_DURATION_SECONDS,
  TIMELINE_SLOT_MINUTES,
  TIMELINE_SNAP_SECONDS,
} from '../PlanConstants'

describe('timeline geometry (TimelineLayoutMetrics)', () => {
  it('scales the hour grid at 60px per hour', () => {
    expect(TIMELINE_HOUR_HEIGHT_PX).toBe(60)
  })

  it('keeps a card at least 30px tall so a 10-minute event stays tappable', () => {
    expect(TIMELINE_MINIMUM_CARD_HEIGHT_PX).toBe(30)
  })

  it('carries canon inset and gutter widths', () => {
    expect(TIMELINE_HORIZONTAL_INSET_PX).toBe(12)
    expect(TIMELINE_HOUR_LABEL_WIDTH_PX).toBe(52)
  })
})

describe('snap grain and slots', () => {
  it('snaps every edit to 900 seconds — the literal canon repeats three times', () => {
    expect(TIMELINE_SNAP_SECONDS).toBe(900)
  })

  it('holds the minimum duration at 15 minutes, equal to the snap grain', () => {
    expect(TIMELINE_MINIMUM_DURATION_SECONDS).toBe(900)
    expect(TIMELINE_MINIMUM_DURATION_SECONDS).toBe(TIMELINE_SNAP_SECONDS)
  })

  it('lays four quarter-hour slots across every rendered hour', () => {
    expect(TIMELINE_SLOT_MINUTES).toBe(15)
    expect(TIMELINE_SLOTS_PER_HOUR).toBe(4)
  })

  it('seeds an hour-long ghost from a pressed slot', () => {
    expect(TIMELINE_SLOT_DEFAULT_DURATION_MINUTES).toBe(60)
    expect(TIMELINE_SLOT_DEFAULT_DURATION_SECONDS).toBe(3600)
  })

  it('falls back to an hour for an event a drag grabbed with no duration', () => {
    expect(TIMELINE_FALLBACK_EVENT_DURATION_SECONDS).toBe(3600)
  })
})

describe('gesture timings (TimelineDayView)', () => {
  it('arms edit mode after a deliberate 0.6s hold on a block', () => {
    expect(EDIT_MODE_HOLD_DURATION_SECONDS).toBe(0.6)
  })

  it('recognises a create-here press on empty canvas after 0.3s', () => {
    expect(SLOT_PRESS_DURATION_SECONDS).toBe(0.3)
  })

  it('keeps the block hold longer than the canvas press, as canon reasons', () => {
    expect(EDIT_MODE_HOLD_DURATION_SECONDS).toBeGreaterThan(
      SLOT_PRESS_DURATION_SECONDS,
    )
  })

  it('lets a block press travel less far than a canvas press before failing', () => {
    expect(BLOCK_PRESS_MAX_DISTANCE_PX).toBe(10)
    expect(SLOT_PRESS_MAX_DISTANCE_PX).toBe(12)
  })

  it('derives the millisecond forms from the second forms, never a literal', () => {
    expect(EDIT_MODE_HOLD_DURATION_MS).toBe(600)
    expect(SLOT_PRESS_DURATION_MS).toBe(300)
  })

  it('eases only the ripple release, keeping the hold longer than it', () => {
    expect(BLOCK_RIPPLE_TIMING.holdSeconds).toBe(0.38)
    expect(BLOCK_RIPPLE_TIMING.releaseSeconds).toBe(0.22)
    expect(BLOCK_RIPPLE_TIMING.holdSeconds).toBeGreaterThan(
      BLOCK_RIPPLE_TIMING.releaseSeconds,
    )
    expect(BLOCK_RIPPLE_TIMING_MS.holdMs).toBeCloseTo(380, 6)
    expect(BLOCK_RIPPLE_TIMING_MS.releaseMs).toBeCloseTo(220, 6)
  })

  it('animates entering and leaving edit mode over 0.15s', () => {
    expect(EDIT_MODE_TRANSITION_SECONDS).toBe(0.15)
  })
})

describe('preload and picker', () => {
  it('reads three days either side of the selected day', () => {
    expect(TIMELINE_PRELOAD_RADIUS_DAYS).toBe(3)
  })

  it('shows five day chips, derived from the -2…+2 span', () => {
    expect(TIMELINE_DAY_PICKER_SPAN).toBe(2)
    expect(TIMELINE_DAY_PICKER_VISIBLE_DAYS).toBe(5)
  })

  it('covers seven days in one preload window', () => {
    expect(TIMELINE_PRELOAD_RADIUS_DAYS * 2 + 1).toBe(7)
  })
})
