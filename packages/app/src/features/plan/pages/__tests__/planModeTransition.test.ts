/**
 * The mode swap direction — the arithmetic that makes the wrap read as one
 * carousel rather than as two unrelated slides.
 */
import { describe, expect, it } from 'vitest'
import { PlanViewMode } from '../../PlanNavigation'
import {
  PLAN_MODE_SLIDE_FRACTION,
  oppositePlanModeEdge,
  planModeEntryEdge,
  planModeOffsetPercent,
} from '../planModeTransition'

describe('planModeEntryEdge', () => {
  it('enters from the trailing edge stepping forward one — Day View to List', () => {
    expect(planModeEntryEdge(PlanViewMode.timeline, PlanViewMode.list)).toBe(
      'trailing',
    )
  })

  it('enters from the leading edge stepping back one — List to Day View', () => {
    expect(planModeEntryEdge(PlanViewMode.list, PlanViewMode.timeline)).toBe(
      'leading',
    )
  })

  it('takes the SHORT way round the wrap — Day View to Matrix is one step back', () => {
    // Two steps forward is also one step back, and canon's `forwardSteps * 2 <=
    // count` picks the shorter arc. Getting this wrong is invisible until the
    // matrix slides in from the wrong side.
    expect(
      planModeEntryEdge(PlanViewMode.timeline, PlanViewMode.priorityMatrix),
    ).toBe('leading')
    expect(
      planModeEntryEdge(PlanViewMode.priorityMatrix, PlanViewMode.timeline),
    ).toBe('trailing')
  })

  it('stays trailing when the mode did not change, so a re-render never slides', () => {
    expect(planModeEntryEdge(PlanViewMode.list, PlanViewMode.list)).toBe(
      'trailing',
    )
  })
})

describe('oppositePlanModeEdge', () => {
  it('sends the outgoing destination the other way, so the pair reads as one strip', () => {
    expect(oppositePlanModeEdge('trailing')).toBe('leading')
    expect(oppositePlanModeEdge('leading')).toBe('trailing')
  })

  it('is its own inverse — applying it twice returns the same edge', () => {
    expect(oppositePlanModeEdge(oppositePlanModeEdge('leading'))).toBe('leading')
  })
})

describe('planModeOffsetPercent', () => {
  it('rests at zero once the destination is on screen', () => {
    expect(planModeOffsetPercent('trailing', 'present')).toBe(0)
    expect(planModeOffsetPercent('leading', 'present')).toBe(0)
  })

  it('starts off to the right when entering from the trailing edge', () => {
    expect(planModeOffsetPercent('trailing', 'absent')).toBe(
      PLAN_MODE_SLIDE_FRACTION * 100,
    )
  })

  it('starts off to the left when entering from the leading edge', () => {
    expect(planModeOffsetPercent('leading', 'absent')).toBe(
      -PLAN_MODE_SLIDE_FRACTION * 100,
    )
  })

  it('is expressed as a percentage so the slide reads the same at any width', () => {
    expect(PLAN_MODE_SLIDE_FRACTION).toBeGreaterThan(0)
    expect(PLAN_MODE_SLIDE_FRACTION).toBeLessThan(1)
  })
})
