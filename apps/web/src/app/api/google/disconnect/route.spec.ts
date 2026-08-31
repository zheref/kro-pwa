/**
 * The disconnect route, driven end to end with no network. The revoke-then-clear
 * policy is covered in `@kro/app`'s `GoogleCalendarRouteHandlers.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST, dynamic } from './route'

const post = (cookieHeader?: string) =>
  POST(
    new Request('https://kro.app/api/google/disconnect', {
      method: 'POST',
      ...(cookieHeader === undefined
        ? {}
        : { headers: { cookie: cookieHeader } }),
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

describe('POST /api/google/disconnect', () => {
  it('is dynamic — it clears a cookie', () => {
    expect(dynamic).toBe('force-dynamic')
  })

  it('is a no-op success when there was nothing to disconnect', async () => {
    const response = await post()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ revoked: false })
  })

  it('clears the credential cookie ANYWAY, so the state cannot get stuck', async () => {
    const response = await post()
    const [cleared] = response.headers.getSetCookie()
    expect(cleared).toContain('kro_gcal=')
    expect(cleared).toContain('Max-Age=0')
    expect(cleared).toContain('HttpOnly')
  })

  it('clears a cookie it cannot read rather than leaving it behind', async () => {
    const response = await post('kro_gcal=unreadable-value')
    expect(response.status).toBe(200)
    expect(response.headers.getSetCookie()[0]).toContain('Max-Age=0')
  })

  it('is never cached', async () => {
    expect((await post()).headers.get('cache-control')).toContain('no-store')
  })
})
