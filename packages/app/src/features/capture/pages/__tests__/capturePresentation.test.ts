/**
 * The capture surfaces' pure presentation rules.
 *
 * Every case is named for the situation it protects, and every clock-relative
 * one passes its own instant — the fixtures' `CAPTURE_MOCK_NOW` — so none of
 * these can pass or fail because of the day the suite happened to run.
 */
import { Month, WeekDay } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { doSurfaceLayout } from '../../../main/DoSurfaceLayout'
import {
  desktopSurface,
  handheldSurface,
  tabletSurface,
} from '../../../main/MainMocks'
import { CAPTURE_MOCK_NOW, captureMockAt } from '../../CaptureMocks'
import { NO_RECURRENCE } from '../../CaptureRules'
import {
  capturePromptPresentation,
  captureRecurrencePresets,
  captureRepeatChipLabel,
  dateInputValue,
  formatCaptureDate,
  formatCaptureTime,
  inboxCountCaption,
  inboxRowConfigFor,
  inboxRowLayoutFor,
  parseDateInput,
  parseTimeInput,
  schedulingToastMessage,
  timeInputValue,
  weekDayFromDate,
} from '../capturePresentation'

describe('capturePromptPresentation — the idiom split', () => {
  it('pops the prompt over the content on a Mac-shaped window', () => {
    expect(capturePromptPresentation(doSurfaceLayout(desktopSurface))).toBe(
      'popover',
    )
  })

  it('sheets it from the bottom edge on a phone, where a popover costs more than it gives', () => {
    expect(capturePromptPresentation(doSurfaceLayout(handheldSurface))).toBe(
      'sheet',
    )
  })

  it('pops it over a landscape tablet too — the cell is width, not pointer', () => {
    expect(capturePromptPresentation(doSurfaceLayout(tabletSurface))).toBe(
      'popover',
    )
  })
})

describe("inboxRowLayoutFor — canon's InboxView.Layout", () => {
  it("draws the compact row on a pointer-first window, per canon's own note", () => {
    expect(inboxRowLayoutFor(doSurfaceLayout(desktopSurface))).toBe(
      'compactDesktop',
    )
  })

  it('keeps the comfortable row on a phone', () => {
    expect(inboxRowLayoutFor(doSurfaceLayout(handheldSurface))).toBe(
      'comfortable',
    )
  })

  it('keeps it comfortable on a landscape tablet, which is wide but still a finger', () => {
    expect(inboxRowLayoutFor(doSurfaceLayout(tabletSurface))).toBe(
      'comfortable',
    )
  })

  it('maps each layout onto the EndeavorRow preset canon names', () => {
    expect(inboxRowConfigFor('compactDesktop')).toBe('compactDesktopInbox')
    expect(inboxRowConfigFor('comfortable')).toBe('inbox')
  })
})

describe('dateInputValue / parseDateInput', () => {
  it('writes the local calendar day, not the UTC one — a user east of London at 00:30', () => {
    expect(dateInputValue(new Date(2026, 2, 17, 0, 30))).toBe('2026-03-17')
  })

  it('round-trips a picked day back to local midnight', () => {
    const parsed = parseDateInput('2026-03-17')
    expect(parsed?.getFullYear()).toBe(2026)
    expect(parsed?.getMonth()).toBe(2)
    expect(parsed?.getDate()).toBe(17)
    expect(parsed?.getHours()).toBe(0)
  })

  it('refuses the half-typed value the input allows mid-keystroke', () => {
    expect(parseDateInput('2026-03-')).toBeNull()
    expect(parseDateInput('')).toBeNull()
  })
})

describe('timeInputValue / parseTimeInput', () => {
  it('pads a single-digit hour so the input accepts it', () => {
    expect(timeInputValue(captureMockAt(17, 9, 5))).toBe('09:05')
  })

  it('projects the picked time onto the day the draft is already on', () => {
    const parsed = parseTimeInput('14:45', captureMockAt(20, 8, 0))
    expect(parsed?.getDate()).toBe(20)
    expect(parsed?.getHours()).toBe(14)
    expect(parsed?.getMinutes()).toBe(45)
    expect(parsed?.getSeconds()).toBe(0)
  })

  it('refuses a malformed or out-of-range time rather than inventing one', () => {
    expect(parseTimeInput('', CAPTURE_MOCK_NOW)).toBeNull()
    expect(parseTimeInput('9:5', CAPTURE_MOCK_NOW)).toBeNull()
    expect(parseTimeInput('24:00', CAPTURE_MOCK_NOW)).toBeNull()
  })
})

