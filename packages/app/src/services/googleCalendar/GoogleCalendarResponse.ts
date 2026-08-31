/**
 * The **wire** shapes of Google Calendar API v3, and the parsers that get an
 * `unknown` JSON body safely into them (`RC-29`, `SEC-7`).
 *
 * Field names mirror Google's payload exactly — `dateTime`, `nextPageToken`,
 * `access_token` — and are never renamed to read idiomatically. Renaming is the
 * Mapper's job (`GoogleCalendarMapper`), and doing it in the type is how a wire
 * concern quietly becomes a domain concern (`RC-29`'s forbidden list).
 *
 * ## Why hand-written parsers rather than a cast
 *
 * `SEC-7` requires a typed boundary: nothing crosses from the network into the
 * app as `as GoogleCalendarEventResponse`. A cast is a promise the compiler
 * cannot keep — Google returns `items: []` for an empty calendar, omits
 * `summary` on some event kinds, and a proxy or captive portal can return HTML
 * with a 200. Each parser below therefore *narrows* rather than asserts, and
 * answers `null` on anything it does not recognise so the caller raises
 * `malformedResponse` instead of storing a half-decoded object.
 *
 * The parsers are total and pure: no throw, no clock, no I/O. They are also the
 * one place a response body is inspected at all, which matters for `SEC-5` —
 * no other file needs to hold a raw body, so no other file can log one.
 *
 * ## `GoogleCalendarEventEnvelope` — the one shape this repo adds
 *
 * Google's `/events` response says nothing about which calendar produced it,
 * but canon's mapper needs the calendar's display name for the shadow's
 * `group`, and Kro's lens hides events *per calendar*. So a fetched event
 * travels paired with its calendar. The envelope is also exactly what the
 * `/api/google/events` route returns to the browser, which is why it lives here
 * with the wire types rather than in the Mapper: it is a transport shape, and
 * the browser maps it to domain with the same `toDomain` the server would.
 */

/** Either a wall-clock `dateTime` or an all-day `date` — Google's schema. */
export interface GoogleDateTimeField {
  /** RFC 3339 timestamp; present for timed events. */
  readonly dateTime?: string
  /** IANA zone name; may be absent even on a timed event. */
  readonly timeZone?: string
  /** `yyyy-MM-dd`; present for all-day events. */
  readonly date?: string
}

/** One event, as `events.list` / `events.insert` return it. */
export interface GoogleCalendarEventResponse {
  readonly id: string
  /** Per-event version token, sent back as `If-Match` on a write. */
  readonly etag?: string
  readonly summary?: string
  readonly location?: string
  /** `"confirmed"` | `"tentative"` | `"cancelled"`. */
  readonly status?: string
  readonly start?: GoogleDateTimeField
  readonly end?: GoogleDateTimeField
  readonly colorId?: string
  /** RFC 5545 `RRULE` strings. Absent when `singleEvents=true` expanded them. */
  readonly recurrence?: readonly string[]
}

export interface GoogleCalendarEventListResponse {
  readonly items: readonly GoogleCalendarEventResponse[]
  readonly nextPageToken?: string
}

/** One entry of `/users/me/calendarList`. */
export interface GoogleCalendarListEntryResponse {
  readonly id: string
  readonly summary?: string
  readonly primary?: boolean
  readonly selected?: boolean
}

export interface GoogleCalendarListResponse {
  readonly items: readonly GoogleCalendarListEntryResponse[]
  readonly nextPageToken?: string
}

/** The OAuth token endpoint's body. Never leaves the server (`SEC-5`). */
export interface GoogleTokenResponse {
  readonly access_token: string
  readonly refresh_token?: string
  readonly expires_in?: number
  readonly scope?: string
  readonly token_type?: string
}

/** An event paired with the calendar it came from. See the module note. */
export interface GoogleCalendarEventEnvelope {
  readonly event: GoogleCalendarEventResponse
  readonly calendarId: string
  /** The calendar's display name, or `null` when Google gave none. */
  readonly calendarName: string | null
}

/** What `/api/google/events` answers with. */
export interface GoogleCalendarEventsPayload {
  readonly events: readonly GoogleCalendarEventEnvelope[]
}

/** One calendar, flattened for the lens's hidden-calendars control. */
export interface GoogleCalendarSummary {
  readonly id: string
  readonly name: string
  readonly isPrimary: boolean
  /** Whether the user has this calendar selected in Google's own UI. */
  readonly isSelected: boolean
}

/** What `/api/google/calendars` answers with. */
export interface GoogleCalendarListPayload {
  readonly calendars: readonly GoogleCalendarSummary[]
}

