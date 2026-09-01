/**
 * The settings slice's synchronous reducer arms, called directly against the
 * slice's own `reducer` — no store, no middleware (`RC-12`).
 *
 * The thunk-lifecycle arms are covered by `SettingsProducer.test.ts`, driven
 * through the real thunks against stubbed Services (`RC-54`), which is where
 * they belong: an arm asserted with a hand-built action would pass on a payload
 * the Producer can no longer produce.
 */
import { describe, expect, it } from 'vitest'
import {
  childAuthDelegatedSignedIn,
  settingsSlice,
  userDidDismissAuth,
  userDidTapBackToHub,
  userDidTapSection,
  userDidTapSignIn,
} from '../SettingsFeature'
import { SettingsMocks } from '../SettingsMocks'
import { SettingsSectionId } from '../SettingsSection'

const { reducer, getInitialState } = settingsSlice

describe('userDidTapSection', () => {
  it('opens the pane the row names — a user taps General', () => {
    const next = reducer(
      getInitialState(),
      userDidTapSection(SettingsSectionId.general),
    )

    expect(next.pane).toEqual({
      kind: 'section',
      section: SettingsSectionId.general,
    })
  })

  it('replaces an open pane rather than stacking — Settings has one column here', () => {
    const first = reducer(
      getInitialState(),
      userDidTapSection(SettingsSectionId.general),
    )
    const second = reducer(
      first,
      userDidTapSection(SettingsSectionId.integrations),
    )

    expect(second.pane).toEqual({
      kind: 'section',
      section: SettingsSectionId.integrations,
    })
  })

  it('leaves the loaded values untouched — opening a pane reads nothing', () => {
    const next = reducer(
      SettingsMocks.loaded,
      userDidTapSection(SettingsSectionId.sessionPreferences),
    )

    expect(next.values).toBe(SettingsMocks.loaded.values)
  })
})

describe('userDidTapBackToHub', () => {
  it('returns from a pane to the hub — the back affordance', () => {
    expect(
      reducer(SettingsMocks.generalPane, userDidTapBackToHub()).pane,
    ).toEqual({ kind: 'hub' })
  })

  it('is a no-op on the hub — a stray back press changes nothing', () => {
    expect(reducer(SettingsMocks.loaded, userDidTapBackToHub()).pane).toEqual({
      kind: 'hub',
    })
  })

  it('does not disturb the Google connection on the way back', () => {
    const next = reducer(
      SettingsMocks.integrationsConnected,
      userDidTapBackToHub(),
    )

    expect(next.google.connection).toEqual({ kind: 'connected' })
  })
})

describe('userDidTapSignIn', () => {
  it('presents the auth surface from the profile popover', () => {
    const next = reducer(
      getInitialState(),
      userDidTapSignIn({ origin: 'profilePopover' }),
    )

    expect(next.authPresentation).toEqual({
      kind: 'presented',
      origin: 'profilePopover',
    })
  })

  it("presents it from the hub's signed-out row, remembering that origin", () => {
    const next = reducer(
      SettingsMocks.loaded,
      userDidTapSignIn({ origin: 'settingsHub' }),
    )

    expect(next.authPresentation).toEqual({
      kind: 'presented',
      origin: 'settingsHub',
    })
  })

  it('re-presenting from the other entry point updates the origin', () => {
    const first = reducer(
      getInitialState(),
      userDidTapSignIn({ origin: 'profilePopover' }),
    )
    const second = reducer(first, userDidTapSignIn({ origin: 'settingsHub' }))

    expect(second.authPresentation).toEqual({
      kind: 'presented',
      origin: 'settingsHub',
    })
  })
})

describe('dismissing the auth surface', () => {
  it('hides it on Cancel', () => {
    expect(
      reducer(SettingsMocks.authPresented, userDidDismissAuth())
        .authPresentation,
    ).toEqual({ kind: 'hidden' })
  })

  it('hides it when the session arrives — the delegated sign-in', () => {
    expect(
      reducer(SettingsMocks.authPresented, childAuthDelegatedSignedIn())
        .authPresentation,
    ).toEqual({ kind: 'hidden' })
  })

  it('is a no-op when it was never presented', () => {
    expect(
      reducer(SettingsMocks.loaded, userDidDismissAuth()).authPresentation,
    ).toEqual({ kind: 'hidden' })
  })
})
