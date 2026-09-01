import { EndeavorComputedState } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { DO_MOCK_NOW, doEndeavorFixtures } from '../../DoMocks'
import { DoLane, initialDoVisibility } from '../../DoRules'
import {
  DO_MARK_COMPLETE_SUBTITLE,
  DO_MARK_COMPLETE_TITLE,
  DO_TASK_SECTIONS,
  doAllFiltersVisible,
  doCardModels,
  doComputedStateLabel,
  doEventsBadgeText,
  doHeaderContent,
  doNotificationsAccessibilityValue,
  doNotificationsSummary,
  doRemindersBadgeText,
  doSectionBadgeText,
  doShortDateString,
  doVisibilityToggled,
  doWeekdayString,
} from '../doPresentation'

const LOCALE = 'en-US'

describe('the lane order is the acceptance criterion, so it is a value', () => {
  it('lists the six scrolling lanes in canon render order', () => {
    expect(DO_TASK_SECTIONS.map((section) => section.tag)).toEqual([
      DoLane.overdue,
      DoLane.now,
      DoLane.expired,
      DoLane.next,
      DoLane.anytime,
      DoLane.completed,
    ])
  })

  it('gives Next no glyph — the one lane canon passes none for', () => {
    const next = DO_TASK_SECTIONS.find((section) => section.tag === DoLane.next)
    expect(next?.glyph).toBeNull()
  })

  it('omits the featured lane, which is the adaptive stack and not a section', () => {
    expect(
      DO_TASK_SECTIONS.some((section) => section.tag === DoLane.featured),
    ).toBe(false)
  })
})

describe('badge copy', () => {
  it('counts the four urgent lanes in tasks — "3 tasks" on Overdue', () => {
    const overdue = DO_TASK_SECTIONS[0]
    if (overdue === undefined) throw new Error('missing Overdue section')
    expect(doSectionBadgeText(overdue, 3)).toBe('3 tasks')
  })

  it('counts Anytime and Completed Today in items, as canon does', () => {
    const anytime = DO_TASK_SECTIONS.find(
      (section) => section.tag === DoLane.anytime,
    )
    if (anytime === undefined) throw new Error('missing Anytime section')
    expect(doSectionBadgeText(anytime, 1)).toBe('1 items')
  })

  it('inflects the Reminders lane, which is the only lane canon inflects', () => {
    expect(doRemindersBadgeText(1)).toBe('1 reminder')
    expect(doRemindersBadgeText(0)).toBe('0 reminders')
    expect(doRemindersBadgeText(4)).toBe('4 reminders')
  })

  it('counts all-day and timed events together on the Calendar badge', () => {
    expect(doEventsBadgeText(0)).toBe('0 events')
    expect(doEventsBadgeText(7)).toBe('7 events')
  })
})

describe('the header composition follows the WIDTH, not the idiom', () => {
  it('shows the sun, My Day, the short date and the weekday when expanded', () => {
    const content = doHeaderContent({
      now: DO_MOCK_NOW,
      locale: LOCALE,
      usesExpandedDayTitle: true,
      isInMarkCompleteMode: false,
      remainingCount: 3,
    })

    expect(content).toEqual({
      title: 'My Day',
      titleDetail: 'Mar 17',
      titleSpecifier: 'Tuesday',
      subtitle: '3 left today',
      showsSunGlyph: true,
    })
  })

  it('falls back to the bare short date on a narrow window', () => {
    const content = doHeaderContent({
      now: DO_MOCK_NOW,
      locale: LOCALE,
      usesExpandedDayTitle: false,
      isInMarkCompleteMode: false,
      remainingCount: 3,
    })

    expect(content.title).toBe('Mar 17')
    expect(content.titleDetail).toBeNull()
    expect(content.titleSpecifier).toBeNull()
    expect(content.showsSunGlyph).toBe(false)
  })

  it('drops the subtitle when nothing is left today', () => {
    const content = doHeaderContent({
      now: DO_MOCK_NOW,
      locale: LOCALE,
      usesExpandedDayTitle: true,
      isInMarkCompleteMode: false,
      remainingCount: 0,
    })
    expect(content.subtitle).toBeNull()
  })

  it('retitles to the instruction in bulk mode, even on a wide window', () => {
    const content = doHeaderContent({
      now: DO_MOCK_NOW,
      locale: LOCALE,
      usesExpandedDayTitle: true,
      isInMarkCompleteMode: true,
      remainingCount: 9,
    })

    expect(content.title).toBe(DO_MARK_COMPLETE_TITLE)
    expect(content.subtitle).toBe(DO_MARK_COMPLETE_SUBTITLE)
    expect(content.showsSunGlyph).toBe(false)
    expect(content.titleDetail).toBeNull()
  })
})