// ---------------------------------------------------------------------------
// Parsers — the SEC-7 boundary
// ---------------------------------------------------------------------------

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const optionalBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined

/**
 * A `DateTimeField`, or `undefined`.
 *
 * An object with neither `dateTime` nor `date` is dropped rather than kept as
 * an empty field: `resolvedDate` would answer `null` for it anyway, and keeping
 * it would make "Google sent a start" and "Google sent a usable start" two
 * different questions at every call site.
 */
export const parseGoogleDateTimeField = (
  value: unknown,
): GoogleDateTimeField | undefined => {
  if (!isRecord(value)) return undefined
  const dateTime = optionalString(value.dateTime)
  const date = optionalString(value.date)
  if (dateTime === undefined && date === undefined) return undefined
  const timeZone = optionalString(value.timeZone)
  return {
    ...(dateTime === undefined ? {} : { dateTime }),
    ...(date === undefined ? {} : { date }),
    ...(timeZone === undefined ? {} : { timeZone }),
  }
}

/**
 * One event, or `null` when it has no usable `id`.
 *
 * `id` is the only required field: it is the source identifier every downstream
 * identity rule keys on (`SourceIdentity`), so an event without one cannot be
 * reconciled and must not be invented. Everything else is genuinely optional in
 * Google's schema and is simply absent here when absent there.
 */
export const parseGoogleCalendarEvent = (
  value: unknown,
): GoogleCalendarEventResponse | null => {
  if (!isRecord(value)) return null
  const id = optionalString(value.id)
  if (id === undefined || id.length === 0) return null

  const recurrence = Array.isArray(value.recurrence)
    ? value.recurrence.filter(
        (entry): entry is string => typeof entry === 'string',
      )
    : undefined

  const etag = optionalString(value.etag)
  const summary = optionalString(value.summary)
  const location = optionalString(value.location)
  const status = optionalString(value.status)
  const colorId = optionalString(value.colorId)
  const start = parseGoogleDateTimeField(value.start)
  const end = parseGoogleDateTimeField(value.end)

  return {
    id,
    ...(etag === undefined ? {} : { etag }),
    ...(summary === undefined ? {} : { summary }),
    ...(location === undefined ? {} : { location }),
    ...(status === undefined ? {} : { status }),
    ...(colorId === undefined ? {} : { colorId }),
    ...(start === undefined ? {} : { start }),
    ...(end === undefined ? {} : { end }),
    ...(recurrence === undefined ? {} : { recurrence }),
  }
}

/**
 * One page of events, or `null` when the body is not a page at all.
 *
 * A body with an `items` array survives even if some of its entries do not:
 * canon's fetch does the same (`compactMap`), and the reason is the one
 * `endeavorsFromRecords` gives — one unreadable row must not empty the day.
 * A body with **no** `items` key is a different thing entirely (an error
 * envelope, an HTML login page) and is rejected.
 */
export const parseGoogleCalendarEventList = (
  value: unknown,
): GoogleCalendarEventListResponse | null => {
  if (!isRecord(value)) return null
  if (!Array.isArray(value.items)) return null
  const items: GoogleCalendarEventResponse[] = []
  for (const entry of value.items) {
    const parsed = parseGoogleCalendarEvent(entry)
    if (parsed !== null) items.push(parsed)
  }
  const nextPageToken = optionalString(value.nextPageToken)
  return {
    items,
    ...(nextPageToken === undefined ? {} : { nextPageToken }),
  }
}

export const parseGoogleCalendarListEntry = (
  value: unknown,
): GoogleCalendarListEntryResponse | null => {
  if (!isRecord(value)) return null
  const id = optionalString(value.id)
  if (id === undefined || id.length === 0) return null
  const summary = optionalString(value.summary)
  const primary = optionalBoolean(value.primary)
  const selected = optionalBoolean(value.selected)
  return {
    id,
    ...(summary === undefined ? {} : { summary }),
    ...(primary === undefined ? {} : { primary }),
    ...(selected === undefined ? {} : { selected }),
  }
}

export const parseGoogleCalendarList = (
  value: unknown,
): GoogleCalendarListResponse | null => {
  if (!isRecord(value)) return null
  if (!Array.isArray(value.items)) return null
  const items: GoogleCalendarListEntryResponse[] = []
  for (const entry of value.items) {
    const parsed = parseGoogleCalendarListEntry(entry)
    if (parsed !== null) items.push(parsed)
  }
  const nextPageToken = optionalString(value.nextPageToken)
  return {
    items,
    ...(nextPageToken === undefined ? {} : { nextPageToken }),
  }
}

