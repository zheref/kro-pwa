/**
 * The picker's model: what it offers, in what order, and where the cap bites.
 *
 * The cap is asserted from BOTH ends — the enabling question a card asks and
 * the confirmed list itself — because canon enforces it in both places and a
 * cap that only bites at confirm time reads as a bug.
 */
import { PlanListGrouping } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { planMatrixFixtures } from '../../../PlanMocks'
import {
  PICK_ENDEAVOR_SELECTION_LIMIT,
  PickEndeavorPriority,
  pickEndeavorCanConfirm,
  pickEndeavorCanSelectMore,
  pickEndeavorCandidates,
  pickEndeavorCapNotice,
  pickEndeavorConfirmBlocker,
  pickEndeavorPriorityFor,
  pickEndeavorPriorityTitle,
  pickEndeavorSections,
  pickEndeavorSelection,
  pickEndeavorSelectionCaption,
} from '../planPickerModel'
import {
  PLAN_PICKER_NOW,
  planPickerAdmissionPool,
  planPickerPool,
} from '../planPickerMocks'

const now = PLAN_PICKER_NOW

describe('pickEndeavorCandidates', () => {
  it('offers tasks and issue-tracker tickets, which is what the board admits', () => {
    const ids = pickEndeavorCandidates(planPickerAdmissionPool, '').map(
      (endeavor) => endeavor.id,
    )
    expect(ids).toContain(planMatrixFixtures.urgentImportant.id)
    expect(ids).toContain(planMatrixFixtures.ticket.id)
  })

  it('offers an UNTRIAGED task — assigning its due date is the point of picking', () => {
    const ids = pickEndeavorCandidates(planPickerAdmissionPool, '').map(
      (endeavor) => endeavor.id,
    )
    expect(ids).toContain(planMatrixFixtures.missingValue.id)
    expect(ids).toContain(planMatrixFixtures.missingDue.id)
  })

  it('refuses a habit, a reminder and a calendar event, whatever they carry', () => {
    const ids = pickEndeavorCandidates(planPickerAdmissionPool, '').map(
      (endeavor) => endeavor.id,
    )
    expect(ids).not.toContain(planMatrixFixtures.habit.id)
    expect(ids).not.toContain(planMatrixFixtures.reminder.id)
    expect(ids).not.toContain(planMatrixFixtures.calendarEvent.id)
  })

  it('orders by title, case-insensitively, then by id', () => {
    const titles = pickEndeavorCandidates(planPickerPool, '').map(
      (endeavor) => endeavor.title,
    )
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)))
  })

  it('narrows on the search term, ignoring case', () => {
    const ids = pickEndeavorCandidates(planPickerPool, 'GARAGE').map(
      (endeavor) => endeavor.id,
    )
    expect(ids).toEqual(['pick-untriaged-a'])
  })

  it('ignores accents, exactly as the Apple search does', () => {
    const ids = pickEndeavorCandidates(planPickerPool, 'reserver').map(
      (endeavor) => endeavor.id,
    )
    expect(ids).toEqual(['pick-triaged-b'])
  })

  it('treats a whitespace-only query as no query at all', () => {
    expect(pickEndeavorCandidates(planPickerPool, '   ')).toHaveLength(
      planPickerPool.length,
    )
  })
})

describe('pickEndeavorPriorityFor', () => {
  it('files a task due today under Today', () => {
    expect(pickEndeavorPriorityFor(planPickerPool[0]!, now)).toBe(
      PickEndeavorPriority.today,
    )
  })

  it('files a task with triage data for another day under Has triage data', () => {
    expect(pickEndeavorPriorityFor(planPickerPool[2]!, now)).toBe(
      PickEndeavorPriority.triaged,
    )
  })

  it('files a task with neither a due date nor a value under No triage data', () => {
    expect(pickEndeavorPriorityFor(planPickerPool[5]!, now)).toBe(
      PickEndeavorPriority.untriaged,
    )
  })

  it('names the three bands exactly as canon does', () => {
    expect(
      [
        PickEndeavorPriority.today,
        PickEndeavorPriority.triaged,
        PickEndeavorPriority.untriaged,
      ].map(pickEndeavorPriorityTitle),
    ).toEqual(['Today', 'Has triage data', 'No triage data'])
  })
})

