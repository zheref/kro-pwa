/**
 * The timeline's own strings.
 *
 * Every case pins an explicit locale. `Intl` reads the runtime's locale by
 * default, so an assertion without one passes on the author's machine and
 * fails on a CI runner in another region — which is a test asserting the
 * environment, not the code.
 */
import { describe, expect, it } from 'vitest'
import {
  dayPickerAccessibleDate,
  dayPickerDayNumber,
  dayPickerWeekdayLetter,
  planEventCountLabel,
  planTitleDate,
  planTitleWeekday,
  slotAccessibilityLabel,
  timelineHourLabel,
} from '../timelineFormat'

const REFERENCE = new Date(2026, 5, 18, 9, 40)

describe('timelineHourLabel', () => {
  it('names an ordinary hour the way canon 12-hour grid does', () => {
    expect(timelineHourLabel(9, 'en-US')).toBe('9 AM')
    expect(timelineHourLabel(13, 'en-US')).toBe('1 PM')
  })

  it('renders midnight for the band-closing 24, not an invalid hour', () => {
    expect(timelineHourLabel(24, 'en-US')).toBe(timelineHourLabel(0, 'en-US'))
  })

  it('normalises a negative hour rather than producing NaN', () => {
    expect(timelineHourLabel(-1, 'en-US')).toBe(timelineHourLabel(23, 'en-US'))
  })

  it('follows a 24-hour locale instead of forcing an AM/PM pattern', () => {
    expect(timelineHourLabel(13, 'en-GB')).not.toContain('PM')
  })
})

describe('the day picker strings', () => {
  it('gives the narrow weekday letter the top line shows', () => {
    expect(dayPickerWeekdayLetter(REFERENCE, 'en-US')).toBe('T')
  })

  it('gives the bare day number the bottom line shows', () => {
    expect(dayPickerDayNumber(REFERENCE, 'en-US')).toBe('18')
  })

  it('spells the whole date for a screen reader, since "T 18" names nothing', () => {
    expect(dayPickerAccessibleDate(REFERENCE, 'en-US')).toBe(
      'Thursday, June 18, 2026',
    )
  })
})

describe('slotAccessibilityLabel', () => {
  it('says what activating the slot would do, at the slot own time', () => {
    expect(slotAccessibilityLabel(new Date(2026, 5, 18, 9, 0), 'en-US')).toBe(
      'Add event at 9:00 AM',
    )
  })

  it('keeps the minutes, so a quarter-hour slot is distinguishable', () => {
    expect(slotAccessibilityLabel(new Date(2026, 5, 18, 9, 45), 'en-US')).toBe(
      'Add event at 9:45 AM',
    )
  })

  it('reads midnight as an hour rather than as zero', () => {
    expect(slotAccessibilityLabel(new Date(2026, 5, 18, 0, 0), 'en-US')).toBe(
      'Add event at 12:00 AM',
    )
  })
})

describe('the Plan title', () => {
  it('shows canon short month and day', () => {
    expect(planTitleDate(REFERENCE, 'en-US')).toBe('Jun 18')
  })

  it('shows the full weekday beside it', () => {
    expect(planTitleWeekday(REFERENCE, 'en-US')).toBe('Thursday')
  })

  it('says "1 event" rather than "1 events" on a one-event day', () => {
    expect(planEventCountLabel(1)).toBe('1 event')
    expect(planEventCountLabel(0)).toBe('0 events')
    expect(planEventCountLabel(4)).toBe('4 events')
  })
})
