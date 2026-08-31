/**
 * The events route, driven end to end with no network. The window parsing and
 * per-calendar fetch are covered in `@kro/app`'s
 * `GoogleCalendarRouteHandlers.test.ts` and `GoogleCalendarApiService.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, dynamic } from './route'

const WINDOW = 'from=2026-08-31T00:00:00Z&to=2026-09-01T00:00:00Z'

beforeEach(() => {
  vi.stubEnv('GOOGLE_CLIENT_ID', '')
  vi.stubEnv('GOOGLE_CLIENT_SECRET', '')
  vi.stubEnv('GOOGLE_CALENDAR_TOKEN_KEY', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /api/google/events', () => {
  it('is dynamic — the answer depends on a cookie', () => {
    expect(dynamic).toBe('force-dynamic')
  })

  it('rejects a request with no window as a 400, not a 500', async () => {
    const response = await GET(new Request('https://kro.app/api/google/events'))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { kind: 'invalidRequest' },
    })
  })

  it('rejects a backwards window', async () => {
    const response = await GET(
      new Request(
        'https://kro.app/api/google/events?from=2026-09-01T00:00:00Z&to=2026-08-31T00:00:00Z',
      ),
    )
    expect(response.status).toBe(400)
  })

  it('reports an unconfigured deployment as 503 for a well-formed window', async () => {
    const response = await GET(
      new Request(`https://kro.app/api/google/events?${WINDOW}`),
    )
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      error: { kind: 'unconfigured' },
    })
  })

  it('is never cached — one user’s calendar must not be served to another', async () => {
    const response = await GET(
      new Request(`https://kro.app/api/google/events?${WINDOW}`),
    )
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
})
