/**
 * The pure derivations on `Endeavor` — canon
 * `KroCore/Model/Endeavor/Endeavor+Computed.swift` and the computed properties
 * at the foot of `Endeavor.swift`.
 *
 * ## The clock is a parameter, never an ambient
 *
 * Canon's `isDue`, `isDueToday`, `isDueSoon` and `isRecent` read `Date()`
 * inside the property. Here every time-relative predicate takes `now`
 * explicitly. Two reasons, and both are load-bearing: this tier compiles with
 * `types: []` so there is no sanctioned clock to reach for, and KroApple
 * already routes time through a `CurrentTimeManager` for exactly the
 * testability this makes structural. A test states the moment it is asking
 * about instead of mocking a global.
 *
 * ## What is deliberately not here
 *
 * - `completionString`, `dueString`, `createdString` and their `…Relative`
 *   siblings — `DateFormatter` / `RelativeDateTimeFormatter` output, i.e.
 *   locale-formatted presentation. The domain tier has no locale; see
 *   `EndeavorCaptionSource`, which carries the *mapping* those captions need.
 * - `blockedSinceString` / `pausedSinceString` — canon returns `nil` from both
 *   and leaves the body commented out; `Endeavor` stores no blocked/paused
 *   timestamp to format.
 * - `dueSection` — needs `DaySection`, a Do-lane concept owned by #16.
 * - `empiricalDuration`, `empiricalDurationPerformances`,
 *   `sessionLaunchRecommendation` — session math, explicitly #8.
 * - `resolvedKind` and `partitionedByKindResolvingShadows` — source
 *   reconciliation, explicitly #12.
 * - `uuid` — canon parses `id` into a `UUID`; a web `id` is a string end to
 *   end and there is no UUID type to parse into.
 */
import {
  dateAddingSeconds,
  hoursInSeconds,
  isSameCalendarDay,
  isWithinLast,
  isWithinNext,
} from '../shared/TimeInterval'
import type { Endeavor } from './Endeavor'
import { EndeavorHost } from './EndeavorHost'
import { EndeavorKind } from './EndeavorKind'
import { EndeavorStatus } from './EndeavorStatus'
import { endeavorTagAllowsForBackground } from './EndeavorTag'

/** Canon's `48.hours` window behind `isRecent`. */
export const RECENT_WINDOW_SECONDS = hoursInSeconds(48)

/** Canon's `72.hours` window behind `isDueSoon`. */
export const DUE_SOON_WINDOW_SECONDS = hoursInSeconds(72)

/** `isCompleted` — a host-native completion timestamp exists. */
export const isCompleted = (endeavor: Endeavor): boolean =>
  endeavor.completed !== null

/** `isEvent`. */
export const isEvent = (endeavor: Endeavor): boolean =>
  endeavor.kind === EndeavorKind.calendarEvent

/**
 * `end` — `start + duration`, or `null` when either is missing. Both are
 * required: a start with no duration has no end, and a duration with no start
 * has nowhere to begin.
 */
export const endOf = (endeavor: Endeavor): Date | null => {
  const { start, duration } = endeavor
  if (start === null || duration === null) return null
  return dateAddingSeconds(start, duration)
}

/**
 * `isEngaging` — whether this endeavor demands the user's attention rather
 * than running in the background. Three conditions, all of which must hold:
 * it is not one of the three meta kinds, it is not a draft, and **no** tag on
 * it allows background execution.
 */
export const isEngaging = (endeavor: Endeavor): boolean => {
  const tags = endeavor.tags ?? []
  return (
    endeavor.kind !== EndeavorKind.behavior &&
    endeavor.kind !== EndeavorKind.background &&
    endeavor.kind !== EndeavorKind.blueprint &&
    endeavor.isDraft === false &&
    !tags.some(endeavorTagAllowsForBackground)
  )
}

/**
 * `hasBeenCompleted` — a **status**-level answer, distinct from `isCompleted`,
 * which asks about the host's timestamp. `qa`, `reviewing` and `skipped` all
 * count as done here even though none of them is `closed`.
 */
export const hasBeenCompleted = (endeavor: Endeavor): boolean =>
  endeavor.status === EndeavorStatus.closed ||
  endeavor.status === EndeavorStatus.reviewing ||
  endeavor.status === EndeavorStatus.qa ||
  endeavor.status === EndeavorStatus.skipped

/** `hasBeenPersisted` — at least one host has it. */
export const hasBeenPersisted = (endeavor: Endeavor): boolean =>
  endeavor.hostedBy.length > 0

/** `isOnlyInMemory` — no host has it yet. The exact negation of the above. */
export const isOnlyInMemory = (endeavor: Endeavor): boolean =>
  endeavor.hostedBy.length === 0

/** `isDue` — the due moment has passed. Strictly before `now`. */
export const isDue = (endeavor: Endeavor, now: Date): boolean =>
  endeavor.due !== null && endeavor.due.getTime() < now.getTime()

/** `isDueToday` — same calendar day as `now`, in the runtime's time zone. */
export const isDueToday = (endeavor: Endeavor, now: Date): boolean =>
  endeavor.due !== null && isSameCalendarDay(endeavor.due, now)

/**
 * `isDueSoon` — due within the next 72 hours. An **overdue** endeavor is not
 * "due soon": canon's Do lanes list Overdue and Due Soon separately.
 */
export const isDueSoon = (endeavor: Endeavor, now: Date): boolean =>
  endeavor.due !== null &&
  isWithinNext(endeavor.due, DUE_SOON_WINDOW_SECONDS, now)

/** `isRecent` — created within the last 48 hours. */
export const isRecent = (endeavor: Endeavor, now: Date): boolean =>
  endeavor.createdAt !== null &&
  isWithinLast(endeavor.createdAt, RECENT_WINDOW_SECONDS, now)

/**
 * `isShadowing(_:)` — whether this endeavor already mirrors `capturedEvent`.
 *
 * All three of canon's preconditions must hold or the answer is `false`
 * regardless: this endeavor is a Kro event (hosted by `supabase`), it has
 * shadows to compare, and the captured event carries at least one shadow. A
 * match is on `originalTitle` + `sourceIdentifier` + `source` — note `group`
 * and `kind` are **not** compared, so a reminder moved between lists still
 * matches its existing mirror.
 */
export const isShadowing = (
  endeavor: Endeavor,
  capturedEvent: Endeavor,
): boolean => {
  if (!endeavor.hostedBy.includes(EndeavorHost.supabase)) return false
  const shadows = endeavor.shadows
  if (shadows === null) return false
  const capturedShadow = capturedEvent.shadows?.[0]
  if (capturedShadow === undefined) return false
  return shadows.some(
    (shadow) =>
      shadow.originalTitle === capturedShadow.originalTitle &&
      shadow.sourceIdentifier === capturedShadow.sourceIdentifier &&
      shadow.source === capturedShadow.source,
  )
}

/**
 * `exposesEvent(withCalendarId:)` — whether any shadow references that
 * calendar event id. The shadow's own `kind` must be `calendarEvent`; a task
 * shadow that happens to share an identifier does not count.
 */
export const exposesEvent = (
  endeavor: Endeavor,
  calendarEventId: string,
): boolean =>
  (endeavor.shadows ?? []).some(
    (shadow) =>
      shadow.kind === EndeavorKind.calendarEvent &&
      shadow.sourceIdentifier === calendarEventId,
  )
