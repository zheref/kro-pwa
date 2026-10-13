import { describe, expect, it } from 'vitest'
import { landingSecurityHeaders } from './securityHeaders'

const directives = (csp: string): Map<string, string> =>
  new Map(
    csp.split('; ').map((directive) => {
      const [name, ...values] = directive.split(' ')
      return [name ?? '', values.join(' ')] as const
    }),
  )

describe('landingSecurityHeaders', () => {
  it('admits only self in production with analytics off', () => {
    const headers = landingSecurityHeaders({
      umamiOrigin: null,
      umamiCollectOrigin: null,
      production: true,
    })
    const csp = directives(headers['Content-Security-Policy'] ?? '')

    expect(csp.get('script-src')).toBe("'self' 'unsafe-inline'")
    expect(csp.get('connect-src')).toBe("'self'")
    expect(csp.get('default-src')).toBe("'self'")
    expect(csp.get('form-action')).toBe("'self'")
    expect(csp.get('frame-ancestors')).toBe("'none'")
    expect(csp.get('object-src')).toBe("'none'")
    expect(csp.get('base-uri')).toBe("'self'")
    expect(csp.get('img-src')).toBe("'self' data: blob:")
    expect(csp.get('style-src')).toBe("'self' 'unsafe-inline'")
    expect(csp.get('font-src')).toBe("'self' data:")
  })

  it('admits Umami Cloud: the script host for scripts, the gateway for events', () => {
    const headers = landingSecurityHeaders({
      umamiOrigin: 'https://cloud.umami.is',
      umamiCollectOrigin: 'https://gateway.umami.is',
      production: true,
    })
    const csp = directives(headers['Content-Security-Policy'] ?? '')

    expect(csp.get('script-src')).toBe(
      "'self' 'unsafe-inline' https://cloud.umami.is",
    )
    expect(csp.get('connect-src')).toBe("'self' https://gateway.umami.is")
    expect(csp.get('img-src')).not.toContain('umami')
  })

  it('admits a self-hosted Umami on its one origin in both directives', () => {
    const headers = landingSecurityHeaders({
      umamiOrigin: 'https://stats.example.com',
      umamiCollectOrigin: 'https://stats.example.com',
      production: true,
    })
    const csp = directives(headers['Content-Security-Policy'] ?? '')

    expect(csp.get('script-src')).toBe(
      "'self' 'unsafe-inline' https://stats.example.com",
    )
    expect(csp.get('connect-src')).toBe("'self' https://stats.example.com")
  })

  it("admits 'unsafe-eval' only outside production (Next's dev runtime)", () => {
    const dev = directives(
      landingSecurityHeaders({
        umamiOrigin: null,
        umamiCollectOrigin: null,
        production: false,
      })['Content-Security-Policy'] ?? '',
    )
    const prod = directives(
      landingSecurityHeaders({
        umamiOrigin: null,
        umamiCollectOrigin: null,
        production: true,
      })['Content-Security-Policy'] ?? '',
    )

    expect(dev.get('script-src')).toContain("'unsafe-eval'")
    expect(prod.get('script-src')).not.toContain("'unsafe-eval'")
  })

  it('carries the three companion headers whatever the inputs', () => {
    for (const production of [true, false]) {
      const headers = landingSecurityHeaders({
        umamiOrigin: 'https://stats.example.com',
        umamiCollectOrigin: 'https://stats.example.com',
        production,
      })
      expect(headers['X-Content-Type-Options']).toBe('nosniff')
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
      expect(headers['X-Frame-Options']).toBe('DENY')
    }
  })
})
