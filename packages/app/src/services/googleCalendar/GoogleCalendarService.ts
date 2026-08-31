/**
 * `GoogleCalendarService` — the **browser's** binding, and the one registered in
 * `ThunkExtra` (`RC-21`, `RC-33`, `RC-59`).
 *
 * ## It talks to Kro, not to Google
 *
 * This is the load-bearing design decision of the whole integration. The live
 * binding calls **this app's own** `/api/google/*` routes; only those routes
 * hold a token and only they reach `googleapis.com`. Consequences, all of them
 * deliberate:
 *
 * - **No token can leak to the browser, because none is ever sent there**
 *   (`SEC-5`). Not "we are careful not to log it" — the client tier has no
 *   token to log, no `Authorization` header to build, and no Google URL to
 *   build. The SEC proofs in `__tests__` assert exactly that against the
 *   recorded transport.
 * - The client tier stays free of `googleapis` and of every Node-only API, so
 *   `packages/app` remains bundleable for the browser (issue constraint).
 * - The refresh dance — expiry, `invalid_grant`, re-mint — happens server-side
 *   where the refresh token lives, so the client never has to model it. It sees
 *   one of four connection states and nothing more.
 *
 * ## The operations throw; they do not return `Result`
 *
 * `RC-33` puts the `Result` boundary in the Producer. Where this Service *knows*
 * the answer — the proxy answered 401, the body did not parse — it throws the
 * typed `GoogleCalendarException` directly, exactly as canon throws
 * `GoogleCalendarError`, and `GoogleCalendarMapper.toException` passes those
 * through untouched.
 *
 * ## `fetchRange` is deliberately `PlanHost`-shaped
 *
 * KC-IS-#18 defines `PlanHost` as `{ id, fetchRange(range, options) }` and says
 * *"#33 adds a second `PlanHost` and nothing in the feature changes"*. It also
 * says a feature file may not import a Service module — `check-uzf-boundaries`
 * enforces it. So the adapter is built at the composition root
 * (`library/store.ts`, the one file exempt from that rule) and arrives in
 * `ThunkExtra` already adapted; `planHostsFor` gains one line and imports
 * nothing new. See `GoogleCalendarPlanHost.ts`.
 */
import type { Endeavor } from '@kro/core'
import {
  type GoogleCalendarConnection,
  GoogleCalendarConnections,
  parseGoogleCalendarConnection,
} from './GoogleCalendarConnection'
import {
  GoogleCalendarExceptions,
  googleCalendarExceptionForStatus,
  googleCalendarExceptionFrom,
} from './GoogleCalendarException'
import { GoogleCalendarMapper } from './GoogleCalendarMapper'
import {
  type GoogleCalendarEventEnvelope,
  type GoogleCalendarSummary,
  parseGoogleCalendarEventsPayload,
  parseGoogleCalendarListPayload,
} from './GoogleCalendarResponse'
import type { SessionCalendarLogInput } from './GoogleCalendarSessionEvent'
import fixtures from './google.fixtures.json'

/** The routes this service speaks to. One place, so a rename is one edit. */
export const googleApiPaths = {
  connect: '/api/google/connect',
  callback: '/api/google/callback',
  status: '/api/google/status',
  events: '/api/google/events',
  calendars: '/api/google/calendars',
  createEvent: '/api/google/createEvent',
  disconnect: '/api/google/disconnect',
} as const

/** The half-open window a range fetch asks for. Mirrors `PlanHostRange`. */
export interface GoogleCalendarRange {
  readonly start: Date
  readonly end: Date
}

export interface GoogleCalendarService {
  /** The state KC-IS-#19's banner and the Settings surface read. */
  connection(options?: {
    readonly signal?: AbortSignal
  }): Promise<GoogleCalendarConnection>

  /**
   * Every Google event overlapping `[start, end)`, already mapped to domain.
   *
   * Returns `[]` — never throws — when the integration is `unconfigured` or
   * `disconnected`: those are ordinary states of a day with no Google events,
   * and a Plan preload that failed because Google is not set up would be a
   * failure the user cannot act on. `needsReconnect` **does** throw, because
   * that one has an action behind it.
   */
  fetchRange(
    range: GoogleCalendarRange,
    options?: { readonly signal?: AbortSignal },
  ): Promise<readonly Endeavor[]>

  /** The lens's hidden-calendars inventory. */
  listCalendars(options?: {
    readonly signal?: AbortSignal
  }): Promise<readonly GoogleCalendarSummary[]>

