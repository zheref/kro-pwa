/**
 * `DateRangeSpec` — canon `KroCore/Vistas/EndeavorsQuery.swift`, resolved by
 * `Kro/Dependencies/Vistas/EndeavorsQueryClient.swift`'s
 * `resolve(dateRange:now:)`.
 *
 * The time window a vista's query asks its hosts for. It is a **specification**,
 * not a window: `.today` means "whatever day it is when the fetch runs", and it
 * becomes two concrete instants only when a caller supplies `now`.
 *
 * ## What the port changes, and why
 *
 * Swift's enum-with-associated-values becomes a discriminated union on `kind`
 * (`RC-24`). Canon's `resolve` is a `static func` on the query *client* — an
 * application-tier type this package does not own — so the resolution lands
 * here, beside the spec it resolves, where it stays pure and testable.
 *
 * Canon reads `Calendar.current`, which carries the user's locale. This tier
 * has `types: []` and no locale, so two things are made explicit instead of
 * assumed:
 *
 *  - **Calendar arithmetic is local-time**, built with the `Date(year, month,
 *    day)` constructor rather than UTC millisecond maths, so a day boundary
 *    lands where the user's clock says it does (and survives a DST shift).
 *  - **The first weekday is a parameter**, defaulting to Sunday. `Calendar.current`
 *    resolves it from the locale; a caller that knows the user's locale (the
 *    presentation tier, which is the only tier that does) passes it in.
 *
 * The window is **half-open** — `[start, end)` — exactly as canon's
 * `startOfDay … +1 day` pair is.
 */
import { assertNever } from '../library/assertNever'

/** Which window to ask for. `week` and `month` are anchored, `today` is not. */
export type DateRangeSpec =
  | { readonly kind: 'today' }
  | { readonly kind: 'week'; readonly of: Date }
  | { readonly kind: 'month'; readonly year: number; readonly month: number }
  | { readonly kind: 'absolute'; readonly from: Date; readonly to: Date }

/** `.today` — the calendar day containing `now`. */
export const todayDateRange: DateRangeSpec = { kind: 'today' }

/** `.week(of:)` — the calendar week containing `anchor`. */
export const weekDateRange = (anchor: Date): DateRangeSpec => ({
  kind: 'week',
  of: anchor,
})

/** `.month(year:month:)` — `month` is 1-based, as canon's `DateComponents` is. */
export const monthDateRange = (year: number, month: number): DateRangeSpec => ({
  kind: 'month',
  year,
  month,
})

/** `.absolute(from:to:)` — a literal half-open `[from, to)` window. */
export const absoluteDateRange = (from: Date, to: Date): DateRangeSpec => ({
  kind: 'absolute',
  from,
  to,
})

/** A resolved, half-open `[start, end)` window. */
export interface ResolvedDateRange {
  readonly start: Date
  readonly end: Date
}

/**
 * Index of the day a week starts on, `0` = Sunday … `6` = Saturday — the same
 * numbering `Date.prototype.getDay` uses. Canon takes this from
 * `Calendar.current`; the platform-free tier defaults to Sunday and lets a
 * locale-aware caller override it.
 */
export const DEFAULT_FIRST_WEEKDAY = 0

/** Midnight local time on a given date, correct for years 0–99 too. */
const atMidnight = (year: number, monthIndex: number, day: number): Date => {
  const date = new Date(2000, 0, 1)
  date.setFullYear(year, monthIndex, day)
  date.setHours(0, 0, 0, 0)
  return date
}

/** `Calendar.startOfDay(for:)`. */
const startOfDay = (date: Date): Date =>
  atMidnight(date.getFullYear(), date.getMonth(), date.getDate())

/** `Calendar.date(byAdding: .day, value:)`, from a midnight anchor. */
const addingDays = (date: Date, days: number): Date =>
  atMidnight(date.getFullYear(), date.getMonth(), date.getDate() + days)

/**
 * `EndeavorsQueryClient.resolve(dateRange:now:)` — turn a spec into concrete
 * `[start, end)` bounds.
 *
 * `now` is required and injected so a caller mid-fetch can share one anchor
 * across every host, and so a test can pin a value instead of racing the wall
 * clock around midnight — canon's stated reason, unchanged.
 *
 * Two behaviours are load-bearing and easy to lose:
 *
 *  - **`null` resolves the same as `.today`.** A query with no date constraint
 *    still hands a calendar client a window, because a calendar client cannot
 *    fetch without one.
 *  - **Reversed absolute bounds yield an empty window**, `[from, from)` — canon's
 *    defensive normalization, which `mockReversedRange` exists to pin.
 */
export const resolveDateRange = (
  spec: DateRangeSpec | null,
  now: Date,
  options?: { readonly firstWeekday?: number },
): ResolvedDateRange => {
  if (spec === null) {
    const start = startOfDay(now)
    return { start, end: addingDays(start, 1) }
  }
  switch (spec.kind) {
    case 'today': {
      const start = startOfDay(now)
      return { start, end: addingDays(start, 1) }
    }
    case 'week': {
      const firstWeekday = options?.firstWeekday ?? DEFAULT_FIRST_WEEKDAY
      const anchor = startOfDay(spec.of)
      const offset = (anchor.getDay() - firstWeekday + 7) % 7
      const start = addingDays(anchor, -offset)
      return { start, end: addingDays(start, 7) }
    }
    case 'month': {
      const start = atMidnight(spec.year, spec.month - 1, 1)
      return { start, end: atMidnight(spec.year, spec.month, 1) }
    }
    case 'absolute':
      return spec.from.getTime() <= spec.to.getTime()
        ? { start: spec.from, end: spec.to }
        : { start: spec.from, end: spec.from }
    default:
      return assertNever(spec)
  }
}
