/**
 * The OAuth callback route, driven end to end with no network. The handshake,
 * state check and token exchange are covered in `@kro/app`'s
 * `GoogleCalendarRouteHandlers.test.ts`; this suite pins the HTTP shape the
 * browser actually receives.
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

describe('GET /api/google/callback', () => {
  it('is dynamic — it reads a cookie and exchanges a code', () => {
    expect(dynamic).toBe('force-dynamic')
  })

  it('always REDIRECTS, never renders JSON at a browser', async () => {
    // A browser landed here from Google; a JSON body would be shown as text.
    const response = await GET(
      new Request('https://kro.app/api/google/callback?code=c&state=s'),
    )
    expect(response.status).toBe(302)
    expect(await response.text()).toBe('')
  })

  it('sends a failed exchange to the Integrations failure destination', async () => {
    const response = await GET(
      new Request('https://kro.app/api/google/callback?code=c&state=s'),
    )
    expect(response.headers.get('location')).toBe('/integrations?google=failed')
  })

  it('never echoes the authorization code into the redirect (SEC-5)', async () => {
    const response = await GET(
      new Request(
        'https://kro.app/api/google/callback?code=super-secret&state=s',
      ),
    )
    expect(response.headers.get('location')).not.toContain('super-secret')
  })

  it('never follows a redirect target the request supplied (open redirect)', async () => {
    const response = await GET(
      new Request(
        'https://kro.app/api/google/callback?code=c&state=s&next=https://evil.example',
      ),
    )
    expect(response.headers.get('location')).not.toContain('evil.example')
  })
})
