/**
 * `Endeavor.Status` — canon `KroCore/Model/Endeavor/Endeavor.swift`.
 *
 * Ten states. Two things about them are load-bearing and easy to get wrong:
 *
 *  1. **Ordering is by `indexValue`, not by declaration order.** Canon's
 *     `Comparable` conformance is `lhs.indexValue < rhs.indexValue`, and the
 *     index values are neither the declaration order nor contiguous from zero:
 *     `ongoing` is `0`, `skipped` is `8`, and `blocked` is **`-1`** — it sorts
 *     ahead of everything, because a blocked endeavor is the one that most
 *     needs looking at.
 *  2. **`captionPrefix` and the caption's *source* are separate.** Canon pairs
 *     each state with a prefix ("Due ", "Completed ", …) and a `KeyPath` into
 *     one of `Endeavor`'s formatted date strings. A `KeyPath` has no TypeScript
 *     equivalent, and those strings are `DateFormatter` /
 *     `RelativeDateTimeFormatter` output — locale-formatted presentation, not
 *     domain data. So the port keeps the mapping as data
 *     (`statusCaptionSource`) and leaves the formatting to the presentation
 *     tier, which is the only tier that knows the user's locale.
 */
import { assertNever } from '../../library/assertNever'

export const EndeavorStatus = {
  pending: 'pending',
  planned: 'planned',
  ongoing: 'ongoing',
  paused: 'paused',
  reviewing: 'reviewing',
  delegated: 'delegated',
  qa: 'qa',
  blocked: 'blocked',
  closed: 'closed',
  skipped: 'skipped',
} as const

export type EndeavorStatus =
  (typeof EndeavorStatus)[keyof typeof EndeavorStatus]

/** `Status.allCases`, in canon **declaration** order — not index order. */
export const endeavorStatuses: readonly EndeavorStatus[] = [
  EndeavorStatus.pending,
  EndeavorStatus.planned,
  EndeavorStatus.ongoing,
  EndeavorStatus.paused,
  EndeavorStatus.reviewing,
  EndeavorStatus.delegated,
  EndeavorStatus.qa,
  EndeavorStatus.blocked,
  EndeavorStatus.closed,
  EndeavorStatus.skipped,
]

/** `Status(rawValue:)` — narrows a raw string, or `null` when unknown. */
export const endeavorStatusFromRawValue = (
  raw: string,
): EndeavorStatus | null =>
  endeavorStatuses.find((status) => status === raw) ?? null

/**
 * `Status.indexValue` — the sort key. `blocked` is `-1`; the rest run `0`
 * (`ongoing`) through `8` (`skipped`).
 */
export const endeavorStatusIndexValue = (status: EndeavorStatus): number => {
  switch (status) {
    case EndeavorStatus.blocked:
      return -1
    case EndeavorStatus.ongoing:
      return 0
    case EndeavorStatus.planned:
      return 1
    case EndeavorStatus.paused:
      return 2
    case EndeavorStatus.pending:
      return 3
    case EndeavorStatus.delegated:
      return 4
    case EndeavorStatus.qa:
      return 5
    case EndeavorStatus.reviewing:
      return 6
    case EndeavorStatus.closed:
      return 7
    case EndeavorStatus.skipped:
      return 8
    default:
      return assertNever(status)
  }
}

/**
 * Canon's `Comparable` conformance, as an `Array.prototype.sort` comparator:
 * negative when `left` sorts first. `[…].sort(compareEndeavorStatuses)` yields
 * canon's ascending order, `blocked` first.
 */
export const compareEndeavorStatuses = (
  left: EndeavorStatus,
  right: EndeavorStatus,
): number => endeavorStatusIndexValue(left) - endeavorStatusIndexValue(right)

/** Canon's `<` operator on `Status`. */
export const endeavorStatusIsBefore = (
  left: EndeavorStatus,
  right: EndeavorStatus,
): boolean => endeavorStatusIndexValue(left) < endeavorStatusIndexValue(right)

