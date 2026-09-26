/**
 * The strings the timeline draws that the endeavor kit's `formatting.ts` does
 * not already own — the hour-grid label, the day-picker pair, and the two
 * spoken names canon writes by hand.
 *
 * `formatTime` / `formatTimeRange` are NOT re-implemented here: the kit
 * already ports them from canon's `TimedEventCard.timeRangeString`, and a
 * second `Intl.DateTimeFormat` with the same options is how two surfaces end
 * up disagreeing about a separator.
 *
 * Everything is `Intl`-driven and locale-aware. Canon pins
 * `Locale(identifier: "en_US_POSIX")` on the hour label because SwiftUI's
 * `DateFormatter` would otherwise reformat a fixed `"h a"` pattern per locale;
 * `Intl` takes the *intent* (`hour: 'numeric'`) rather than a pattern, so the
 * runtime's own locale is the correct input and a 24-hour locale correctly
 * renders `13` where an en-US one renders `1 PM`.
 */

/**
 * `TimelineDayView.hourLabel(for:)` — an hour index as a short clock string.
 *
 * The band's closing boundary is one past its last hour (24 for a full day),
 * which is midnight again rather than an invalid hour; canon normalises with
 * `((hour % 24) + 24) % 24` and so does this.
 */
export const timelineHourLabel = (hour: number, locale?: string): string => {
  const normalized = ((hour % 24) + 24) % 24
  // A fixed date so only the hour varies; the day itself is never rendered.
  const at = new Date(2000, 0, 1, normalized, 0, 0, 0)
  return new Intl.DateTimeFormat(locale, { hour: 'numeric' }).format(at)
}

/** The narrow weekday letter the day picker's top line shows — canon's `.narrow`. */
export const dayPickerWeekdayLetter = (date: Date, locale?: string): string =>
  new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(date)

/** The day number under it — canon's `.dateTime.day()`. */
export const dayPickerDayNumber = (date: Date, locale?: string): string =>
  new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date)

/** The chip's spoken name — canon's `date.formatted(date: .complete, time: .omitted)`. */
export const dayPickerAccessibleDate = (date: Date, locale?: string): string =>
  new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)

/**
 * `TimelineDayView.slotAccessibilityLabel(index:)` — *"Add event at 9:00 AM"*.
 *
 * Takes the already-resolved slot moment rather than an index: the index→time
 * arithmetic is `TimelineSlots.timelineSlotStart`'s, and duplicating it here so
 * this module could take an index would be the second copy that drifts.
 */
export const slotAccessibilityLabel = (start: Date, locale?: string): string =>
  `Add event at ${new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(start)}`

/** The Plan header's own title — canon's `"MMM d"` over the selected day. */
export const planTitleDate = (date: Date, locale?: string): string =>
  new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(
    date,
  )

/** The line under it — canon's `"EEEE"`. */
export const planTitleWeekday = (date: Date, locale?: string): string =>
  new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)

/**
 * `PlanScreen.titleSubtitle`'s event half — *"1 event"* / *"4 events"*.
 *
 * Canon's own branch, kept because the singular is not `"1 events"` and an
 * `Intl.PluralRules` call would be a third way to say a thing canon says with
 * an `if`.
 */
export const planEventCountLabel = (count: number): string =>
  count === 1 ? '1 event' : `${count} events`
