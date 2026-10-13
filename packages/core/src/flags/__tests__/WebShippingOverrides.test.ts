import { describe, expect, it } from 'vitest'
import { FeatureFlags } from '../FeatureFlag'
import { disabledAssignment } from '../FeatureFlagAssignment'
import { makeHardcodedFeatureFlagService } from '../FeatureFlagService'
import {
  makeWebShippingFeatureFlagService,
  webShippingLandingPageOverride,
  webShippingOverrides,
} from '../WebShippingOverrides'

describe('the web shipping overrides', () => {
  it('turn the landing page on for the web product while canon dark-launches it', () => {
    const shipping = makeWebShippingFeatureFlagService()
    const canon = makeHardcodedFeatureFlagService()

    expect(shipping.isEnabled(FeatureFlags.landingPage)).toBe(true)
    expect(canon.isEnabled(FeatureFlags.landingPage)).toBe(false)
  })

  it('turn Kro Cloud, Appearance and the pane Inbox on, the web product calls recorded beside each flag', () => {
    const shipping = makeWebShippingFeatureFlagService()

    expect(shipping.isEnabled(FeatureFlags.supabaseHosting)).toBe(true)
    expect(shipping.isEnabled(FeatureFlags.appearanceThemes)).toBe(true)
    expect(shipping.isEnabled(FeatureFlags.detailPaneInbox)).toBe(true)
    expect(shipping.isEnabled(FeatureFlags.captureSuggestions)).toBe(true)
    expect(shipping.isEnabled(FeatureFlags.keyboardAccelerators)).toBe(true)
  })

  it("leave a flag the list does not name at canon's state — habits stays dark", () => {
    const shipping = makeWebShippingFeatureFlagService()

    expect(shipping.isEnabled(FeatureFlags.habits)).toBe(false)
    expect(webShippingOverrides.map((o) => o.flag.name)).not.toContain(
      FeatureFlags.habits.name,
    )
  })

  it('let a caller-supplied override win over the shipping list — a kill switch flipped at runtime', () => {
    const killed = makeWebShippingFeatureFlagService({
      overrides: [disabledAssignment(FeatureFlags.landingPage)],
    })

    expect(killed.isEnabled(FeatureFlags.landingPage)).toBe(false)
    expect(webShippingOverrides).toContain(webShippingLandingPageOverride)
  })

  it('list exactly the six web calls, each once', () => {
    const names = webShippingOverrides.map((o) => o.flag.name)

    expect(names).toEqual([
      'appearanceThemes',
      'supabaseHosting',
      'detailPaneInbox',
      'captureSuggestions',
      'keyboardAccelerators',
      'landingPage',
    ])
    expect(new Set(names).size).toBe(names.length)
  })
})
