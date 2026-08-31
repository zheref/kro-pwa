/**
 * The integration's connection state — **one discriminated field**, never a
 * `isConnected` boolean beside a `needsReconnect` boolean (`RC-24`, `UZF-9`).
 *
 * The pair could represent "connected and needing reconnection at once", which
 * is precisely the state the reconnect banner must never be asked to render.
 *
 * ## The four states, and who acts on each
 *
 * | State | Means | The surface offers |
 * |---|---|---|
 * | `unconfigured` | This deployment has no Google client at all. | Nothing. A G5 human step (Google Cloud + env) fixes it. |
 * | `disconnected` | Configured; this user has never granted the calendar scope. | **Connect** |
 * | `connected` | A refresh token exists and Google is honouring it. | Disconnect, calendar visibility |
 * | `needsReconnect` | A grant existed and Google has stopped honouring it. | **Reconnect** — this is KC-IS-#19's banner |
 *
 * `unconfigured` is deliberately distinct from `disconnected`. Collapsing them
 * would show a Connect button on a deployment where connecting cannot possibly
 * work, which is the worst of the four outcomes: the user tries, Google returns
 * an opaque OAuth error, and nothing in the product explains why.
 *
 * ## Why `needsReconnect` carries a reason
 *
 * Google answers `invalid_grant` for three different situations — the user
 * revoked access in their Google account, the refresh token expired (a testing
 * client's tokens expire in seven days), and the consented scope no longer
 * covers what Kro asks for. The recovery is the same (`Reconnect`), so it is
 * one state; but the *explanation* differs, and canon's own integration doc
 * distinguishes them, so the reason travels along for the banner's copy and
 * for a support log. It is a closed union, not free text — a reason string
 * assembled from a response body would be the one place a token could ride
 * into the UI (`SEC-5`).
 *
 * Today the server emits only `revoked` and `scopeChanged`: Google's
 * `invalid_grant` does not distinguish an expired refresh token from a
 * revoked one, so `expired` is RESERVED for a caller that knows better
 * (e.g. a testing-mode client whose seven-day expiry is configuration,
 * not inference). Nothing may guess it from a response body.
 */
import { assertNever } from '@kro/core'
import type { GoogleCalendarException } from './GoogleCalendarException'

/** Why a grant stopped working. Closed — never assembled from a response. */
export const GoogleReconnectReason = {
  /** The user withdrew access in their Google account. */
  revoked: 'revoked',
  /** The refresh token aged out (testing clients expire in seven days). */
  expired: 'expired',
  /** The consented scope no longer covers the calendar operations Kro needs. */
  scopeChanged: 'scopeChanged',
} as const

export type GoogleReconnectReason =
  (typeof GoogleReconnectReason)[keyof typeof GoogleReconnectReason]

export type GoogleCalendarConnection =
  | { readonly kind: 'unconfigured'; readonly missing: readonly string[] }
  | { readonly kind: 'disconnected' }
  | {
      readonly kind: 'connected'
      /** The scopes Google reported on the last grant, or `null` if it said none. */
      readonly scopes: readonly string[] | null
    }
  | {
      readonly kind: 'needsReconnect'
      readonly reason: GoogleReconnectReason
    }

export const GoogleCalendarConnections = {
  unconfigured: (missing: readonly string[]): GoogleCalendarConnection => ({
    kind: 'unconfigured',
    missing,
  }),
  disconnected: (): GoogleCalendarConnection => ({ kind: 'disconnected' }),
  connected: (
    scopes: readonly string[] | null = null,
  ): GoogleCalendarConnection => ({ kind: 'connected', scopes }),
  needsReconnect: (
    reason: GoogleReconnectReason = GoogleReconnectReason.revoked,
  ): GoogleCalendarConnection => ({ kind: 'needsReconnect', reason }),
}

/** The one question a fetch path asks: may I try? */
export const isGoogleCalendarConnected = (
  connection: GoogleCalendarConnection,
): boolean => connection.kind === 'connected'

/** The one question KC-IS-#19's banner asks. */
export const googleCalendarNeedsReconnect = (
  connection: GoogleCalendarConnection,
): boolean => connection.kind === 'needsReconnect'