describe('pickEndeavorSections', () => {
  it('renders the three bands in canon order under the default grouping', () => {
    const sections = pickEndeavorSections({
      endeavors: planPickerPool,
      query: '',
      grouping: PlanListGrouping.none,
      referenceDate: now,
    })
    expect(sections.map((section) => section.title)).toEqual([
      'Today',
      'Has triage data',
      'No triage data',
    ])
  })

  it('renders NO sections when the search matches nothing', () => {
    expect(
      pickEndeavorSections({
        endeavors: planPickerPool,
        query: 'zzzzz-nothing',
        grouping: PlanListGrouping.none,
        referenceDate: now,
      }),
    ).toEqual([])
  })

  it('omits a band with no rows rather than drawing a bare header', () => {
    const sections = pickEndeavorSections({
      endeavors: planPickerPool,
      query: 'garage',
      grouping: PlanListGrouping.none,
      referenceDate: now,
    })
    expect(sections.map((section) => section.title)).toEqual(['No triage data'])
  })

  it('groups INSIDE a band when the user preference says Project', () => {
    const sections = pickEndeavorSections({
      endeavors: planPickerPool,
      query: '',
      grouping: PlanListGrouping.project,
      referenceDate: now,
    })
    expect(sections.map((section) => section.title)).toContain(
      'Has triage data · atlas',
    )
    expect(sections.map((section) => section.title)).toContain(
      'Has triage data · No project',
    )
  })

  it('offers an Unscheduled band under Time of day, which the Plan list has not', () => {
    const sections = pickEndeavorSections({
      endeavors: planPickerPool,
      query: '',
      grouping: PlanListGrouping.timeOfDay,
      referenceDate: now,
    })
    expect(sections.map((section) => section.title)).toContain(
      'No triage data · Unscheduled',
    )
  })
})

describe('the seven-selection cap', () => {
  it('is canon seven', () => {
    expect(PICK_ENDEAVOR_SELECTION_LIMIT).toBe(7)
  })

  it('still allows another pick at six', () => {
    expect(pickEndeavorCanSelectMore(6)).toBe(true)
    expect(pickEndeavorCapNotice(6)).toBeNull()
  })

  it('refuses another pick at seven, and says why in words', () => {
    expect(pickEndeavorCanSelectMore(7)).toBe(false)
    expect(pickEndeavorCapNotice(7)).toContain('7 tasks at a time')
  })

  it('caps the CONFIRMED list too, so an over-long selection cannot slip past', () => {
    const candidates = pickEndeavorCandidates(planPickerPool, '')
    const everything = new Set(candidates.map((endeavor) => endeavor.id))
    expect(everything.size).toBeGreaterThan(PICK_ENDEAVOR_SELECTION_LIMIT)
    expect(pickEndeavorSelection(candidates, everything)).toHaveLength(
      PICK_ENDEAVOR_SELECTION_LIMIT,
    )
  })

  it('drops a selected row the current search no longer shows', () => {
    const narrowed = pickEndeavorCandidates(planPickerPool, 'garage')
    const selection = pickEndeavorSelection(
      narrowed,
      new Set(['pick-untriaged-a', 'pick-today-a']),
    )
    expect(selection.map((endeavor) => endeavor.id)).toEqual([
      'pick-untriaged-a',
    ])
  })

  it('counts the selection in the user words', () => {
    expect(pickEndeavorSelectionCaption(3)).toBe('3 of 7 selected')
  })
})

describe('the Confirm gate', () => {
  it('is closed on an empty selection, and names the blocker', () => {
    expect(pickEndeavorCanConfirm(0)).toBe(false)
    expect(pickEndeavorConfirmBlocker(0)).toBe(
      'Select at least one task to add.',
    )
  })

  it('opens on the first selection', () => {
    expect(pickEndeavorCanConfirm(1)).toBe(true)
    expect(pickEndeavorConfirmBlocker(1)).toBeNull()
  })

  it('stays open at the cap — seven is allowed, eight is refused earlier', () => {
    expect(pickEndeavorCanConfirm(7)).toBe(true)
    expect(pickEndeavorConfirmBlocker(7)).toBeNull()
  })
})