  /**
   * Log a concluded focus session — canon's `SessionSummary.asEKEvent`
   * destination. Answers the event Google created, so a caller can record its
   * id.
   */
  logSession(
    input: SessionCalendarLogInput,
    options?: { readonly signal?: AbortSignal },
  ): Promise<GoogleCalendarEventEnvelope>

  /** Revoke the grant and clear the stored credential. */
  disconnect(options?: { readonly signal?: AbortSignal }): Promise<void>

  /** Where to send the browser to start (or repeat) authorization. */
  authorizationPath(): string
}

/**
 * The JSON surface, injected (`RC-6`, `RC-33`).
 *
 * Narrower than `fetch`, for the same reason `GoogleFormTransport` is: a test
 * double implements two methods and cannot accidentally reach the network.
 */
export interface KroApiTransport {
  get(
    path: string,
    options?: { readonly signal?: AbortSignal },
  ): Promise<{ readonly status: number; readonly body: unknown }>
  post(
    path: string,
    body: unknown,
    options?: { readonly signal?: AbortSignal },
  ): Promise<{ readonly status: number; readonly body: unknown }>
}

/**
 * The live transport — same-origin `fetch`, the only one in this module.
 *
 * `credentials: 'same-origin'` is explicit rather than relied upon: the
 * connection cookie is `HttpOnly` and the whole flow depends on it riding
 * along, and a future change to the app's default fetch behaviour must not
 * silently break the integration.
 */
export const liveKroApiTransport: KroApiTransport = {
  async get(path, options) {
    const response = await fetch(path, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    })
    return { status: response.status, body: await readJson(response) }
  },
  async post(path, body, options) {
    const response = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    })
    return { status: response.status, body: await readJson(response) }
  },
}

/** Read a body without throwing on an empty or non-JSON answer. */
const readJson = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  if (text.length === 0) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * The failure a proxy response implies.
 *
 * The routes answer with `{ error: { kind, message, recoverable } }` — this
 * app's own exception shape — so a server-side `needsReconnect` arrives at the
 * client as `needsReconnect` rather than as an anonymous 401 the client would
 * have to guess about. An unrecognised body falls back to the status mapping.
 */
export const proxyFailureFrom = (status: number, body: unknown) => {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const error = (body as { readonly error: unknown }).error
    const parsed = googleCalendarExceptionFrom(error)
    if (parsed.kind !== 'unknown') return parsed
  }
  return googleCalendarExceptionForStatus(status)
}

export interface LiveGoogleCalendarServiceOptions {
  readonly transport?: KroApiTransport
}

export const makeLiveGoogleCalendarService = (
  options: LiveGoogleCalendarServiceOptions = {},
): GoogleCalendarService => {
  const transport = options.transport ?? liveKroApiTransport

  const connection: GoogleCalendarService['connection'] = async (opts) => {
    const response = await transport
      .get(googleApiPaths.status, opts)
      .catch((error: unknown) => {
        throw googleCalendarExceptionFrom(error)
      })
    if (response.status < 200 || response.status >= 300) {
      throw proxyFailureFrom(response.status, response.body)
    }
    const parsed = parseGoogleCalendarConnection(response.body)
    if (parsed === null) {
      throw GoogleCalendarExceptions.malformedResponse('connection status')
    }
    return parsed
  }

  return {
    connection,

    async fetchRange(range, opts) {
      if (range.end.getTime() <= range.start.getTime()) return []
      const path = `${googleApiPaths.events}?from=${encodeURIComponent(
        range.start.toISOString(),
      )}&to=${encodeURIComponent(range.end.toISOString())}`

      const response = await transport.get(path, opts).catch((error: unknown) => {
        throw googleCalendarExceptionFrom(error)
      })

      if (response.status < 200 || response.status >= 300) {
        const failure = proxyFailureFrom(response.status, response.body)
        // "Not set up" and "not connected" are states of an empty day, not
        // failures the user can act on from the timeline. `needsReconnect` is
        // the one that has a button behind it, so it alone propagates.
        if (failure.kind === 'unconfigured' || failure.kind === 'notConnected') {
          return []
        }
        throw failure
      }

      const payload = parseGoogleCalendarEventsPayload(response.body)
      if (payload === null) {
        throw GoogleCalendarExceptions.malformedResponse('event list')
      }
      return GoogleCalendarMapper.toDomainAll(payload.events)
    },

    async listCalendars(opts) {
      const response = await transport
        .get(googleApiPaths.calendars, opts)
        .catch((error: unknown) => {
          throw googleCalendarExceptionFrom(error)
        })
      if (response.status < 200 || response.status >= 300) {
        const failure = proxyFailureFrom(response.status, response.body)
        if (failure.kind === 'unconfigured' || failure.kind === 'notConnected') {
          return []
        }
        throw failure
      }
      const payload = parseGoogleCalendarListPayload(response.body)
      if (payload === null) {
        throw GoogleCalendarExceptions.malformedResponse('calendar list')
      }
      return payload.calendars
    },

    async logSession(input, opts) {
      const response = await transport
        .post(
          googleApiPaths.createEvent,
          {
            intention: input.intention,
            start: input.start.toISOString(),
            end: input.end.toISOString(),
            timeZone: input.timeZone,
          },
          opts,
        )
        .catch((error: unknown) => {
          throw googleCalendarExceptionFrom(error)
        })
      if (response.status < 200 || response.status >= 300) {
        throw proxyFailureFrom(response.status, response.body)
      }
      const payload = parseGoogleCalendarEventsPayload(response.body)
      const created = payload?.events[0]
      if (created === undefined) {
        throw GoogleCalendarExceptions.malformedResponse('created event')
      }
      return created
    },

    async disconnect(opts) {
      const response = await transport
        .post(googleApiPaths.disconnect, {}, opts)
        .catch((error: unknown) => {
          throw googleCalendarExceptionFrom(error)
        })
      if (response.status < 200 || response.status >= 300) {
        throw proxyFailureFrom(response.status, response.body)
      }
    },

    authorizationPath: () => googleApiPaths.connect,
  }
}

