import { describe, expect, it } from 'vitest'
import { addingPlanDays, planDayKey, startOfPlanDay } from '../PlanCalendar'
import { PLAN_REFERENCE_DAY, PLAN_REFERENCE_NOW } from '../PlanMocks'
import {
  PlanViewMode,
  advancePlanViewMode,
  isPlanFabAvailable,
  isPlanFabGlowActive,
  planDayPickerCenter,
  planDayPickerDates,
  planViewModeFromRawValue,
  planViewModeLabel,
  planViewModeSupportsQuickCreate,
  planViewModeUsesTimelineCanvas,
  planViewModes,
} from '../PlanNavigation'

const today = startOfPlanDay(PLAN_REFERENCE_DAY)

describe('PlanViewMode', () => {
  it('exposes the three destinations in canon carousel order', () => {
    expect(planViewModes).toEqual(['timeline', 'list', 'priorityMatrix'])
  })

  it('narrows a stored raw value', () => {
    expect(planViewModeFromRawValue('list')).toBe(PlanViewMode.list)
  })

  it('refuses a raw value naming no mode', () => {
    expect(planViewModeFromRawValue('calendar')).toBeNull()
  })

  it('labels each destination as canon does', () => {
    expect(planViewModeLabel(PlanViewMode.timeline)).toBe('Day View')
    expect(planViewModeLabel(PlanViewMode.list)).toBe('List View')
    expect(planViewModeLabel(PlanViewMode.priorityMatrix)).toBe(
      'Priority Matrix',
    )
  })
})

describe('FAB availability per mode', () => {
  it('offers the quick-action button on the timeline', () => {
    expect(isPlanFabAvailable(PlanViewMode.timeline)).toBe(true)
  })

  it('offers it on the list too', () => {
    expect(isPlanFabAvailable(PlanViewMode.list)).toBe(true)
  })

  it('stands it down over the matrix, whose quadrants carry their own actions', () => {
    expect(isPlanFabAvailable(PlanViewMode.priorityMatrix)).toBe(false)
  })

  it('never runs the glow where there is no button behind it', () => {
    for (const mode of planViewModes) {
      expect(isPlanFabGlowActive(mode)).toBe(isPlanFabAvailable(mode))
    }
  })
})

describe('canvas capabilities per mode', () => {
  it('renders the hour grid only on the timeline', () => {
    expect(planViewModeUsesTimelineCanvas(PlanViewMode.timeline)).toBe(true)
    expect(planViewModeUsesTimelineCanvas(PlanViewMode.list)).toBe(false)
    expect(planViewModeUsesTimelineCanvas(PlanViewMode.priorityMatrix)).toBe(
      false,
    )
  })

  it('allows press-to-create only where there is canvas to press', () => {
    expect(planViewModeSupportsQuickCreate(PlanViewMode.timeline)).toBe(true)
    expect(planViewModeSupportsQuickCreate(PlanViewMode.list)).toBe(false)
  })

  it('never allows press-to-create on the matrix', () => {
    expect(planViewModeSupportsQuickCreate(PlanViewMode.priorityMatrix)).toBe(
      false,
    )
  })
})

describe('advancePlanViewMode — the carousel is circular', () => {
  it('steps forward one destination', () => {
    expect(advancePlanViewMode(PlanViewMode.timeline, 1)).toBe(
      PlanViewMode.list,
    )
  })

  it('wraps past the last destination back to the first', () => {
    expect(advancePlanViewMode(PlanViewMode.priorityMatrix, 1)).toBe(
      PlanViewMode.timeline,
    )
  })

  it('wraps backwards from the first to the last', () => {
    expect(advancePlanViewMode(PlanViewMode.timeline, -1)).toBe(
      PlanViewMode.priorityMatrix,
    )
  })

  it('returns to itself after a full turn, however many turns', () => {
    for (const mode of planViewModes) {
      expect(advancePlanViewMode(mode, 3)).toBe(mode)
      expect(advancePlanViewMode(mode, -9)).toBe(mode)
    }
  })

  it('stands still for a step of zero', () => {
    expect(advancePlanViewMode(PlanViewMode.list, 0)).toBe(PlanViewMode.list)
  })
})

describe('planDayPickerDates', () => {
  it('shows five days centred on the batch centre', () => {
    const dates = planDayPickerDates(today)
    expect(dates).toHaveLength(5)
    expect(planDayKey(dates[2] as Date)).toBe(planDayKey(today))
  })

  it('runs from two days back to two days forward, ascending', () => {
    const dates = planDayPickerDates(today).map(planDayKey)
    expect(dates[0]).toBe(planDayKey(addingPlanDays(today, -2)))
    expect(dates[4]).toBe(planDayKey(addingPlanDays(today, 2)))
  })

  it('reads only the day of the centre, not the time within it', () => {
    const noon = new Date(today.getTime() + 12 * 3_600_000)
    expect(planDayPickerDates(noon)).toEqual(planDayPickerDates(today))
  })
})

describe('planDayPickerCenter — the batch shifts only at its edges', () => {
  it('seeds from today, not from the selection, before it first renders', () => {
    const center = planDayPickerCenter({
      currentCenter: null,
      selectedDate: addingPlanDays(today, 1),
      now: PLAN_REFERENCE_NOW,
    })
    expect(planDayKey(center)).toBe(planDayKey(today))
  })

  it('leaves the batch alone while the selection is still inside it', () => {
    for (const offset of [-2, -1, 0, 1, 2]) {
      const center = planDayPickerCenter({
        currentCenter: today,
        selectedDate: addingPlanDays(today, offset),
        now: PLAN_REFERENCE_NOW,
      })
      expect(planDayKey(center)).toBe(planDayKey(today))
    }
  })

  it('shifts by exactly one day when the selection steps past the trailing edge', () => {
    const center = planDayPickerCenter({
      currentCenter: today,
      selectedDate: addingPlanDays(today, 3),
      now: PLAN_REFERENCE_NOW,
    })
    expect(planDayKey(center)).toBe(planDayKey(addingPlanDays(today, 1)))
  })

  it('shifts by exactly one day past the leading edge, keeping the day at that edge', () => {
    const center = planDayPickerCenter({
      currentCenter: today,
      selectedDate: addingPlanDays(today, -3),
      now: PLAN_REFERENCE_NOW,
    })
    expect(planDayKey(center)).toBe(planDayKey(addingPlanDays(today, -1)))
    expect(planDayPickerDates(center).map(planDayKey)).toContain(
      planDayKey(addingPlanDays(today, -3)),
    )
  })

  it('jumps far enough in one move to bring a distant selection back to an edge', () => {
    const center = planDayPickerCenter({
      currentCenter: today,
      selectedDate: addingPlanDays(today, 30),
      now: PLAN_REFERENCE_NOW,
    })
    expect(planDayKey(center)).toBe(planDayKey(addingPlanDays(today, 28)))
    expect(planDayPickerDates(center).map(planDayKey)).toContain(
      planDayKey(addingPlanDays(today, 30)),
    )
  })
})
