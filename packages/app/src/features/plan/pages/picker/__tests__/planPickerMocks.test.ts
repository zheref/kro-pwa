/**
 * The picker fixtures have to be big enough and varied enough for the cap and
 * the three bands to be real questions — a pool of six could never reach the
 * seven-selection limit, and a pool with one band would make the section order
 * pass vacuously.
 */
import { describe, expect, it } from 'vitest'
import {
  PICK_ENDEAVOR_SELECTION_LIMIT,
  PickEndeavorPriority,
  pickEndeavorPriorityFor,
} from '../planPickerModel'
import {
  PLAN_PICKER_NOW,
  planPickerAdmissionPool,
  planPickerPool,
} from '../planPickerMocks'

describe('planPickerPool', () => {
  it('is larger than the selection cap, so the cap can actually bite', () => {
    expect(planPickerPool.length).toBeGreaterThan(PICK_ENDEAVOR_SELECTION_LIMIT)
  })

  it('covers all three priority bands', () => {
    const bands = new Set(
      planPickerPool.map((endeavor) =>
        pickEndeavorPriorityFor(endeavor, PLAN_PICKER_NOW),
      ),
    )
    expect(bands).toEqual(
      new Set([
        PickEndeavorPriority.today,
        PickEndeavorPriority.triaged,
        PickEndeavorPriority.untriaged,
      ]),
    )
  })

  it('carries a project id on some rows and not others, for the grouped bands', () => {
    const projects = new Set(planPickerPool.map((e) => e.projectId))
    expect(projects.has('atlas')).toBe(true)
    expect(projects.has(null)).toBe(true)
  })

  it('carries an accented title, so the search fold is a real question', () => {
    expect(planPickerPool.some((e) => e.title.includes('é'))).toBe(true)
  })

  it('gives every row a unique id', () => {
    const ids = planPickerPool.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('planPickerAdmissionPool', () => {
  it('is the board own fixture list, not a second copy of it', () => {
    expect(planPickerAdmissionPool.length).toBeGreaterThan(0)
    expect(planPickerAdmissionPool.some((e) => e.kind === 'habit')).toBe(true)
  })

  it('includes the kinds the picker must refuse', () => {
    const kinds = new Set(planPickerAdmissionPool.map((e) => e.kind))
    expect(kinds.has('calendarEvent')).toBe(true)
    expect(kinds.has('reminder')).toBe(true)
  })

  it('includes the two untriaged shapes the picker must still offer', () => {
    expect(
      planPickerAdmissionPool.some((e) => e.due !== null && e.value === null),
    ).toBe(true)
    expect(
      planPickerAdmissionPool.some((e) => e.due === null && e.value !== null),
    ).toBe(true)
  })
})