describe('the two date strings', () => {
  it('prints canon\'s "MMM d" short date', () => {
    expect(doShortDateString(DO_MOCK_NOW, LOCALE)).toBe('Mar 17')
  })

  it("prints the weekday alone, without canon's comma split", () => {
    expect(doWeekdayString(DO_MOCK_NOW, LOCALE)).toBe('Tuesday')
  })

  it('follows the locale rather than hardcoding English', () => {
    expect(doWeekdayString(DO_MOCK_NOW, 'de-DE')).toBe('Dienstag')
  })
})

describe('the bell speaks per surface, because the two surfaces differ', () => {
  it('announces the combined count where it opens a panel', () => {
    expect(
      doNotificationsAccessibilityValue({
        presentsInline: true,
        overdueCount: 2,
        expiredCount: 1,
      }),
    ).toBe('3 need attention')
  })

  it('announces only the overdue count where it merely jumps', () => {
    expect(
      doNotificationsAccessibilityValue({
        presentsInline: false,
        overdueCount: 2,
        expiredCount: 5,
      }),
    ).toBe('2 overdue')
  })

  it('says nothing when the jump has nowhere to land', () => {
    expect(
      doNotificationsAccessibilityValue({
        presentsInline: false,
        overdueCount: 0,
        expiredCount: 5,
      }),
    ).toBe('')
  })

  it('summarises one item in the singular, matching the panel subtitle', () => {
    expect(doNotificationsSummary(1)).toBe('1 needs attention')
    expect(doNotificationsSummary(4)).toBe('4 need attention')
    expect(doNotificationsSummary(0)).toBeNull()
  })
})

describe('visibility', () => {
  it('reads every filter as visible when nothing is hidden', () => {
    expect(doAllFiltersVisible(initialDoVisibility)).toBe(true)
  })

  it('reads the eye as struck through once one kind is hidden', () => {
    expect(
      doAllFiltersVisible({ ...initialDoVisibility, hiddenKinds: ['task'] }),
    ).toBe(false)
  })

  it('still reads the calendar term, which no surface can fill yet', () => {
    expect(
      doAllFiltersVisible({
        ...initialDoVisibility,
        hiddenCalendarIds: ['primary'],
      }),
    ).toBe(false)
  })

  it('hides on the first tap and re-shows on the second', () => {
    const once = doVisibilityToggled([], 'task')
    expect(once).toEqual(['task'])
    expect(doVisibilityToggled(once, 'task')).toEqual([])
  })

  it('leaves the other entries alone while toggling one', () => {
    expect(doVisibilityToggled(['task', 'habit'], 'task')).toEqual(['habit'])
  })

  it('labels each computed state with the lane name it hides', () => {
    expect(doComputedStateLabel(EndeavorComputedState.overdue)).toBe('Overdue')
    expect(doComputedStateLabel(EndeavorComputedState.expired)).toBe('Expired')
    expect(doComputedStateLabel(EndeavorComputedState.completedToday)).toBe(
      'Completed Today',
    )
  })
})

describe("card projection goes through the kit's one seam", () => {
  it('projects an overdue task as High urgency at the parked instant', () => {
    const [card] = doCardModels(
      [doEndeavorFixtures.overdueThisMorning],
      DO_MOCK_NOW,
    )
    expect(card?.urgency).toBe('high')
    expect(card?.title).toBe('Send the invoice')
  })

  it('projects a task due inside two hours as Medium, so it warns', () => {
    const [card] = doCardModels([doEndeavorFixtures.habitDueSoon], DO_MOCK_NOW)
    expect(card?.urgency).toBe('medium')
    expect(card?.showWarning).toBe(true)
  })

  it('projects an empty lane as an empty list rather than throwing', () => {
    expect(doCardModels([], DO_MOCK_NOW)).toEqual([])
  })
})
