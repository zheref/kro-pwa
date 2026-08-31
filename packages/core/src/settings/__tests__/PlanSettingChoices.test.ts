import { describe, expect, it } from 'vitest'
import {
  DayViewRange,
  PlanListGrouping,
  PlanListSort,
  dayViewRangeHours,
  dayViewRangeLabel,
  dayViewRanges,
  planListGroupingLabel,
  planListGroupings,
  planListSortLabel,
  planListSorts,
} from '../PlanSettingChoices'

describe('DayViewRange', () => {
  it('renders midnight to midnight on the full-day setting', () => {
    expect(dayViewRangeHours(DayViewRange.full)).toEqual({
      start: 0,
      endExclusive: 24,
    })
  })

  it('starts waking hours at 6am and business hours at 8am, ending at 8pm', () => {
    expect(dayViewRangeHours(DayViewRange.waking)).toEqual({
      start: 6,
      endExclusive: 24,
    })
    expect(dayViewRangeHours(DayViewRange.business)).toEqual({
      start: 8,
      endExclusive: 20,
    })
  })

  it('keeps every band non-empty and inside a single day', () => {
    for (const range of dayViewRanges) {
      const { start, endExclusive } = dayViewRangeHours(range)
      expect(start).toBeGreaterThanOrEqual(0)
      expect(endExclusive).toBeGreaterThan(start)
      expect(endExclusive).toBeLessThanOrEqual(24)
    }
  })

  it('titles each band as the Plan preferences picker shows it', () => {
    expect(dayViewRanges.map(dayViewRangeLabel)).toEqual([
      'Full day',
      'Waking hours',
      'Business hours',
    ])
  })
})

describe('PlanListSort', () => {
  it('persists the case name for each sort', () => {
    expect(planListSorts).toEqual(['time', 'priority', 'title'])
  })

  it('offers Time first — the default a Plan list opens with', () => {
    expect(planListSorts[0]).toBe(PlanListSort.time)
  })

  it('titles each sort for the picker', () => {
    expect(planListSorts.map(planListSortLabel)).toEqual([
      'Time',
      'Priority',
      'Title',
    ])
  })
})

describe('PlanListGrouping', () => {
  it('stores "none" as a real value, not as an absent key', () => {
    expect(PlanListGrouping.none).toBe('none')
    expect(planListGroupings).toContain('none')
  })

  it('offers None, Project and Time of day in picker order', () => {
    expect(planListGroupings).toEqual(['none', 'project', 'timeOfDay'])
  })

  it('titles the time-of-day grouping in sentence case, as canon spells it', () => {
    expect(planListGroupingLabel(PlanListGrouping.timeOfDay)).toBe(
      'Time of day',
    )
    expect(planListGroupings.map(planListGroupingLabel)).toEqual([
      'None',
      'Project',
      'Time of day',
    ])
  })
})