// ---------------------------------------------------------------------------
// Stubbed (RC-33)
// ---------------------------------------------------------------------------

const fixtureEnvelopes = (): readonly GoogleCalendarEventEnvelope[] =>
  parseGoogleCalendarEventsPayload(fixtures.events)?.events ?? []

const fixtureCalendars = (): readonly GoogleCalendarSummary[] =>
  parseGoogleCalendarListPayload(fixtures.calendars)?.calendars ?? []

export interface StubbedGoogleCalendarServiceOptions {
  readonly connection?: GoogleCalendarConnection
  /** Overrides the fixture set. */
  readonly envelopes?: readonly GoogleCalendarEventEnvelope[]
  readonly calendars?: readonly GoogleCalendarSummary[]
  /** Thrown by every operation that reaches the network. */
  readonly failure?: unknown
  /** Every call, in order — what a Producer test asserts on. */
  readonly calls?: string[]
}

export const makeStubbedGoogleCalendarService = (
  options: StubbedGoogleCalendarServiceOptions = {},
): GoogleCalendarService => {
  const connection = options.connection ?? GoogleCalendarConnections.disconnected()
  const record = (call: string) => options.calls?.push(call)
  const raise = () => {
    if (options.failure !== undefined) throw options.failure
  }

  return {
    async connection() {
      record('connection')
      raise()
      return connection
    },

    async fetchRange(range) {
      record(`fetchRange:${range.start.toISOString()}..${range.end.toISOString()}`)
      raise()
      if (connection.kind !== 'connected') {
        if (connection.kind === 'needsReconnect') {
          throw GoogleCalendarExceptions.needsReconnect()
        }
        return []
      }
      const envelopes = options.envelopes ?? fixtureEnvelopes()
      return GoogleCalendarMapper.toDomainAll(envelopes).filter((endeavor) => {
        const start = endeavor.start
        if (start === null) return false
        const end = new Date(start.getTime() + (endeavor.duration ?? 0) * 1000)
        return (
          end.getTime() >= range.start.getTime() &&
          start.getTime() < range.end.getTime()
        )
      })
    },

    async listCalendars() {
      record('listCalendars')
      raise()
      if (connection.kind !== 'connected') return []
      return options.calendars ?? fixtureCalendars()
    },

    async logSession(input) {
      record(`logSession:${input.intention}`)
      raise()
      if (connection.kind !== 'connected') {
        throw GoogleCalendarExceptions.notConnected()
      }
      const created = fixtureEnvelopes()[0]
      if (created === undefined) {
        throw GoogleCalendarExceptions.malformedResponse('created event')
      }
      return created
    },

    async disconnect() {
      record('disconnect')
      raise()
    },

    authorizationPath: () => googleApiPaths.connect,
  }
}

/**
 * The default double: **disconnected**, so a suite that asserts on shipping
 * behaviour gets shipping behaviour — no Google events on the day, exactly like
 * a user who has never connected. A suite that wants events builds its own with
 * `makeStubbedGoogleCalendarService({ connection: …connected() })`, so no two
 * suites can see each other's fixtures through a shared instance.
 */
export const stubbedGoogleCalendarService: GoogleCalendarService =
  makeStubbedGoogleCalendarService()