/**
 * The token endpoint's body, or `null`.
 *
 * `access_token` is required because a token response without one is not a
 * grant. `expires_in` is coerced only from a finite number — Google sends an
 * integer, and accepting a string here would let `"3600"` become `NaN` seconds
 * downstream and mark a fresh token permanently expired.
 */
export const parseGoogleTokenResponse = (
  value: unknown,
): GoogleTokenResponse | null => {
  if (!isRecord(value)) return null
  const accessToken = optionalString(value.access_token)
  if (accessToken === undefined || accessToken.length === 0) return null
  const refreshToken = optionalString(value.refresh_token)
  const scope = optionalString(value.scope)
  const tokenType = optionalString(value.token_type)
  const expiresIn =
    typeof value.expires_in === 'number' && Number.isFinite(value.expires_in)
      ? value.expires_in
      : undefined
  return {
    access_token: accessToken,
    ...(refreshToken === undefined ? {} : { refresh_token: refreshToken }),
    ...(expiresIn === undefined ? {} : { expires_in: expiresIn }),
    ...(scope === undefined ? {} : { scope }),
    ...(tokenType === undefined ? {} : { token_type: tokenType }),
  }
}

/** One envelope, or `null`. Used by the browser to read the proxy's answer. */
export const parseGoogleCalendarEventEnvelope = (
  value: unknown,
): GoogleCalendarEventEnvelope | null => {
  if (!isRecord(value)) return null
  const event = parseGoogleCalendarEvent(value.event)
  if (event === null) return null
  const calendarId = optionalString(value.calendarId)
  if (calendarId === undefined) return null
  const calendarName = optionalString(value.calendarName)
  return { event, calendarId, calendarName: calendarName ?? null }
}

export const parseGoogleCalendarEventsPayload = (
  value: unknown,
): GoogleCalendarEventsPayload | null => {
  if (!isRecord(value)) return null
  if (!Array.isArray(value.events)) return null
  const events: GoogleCalendarEventEnvelope[] = []
  for (const entry of value.events) {
    const parsed = parseGoogleCalendarEventEnvelope(entry)
    if (parsed !== null) events.push(parsed)
  }
  return { events }
}

/** `calendarList` entries flattened for the lens. */
export const googleCalendarSummariesFrom = (
  entries: readonly GoogleCalendarListEntryResponse[],
): readonly GoogleCalendarSummary[] =>
  entries.map((entry) => ({
    id: entry.id,
    name: entry.summary ?? entry.id,
    isPrimary: entry.primary === true,
    // Google omits `selected` on a calendar the user has selected by default;
    // treating "absent" as selected matches what the Google UI shows, and the
    // conservative direction is to show an event rather than silently hide it.
    isSelected: entry.selected !== false,
  }))

export const parseGoogleCalendarSummary = (
  value: unknown,
): GoogleCalendarSummary | null => {
  if (!isRecord(value)) return null
  const id = optionalString(value.id)
  if (id === undefined || id.length === 0) return null
  const name = optionalString(value.name)
  return {
    id,
    name: name ?? id,
    isPrimary: value.isPrimary === true,
    isSelected: value.isSelected !== false,
  }
}

export const parseGoogleCalendarListPayload = (
  value: unknown,
): GoogleCalendarListPayload | null => {
  if (!isRecord(value)) return null
  if (!Array.isArray(value.calendars)) return null
  const calendars: GoogleCalendarSummary[] = []
  for (const entry of value.calendars) {
    const parsed = parseGoogleCalendarSummary(entry)
    if (parsed !== null) calendars.push(parsed)
  }
  return { calendars }
}

/**
 * Whether an error body names a rate-limit reason — canon's
 * `isRateLimitedBody`. Google sends `rateLimitExceeded` and
 * `userRateLimitExceeded` under a `403`, which otherwise means "forbidden".
 */
export const isGoogleRateLimitBody = (value: unknown): boolean => {
  if (!isRecord(value)) return false
  const envelope = value.error
  if (!isRecord(envelope)) return false
  const errors = envelope.errors
  if (!Array.isArray(errors)) return false
  return errors.some((entry) => {
    if (!isRecord(entry)) return false
    const reason = optionalString(entry.reason)
    return reason !== undefined && reason.toLowerCase().endsWith('ratelimitexceeded')
  })
}

/**
 * The OAuth error code in a token-endpoint failure body, or `null`.
 *
 * `invalid_grant` is the one that matters: it is Google's answer when a refresh
 * token has been revoked, expired, or had its consent withdrawn — i.e. exactly
 * the `needsReconnect` condition, and the only way to tell it apart from an
 * ordinary bad request.
 */
export const googleOAuthErrorCode = (value: unknown): string | null => {
  if (!isRecord(value)) return null
  const code = optionalString(value.error)
  return code ?? null
}
