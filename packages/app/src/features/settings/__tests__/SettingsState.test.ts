/**
 * The settings slice's initial shape.
 *
 * These pin the two decisions the shape encodes: nothing is claimed before it
 * is known (`unknown`, `idle`, `hidden`), and the four lifecycles are separate
 * fields so a failure in one cannot describe another.
 */
import { describe, expect, it } from 'vitest'
import { SUBSCRIPTION_PLAN_NAME, initialSettingsState } from '../SettingsState'

describe('the initial state claims nothing it does not know', () => {
  it('has not read the preference store yet', () => {
    expect(initialSettingsState.load).toEqual({ kind: 'idle' })
    expect(initialSettingsState.values).toEqual({})
  })

  it('reports the Google connection as unknown, never as unconfigured', () => {
    // The two are different: `unconfigured` says the deployment is broken, and
    // saying that before asking would be wrong on every correct deployment.
    expect(initialSettingsState.google.connection).toEqual({ kind: 'unknown' })
  })

  it('opens on the hub with no auth surface presented', () => {
    expect(initialSettingsState.pane).toEqual({ kind: 'hub' })
    expect(initialSettingsState.authPresentation).toEqual({ kind: 'hidden' })
  })

  it('treats the googleCalendar flag as off until it is resolved', () => {
    expect(initialSettingsState.google.isEnabled).toBe(false)
    expect(initialSettingsState.google.isBusy).toBe(false)
    expect(initialSettingsState.google.exception).toBeNull()
  })

  it('seeds Appearance on, matching the web product override', () => {
    expect(initialSettingsState.isAppearanceThemesEnabled).toBe(true)
  })
})

describe('the subscription plan is a constant, because canon has no flow', () => {
  it('names the only tier that exists', () => {
    expect(SUBSCRIPTION_PLAN_NAME).toBe('Free')
  })
})
