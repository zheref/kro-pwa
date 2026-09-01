/**
 * The wire ↔ domain boundary for Google Calendar (`RC-30`, `UZF-17`).
 *
 * Canon: `GoogleCalendarEvent.swift`'s `Endeavor.from(googleEvent:calendarName:)`
 * and `DateTimeField.resolvedDate()`. Every rule below is canon's; the notes say
 * where the web forced a choice canon did not have to make.
 *
 * ## Every Google event becomes a `calendarEvent` endeavor
 *
 * Canon hard-codes `kind: .calendarEvent` on both the endeavor and its shadow,
 * and that is the whole classification story for this provider —
 * `GoogleCalendarRuleset` in `@kro/core` states the same rule as a
 * `ProviderClassificationRuleset` so a *persisted mirror* of one of these rows
 * resolves the same way on a later launch, when the Google row itself is not in
 * the fan-out.
 *
 * ## The event id is the endeavor id
 *
 * Canon uses `event.id` for both the endeavor's `id` and the shadow's
 * `sourceIdentifier`, and `SourceIdentity.identitiesOf` depends on exactly that:
 * a provider-native row claims `(googleCalendar, event.id)` through its host,
 * and a Kro-persisted mirror claims the same pair through its shadow. That is
 * what makes a Kro-hosted copy and the Google row reconcile to one endeavor
 * (`Reconcile.ts` stage 2) instead of appearing twice.
 *
 * Recurring instances are safe because the fetch sets `singleEvents=true`:
 * Google expands a series into instances with distinct ids, and
 * `occurrenceScopedIdentifier` scopes them by start on top of that.
 *
 * ## No token, no body, no URL is reachable from here
 *
 * The Mapper sees a parsed wire object and nothing else. It cannot log a
 * response and cannot build a request (`SEC-5`).
 */
import {
  type Endeavor,
  EndeavorHost,
  EndeavorKind,
  type Shadow,
  eventEndeavor,
  makeShadow,
} from '@kro/core'
import {
  GoogleCalendarExceptions,
  type GoogleCalendarException,
  googleCalendarExceptionFrom,
} from './GoogleCalendarException'
import type {
  GoogleCalendarEventEnvelope,
  GoogleCalendarEventResponse,
  GoogleDateTimeField,
} from './GoogleCalendarResponse'

/** Canon's `"(No title)"` placeholder for an event Google gave no summary. */
export const GOOGLE_EVENT_FALLBACK_TITLE = '(No title)'

/**
 * `DateTimeField.resolvedDate()` — prefer `dateTime`, fall back to `date`.
 *
 * **Canon divergence, deliberate.** Canon parses the `yyyy-MM-dd` all-day form
 * with a `DateFormatter` pinned to `TimeZone.current`, i.e. local midnight.
 * `new Date('2026-08-31')` in JavaScript parses a date-only ISO string as
 * **UTC** midnight, which is a different instant and would put an all-day event
 * on the wrong day for anyone west of Greenwich. The components are therefore
 * split and handed to the `Date(y, m, d)` constructor, which is local-time by
 * definition — canon's behaviour, restored.
 */
