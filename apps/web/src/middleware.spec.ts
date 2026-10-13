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
