/**
 * The route file itself, exercised end to end with **no network**.
 *
 * With no Google client in the environment every handler answers the typed
 * `unconfigured` outcome before it ever reaches a transport, so this suite
 * drives the real `GET` — including `makeGoogleRouteDependencies()`, the
 * `Request` adaptation and `googleRouteResponse` — without stubbing anything.
 * The logic these routes delegate to has its own suite in
 * `@kro/app`'s `GoogleCalendarRouteHandlers.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, dynamic } from './route'

beforeEach(() => {
  // Deterministic: a developer's shell may have real values exported.
  vi.stubEnv('GOOGLE_CLIENT_ID', '')
  vi.stubEnv('GOOGLE_CLIENT_SECRET', '')
  vi.stubEnv('GOOGLE_CALENDAR_TOKEN_KEY', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /api/google/status', () => {
  it('is dynamic — it reads cookies, so a static copy would be wrong', () => {
    expect(dynamic).toBe('force-dynamic')
  })

  it('reports unconfigured rather than failing, on a deployment with no client', async () => {
    const response = await GET(new Request('https://kro.app/api/google/status'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ kind: 'unconfigured' })
  })

  it('names the variables an operator has to set', async () => {
    const response = await GET(new Request('https://kro.app/api/google/status'))
    const body = (await response.json()) as { missing: readonly string[] }
    expect(body.missing).toContain('GOOGLE_CLIENT_ID')
    expect(body.missing).toContain('GOOGLE_CALENDAR_TOKEN_KEY')
  })

  it('is never cached — the answer is per-user', async () => {
    const response = await GET(new Request('https://kro.app/api/google/status'))
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
})
