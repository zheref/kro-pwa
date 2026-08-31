import { describe, expect, it } from 'vitest'
import {
  GoogleCalendarConnections,
  GoogleReconnectReason,
  canOfferGoogleConnect,
  googleCalendarConnectionCopy,
  googleCalendarNeedsReconnect,
  googleConnectionFromFailure,
  isGoogleCalendarConnected,
  parseGoogleCalendarConnection,
} from '../GoogleCalendarConnection'
import {
  GoogleCalendarExceptions,
  googleCalendarExceptionKinds,
} from '../GoogleCalendarException'

describe('the four connection states', () => {
  it('lets a fetch proceed only when connected', () => {
    expect(
      isGoogleCalendarConnected(GoogleCalendarConnections.connected()),
    ).toBe(true)
    expect(
      isGoogleCalendarConnected(GoogleCalendarConnections.disconnected()),
    ).toBe(false)
    expect(
      isGoogleCalendarConnected(GoogleCalendarConnections.needsReconnect()),
    ).toBe(false)
  })

  it('raises the banner only for needsReconnect', () => {
    expect(
      googleCalendarNeedsReconnect(GoogleCalendarConnections.needsReconnect()),
    ).toBe(true)
    expect(
      googleCalendarNeedsReconnect(GoogleCalendarConnections.disconnected()),
    ).toBe(false)
  })

  it('offers Connect only from disconnected, never from needsReconnect', () => {
    // Offering "Connect" to a user whose access was revoked would tell them
    // they have never connected. Reconnect is a different affordance.
    expect(
      canOfferGoogleConnect(GoogleCalendarConnections.disconnected()),
    ).toBe(true)
    expect(
      canOfferGoogleConnect(GoogleCalendarConnections.needsReconnect()),
    ).toBe(false)
  })

  it('offers nothing on an unconfigured deployment', () => {
    // A Connect button that cannot possibly work is the worst outcome: the
    // user tries, Google returns an opaque error, nothing explains why.
    const unconfigured = GoogleCalendarConnections.unconfigured([
      'GOOGLE_CLIENT_ID',
    ])
    expect(canOfferGoogleConnect(unconfigured)).toBe(false)
    expect(isGoogleCalendarConnected(unconfigured)).toBe(false)
    expect(googleCalendarConnectionCopy(unconfigured)).toBeNull()
  })
})

describe('banner copy', () => {
  it('says nothing when there is nothing to say', () => {
    expect(
      googleCalendarConnectionCopy(GoogleCalendarConnections.connected()),
    ).toBeNull()
    expect(
      googleCalendarConnectionCopy(GoogleCalendarConnections.disconnected()),
    ).toBeNull()
  })

  it('distinguishes revoked from expired from scope-changed', () => {
    const copies = [
      GoogleReconnectReason.revoked,
      GoogleReconnectReason.expired,
      GoogleReconnectReason.scopeChanged,
    ].map((reason) =>
      googleCalendarConnectionCopy(
        GoogleCalendarConnections.needsReconnect(reason),
      ),
    )
    expect(new Set(copies).size).toBe(3)
    for (const copy of copies) expect(copy).toContain('Reconnect')
  })
})

describe('what a failure says about the grant', () => {
  it('reads unauthorized as a dead grant — reconnect', () => {
    // A 401 after a successful refresh means the grant behind the token is
    // gone; there is nothing left to retry.
    const connection = googleConnectionFromFailure(
      GoogleCalendarExceptions.unauthorized(),
    )
    expect(connection?.kind).toBe('needsReconnect')
  })

  it('reads forbidden as a narrowed scope — also reconnect', () => {
    const connection = googleConnectionFromFailure(
      GoogleCalendarExceptions.forbidden(),
    )
    expect(connection?.kind).toBe('needsReconnect')
    if (connection?.kind !== 'needsReconnect') return
    expect(connection.reason).toBe(GoogleReconnectReason.scopeChanged)
  })

  it('says NOTHING about the grant for a transient failure', () => {
    // A rate limit or an offline moment must never clear a working connection
    // — a banner that appears on every network hiccup gets ignored.
    for (const failure of [
      GoogleCalendarExceptions.rateLimited(),
      GoogleCalendarExceptions.offline(),
      GoogleCalendarExceptions.server(503),
      GoogleCalendarExceptions.conflict(),
      GoogleCalendarExceptions.malformedResponse('event list'),
    ]) {
      expect(googleConnectionFromFailure(failure)).toBeNull()
    }
  })

  it('has an answer, or a considered null, for every declared failure kind', () => {
    for (const kind of googleCalendarExceptionKinds) {
      const failure = {
        kind,
        message: 'detail',
        recoverable: true,
      } as Parameters<typeof googleConnectionFromFailure>[0]
      expect(() => googleConnectionFromFailure(failure)).not.toThrow()
    }
  })
})

describe('reading a connection off the wire (SEC-7)', () => {
  it('round-trips each state through JSON', () => {
    for (const connection of [
      GoogleCalendarConnections.unconfigured(['GOOGLE_CLIENT_ID']),
      GoogleCalendarConnections.disconnected(),
      GoogleCalendarConnections.connected(['calendar']),
      GoogleCalendarConnections.needsReconnect(GoogleReconnectReason.expired),
    ]) {
      expect(
        parseGoogleCalendarConnection(JSON.parse(JSON.stringify(connection))),
      ).toEqual(connection)
    }
  })

  it('refuses an HTML error page rather than reading it as connected', () => {
    expect(parseGoogleCalendarConnection('<html>')).toBeNull()
    expect(parseGoogleCalendarConnection({ kind: 'whatever' })).toBeNull()
    expect(parseGoogleCalendarConnection(null)).toBeNull()
  })

  it('narrows an unknown reconnect reason to the safest copy', () => {
    const parsed = parseGoogleCalendarConnection({
      kind: 'needsReconnect',
      reason: 'something-new',
    })
    expect(parsed?.kind).toBe('needsReconnect')
    if (parsed?.kind !== 'needsReconnect') return
    expect(parsed.reason).toBe(GoogleReconnectReason.revoked)
  })

  it('drops non-string entries from scopes and missing', () => {
    const parsed = parseGoogleCalendarConnection({
      kind: 'connected',
      scopes: ['calendar', 7, null],
    })
    expect(parsed?.kind).toBe('connected')
    if (parsed?.kind !== 'connected') return
    expect(parsed.scopes).toEqual(['calendar'])
  })
})
