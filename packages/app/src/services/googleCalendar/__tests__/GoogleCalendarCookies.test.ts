import { describe, expect, it } from 'vitest'
import {
  GOOGLE_TOKEN_COOKIE,
  clearCookieHeader,
  parseHandshake,
  readCookie,
  serializeHandshake,
  setCookieHeader,
  shouldUseSecureCookies,
} from '../GoogleCalendarCookies'

describe('reading a cookie out of a request header', () => {
  it('finds the named cookie among several', () => {
    expect(
      readCookie(
        'theme=dark; kro_gcal=sealed-value; other=x',
        GOOGLE_TOKEN_COOKIE,
      ),
    ).toBe('sealed-value')
  })

  it('answers null when the header is absent entirely', () => {
    expect(readCookie(null, GOOGLE_TOKEN_COOKIE)).toBeNull()
    expect(readCookie(undefined, GOOGLE_TOKEN_COOKIE)).toBeNull()
  })

  it('answers null when the cookie is present but empty', () => {
    // What a cleared cookie looks like on the way back — it must read as
    // absent, or a disconnect would appear not to have happened.
    expect(readCookie('kro_gcal=', GOOGLE_TOKEN_COOKIE)).toBeNull()
  })

  it('does not match a cookie whose name merely ends the same way', () => {
    expect(readCookie('not_kro_gcal=x', GOOGLE_TOKEN_COOKIE)).toBeNull()
  })

  it('decodes the percent-encoding a browser applies', () => {
    expect(readCookie('kro_gcal=a%2Bb', GOOGLE_TOKEN_COOKIE)).toBe('a+b')
  })

  it('treats an undecodable value as absent rather than passing it through half-read', () => {
    expect(readCookie('kro_gcal=%E0%A4%A', GOOGLE_TOKEN_COOKIE)).toBeNull()
  })
})

describe('writing a Set-Cookie header', () => {
  it('is HttpOnly, SameSite=Lax and Path=/', () => {
    const header = setCookieHeader('kro_gcal', 'v', {
      maxAge: 60,
      secure: true,
    })
    expect(header).toContain('HttpOnly')
    expect(header).toContain('SameSite=Lax')
    expect(header).toContain('Path=/')
  })

  it('is Lax rather than Strict, because the OAuth callback is a cross-site GET', () => {
    // Strict would drop the cookie on the way back from Google and break the
    // whole flow in a way that looks like an OAuth error.
    expect(
      setCookieHeader('c', 'v', { maxAge: 1, secure: true }),
    ).not.toContain('SameSite=Strict')
  })

  it('adds Secure only when asked', () => {
    expect(setCookieHeader('c', 'v', { maxAge: 1, secure: true })).toContain(
      'Secure',
    )
    expect(
      setCookieHeader('c', 'v', { maxAge: 1, secure: false }),
    ).not.toContain('Secure')
  })

  it('percent-encodes the value so a cookie cannot break the header', () => {
    expect(setCookieHeader('c', 'a;b', { maxAge: 1, secure: false })).toContain(
      'c=a%3Bb',
    )
  })

  it('never emits a negative or fractional Max-Age', () => {
    expect(setCookieHeader('c', 'v', { maxAge: -5, secure: false })).toContain(
      'Max-Age=0',
    )
    expect(setCookieHeader('c', 'v', { maxAge: 1.7, secure: false })).toContain(
      'Max-Age=1',
    )
  })

  it('clears with both an empty value and Max-Age=0', () => {
    // Some intermediaries honour only one of the two; a stale sealed token
    // surviving a disconnect would keep reporting `connected`.
    const header = clearCookieHeader('kro_gcal', true)
    expect(header).toContain('kro_gcal=')
    expect(header).toContain('Max-Age=0')
  })
})

describe('deciding whether cookies are Secure', () => {
  it('always secures an https origin', () => {
    expect(shouldUseSecureCookies('https://kro.app/api/google/status')).toBe(
      true,
    )
  })

  it('does not secure http://localhost, where a Secure cookie is dropped', () => {
    expect(
      shouldUseSecureCookies('http://localhost:3000/api/google/connect'),
    ).toBe(false)
    expect(shouldUseSecureCookies('http://127.0.0.1:3000/x')).toBe(false)
  })

  it('secures plain http on any other host — that is a misconfiguration', () => {
    // Making it visibly fail beats quietly transmitting a credential in clear.
    expect(shouldUseSecureCookies('http://staging.internal/x')).toBe(true)
  })

  it('secures an unparseable URL rather than downgrading', () => {
    expect(shouldUseSecureCookies('not a url')).toBe(true)
  })
})

describe('the in-flight authorization handshake', () => {
  const handshake = {
    state: 'state-value',
    verifier: 'verifier-value',
    redirectUri: 'https://kro.app/api/google/callback',
  }

  it('round-trips all three fields', () => {
    expect(parseHandshake(serializeHandshake(handshake))).toEqual(handshake)
  })

  it('refuses a payload with the wrong number of parts', () => {
    expect(parseHandshake('a\nb')).toBeNull()
    expect(parseHandshake('a\nb\nc\nd')).toBeNull()
  })

  it('refuses a payload with an empty field', () => {
    expect(parseHandshake('\nverifier\nhttps://x')).toBeNull()
  })
})
