/**
 * The typed failures the Google Calendar integration can report (`RC-8`).
 *
 * A closed discriminated union plus a factory, so no caller hand-assembles a
 * literal and no `State` ever holds a raw `Error` or a bare `string`. User copy
 * is derived from `kind` here, in the domain tier — never assembled in a view
 * and never read out of `message`, which is developer detail for a log.
 *
 * ## The three cases that are *states*, not errors
 *
 * `unconfigured`, `notConnected` and `needsReconnect` are the integration's
 * ordinary lifecycle expressed as exceptions, because that is how a Producer
 * surfaces them: every operation on a disconnected integration fails, and the
 * surface needs to tell the three apart to know what to offer.
 *
 * - `unconfigured` — this **deployment** has no Google client (`SEC-5`: the
 *   variables are absent). Nothing the user can do; a G5 human step fixes it.
 * - `notConnected` — the deployment is configured but this **user** has not
 *   granted the calendar scope. Offer "Connect".
 * - `needsReconnect` — a grant existed and Google has stopped honouring it: the
 *   refresh token was revoked, expired, or had its scope narrowed. Offer
 *   "Reconnect". This is the state KC-IS-#19's banner consumes.
 *
 * `needsReconnect` is `recoverable: true` and `unconfigured` is not, and that
 * difference is the whole point of the split: only one of them has a button.
 *
 * ## No message ever carries a token
 *
 * `message` is developer detail, so it is the one field a careless caller could
 * stuff a token into. Every factory below builds its own message from a fixed
 * string plus, at most, a status code or a variable **name** — never a response
 * body, never a header, never a URL (`SEC-5`). `toException` upholds the same
 * rule when it translates a caught value.
 */
import { type Exception, assertNever, exception } from '@kro/core'

export type GoogleCalendarException =
  /** No Google client is configured for this deployment. */
  | Exception<'unconfigured'>
  /** Configured, but this user has not granted the calendar scope. */
  | Exception<'notConnected'>
  /** The grant existed and Google no longer honours it — reconnect. */
  | Exception<'needsReconnect'>
  /** Google rejected the access token for a single call (HTTP 401). */
  | Exception<'unauthorized'>
  /** The grant lacks the scope this call needs (HTTP 403). */
  | Exception<'forbidden'>
  /** HTTP 429, or a 403 whose body names a rate-limit reason. */
  | Exception<'rateLimited'>
  /** The event changed elsewhere since it was read (HTTP 412). */
  | Exception<'conflict'>
  /** No such calendar or event (HTTP 404). */
  | Exception<'notFound'>
  /** The request never left the device. */
  | Exception<'offline'>
  /** Google answered, with a 5xx. */
  | Exception<'server'>
  /** Google answered with something this build cannot parse (`SEC-7`). */
  | Exception<'malformedResponse'>
  /** The caller asked for something impossible (an empty range, no fragments). */
  | Exception<'invalidRequest'>
  | Exception<'unknown'>

export const GoogleCalendarExceptions = {
  /**
   * `missing` is a list of variable **names**. It is interpolated into the
   * developer message on purpose — an operator reading a server log needs to
   * know which variable to set — and it is safe precisely because it is names.
   */
  unconfigured: (missing: readonly string[] = []): GoogleCalendarException =>
    exception(
      'unconfigured',
      missing.length === 0
        ? 'Google Calendar is not configured for this deployment.'
        : `Google Calendar is not configured: set ${missing.join(', ')}.`,
      false,
    ),
  notConnected: (): GoogleCalendarException =>
    exception('notConnected', 'Google Calendar is not connected.', true),
  needsReconnect: (
    detail = 'the grant is no longer valid',
  ): GoogleCalendarException =>
    exception(
      'needsReconnect',
      `Google Calendar needs to be reconnected — ${detail}.`,
      true,
    ),
  unauthorized: (): GoogleCalendarException =>
    exception('unauthorized', 'Google rejected the access token.', true),
  forbidden: (): GoogleCalendarException =>
    exception(
      'forbidden',
      'The Google grant does not cover this operation.',
      true,
    ),
  rateLimited: (): GoogleCalendarException =>
    exception('rateLimited', 'Google is rate-limiting this app.', true),
  conflict: (): GoogleCalendarException =>
    exception(
      'conflict',
      'The event changed in Google since it was read.',
      true,
    ),
  notFound: (): GoogleCalendarException =>
    exception('notFound', 'Google has no such calendar or event.', false),
  offline: (): GoogleCalendarException =>
    exception('offline', 'The request never reached Google.', true),
  server: (status: number): GoogleCalendarException =>
    exception('server', `Google answered HTTP ${status}.`, true),
  malformedResponse: (what: string): GoogleCalendarException =>
    exception(
      'malformedResponse',
      `Google returned an unreadable ${what}.`,
      true,
    ),
  invalidRequest: (why: string): GoogleCalendarException =>
    exception('invalidRequest', why, false),
  unknown: (message: string): GoogleCalendarException =>
    exception('unknown', message, true),
}

