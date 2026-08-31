/**
 * The Google Calendar REST v3 client — canon `GoogleCalendar.swift`.
 *
 * **Server-side only.** Every operation takes an access token, so the only
 * caller is a route handler under `apps/web/src/app/api/google/**` where the
 * token is minted from the sealed cookie. The browser's binding is
 * `GoogleCalendarService`, which talks to those routes and has no token at all
 * — that structural split is what makes "tokens never reach the browser" a
 * property of the code rather than a promise (`SEC-5`).
 *
 * ## Zero new dependencies
 *
 * The repo already carries `googleapis`, and the legacy `createEvent` route
 * used it. This client uses plain `fetch` instead, for two reasons the issue
 * names: `googleapis` is Node-only and must never enter `packages/*`, and the
 * four operations below are four URLs and one bearer header — a 20 MB SDK to
 * spell them is cost without benefit. The trade is that pagination, status
 * mapping and parsing are written here; they are written once, and they are
 * tested against a stubbed transport rather than against Google.
 *
 * ## SEC-5, structurally
 *
 * - The access token is **only ever** an `Authorization: Bearer` header. It is
 *   never a query parameter, never part of a path, never interpolated into a
 *   message. `buildEventsUrl` and friends take no token argument at all, so
 *   there is no code path that could put one in a URL.
 * - Nothing in this file logs. Canon's `#if DEBUG print(...)` lines — which
 *   printed calendar names and event counts, and whose route-level equivalents
 *   in this repo printed the whole OAuth token response (removed in KC-PR-#37
 *   at `71c7828`) — are deliberately **not** ported. The stubbed transport is
 *   how a developer sees what was requested.
 * - `validate` maps a status to a typed exception and drops the body. Canon
 *   keeps the body for the message; that body is an error envelope that can
 *   quote the request, and quoting the request is how a token reaches a log.
 */
import {
  GoogleCalendarExceptions,
  googleCalendarExceptionForStatus,
  googleCalendarExceptionFrom,
} from './GoogleCalendarException'
import type { GoogleEventWriteRequest } from './GoogleCalendarMapper'
import {
  type GoogleCalendarEventEnvelope,
  type GoogleCalendarEventResponse,
  type GoogleCalendarListEntryResponse,
  isGoogleRateLimitBody,
  parseGoogleCalendarEvent,
  parseGoogleCalendarEventList,
  parseGoogleCalendarList,
} from './GoogleCalendarResponse'

/** Canon's `GoogleOAuthConfig.calendarAPIBase`. */
export const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'

/** Canon's page size for an events window. */
export const GOOGLE_EVENTS_PAGE_SIZE = 250

/**
 * A guard canon does not have and a serverless function needs: a fetch that
 * pages forever burns the invocation's whole time budget. Twenty pages is
 * 5 000 events in one window — far past any real day, and far short of a
 * runaway.
 */
export const GOOGLE_MAX_PAGES = 20

/**
 * The HTTP surface, injected (`RC-6`, `RC-33`).
 *
 * `headers` rather than a token parameter, so the transport double sees exactly
 * what the wire would and a SEC assertion can prove the token is in a header
 * and nowhere else.
 */
export interface GoogleHttpTransport {
  request(params: {
    readonly url: string
    readonly method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    readonly headers: Readonly<Record<string, string>>
    readonly body?: string
    readonly signal?: AbortSignal
  }): Promise<{ readonly status: number; readonly body: unknown }>
}

/** The live transport. The only `fetch` in this module. */
export const liveGoogleHttpTransport: GoogleHttpTransport = {
  async request({ url, method, headers, body, signal }) {
    const response = await fetch(url, {
      method,
      headers,
      ...(body === undefined ? {} : { body }),
      ...(signal === undefined ? {} : { signal }),
    })
    const text = await response.text()
    let parsed: unknown = null
    try {
      parsed = text.length === 0 ? null : JSON.parse(text)
    } catch {
      parsed = null
    }
    return { status: response.status, body: parsed }
  },
}

/** Canon's `validate(response:body:)`, without the body in the message. */
export const validateGoogleStatus = (status: number, body: unknown): void => {
  if (status >= 200 && status < 300) return
  throw googleCalendarExceptionForStatus(status, isGoogleRateLimitBody(body))
}

