/**
 * The canned `State` variants stories and render tests share (`RC-31`).
 *
 * The point of these assertions is that the mocks are built from the schema
 * rather than typed out: a default that drifted from `SettingOptions.ts` would
 * make every green story prove nothing.
 */
import {
  allSettingOptions,
  sessionDefaultDurationOption,
  workingHoursEndOption,
  workingHoursStartOption,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { settingsSlice } from '../SettingsFeature'
import { SettingsMocks, defaultSettingValues } from '../SettingsMocks'

describe('the default snapshot is the schema, not a copy of it', () => {
  it('carries one entry per declared option', () => {
    expect(Object.keys(defaultSettingValues).sort()).toEqual(
      allSettingOptions.map((option) => option.key).sort(),
    )
  })

  it('carries each option declared default value', () => {
    for (const option of allSettingOptions) {
      expect(defaultSettingValues[option.key]).toBe(option.defaultValue)
    }
  })

  it('reproduces canon 09:00–17:00 working day without typing the numbers', () => {
    expect(defaultSettingValues[workingHoursStartOption.key]).toBe(9 * 60)
    expect(defaultSettingValues[workingHoursEndOption.key]).toBe(17 * 60)
  })
})

describe('the variants describe distinct, reachable worlds', () => {
  it('starts from the slice own initial state', () => {
    expect(SettingsMocks.idle).toEqual(settingsSlice.getInitialState())
  })

  it('keeps both working-hours values in the invalid variant — canon persists as entered', () => {
    const values = SettingsMocks.generalPaneInvalidHours.values

    expect(values[workingHoursStartOption.key]).toBe(18 * 60)
    expect(values[workingHoursEndOption.key]).toBe(9 * 60)
  })

  it('tunes the Session pane away from every default it claims to change', () => {
    const values = SettingsMocks.sessionPaneTuned.values

    expect(values[sessionDefaultDurationOption.key]).not.toBe(
      sessionDefaultDurationOption.defaultValue,
    )
    expect(values['session.soundOnEnd']).toBe(false)
  })

  it('gives each integration variant a different connection', () => {
    expect(SettingsMocks.integrationsDisconnected.google.connection.kind).toBe(
      'disconnected',
    )
    expect(SettingsMocks.integrationsConnected.google.connection.kind).toBe(
      'connected',
    )
    expect(SettingsMocks.integrationsUnconfigured.google.connection.kind).toBe(
      'unconfigured',
    )
    expect(
      SettingsMocks.integrationsNeedsReconnect.google.connection.kind,
    ).toBe('needsReconnect')
  })

  it('keeps the load-failed variant editable — defaults show, form still works', () => {
    expect(SettingsMocks.loadFailed.load.kind).toBe('failed')
    expect(Object.keys(SettingsMocks.loadFailed.values).length).toBeGreaterThan(
      0,
    )
  })
})
