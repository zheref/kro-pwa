import { describe, expect, it } from 'vitest'
import { FeatureFlags } from '../FeatureFlag'
import {
  FeatureFlagState,
  disabledAssignment,
  enabledAssignment,
  isAssignmentEnabled,
  makeFeatureFlagAssignment,
  resolveAssignedState,
} from '../FeatureFlagAssignment'

describe('building an assignment', () => {
  it('pins a flag to a state', () => {
    expect(
      makeFeatureFlagAssignment(FeatureFlags.triage, FeatureFlagState.enabled),
    ).toEqual({ flag: FeatureFlags.triage, state: 'enabled' })
  })

  it('reads the two shorthands as the states they name', () => {
    expect(enabledAssignment(FeatureFlags.now).state).toBe('enabled')
    expect(disabledAssignment(FeatureFlags.habits).state).toBe('disabled')
  })

  it('answers "is this on?" without a caller re-spelling the comparison', () => {
    expect(isAssignmentEnabled(enabledAssignment(FeatureFlags.now))).toBe(true)
    expect(isAssignmentEnabled(disabledAssignment(FeatureFlags.now))).toBe(
      false,
    )
  })
})

describe('resolveAssignedState', () => {
  it('finds the state of a flag the list assigns once', () => {
    const layers = [
      enabledAssignment(FeatureFlags.session),
      disabledAssignment(FeatureFlags.habits),
    ]
    expect(resolveAssignedState(layers, FeatureFlags.habits)).toBe('disabled')
  })

  it('lets the last layer win, which is how an override beats the baseline', () => {
    const layers = [
      disabledAssignment(FeatureFlags.sessionBreak),
      enabledAssignment(FeatureFlags.sessionBreak),
    ]
    expect(resolveAssignedState(layers, FeatureFlags.sessionBreak)).toBe(
      'enabled',
    )
  })

  it('lets a later layer turn something off again', () => {
    const layers = [
      enabledAssignment(FeatureFlags.session),
      disabledAssignment(FeatureFlags.session),
    ]
    expect(resolveAssignedState(layers, FeatureFlags.session)).toBe('disabled')
  })

  it('returns null for a flag no layer assigns, rather than guessing disabled', () => {
    expect(
      resolveAssignedState(
        [enabledAssignment(FeatureFlags.now)],
        FeatureFlags.matrix,
      ),
    ).toBeNull()
  })

  it('returns null against an empty list', () => {
    expect(resolveAssignedState([], FeatureFlags.now)).toBeNull()
  })

  it('matches by name, so a flag rebuilt from a persisted key still resolves', () => {
    const layers = [enabledAssignment(FeatureFlags.googleCalendar)]
    expect(resolveAssignedState(layers, { name: 'googleCalendar' })).toBe(
      'enabled',
    )
  })
})