/** Canon's `buildEventsURL`. No token — see the module note. */
export const buildEventsUrl = (params: {
  readonly calendarId: string
  readonly from: Date
  readonly to: Date
  readonly pageToken?: string | null
}): string => {
  const url = new URL(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(
      params.calendarId,
    )}/events`,
  )
  url.searchParams.set('timeMin', params.from.toISOString())
  url.searchParams.set('timeMax', params.to.toISOString())
  // `singleEvents=true` expands a recurring series into discrete instances with
  // distinct ids. That is what lets `SourceIdentity` treat each occurrence as
  // its own identity instead of collapsing a week of a standing meeting into
  // one row — canon sets it for the same reason.
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', String(GOOGLE_EVENTS_PAGE_SIZE))
  url.searchParams.set('showDeleted', 'false')
  if (params.pageToken != null && params.pageToken.length > 0) {
    url.searchParams.set('pageToken', params.pageToken)
  }
  return url.toString()
}

export const buildCalendarListUrl = (pageToken?: string | null): string => {
  const url = new URL(`${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList`)
  url.searchParams.set('showHidden', 'false')
  url.searchParams.set('showDeleted', 'false')
  if (pageToken != null && pageToken.length > 0) {
    url.searchParams.set('pageToken', pageToken)
  }
  return url.toString()
}

export const buildEventUrl = (calendarId: string, eventId?: string): string => {
  const base = `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(
    calendarId,
  )}/events`
  return eventId === undefined ? base : `${base}/${encodeURIComponent(eventId)}`
}

export interface GoogleCalendarApiService {
  /** `fetchCalendarList` — every calendar visible to the grant. */
  listCalendars(params: {
    readonly accessToken: string
    readonly signal?: AbortSignal
  }): Promise<readonly GoogleCalendarListEntryResponse[]>

  /**
   * Every event in `[from, to)` across every calendar, paired with the calendar
   * it came from.
   *
   * Canon's per-calendar failure policy is kept: one calendar that errors
   * contributes nothing and does **not** fail the fetch. A shared calendar the
   * grant cannot read must not empty the day.
   */
  listEvents(params: {
    readonly accessToken: string
    readonly from: Date
    readonly to: Date
    readonly calendarIds?: readonly string[]
    readonly signal?: AbortSignal
  }): Promise<readonly GoogleCalendarEventEnvelope[]>

  /**
   * `events.insert` — the session-logging destination.
   *
   * Canon's `updateEvent` / `writeBackEvent` are deliberately **not** ported.
   * They exist to push a Kro edit back to a mirrored Google event, which needs
   * the host attach/detach path in KC-IS-#29's lane to exist first; porting
   * them now would ship two operations nothing calls, which is the objection
   * `AuthService` records for `uploadAvatar`. `buildEventUrl` already takes the
   * event id they need, so adding them is a body and a header.
   */
  createEvent(params: {
    readonly accessToken: string
    readonly calendarId?: string
    readonly request: GoogleEventWriteRequest
    readonly signal?: AbortSignal
  }): Promise<GoogleCalendarEventResponse>
}

/** Google's alias for the account's own calendar. */
export const PRIMARY_CALENDAR_ID = 'primary'

export const makeLiveGoogleCalendarApiService = (
  transport: GoogleHttpTransport = liveGoogleHttpTransport,
): GoogleCalendarApiService => {
  const authorized = (accessToken: string): Record<string, string> => ({
    // The token's ONLY appearance in this module.
    authorization: `Bearer ${accessToken}`,
    accept: 'application/json',
  })

  const listCalendars: GoogleCalendarApiService['listCalendars'] = async ({
    accessToken,
    signal,
  }) => {
    const accumulated: GoogleCalendarListEntryResponse[] = []
    let pageToken: string | null = null
    for (let page = 0; page < GOOGLE_MAX_PAGES; page += 1) {
      const response = await transport
        .request({
          url: buildCalendarListUrl(pageToken),
          method: 'GET',
          headers: authorized(accessToken),
          ...(signal === undefined ? {} : { signal }),
        })
        .catch((error: unknown) => {
          throw googleCalendarExceptionFrom(error)
        })
      validateGoogleStatus(response.status, response.body)
      const parsed = parseGoogleCalendarList(response.body)
      if (parsed === null) {
        throw GoogleCalendarExceptions.malformedResponse('calendar list')
      }
      accumulated.push(...parsed.items)
      pageToken = parsed.nextPageToken ?? null
      if (pageToken === null) break
    }
    return accumulated
  }

  return {
    listCalendars,

    async listEvents({ accessToken, from, to, calendarIds, signal }) {
      if (to.getTime() <= from.getTime()) {
        throw GoogleCalendarExceptions.invalidRequest(
          'A calendar window must end after it starts.',
        )
      }

      const calendars =
        calendarIds === undefined
          ? await listCalendars({
              accessToken,
              ...(signal === undefined ? {} : { signal }),
            })
          : calendarIds.map((id) => ({ id }))

      const envelopes: GoogleCalendarEventEnvelope[] = []
      for (const calendar of calendars) {
        const calendarName =
          'summary' in calendar ? (calendar.summary ?? null) : null
        try {
          let pageToken: string | null = null
          for (let page = 0; page < GOOGLE_MAX_PAGES; page += 1) {
            const response = await transport.request({
              url: buildEventsUrl({
                calendarId: calendar.id,
                from,
                to,
                pageToken,
              }),
              method: 'GET',
              headers: authorized(accessToken),
              ...(signal === undefined ? {} : { signal }),
            })
            validateGoogleStatus(response.status, response.body)
            const parsed = parseGoogleCalendarEventList(response.body)
            if (parsed === null) {
              throw GoogleCalendarExceptions.malformedResponse('event list')
            }
            for (const event of parsed.items) {
              envelopes.push({ event, calendarId: calendar.id, calendarName })
            }
            pageToken = parsed.nextPageToken ?? null
            if (pageToken === null) break
          }
        } catch (error) {
          // Canon's per-calendar `catch`: this calendar contributes nothing.
          // A grant-level failure (401/403) is re-thrown, because it is not
          // about *this* calendar and silently returning an empty day would
          // hide the reconnect condition the banner exists to show.
          const failure = googleCalendarExceptionFrom(error)
          if (
            failure.kind === 'unauthorized' ||
            failure.kind === 'needsReconnect'
          ) {
            throw failure
          }
        }
      }
      return envelopes
    },

    async createEvent({ accessToken, calendarId, request, signal }) {
      const response = await transport
        .request({
          url: buildEventUrl(calendarId ?? PRIMARY_CALENDAR_ID),
          method: 'POST',
          headers: {
            ...authorized(accessToken),
            'content-type': 'application/json',
          },
          body: JSON.stringify(request),
          ...(signal === undefined ? {} : { signal }),
        })
        .catch((error: unknown) => {
          throw googleCalendarExceptionFrom(error)
        })
      validateGoogleStatus(response.status, response.body)
      const created = parseGoogleCalendarEvent(response.body)
      if (created === null) {
        throw GoogleCalendarExceptions.malformedResponse('created event')
      }
      return created
    },
  }
}

/**
 * A transport double backed by a fixture, and a recorder of every request
 * (`RC-33`).
 *
 * The recorded list is the evidence for the SEC proofs: a suite asserts that no
 * recorded `url` contains a token and that the token appears only under
 * `headers.authorization`.
 */
export interface RecordedGoogleRequest {
  readonly url: string
  readonly method: string
  readonly headers: Readonly<Record<string, string>>
  readonly body?: string
}

export interface StubbedGoogleHttpTransportOptions {
  /**
   * `url substring → response`. First match wins; order is declaration order.
   *
   * `method` narrows a route to one verb, which the events path needs: a `GET`
   * on `/events` answers a **list** and a `POST` on the same path answers a
   * **single created event**, and a substring match alone cannot tell them
   * apart.
   */
  readonly routes?: readonly {
    readonly match: string
    readonly method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    readonly status?: number
    readonly body?: unknown
  }[]
  /** Every request made, in order. */
  readonly recorded?: RecordedGoogleRequest[]
  /** Throw a `TypeError` instead of answering — the offline arm. */
  readonly offline?: boolean
}

export const makeStubbedGoogleHttpTransport = (
  options: StubbedGoogleHttpTransportOptions = {},
): GoogleHttpTransport => ({
  async request({ url, method, headers, body }) {
    options.recorded?.push({
      url,
      method,
      headers,
      ...(body === undefined ? {} : { body }),
    })
    if (options.offline === true) throw new TypeError('Failed to fetch')
    for (const route of options.routes ?? []) {
      if (!url.includes(route.match)) continue
      if (route.method !== undefined && route.method !== method) continue
      return { status: route.status ?? 200, body: route.body ?? null }
    }
    return { status: 404, body: { error: { message: 'no stub route' } } }
  },
})