export const resolvedGoogleDate = (
  field: GoogleDateTimeField | undefined,
): Date | null => {
  if (field === undefined) return null
  if (field.dateTime !== undefined) {
    const parsed = new Date(field.dateTime)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (field.date === undefined) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(field.date)
  if (match === null) return null
  const [, year, month, day] = match
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    0,
    0,
    0,
    0,
  )
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Canon's `isAllDay` — a `date` start with no `dateTime`. */
export const isAllDayGoogleEvent = (
  event: GoogleCalendarEventResponse,
): boolean =>
  event.start?.date !== undefined && event.start?.dateTime === undefined

/** Canon's `isCancelled`. Cancelled events are dropped before mapping. */
export const isCancelledGoogleEvent = (
  event: GoogleCalendarEventResponse,
): boolean => (event.status ?? '') === 'cancelled'

export const GoogleCalendarMapper = {
  /**
   * `Endeavor.from(googleEvent:calendarName:)`.
   *
   * `null` — never a throw — when the event has no usable start, so the caller
   * surfaces a typed exception or (as canon does, and as the fetch does here)
   * simply drops the row rather than storing a partial endeavor (`RC-30`).
   *
   * Duration follows canon exactly: an all-day event gets **none**, and a
   * non-positive span is discarded rather than stored as `0` — a zero-length
   * block draws nothing on the timeline, and canon's `d > 0 ? d : nil` is what
   * keeps a malformed `end` from creating one.
   */
  toDomain(envelope: GoogleCalendarEventEnvelope): Endeavor | null {
    const { event, calendarName } = envelope
    const start = resolvedGoogleDate(event.start)
    if (start === null) return null

    const end = resolvedGoogleDate(event.end)
    const duration = (() => {
      if (isAllDayGoogleEvent(event) || end === null) return null
      const seconds = (end.getTime() - start.getTime()) / 1000
      return seconds > 0 ? seconds : null
    })()

    const title = event.summary ?? GOOGLE_EVENT_FALLBACK_TITLE

    return eventEndeavor({
      id: event.id,
      title,
      start,
      duration,
      host: EndeavorHost.googleCalendar,
      shadow: GoogleCalendarMapper.shadowFor(event, calendarName),
    })
  },

  /**
   * The `Shadow` canon attaches to a mapped event.
   *
   * `group` is the calendar's display name — the value the lens's
   * hidden-calendars control matches on, and the reason the envelope carries a
   * calendar at all.
   *
   * `appleReminderPriority` stays `null`: Google Calendar has no priority
   * concept. That is not an omission but the evidence gate — `ProviderEvidence`
   * reads the field as *the provider's priority evidence*, and `null` there
   * means "this provider supplies none", which is exactly true.
   */
  shadowFor(
    event: GoogleCalendarEventResponse,
    calendarName: string | null,
  ): Shadow {
    return makeShadow({
      originalTitle: event.summary ?? GOOGLE_EVENT_FALLBACK_TITLE,
      sourceIdentifier: event.id,
      kind: EndeavorKind.calendarEvent,
      source: EndeavorHost.googleCalendar,
      group: calendarName,
    })
  },

  /**
   * Every mappable event in a fetch, cancelled ones dropped.
   *
   * Canon filters `!isCancelled` then `compactMap`s — a cancelled event is a
   * tombstone Google keeps in the range, not an event, and mapping it would put
   * a deleted meeting on the day.
   */
  toDomainAll(
    envelopes: readonly GoogleCalendarEventEnvelope[],
  ): readonly Endeavor[] {
    const endeavors: Endeavor[] = []
    for (const envelope of envelopes) {
      if (isCancelledGoogleEvent(envelope.event)) continue
      const mapped = GoogleCalendarMapper.toDomain(envelope)
      if (mapped !== null) endeavors.push(mapped)
    }
    return endeavors
  },

  /** The single caught-value translation site (`RC-30`). */
  toException(error: unknown): GoogleCalendarException {
    return googleCalendarExceptionFrom(error)
  },
}

/**
 * The write direction — an `events.insert` / `events.patch` body.
 *
 * Kept as its own exported shape rather than an inline object literal because
 * two callers build one (session logging and host attach) and both must produce
 * the same thing, and because it is what the route handler validates before it
 * ever reaches Google.
 */
export interface GoogleEventWriteRequest {
  readonly summary: string
  readonly start: GoogleDateTimeField
  readonly end: GoogleDateTimeField
  readonly description?: string
}

/**
 * `RFC 3339`, seconds precision — canon's
 * `ISO8601DateFormatter.googleCalendar` (`withInternetDateTime`, no fractional
 * seconds).
 *
 * `toISOString()` emits milliseconds, which Google accepts but which makes a
 * request body differ from canon's byte for byte and makes a fixture assertion
 * read badly. Trimming to seconds keeps the two adapters comparable.
 */
export const googleRfc3339 = (instant: Date): string =>
  `${instant.toISOString().slice(0, 19)}Z`

/**
 * Build a timed-event write request.
 *
 * The time zone travels **beside** the instant rather than being baked into it:
 * an RFC 3339 `Z` timestamp is unambiguous, and Google uses the accompanying
 * `timeZone` for how the event is *displayed* and how a later recurrence
 * expands. Canon sends both for the same reason.
 *
 * Fails — as a typed exception, not a throw — when the span is not positive.
 * Google rejects `end <= start` with a 400, and finding that out from a remote
 * 400 rather than from the caller's own arguments is strictly worse.
 */
export const googleTimedEventRequest = (params: {
  readonly summary: string
  readonly start: Date
  readonly end: Date
  readonly timeZone: string
  readonly description?: string
}):
  | { readonly ok: true; readonly request: GoogleEventWriteRequest }
  | { readonly ok: false; readonly error: GoogleCalendarException } => {
  if (params.summary.trim().length === 0) {
    return {
      ok: false,
      error: GoogleCalendarExceptions.invalidRequest(
        'A calendar event needs a title.',
      ),
    }
  }
  if (
    Number.isNaN(params.start.getTime()) ||
    Number.isNaN(params.end.getTime())
  ) {
    return {
      ok: false,
      error: GoogleCalendarExceptions.invalidRequest(
        'A calendar event needs a valid start and end.',
      ),
    }
  }
  if (params.end.getTime() <= params.start.getTime()) {
    return {
      ok: false,
      error: GoogleCalendarExceptions.invalidRequest(
        'A calendar event must end after it starts.',
      ),
    }
  }
  return {
    ok: true,
    request: {
      summary: params.summary,
      start: {
        dateTime: googleRfc3339(params.start),
        timeZone: params.timeZone,
      },
      end: { dateTime: googleRfc3339(params.end), timeZone: params.timeZone },
      ...(params.description === undefined
        ? {}
        : { description: params.description }),
    },
  }
}

/**
 * Validate an untrusted write request arriving over HTTP (`SEC-7`).
 *
 * The `/api/google/createEvent` route accepts JSON from the browser and must
 * not forward whatever it was handed: an unchecked body could set arbitrary
 * Google fields (attendees, conference data, a different organiser). Narrowing
 * to the four fields above is the allow-list.
 */
export const parseGoogleEventWriteRequest = (
  value: unknown,
): GoogleEventWriteRequest | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }
  const candidate = value as Record<string, unknown>
  const summary = candidate.summary
  if (typeof summary !== 'string' || summary.trim().length === 0) return null

  const readField = (field: unknown): GoogleDateTimeField | null => {
    if (typeof field !== 'object' || field === null) return null
    const record = field as Record<string, unknown>
    const dateTime =
      typeof record.dateTime === 'string' ? record.dateTime : undefined
    const date = typeof record.date === 'string' ? record.date : undefined
    if (dateTime === undefined && date === undefined) return null
    const timeZone =
      typeof record.timeZone === 'string' ? record.timeZone : undefined
    return {
      ...(dateTime === undefined ? {} : { dateTime }),
      ...(date === undefined ? {} : { date }),
      ...(timeZone === undefined ? {} : { timeZone }),
    }
  }

  const start = readField(candidate.start)
  const end = readField(candidate.end)
  if (start === null || end === null) return null

  const description =
    typeof candidate.description === 'string'
      ? candidate.description
      : undefined

  return {
    summary,
    start,
    end,
    ...(description === undefined ? {} : { description }),
  }
}
