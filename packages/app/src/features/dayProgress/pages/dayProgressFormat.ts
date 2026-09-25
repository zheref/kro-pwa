/**
 * Pure presentation helpers for the Day Progress Fragment — every string the
 * screen shows that depends on a locale or a unit, kept out of the Selectors
 * (which stay locale-free) and out of the JSX (so each rule is unit-tested).
 */
import { PerformResolution, assertNever } from '@kro/core'
import type { DayRelation } from '../DayProgressSelectors'

export const DEFAULT_DAY_PROGRESS_LOCALE = 'en-US'

/** "Today · Thu, Sep 24" / "Yesterday · Wed, Sep 23" / "Tuesday, September 15". */
export const dayProgressSubtitle = (
  relation: DayRelation,
  day: Date,
  locale: string = DEFAULT_DAY_PROGRESS_LOCALE,
): string => {
  const short = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(day)
  switch (relation) {
    case 'today':
      return `Today · ${short}`
    case 'yesterday':
      return `Yesterday · ${short}`
    case 'other':
      return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(day)
    default:
      return assertNever(relation)
  }
}

/** The narrow weekday letter a lane cell shows ("T"). */
export const weekdayLetter = (
  day: Date,
  locale: string = DEFAULT_DAY_PROGRESS_LOCALE,
): string => new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(day)

/** The full date a lane cell is announced as ("Thursday, September 24"). */
export const weekdayAccessibleName = (
  day: Date,
  locale: string = DEFAULT_DAY_PROGRESS_LOCALE,
): string =>
  new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(day)

/** "9:00 – 9:45" — the clock times without a day period. */
export const timeRange = (
  start: Date,
  end: Date,
  locale: string = DEFAULT_DAY_PROGRESS_LOCALE,
): string => {
  const format = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  })
  const strip = (date: Date): string =>
    format
      .formatToParts(date)
      .filter((part) => part.type !== 'dayPeriod')
      .map((part) => part.value)
      .join('')
      .trim()
  return `${strip(start)} – ${strip(end)}`
}

/** "No timer", "45m", "1h 35m". */
export const durationPill = (seconds: number | null): string => {
  if (seconds === null) return 'No timer'
  const minutes = Math.max(0, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

/** The outcome label for a performance's resolution. */
export const outcomeLabel = (resolution: PerformResolution): string => {
  switch (resolution) {
    case PerformResolution.complete:
      return 'Complete'
    case PerformResolution.aborted:
      return 'Aborted'
    case PerformResolution.finished:
      return 'Session finished'
    default:
      return assertNever(resolution)
  }
}
