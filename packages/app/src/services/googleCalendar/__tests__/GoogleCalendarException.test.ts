import { describe, expect, it } from 'vitest'
import {
  GoogleCalendarExceptions,
  googleCalendarExceptionCopy,
  googleCalendarExceptionForStatus,
  googleCalendarExceptionFrom,
  googleCalendarExceptionKinds,
  isGoogleCalendarException,
  isGoogleReconnectFailure,
} from '../GoogleCalendarException'

describe('the exception union', () => {
  it('gives every declared kind user-facing copy', () => {
    // `googleCalendarExceptionCopy` is closed by `assertNever`, so this also
    // pins that no kind was added without copy.
    for (const kind of googleCalendarExceptionKinds) {
      const failure = { kind, message: 'detail', recoverable: true } as Parameters<
        typeof googleCalendarExceptionCopy
      >[0]
      expect(googleCalendarExceptionCopy(failure).length).toBeGreaterThan(0)
    }
  })

  it('marks unconfigured unrecoverable — no button can fix a missing env', () => {
    expect(GoogleCalendarExceptions.unconfigured([]).recoverable).toBe(false)
  })

  it('marks needsReconnect recoverable — that one has a button', () => {
    expect(GoogleCalendarExceptions.needsReconnect().recoverable).toBe(true)
  })

  it('names the missing variables in the unconfigured message', () => {
    const failure = GoogleCalendarExceptions.unconfigured([
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CALENDAR_TOKEN_KEY',
    ])
    expect(failure.message).toContain('GOOGLE_CLIENT_ID')
    expect(failure.message).toContain('GOOGLE_CALENDAR_TOKEN_KEY')
  })

  it('identifies the reconnect failure the banner keys on', () => {
    expect(
      isGoogleReconnectFailure(GoogleCalendarExceptions.needsReconnect()),
    ).toBe(true)
    expect(
      isGoogleReconnectFailure(GoogleCalendarExceptions.notConnected()),
    ).toBe(false)
  })
})

describe('mapping an HTTP status to a failure', () => {
  it('maps 401 to unauthorized — the token was rejected', () => {
    expect(googleCalendarExceptionForStatus(401).kind).toBe('unauthorized')
  })

  it('maps a plain 403 to forbidden — the grant is too narrow', () => {
    expect(googleCalendarExceptionForStatus(403).kind).toBe('forbidden')
  })

  it('maps a rate-limited 403 to rateLimited, as canon does', () => {
    expect(googleCalendarExceptionForStatus(403, true).kind).toBe('rateLimited')
  })

  it('maps 404 to notFound — a deleted calendar is not a retryable server error', () => {
    // Canon folds 404 into `server`, which would make "this calendar is gone"
    // look transient. The divergence is deliberate.
    const failure = googleCalendarExceptionForStatus(404)
    expect(failure.kind).toBe('notFound')
    expect(failure.recoverable).toBe(false)
  })

  it('maps 412 to conflict — the event changed elsewhere', () => {
    expect(googleCalendarExceptionForStatus(412).kind).toBe('conflict')
  })

  it('maps 429 to rateLimited', () => {
    expect(googleCalendarExceptionForStatus(429).kind).toBe('rateLimited')
  })

  it('maps a 5xx to server, carrying the status in the developer message', () => {
    const failure = googleCalendarExceptionForStatus(503)
    expect(failure.kind).toBe('server')
    expect(failure.message).toContain('503')
  })
})

describe('translating a caught value', () => {
  it('passes one of ours through untouched', () => {
    const original = GoogleCalendarExceptions.needsReconnect('revoked')
    expect(googleCalendarExceptionFrom(original)).toBe(original)
  })

  it('maps a TypeError to offline — the request never left the device', () => {
    expect(googleCalendarExceptionFrom(new TypeError('Failed to fetch')).kind).toBe(
      'offline',
    )
  })

  it('keeps an Error message, which this code base controls at every throw', () => {
    const failure = googleCalendarExceptionFrom(new Error('boom'))
    expect(failure.kind).toBe('unknown')
    expect(failure.message).toBe('boom')
  })

  it('never interpolates an arbitrary object, which could carry a URL', () => {
    // SEC-5: `String(error)` on a fetch failure can include the request URL,
    // and a URL is one of the two places a token must never appear.
    const failure = googleCalendarExceptionFrom({
      toString: () => 'https://oauth2.googleapis.com/token?access_token=leak',
    })
    expect(failure.message).not.toContain('access_token')
    expect(failure.message).not.toContain('https://')
  })

  it('recognises our own exceptions structurally', () => {
    expect(
      isGoogleCalendarException(GoogleCalendarExceptions.offline()),
    ).toBe(true)
    expect(isGoogleCalendarException({ kind: 'somethingElse' })).toBe(false)
    expect(isGoogleCalendarException(null)).toBe(false)
    expect(isGoogleCalendarException('offline')).toBe(false)
  })
})