/** `Status.displayName`. `qa` is the only all-caps label. */
export const endeavorStatusDisplayName = (status: EndeavorStatus): string => {
  switch (status) {
    case EndeavorStatus.blocked:
      return 'Blocked'
    case EndeavorStatus.closed:
      return 'Closed'
    case EndeavorStatus.delegated:
      return 'Delegated'
    case EndeavorStatus.paused:
      return 'Paused'
    case EndeavorStatus.pending:
      return 'Pending'
    case EndeavorStatus.planned:
      return 'Planned'
    case EndeavorStatus.ongoing:
      return 'Ongoing'
    case EndeavorStatus.qa:
      return 'QA'
    case EndeavorStatus.reviewing:
      return 'Reviewing'
    case EndeavorStatus.skipped:
      return 'Skipped'
    default:
      return assertNever(status)
  }
}

/**
 * `Status.captionPrefix` — verbatim, **trailing space included**, because the
 * caption is `captionPrefix + formattedDate` and the space is the separator.
 */
export const endeavorStatusCaptionPrefix = (
  status: EndeavorStatus,
): string => {
  switch (status) {
    case EndeavorStatus.blocked:
      return 'Blocked Since '
    case EndeavorStatus.closed:
      return 'Completed '
    case EndeavorStatus.delegated:
      return 'Due '
    case EndeavorStatus.paused:
      return 'Paused Since '
    case EndeavorStatus.pending:
      return 'Due '
    case EndeavorStatus.planned:
      return 'Due '
    case EndeavorStatus.ongoing:
      return 'Due '
    case EndeavorStatus.qa:
      return 'Completed '
    case EndeavorStatus.reviewing:
      return 'Completed '
    case EndeavorStatus.skipped:
      return 'Due '
    default:
      return assertNever(status)
  }
}

/**
 * Which of the endeavor's dates the caption formats, and how — the data form
 * of canon's `captionPath` `KeyPath`.
 *
 * `blockedSince` and `pausedSince` correspond to canon's
 * `blockedSinceString` / `pausedSinceString`, both of which return `nil`
 * today: `Endeavor` stores no `blocked` or `paused` timestamp, and canon
 * leaves the formatter commented out awaiting one. The port keeps the mapping
 * and lets the presentation tier render nothing, rather than inventing a field
 * canon does not have.
 */
export const EndeavorCaptionSource = {
  /** `\.blockedSinceString` — no backing field in canon yet. */
  blockedSince: 'blockedSince',
  /** `\.pausedSinceString` — no backing field in canon yet. */
  pausedSince: 'pausedSince',
  /** `\.completionString` — absolute, "MMMM dd" (with year when not this year). */
  completionAbsolute: 'completionAbsolute',
  /** `\.completionStringRelative` — relative, "2 days ago". */
  completionRelative: 'completionRelative',
  /** `\.dueStringRelative` — relative, "in 3 hours". */
  dueRelative: 'dueRelative',
} as const

export type EndeavorCaptionSource =
  (typeof EndeavorCaptionSource)[keyof typeof EndeavorCaptionSource]

/** `Status.captionPath`, as data. */
export const endeavorStatusCaptionSource = (
  status: EndeavorStatus,
): EndeavorCaptionSource => {
  switch (status) {
    case EndeavorStatus.blocked:
      return EndeavorCaptionSource.blockedSince
    case EndeavorStatus.closed:
      return EndeavorCaptionSource.completionRelative
    case EndeavorStatus.delegated:
      return EndeavorCaptionSource.dueRelative
    case EndeavorStatus.paused:
      return EndeavorCaptionSource.pausedSince
    case EndeavorStatus.pending:
      return EndeavorCaptionSource.dueRelative
    case EndeavorStatus.planned:
      return EndeavorCaptionSource.dueRelative
    case EndeavorStatus.ongoing:
      return EndeavorCaptionSource.dueRelative
    case EndeavorStatus.qa:
      return EndeavorCaptionSource.completionAbsolute
    case EndeavorStatus.reviewing:
      return EndeavorCaptionSource.completionAbsolute
    case EndeavorStatus.skipped:
      return EndeavorCaptionSource.dueRelative
    default:
      return assertNever(status)
  }
}
