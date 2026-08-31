/**
 * The four strings an endeavor card or row prints about time.
 *
 * KroApple formats these with `DateFormatter` / a hand-rolled minute divide
 * inside the view (`EndeavorCard.formatTime`, `formatRelativeTime`,
 * `formatDuration`; `EndeavorRow`'s private `TimeFormatting` singleton). The
 * port keeps them together here for one reason: three canon views each carried
 * their own copy of `formatDuration`, and three copies of a rounding rule drift.
 *
 * `now` is a PARAMETER, never `new Date()` read inside. `@kro/core` made the
 * same call for the same reason — a test states the moment it is asking about
 * instead of mocking a global, and a "2 days ago" caption is otherwise
 * untestable.
 *
 * `locale` is likewise a parameter, and it reaches EVERY string here — the
 * clock through `Intl.DateTimeFormat`, the relative day words through
 * `Intl.RelativeTimeFormat`. On iOS the OS localizes both; a port that
 * localized only the clock produced "14:00" beside the word "Yesterday", which
 * is worse than either language alone.
 */

/** Seconds in one minute — the unit `Endeavor.duration` is denominated in. */
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60

/**
 * `"h:mm a"` — canon's fixed format string.
 *
 * Canon hardcodes a 12-hour clock; the web equivalent asks the runtime for the
 * user's locale instead, because a browser in `de-DE` printing "2:00 PM" is a
 * bug the iOS app cannot have (its formatter is created per-locale by the OS).
 * Pass `locale` to pin it in a test or a story.
 */
export function formatTime(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

/** `"2:00 PM – 3:30 PM"`, canon's `TimedEventCard.timeRangeString` separator. */
export function formatTimeRange(start: Date, end: Date, locale?: string): string {
  return `${formatTime(start, locale)} – ${formatTime(end, locale)}`
}

/**
 * `"45m"`, `"1h"`, `"1h 30m"` — canon's exact three branches, including the
 * one that prints `"0m"` for a sub-minute duration rather than rounding up.
 *
 * Truncating, not rounding: canon divides `Int(interval) / 60`.
 */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.trunc(seconds / SECONDS_PER_MINUTE)
  const hours = Math.trunc(totalMinutes / MINUTES_PER_HOUR)
  const minutes = totalMinutes % MINUTES_PER_HOUR
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h`
  return `${minutes}m`
}

/** Whether two instants land on the same calendar day in the runtime's zone. */
function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

/** Whole calendar days from `date` to `now`, ignoring the time of day. */
function calendarDaysBetween(date: Date, now: Date): number {
  const from = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

/**
 * The relative day phrase, in the caller's locale.
 *
 * Canon gets "Yesterday" from `DateFormatter.doesRelativeDateFormatting` — the
 * OS localizes it — and hand-rolls only the "N days ago" half. The port had
 * BOTH halves hardcoded in English, so a `de-DE` browser printed a 24-hour
 * clock beside the word "Yesterday": half-translated output the iOS app cannot
 * produce. `Intl.RelativeTimeFormat` is the web's equivalent of that OS
 * formatter, and `numeric: 'auto'` is what makes it substitute the word —
 * "yesterday", "gestern", "昨日" — where the locale has one, and fall back to
 * the counted form ("3 days ago", "vor 3 Tagen") where it does not.
 */
function relativeDays(days: number, locale?: string): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day')
}

/**
 * Sentence-case the first character, in the locale's own casing rules.
 *
 * `Intl.RelativeTimeFormat` returns mid-sentence casing ("yesterday"); these
 * strings LEAD a caption, and canon prints "Yesterday". A leading digit is
 * unaffected, so "3 days ago" passes through untouched — which is why both
 * branches can share one rule instead of one being a special case.
 */
function sentenceCase(text: string, locale?: string): string {
  const first = [...text][0]
  if (first === undefined) return text
  return first.toLocaleUpperCase(locale) + text.slice(first.length)
}

/**
 * The overdue caption: `"Yesterday, 5:00 PM"`, `"3 days ago"`, or the plain
 * time when neither applies.
 *
 * Canon's ladder, in canon's order — yesterday first, then a day count strictly
 * greater than one, then the bare time. The `> 1` is load-bearing: a moment
 * earlier the same day and a moment "1 day ago" that is not calendar-yesterday
 * both fall through to the time, which is what canon prints.
 */
export function formatRelativeTime(date: Date, now: Date, locale?: string): string {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (isSameDay(date, yesterday)) {
    return `${sentenceCase(relativeDays(1, locale), locale)}, ${formatTime(date, locale)}`
  }

  const days = calendarDaysBetween(date, now)
  if (days > 1) return sentenceCase(relativeDays(days, locale), locale)

  return formatTime(date, locale)
}

/**
 * What a card prints for its due time: the relative caption once the moment has
 * passed, the plain time until then. Canon inlines this ternary at four call
 * sites; one name means the four cannot disagree.
 */
export function formatDueCaption(due: Date, now: Date, locale?: string): string {
  return due.getTime() < now.getTime()
    ? formatRelativeTime(due, now, locale)
    : formatTime(due, locale)
}
