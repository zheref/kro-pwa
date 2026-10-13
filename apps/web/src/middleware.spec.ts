import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { config, middleware } from './middleware'

/**
 * The adapter only. The routing matrix itself is `hostRouting.spec.ts`; what
 * is asserted here is that each decision kind becomes the right response.
 */
const request = (url: string, host: string) =>
  new NextRequest(url, { headers: { host } })

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the host-routing middleware', () => {
  it('answers an apex /hub/plan with a 307 to the hub, query kept', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_HOST', 'kroapp.com')
    vi.stubEnv('NEXT_PUBLIC_HUB_HOST', 'hub.kroapp.com')

    const response = middleware(
      request('https://kroapp.com/hub/plan?code=abc', 'kroapp.com'),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://hub.kroapp.com/plan?code=abc',
    )
  })

  it('rewrites the hub root to My Day and marks it noindex', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_HOST', 'kroapp.com')
    vi.stubEnv('NEXT_PUBLIC_HUB_HOST', 'hub.kroapp.com')

    const response = middleware(
      request('https://hub.kroapp.com/?code=abc', 'hub.kroapp.com'),
    )

    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'https://hub.kroapp.com/my-day?code=abc',
    )
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  })

  it('strips /hub on the same host when no hosts are configured', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_HOST', '')
    vi.stubEnv('NEXT_PUBLIC_HUB_HOST', '')

    const response = middleware(
      request('http://localhost:3000/hub/plan', 'localhost:3000'),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/plan')
  })

  it('passes an ordinary apex page straight through', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_HOST', 'kroapp.com')
    vi.stubEnv('NEXT_PUBLIC_HUB_HOST', 'hub.kroapp.com')

    const response = middleware(request('https://kroapp.com/', 'kroapp.com'))

    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(response.headers.get('x-robots-tag')).toBeNull()
  })

  it('keeps static files and the API out of its matcher', () => {
    const matcher = new RegExp(`^${config.matcher[0]}$`)

    expect(matcher.test('/plan')).toBe(true)
    expect(matcher.test('/')).toBe(true)
    expect(matcher.test('/api/google/callback')).toBe(false)
    expect(matcher.test('/_next/static/x.js')).toBe(false)
    expect(matcher.test('/icons/Kro192.png')).toBe(false)
    expect(matcher.test('/sw.js')).toBe(false)
    expect(matcher.test('/robots.txt')).toBe(false)
    expect(matcher.test('/opengraph-image-abc')).toBe(false)
  })
})

describe('the landing security headers (SEC-10)', () => {
  const production = () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_HOST', 'kroapp.com')
    vi.stubEnv('NEXT_PUBLIC_HUB_HOST', 'hub.kroapp.com')
  }

  it('puts the CSP and its companions on the apex landing document', () => {
    production()
    vi.stubEnv('NEXT_PUBLIC_UMAMI_WEBSITE_ID', 'site-123')
    vi.stubEnv('NEXT_PUBLIC_UMAMI_SCRIPT_URL', '')

    const response = middleware(request('https://kroapp.com/', 'kroapp.com'))

    const csp = response.headers.get('content-security-policy') ?? ''
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain('https://cloud.umami.is')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('referrer-policy')).toBe(
      'strict-origin-when-cross-origin',
    )
    expect(response.headers.get('x-frame-options')).toBe('DENY')
  })

  it('admits no third-party origin when analytics is off', () => {
    production()
    vi.stubEnv('NEXT_PUBLIC_UMAMI_WEBSITE_ID', '')

    const response = middleware(request('https://kroapp.com/', 'kroapp.com'))

    const csp = response.headers.get('content-security-policy') ?? ''
    expect(csp).toContain("script-src 'self' 'unsafe-inline'")
    expect(csp).not.toContain('umami')
  })

  it('leaves the hub root (a rewrite into the app) without the landing policy', () => {
    production()

    const response = middleware(
      request('https://hub.kroapp.com/', 'hub.kroapp.com'),
    )

    expect(response.headers.get('content-security-policy')).toBeNull()
    expect(response.headers.get('x-frame-options')).toBeNull()
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  })

  it('leaves an apex app-path redirect without the landing policy', () => {
    production()

    const response = middleware(
      request('https://kroapp.com/my-day', 'kroapp.com'),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('content-security-policy')).toBeNull()
  })

  it('leaves an ordinary apex page that is not the landing alone', () => {
    production()

    const response = middleware(
      request('https://kroapp.com/privacy', 'kroapp.com'),
    )

    expect(response.headers.get('content-security-policy')).toBeNull()
  })
})
