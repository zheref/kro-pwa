import { FeatureFlags, makeHardcodedFeatureFlagService } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { isLandingEnabled } from './landingFlag'

describe('the landing flag read', () => {
  it('answers from the web shipping overrides — on for this product', () => {
    expect(isLandingEnabled()).toBe(true)
  })

  it("is a product override, not canon's default — the status-quo baseline keeps it dark", () => {
    expect(
      makeHardcodedFeatureFlagService().isEnabled(FeatureFlags.landingPage),
    ).toBe(false)
  })

  it('needs no browser global — it runs where a Server Component runs', () => {
    expect(typeof window).toBe('object')
    const saved = globalThis.window
    // @ts-expect-error: simulating a server render where window is absent
    globalThis.window = undefined
    try {
      expect(isLandingEnabled()).toBe(true)
    } finally {
      globalThis.window = saved
    }
  })
})
