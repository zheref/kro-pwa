import { describe, expect, it } from 'vitest'
import {
  formatDueCaption,
  formatDuration,
  formatRelativeTime,
  formatTime,
  formatTimeRange,
} from './formatting'

/** Wednesday 2026-04-15, 14:00 local — the same instant the mocks use. */
const NOW = new Date(2026, 3, 15, 14, 0, 0)

describe('formatDuration', () => {
  it('prints minutes alone for a sub-hour block — a 45-minute writing session', () => {
    expect(formatDuration(45 * 60)).toBe('45m')
  })

  it('drops the minutes when they are zero — a clean one-hour meeting', () => {
    expect(formatDuration(60 * 60)).toBe('1h')
    expect(formatDuration(3 * 60 * 60)).toBe('3h')
  })

  it('prints both parts for a ragged block — a 1h 30m deep-work stretch', () => {
    expect(formatDuration(90 * 60)).toBe('1h 30m')
  })

  it('truncates rather than rounding, as canon does — 89 seconds is 1m', () => {
    expect(formatDuration(89)).toBe('1m')
  })

  it('prints 0m for a sub-minute duration instead of rounding it up to 1m', () => {
    expect(formatDuration(30)).toBe('0m')
  })
})

describe('formatTime', () => {
  it('prints a 12-hour clock in en-US — the locale KroApple hardcodes', () => {
    expect(formatTime(new Date(2026, 3, 15, 14, 0), 'en-US')).toBe('2:00 PM')
  })

  it('follows the locale rather than the hardcoded format — de-DE is 24-hour', () => {
    // The one deliberate departure from canon's fixed "h:mm a": a browser in a
    // 24-hour locale printing "2:00 PM" is a bug iOS cannot have.
    expect(formatTime(new Date(2026, 3, 15, 14, 0), 'de-DE')).toBe('14:00')
  })

  it('prints a range with canon’s en-dash separator', () => {
    expect(
      formatTimeRange(new Date(2026, 3, 15, 14, 0), new Date(2026, 3, 15, 15, 30), 'en-US'),
    ).toBe('2:00 PM – 3:30 PM')
  })
})

describe('formatRelativeTime', () => {
  it('names yesterday with its time — a task finished last night', () => {
    const yesterday = new Date(2026, 3, 14, 17, 0)
    expect(formatRelativeTime(yesterday, NOW, 'en-US')).toBe('Yesterday, 5:00 PM')
  })

  it('counts whole days past yesterday — a receipt three days overdue', () => {
    expect(formatRelativeTime(new Date(2026, 3, 12, 9, 0), NOW, 'en-US')).toBe('3 days ago')
  })

  it('falls through to the plain time earlier the same day, as canon does', () => {
    expect(formatRelativeTime(new Date(2026, 3, 15, 9, 30), NOW, 'en-US')).toBe('9:30 AM')
  })

  it('counts calendar days, not 24-hour spans — 23:59 two nights ago is 2 days', () => {
    expect(formatRelativeTime(new Date(2026, 3, 13, 23, 59), NOW, 'en-US')).toBe('2 days ago')
  })

  it('localizes the WORDS as well as the clock — de-DE gets "Gestern, 17:00"', () => {
    // The regression: the relative words were hardcoded English, so a de-DE
    // browser printed a 24-hour clock beside "Yesterday". iOS cannot produce
    // that — its formatter is created per-locale by the OS.
    const yesterday = new Date(2026, 3, 14, 17, 0)
    expect(formatRelativeTime(yesterday, NOW, 'de-DE')).toBe('Gestern, 17:00')
  })

  it('localizes the counted form too — es-ES says "Hace 3 días", not "3 days ago"', () => {
    expect(formatRelativeTime(new Date(2026, 3, 12, 9, 0), NOW, 'es-ES')).toBe('Hace 3 días')
  })

  it('lets the locale use its own word where it has one — de-DE has "vorgestern"', () => {
    // `numeric: 'auto'` is what allows this. English has no single word for
    // the day before yesterday and correctly falls back to "2 days ago".
    expect(formatRelativeTime(new Date(2026, 3, 13, 9, 0), NOW, 'de-DE')).toBe('Vorgestern')
    expect(formatRelativeTime(new Date(2026, 3, 13, 9, 0), NOW, 'en-US')).toBe('2 days ago')
  })
})

describe('formatDueCaption', () => {
  it('prints the plain time while the moment is still ahead', () => {
    expect(formatDueCaption(new Date(2026, 3, 15, 16, 0), NOW, 'en-US')).toBe('4:00 PM')
  })

  it('switches to the relative caption once the moment has passed', () => {
    expect(formatDueCaption(new Date(2026, 3, 14, 17, 0), NOW, 'en-US')).toBe(
      'Yesterday, 5:00 PM',
    )
  })

  it('treats the exact due instant as not-yet-overdue — canon compares strictly', () => {
    expect(formatDueCaption(NOW, NOW, 'en-US')).toBe('2:00 PM')
  })
})