/**
 * Whether the surface should offer a *first* connection.
 *
 * `needsReconnect` deliberately answers `false` — it offers **Reconnect**, a
 * different affordance with different copy, and a surface that treated the two
 * as one would tell a user whose access was revoked that they have never
 * connected.
 */
export const canOfferGoogleConnect = (
  connection: GoogleCalendarConnection,
): boolean => connection.kind === 'disconnected'

/**
 * Banner copy, derived from the state (`RC-8`) and closed by `assertNever`
 * (`RC-9`). `null` where there is nothing to say.
 */
export const googleCalendarConnectionCopy = (
  connection: GoogleCalendarConnection,
): string | null => {
  switch (connection.kind) {
    case 'unconfigured':
      return null
    case 'disconnected':
      return null
    case 'connected':
      return null
    case 'needsReconnect':
      switch (connection.reason) {
        case GoogleReconnectReason.revoked:
          return 'Kro no longer has access to your Google Calendar. Reconnect to see your events.'
        case GoogleReconnectReason.expired:
          return 'Your Google Calendar connection expired. Reconnect to see your events.'
        case GoogleReconnectReason.scopeChanged:
          return 'Kro needs calendar permission again. Reconnect to see your events.'
        default:
          return assertNever(connection.reason)
      }
    default:
      return assertNever(connection)
  }
}

/**
 * The connection a failed operation implies, or `null` when the failure says
 * nothing about the grant.
 *
 * This is the wiring KC-IS-#19's banner consumes without this lane touching a
 * plan file: any Producer that catches a `GoogleCalendarException` can ask this
 * function whether the *connection* changed, and dispatch its own event.
 *
 * `unauthorized` maps to `needsReconnect` rather than to a retry: a 401 from
 * Google after a successful refresh means the access token this app just minted
 * was rejected, and the only remaining explanation is that the grant behind it
 * is gone. `forbidden` maps to `scopeChanged` for the same reason — the grant
 * exists but no longer covers the call.
 */
export const googleConnectionFromFailure = (
  failure: GoogleCalendarException,
): GoogleCalendarConnection | null => {
  switch (failure.kind) {
    case 'unconfigured':
      return GoogleCalendarConnections.unconfigured([])
    case 'notConnected':
      return GoogleCalendarConnections.disconnected()
    case 'needsReconnect':
      return GoogleCalendarConnections.needsReconnect()
    case 'unauthorized':
      return GoogleCalendarConnections.needsReconnect(
        GoogleReconnectReason.revoked,
      )
    case 'forbidden':
      return GoogleCalendarConnections.needsReconnect(
        GoogleReconnectReason.scopeChanged,
      )
    default:
      // rateLimited / conflict / notFound / offline / server /
      // malformedResponse / invalidRequest / unknown say nothing about the
      // grant — a transient failure must never clear a working connection.
      return null
  }
}

// ---------------------------------------------------------------------------
// The `/api/google/status` payload — SEC-7 both ways
// ---------------------------------------------------------------------------

/**
 * Read a connection out of an untrusted JSON body.
 *
 * The browser parses the status route's answer with this, so a proxy that
 * returns an HTML error page degrades to `null` (the caller reports
 * `malformedResponse`) rather than to a plausible-looking `connected`.
 */
export const parseGoogleCalendarConnection = (
  value: unknown,
): GoogleCalendarConnection | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }
  const candidate = value as Record<string, unknown>
  switch (candidate.kind) {
    case 'unconfigured': {
      const missing = Array.isArray(candidate.missing)
        ? candidate.missing.filter(
            (entry): entry is string => typeof entry === 'string',
          )
        : []
      return GoogleCalendarConnections.unconfigured(missing)
    }
    case 'disconnected':
      return GoogleCalendarConnections.disconnected()
    case 'connected': {
      const scopes = Array.isArray(candidate.scopes)
        ? candidate.scopes.filter(
            (entry): entry is string => typeof entry === 'string',
          )
        : null
      return GoogleCalendarConnections.connected(scopes)
    }
    case 'needsReconnect': {
      const reason = candidate.reason
      const known =
        reason === GoogleReconnectReason.revoked ||
        reason === GoogleReconnectReason.expired ||
        reason === GoogleReconnectReason.scopeChanged
      return GoogleCalendarConnections.needsReconnect(
        known ? reason : GoogleReconnectReason.revoked,
      )
    }
    default:
      return null
  }
}