describe("formatCaptureDate — canon's formattedDate", () => {
  it('reads "Today" for the day the user is capturing on', () => {
    expect(
      formatCaptureDate(captureMockAt(17, 0), CAPTURE_MOCK_NOW, 'en-US'),
    ).toBe('Today')
  })

  it('reads "Tomorrow" for the next day', () => {
    expect(
      formatCaptureDate(captureMockAt(18, 0), CAPTURE_MOCK_NOW, 'en-US'),
    ).toBe('Tomorrow')
  })

  it('falls back to a medium date once it is further out', () => {
    expect(
      formatCaptureDate(captureMockAt(25, 0), CAPTURE_MOCK_NOW, 'en-US'),
    ).toBe('Mar 25, 2026')
  })

  it('does not read "Tomorrow" for the same weekday a week later', () => {
    expect(
      formatCaptureDate(captureMockAt(24, 0), CAPTURE_MOCK_NOW, 'en-US'),
    ).not.toBe('Tomorrow')
  })
})

describe("schedulingToastMessage — canon's ActionToastModel copy", () => {
  it("quotes the title and names the slot, as canon's format string does", () => {
    expect(
      schedulingToastMessage(
        'Draft the announcement',
        captureMockAt(17, 14, 30),
        'en-US',
      ),
    ).toBe('"Draft the announcement" scheduled for 2:30 PM')
  })

  it('strips a leading emoji — the toast already carries its own glyph', () => {
    expect(
      schedulingToastMessage(
        '📞 Call the bank',
        captureMockAt(17, 9, 0),
        'en-US',
      ),
    ).toBe('"Call the bank" scheduled for 9:00 AM')
  })

  it('keeps a mid-title emoji, which is part of the name the user typed', () => {
    expect(
      schedulingToastMessage(
        'Ship the 🚀 launch',
        captureMockAt(17, 9, 0),
        'en-US',
      ),
    ).toBe('"Ship the 🚀 launch" scheduled for 9:00 AM')
  })

  it('formats midnight and noon unambiguously', () => {
    expect(formatCaptureTime(captureMockAt(17, 0, 0), 'en-US')).toBe('12:00 AM')
    expect(formatCaptureTime(captureMockAt(17, 12, 0), 'en-US')).toBe(
      '12:00 PM',
    )
  })
})

describe('inboxCountCaption — canon\'s "N endeavors" subtitle', () => {
  it('names the count when there is anything to triage', () => {
    expect(inboxCountCaption(3)).toBe('3 endeavors')
  })

  it('says nothing at all when the tray is empty, so the header does not shout zero', () => {
    expect(inboxCountCaption(0)).toBeUndefined()
  })

  it('singularizes one row — canon\'s own string reads "1 endeavors"', () => {
    expect(inboxCountCaption(1)).toBe('1 endeavor')
  })
})

describe("weekDayFromDate — canon's Monday-first allCases", () => {
  it('maps a Tuesday, which is what the fixtures capture on', () => {
    expect(weekDayFromDate(CAPTURE_MOCK_NOW)).toBe(WeekDay.tuesday)
  })

  it('maps a Sunday, the case a 0-indexed getDay() gets wrong', () => {
    expect(weekDayFromDate(captureMockAt(22, 12))).toBe(WeekDay.sunday)
  })

  it('maps a Monday, the first case', () => {
    expect(weekDayFromDate(captureMockAt(16, 12))).toBe(WeekDay.monday)
  })
})

describe('captureRecurrencePresets — anchored to the drafted day', () => {
  it("offers canon's five shapes, Never first", () => {
    const presets = captureRecurrencePresets(CAPTURE_MOCK_NOW)
    expect(presets.map((preset) => preset.recurrence.kind)).toEqual([
      'never',
      'daily',
      'weekly',
      'monthly',
      'yearly',
    ])
  })

  it('repeats weekly on the weekday the draft is already on', () => {
    const weekly = captureRecurrencePresets(CAPTURE_MOCK_NOW)[2]
    expect(weekly?.recurrence).toEqual({
      kind: 'weekly',
      interval: 1,
      weekdays: [WeekDay.tuesday],
    })
  })

  it("repeats yearly on that month and day, with March as Month.march (not JS's 2)", () => {
    const yearly = captureRecurrencePresets(CAPTURE_MOCK_NOW)[4]
    expect(yearly?.recurrence).toEqual({
      kind: 'yearly',
      interval: 1,
      month: Month.march,
      day: 17,
    })
  })

  it("labels each preset with canon's own EndeavorRecurrence.label", () => {
    expect(
      captureRecurrencePresets(CAPTURE_MOCK_NOW).map((preset) => preset.label),
    ).toEqual(['Never', 'Daily', 'Weekly', 'Monthly', 'Yearly'])
  })
})

describe('captureRepeatChipLabel', () => {
  it('reads "No Repeat" on the chip while nothing repeats — canon\'s own string', () => {
    expect(captureRepeatChipLabel(NO_RECURRENCE)).toBe('No Repeat')
  })

  it('reads the rule once one is picked', () => {
    expect(captureRepeatChipLabel({ kind: 'daily', interval: 1 })).toBe('Daily')
  })

  it('keeps the plural form for an interval above one', () => {
    expect(captureRepeatChipLabel({ kind: 'daily', interval: 3 })).toBe(
      'Every 3 days',
    )
  })
})
