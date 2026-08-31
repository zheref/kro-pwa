/**
 * The connect route, driven end to end with no network. See
 * `status/route.spec.ts` for why an unset environment is the deterministic
 * fixture; the flow's own logic is covered in `@kro/app`'s
 * `GoogleCalendarRouteHandlers.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, dynamic } from './route'

beforeEach(() => {
  vi.stubEnv('GOOGLE_CLIENT_ID', '')
  vi.stubEnv('GOOGLE_CLIENT_SECRET', '')
  vi.stubEnv('GOOGLE_CALENDAR_TOKEN_KEY', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /api/google/connect', () => {
  it('is dynamic — it mints randomness and sets a cookie', () => {
    expect(dynamic).toBe('force-dynamic')
  })

  it('refuses with 503 rather than redirecting to a broken consent screen', async () => {
    const response = await GET(
      new Request('https://kro.app/api/google/connect'),
    )
    expect(response.status).toBe(503)
    expect(response.headers.get('location')).toBeNull()
  })

  it('reports the typed unconfigured failure, kind and all', async () => {
    const response = await GET(
      new Request('https://kro.app/api/google/connect'),
    )
    expect(await response.json()).toMatchObject({
      error: { kind: 'unconfigured', recoverable: false },
    })
  })

  it('sets no cookie when it could not start a flow', async () => {
    const response = await GET(
      new Request('https://kro.app/api/google/connect'),
    )
    expect(response.headers.getSetCookie()).toEqual([])
  })
})
