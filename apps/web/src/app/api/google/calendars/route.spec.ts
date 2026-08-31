/**
 * The calendar-inventory route, driven end to end with no network. The
 * flattening and pagination are covered in `@kro/app`'s
 * `GoogleCalendarResponse.test.ts` and `GoogleCalendarApiService.test.ts`.
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

describe('GET /api/google/calendars', () => {
  it('is dynamic — the inventory is per-user', () => {
    expect(dynamic).toBe('force-dynamic')
  })

  it('reports an unconfigured deployment as 503', async () => {
    const response = await GET(
      new Request('https://kro.app/api/google/calendars'),
    )
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      error: { kind: 'unconfigured' },
    })
  })

  it('answers JSON, so the lens can read it without guessing', async () => {
    const response = await GET(
      new Request('https://kro.app/api/google/calendars'),
    )
    expect(response.headers.get('content-type')).toBe('application/json')
  })

  it('is never cached', async () => {
    const response = await GET(
      new Request('https://kro.app/api/google/calendars'),
    )
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
})
