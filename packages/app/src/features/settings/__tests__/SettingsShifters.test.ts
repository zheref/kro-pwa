/**
 * The settings Shifters — pure, no store, no dispatch, no timers (`RC-56`).
 */
import { describe, expect, it } from 'vitest'
import { SettingsExceptions } from '../SettingsException'
import { SettingsSectionId } from '../SettingsSection'
import {
  withAuthDismissed,
  withAuthPresented,
  withGoogleBusy,
  withGoogleConnection,
  withGoogleEnabled,
  withGoogleFailed,
  withPaneClosed,
  withPaneOpened,
  withPreferencesFailed,
  withPreferencesLoaded,
  withPreferencesLoading,
  withSettingValue,
} from '../SettingsShifters'
import { initialSettingsState } from '../SettingsState'

const base = initialSettingsState

describe('withPreferencesLoading', () => {
  it('moves an untouched surface into loading — first open', () => {
    expect(withPreferencesLoading(base).load).toEqual({ kind: 'loading' })
  })

  it('clears a previous failure so a retry starts clean', () => {
    const failed = withPreferencesFailed(
      base,
      SettingsExceptions.preferencesUnavailable('quota'),
    )

    expect(withPreferencesLoading(failed).load).toEqual({ kind: 'loading' })
  })

  it('leaves the values alone — a reload must not blank the form', () => {
    const loaded = withPreferencesLoaded(base, { 'general.haptics': true })

    expect(withPreferencesLoading(loaded).values).toEqual({
      'general.haptics': true,
    })
  })
})

describe('withPreferencesLoaded', () => {
  it('records the snapshot and reports loaded — the ordinary open', () => {
    const next = withPreferencesLoaded(base, { 'session.defaultDuration': 20 })

    expect(next.load).toEqual({ kind: 'loaded' })
    expect(next.values['session.defaultDuration']).toBe(20)
  })

  it('replaces rather than merges, so a wiped key does not survive on screen', () => {
    const first = withPreferencesLoaded(base, { 'general.haptics': true })
    const second = withPreferencesLoaded(first, { 'general.streakReminders': false })

    expect('general.haptics' in second.values).toBe(false)
  })

  it('accepts an empty snapshot — a store with nothing stored yet', () => {
    expect(withPreferencesLoaded(base, {}).values).toEqual({})
  })
})

describe('withSettingValue', () => {
  it('records one accepted write without touching its neighbours', () => {
    const loaded = withPreferencesLoaded(base, {
      'session.defaultDuration': 20,
      'session.defaultBreakDuration': 5,
    })
    const next = withSettingValue(loaded, 'session.defaultDuration', 45)

    expect(next.values['session.defaultDuration']).toBe(45)
    expect(next.values['session.defaultBreakDuration']).toBe(5)
  })

  it('records a null — an option cleared back to "unset"', () => {
    const next = withSettingValue(base, 'general.timezone', null)
    expect(next.values['general.timezone']).toBeNull()
  })

  it('is a no-op in effect when the value is unchanged', () => {
    const loaded = withPreferencesLoaded(base, { 'general.haptics': true })
    expect(withSettingValue(loaded, 'general.haptics', true).values).toEqual(
      loaded.values,
    )
  })
})

describe('pane navigation', () => {
  it('opens a section from the hub', () => {
    expect(withPaneOpened(base, SettingsSectionId.general).pane).toEqual({
      kind: 'section',
      section: SettingsSectionId.general,
    })
  })

  it('replaces one open pane with another rather than stacking', () => {
    const first = withPaneOpened(base, SettingsSectionId.general)
    const second = withPaneOpened(first, SettingsSectionId.integrations)

    expect(second.pane).toEqual({
      kind: 'section',
      section: SettingsSectionId.integrations,
    })
  })

  it('returns to the hub, and is a no-op when already there', () => {
    const open = withPaneOpened(base, SettingsSectionId.profile)

    expect(withPaneClosed(open).pane).toEqual({ kind: 'hub' })
    expect(withPaneClosed(base).pane).toEqual({ kind: 'hub' })
  })
})

describe('the Google integration', () => {
  it('records an answer and ends the attempt that asked for it', () => {
    const busy = withGoogleBusy(base)
    const next = withGoogleConnection(busy, { kind: 'connected' })

    expect(next.google.connection).toEqual({ kind: 'connected' })
    expect(next.google.isBusy).toBe(false)
    expect(next.google.exception).toBeNull()
  })

  it('spins and clears the previous error when an attempt starts', () => {
    const failed = withGoogleFailed(
      base,
      SettingsExceptions.integrationUnavailable('502'),
    )
    const next = withGoogleBusy(failed)

    expect(next.google.isBusy).toBe(true)
    expect(next.google.exception).toBeNull()
  })

  it('leaves a working grant untouched when an attempt fails', () => {
    const connected = withGoogleConnection(base, { kind: 'connected' })
    const next = withGoogleFailed(
      connected,
      SettingsExceptions.integrationUnavailable('502'),
    )

    expect(next.google.connection).toEqual({ kind: 'connected' })
    expect(next.google.isBusy).toBe(false)
    expect(next.google.exception?.kind).toBe('integrationUnavailable')
  })

  it('records the flag without disturbing the connection', () => {
    const connected = withGoogleConnection(base, { kind: 'needsReconnect' })
    const next = withGoogleEnabled(connected, true)

    expect(next.google.isEnabled).toBe(true)
    expect(next.google.connection).toEqual({ kind: 'needsReconnect' })
  })
})

describe('the auth presentation', () => {
  it('remembers which entry point opened it — the popover', () => {
    expect(withAuthPresented(base, 'profilePopover').authPresentation).toEqual({
      kind: 'presented',
      origin: 'profilePopover',
    })
  })

  it('remembers the hub as an origin too', () => {
    expect(withAuthPresented(base, 'settingsHub').authPresentation).toEqual({
      kind: 'presented',
      origin: 'settingsHub',
    })
  })

  it('hides it, and is a no-op when already hidden', () => {
    const shown = withAuthPresented(base, 'settingsHub')

    expect(withAuthDismissed(shown).authPresentation).toEqual({ kind: 'hidden' })
    expect(withAuthDismissed(base).authPresentation).toEqual({ kind: 'hidden' })
  })
})
