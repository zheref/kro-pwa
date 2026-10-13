import { describe, expect, it } from 'vitest'
import { landingRouteDecision } from './landingRoute'

describe('landingRouteDecision', () => {
  it('shows the landing to a cold visit once the landing is enabled', () => {
    expect(
      landingRouteDecision({ searchParams: {}, landingEnabled: true }),
    ).toEqual({ kind: 'landing' })
  })

  it('sends a Supabase ?code= return to My Day even with the landing enabled', () => {
    expect(
      landingRouteDecision({
        searchParams: { code: 'abc-123', state: 's' },
        landingEnabled: true,
      }),
    ).toEqual({ kind: 'redirect', to: '/my-day?code=abc-123&state=s' })
  })

  it('sends a provider refusal (?error=) to My Day so the app can report it', () => {
    expect(
      landingRouteDecision({
        searchParams: { error: 'access_denied' },
        landingEnabled: true,
      }),
    ).toEqual({ kind: 'redirect', to: '/my-day?error=access_denied' })
  })

  it('falls back to My Day while the landing is disabled', () => {
    expect(
      landingRouteDecision({ searchParams: {}, landingEnabled: false }),
    ).toEqual({ kind: 'redirect', to: '/my-day' })
  })

  it('never forwards an arbitrary query — enabled or not', () => {
    expect(
      landingRouteDecision({
        searchParams: { utm_source: 'x', ref: 'y' },
        landingEnabled: false,
      }),
    ).toEqual({ kind: 'redirect', to: '/my-day' })
    expect(
      landingRouteDecision({
        searchParams: { utm_source: 'x' },
        landingEnabled: true,
      }),
    ).toEqual({ kind: 'landing' })
  })
})
