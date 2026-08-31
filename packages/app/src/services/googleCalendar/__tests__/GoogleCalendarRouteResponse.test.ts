import { describe, expect, it } from 'vitest'
import {
  GOOGLE_CONNECTED_DESTINATION,
  type GoogleRouteResult,
} from '../GoogleCalendarRouteHandlers'
import {
  googleRouteResponse,
  readJsonBody,
} from '../GoogleCalendarRouteResponse'

const success = (
  value: Partial<Extract<GoogleRouteResult, { ok: true }>['value']> = {},
): GoogleRouteResult => ({
  ok: true,
  value: {
    status: 200,
    body: { fine: true },
    setCookies: [],
    redirectTo: null,
    ...value,
  },
})

describe('turning a Result into a Response', () => {
  it('serialises a success body as JSON', async () => {
    const response = googleRouteResponse(success())
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(await response.json()).toEqual({ fine: true })
  })

  it('answers a 302 with a Location and no body for a redirect', async () => {
    const response = googleRouteResponse(
      success({ redirectTo: GOOGLE_CONNECTED_DESTINATION, body: null }),
    )
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(GOOGLE_CONNECTED_DESTINATION)
    expect(await response.text()).toBe('')
  })

  it('emits TWO Set-Cookie headers when the handler sets two', () => {
    // The callback clears the handshake cookie and sets the token cookie in
    // one answer. A plain headers object would drop the first.
    const response = googleRouteResponse(
      success({
        setCookies: ['a=1; Path=/', 'b=2; Path=/'],
        redirectTo: '/integrations',
        body: null,
      }),
    )
    const cookies = response.headers.getSetCookie()
    expect(cookies).toEqual(['a=1; Path=/', 'b=2; Path=/'])
  })

  it('marks every answer no-store — these bodies are per-user', () => {
    // A cached connection status served from a CDN would be one user's
    // calendar shown to another.
    const response = googleRouteResponse(success())
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('maps a failure to its status and the typed error body', async () => {
    const response = googleRouteResponse({
      ok: false,
      error: { kind: 'needsReconnect', message: 'gone', recoverable: true },
    })
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: { kind: 'needsReconnect', message: 'gone', recoverable: true },
    })
  })

  it('sets no cookies on a failure', () => {
    const response = googleRouteResponse({
      ok: false,
      error: { kind: 'offline', message: 'x', recoverable: true },
    })
    expect(response.headers.getSetCookie()).toEqual([])
  })
})

describe('reading a JSON request body', () => {
  it('parses a well-formed body', async () => {
    const request = new Request('https://kro.app/api/google/createEvent', {
      method: 'POST',
      body: JSON.stringify({ intention: 'ship it' }),
    })
    expect(await readJsonBody(request)).toEqual({ intention: 'ship it' })
  })

  it('answers null for an empty body rather than throwing', async () => {
    // A POST with no body is a client mistake and must surface as the route's
    // own `invalidRequest`, not as a 500 with a stack trace.
    const request = new Request('https://kro.app/api/google/createEvent', {
      method: 'POST',
    })
    expect(await readJsonBody(request)).toBeNull()
  })

  it('answers null for a body that is not JSON', async () => {
    const request = new Request('https://kro.app/api/google/createEvent', {
      method: 'POST',
      body: 'not json {',
    })
    expect(await readJsonBody(request)).toBeNull()
  })
})