/** Every `kind` in the union, for exhaustiveness tests and debug surfaces. */
export const googleCalendarExceptionKinds: readonly GoogleCalendarException['kind'][] =
  [
    'unconfigured',
    'notConnected',
    'needsReconnect',
    'unauthorized',
    'forbidden',
    'rateLimited',
    'conflict',
    'notFound',
    'offline',
    'server',
    'malformedResponse',
    'invalidRequest',
    'unknown',
  ]

/**
 * User-facing copy, derived from `kind` (`RC-8`).
 *
 * Closed by `assertNever` (`RC-9`), so adding a case to the union above fails
 * the build here rather than silently falling through to a generic sentence.
 */
export const googleCalendarExceptionCopy = (
  failure: GoogleCalendarException,
): string => {
  switch (failure.kind) {
    case 'unconfigured':
      return 'Google Calendar is not set up for this deployment.'
    case 'notConnected':
      return 'Connect Google Calendar to see your events here.'
    case 'needsReconnect':
      return 'Google Calendar needs reconnecting.'
    case 'unauthorized':
    case 'forbidden':
      return 'Google would not allow that. Reconnecting usually fixes it.'
    case 'rateLimited':
      return 'Google is busy right now. Try again in a minute.'
    case 'conflict':
      return 'That event changed in Google. Reload and try again.'
    case 'notFound':
      return 'That calendar or event no longer exists in Google.'
    case 'offline':
      return 'You appear to be offline.'
    case 'server':
      return 'Google is having trouble. Try again shortly.'
    case 'malformedResponse':
      return 'Google sent something Kro could not read.'
    case 'invalidRequest':
      return 'That request could not be sent to Google.'
    case 'unknown':
      return 'Something went wrong talking to Google.'
    default:
      return assertNever(failure)
  }
}

/** Whether this failure is the one KC-IS-#19's reconnect banner shows. */
export const isGoogleReconnectFailure = (
  failure: GoogleCalendarException,
): boolean => failure.kind === 'needsReconnect'

/**
 * `HTTP status → exception`, the single place the mapping lives.
 *
 * Canon's `GoogleCalendar.validate(response:body:)`, with two additions the web
 * needs: `404` gets its own case (canon folds it into `server`, which would
 * make "this calendar was deleted" retryable), and `400 invalid_grant` on the
 * **token** endpoint is the caller's cue to raise `needsReconnect` — that
 * decision belongs to the refresh path, not here, so this function reports the
 * ordinary `unauthorized` and `GoogleOAuthService` narrows it.
 */
export const googleCalendarExceptionForStatus = (
  status: number,
  rateLimited = false,
): GoogleCalendarException => {
  if (status >= 200 && status < 300) {
    return GoogleCalendarExceptions.unknown(`HTTP ${status} is not a failure.`)
  }
  if (status === 401) return GoogleCalendarExceptions.unauthorized()
  if (status === 403) {
    return rateLimited
      ? GoogleCalendarExceptions.rateLimited()
      : GoogleCalendarExceptions.forbidden()
  }
  if (status === 404) return GoogleCalendarExceptions.notFound()
  if (status === 412) return GoogleCalendarExceptions.conflict()
  if (status === 429) return GoogleCalendarExceptions.rateLimited()
  if (status >= 500) return GoogleCalendarExceptions.server(status)
  return GoogleCalendarExceptions.server(status)
}

/** Whether a caught value already is one of ours. */
export const isGoogleCalendarException = (
  value: unknown,
): value is GoogleCalendarException => {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as { readonly kind?: unknown }
  return (
    typeof candidate.kind === 'string' &&
    (googleCalendarExceptionKinds as readonly string[]).includes(candidate.kind)
  )
}

/**
 * The single translation site (`RC-30`).
 *
 * A `TypeError` is what `fetch` throws when the request never left the device,
 * which is the browser's only signal for "offline". Anything already typed
 * passes through untouched — the Service layer throws these directly, exactly
 * as canon throws `GoogleCalendarError`.
 *
 * The caught value's own text is **not** interpolated when it is an arbitrary
 * object: `String(error)` on a fetch failure or an SDK error can carry a URL,
 * and a URL is one of the two places `SEC-5` forbids a token from appearing.
 * Only `Error.message` — which this code base controls at every throw site —
 * crosses over.
 */
export const googleCalendarExceptionFrom = (
  error: unknown,
): GoogleCalendarException => {
  if (isGoogleCalendarException(error)) return error
  if (error instanceof TypeError) return GoogleCalendarExceptions.offline()
  if (error instanceof Error) {
    return GoogleCalendarExceptions.unknown(error.message)
  }
  return GoogleCalendarExceptions.unknown('Unknown Google Calendar failure.')
}
