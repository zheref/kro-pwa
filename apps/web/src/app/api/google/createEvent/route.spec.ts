/**
 * The session-logging route, driven end to end with no network.
 *
 * Two of these assertions are regression pins on the legacy route this one
 * replaces: it answered `401` unconditionally after KC-IS-#31 retired NextAuth,
 * and it logged the caught error. The composed `"Session: <intention>"` title
 * and the Google call itself are covered in `@kro/app`'s
 * `GoogleCalendarSessionEvent.test.ts` and `GoogleCalendarRouteHandlers.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST, dynamic } from './route'

const BODY = {
  intention: 'Ship the calendar host',
  start: '2026-08-31T09:00:00.000Z',
  end: '2026-08-31T09:25:00.000Z',
  timeZone: 'America/Bogota',
}

const post = (body: unknown) =>
  POST(
    new Request('https://kro.app/api/google/createEvent', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  )

beforeEach(() => {
  vi.stubEnv('GOOGLE_CLIENT_ID', '')
  vi.stubEnv('GOOGLE_CLIENT_SECRET', '')
  vi.stubEnv('GOOGLE_CALENDAR_TOKEN_KEY', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/google/createEvent', () => {
  it('is dynamic — it reads a cookie and writes to Google', () => {
    expect(dynamic).toBe('force-dynamic')
  })

  it('rejects the LEGACY body shape, which carried a pre-formatted title', async () => {
    // The contract moved: the route takes the intention, and composes canon's
    // "Session: <intention>" where it is tested.
    const response = await post({
      title: 'Session: Ship it',
      start: BODY.start,
      end: BODY.end,
      timezone: 'UTC',
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { kind: 'invalidRequest' },
    })
  })

  it('rejects an empty body as 400, not as a 500 with a stack trace', async () => {
    const response = await POST(
      new Request('https://kro.app/api/google/createEvent', { method: 'POST' }),
    )
    expect(response.status).toBe(400)
  })

  it('reports an unconfigured deployment as 503 for a well-formed body', async () => {
    // Not the blanket 401 the legacy route answered after NextAuth was retired.
    const response = await post(BODY)
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      error: { kind: 'unconfigured' },
    })
  })

  it('logs NOTHING — the legacy route console.error’d the caught failure', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(
      (method) => vi.spyOn(console, method).mockImplementation(() => {}),
    )
    try {
      await post(BODY)
      await post({ nonsense: true })
      for (const spy of spies) expect(spy).not.toHaveBeenCalled()
    } finally {
      for (const spy of spies) spy.mockRestore()
    }
  })
})
