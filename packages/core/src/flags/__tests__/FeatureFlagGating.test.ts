import { describe, expect, it } from 'vitest'
import { makeInMemoryKeyValueStore } from '../../settings/__mocks__/KeyValueStore.mocks'
import { makePreferences } from '../../settings/Preferences'
import { FeatureFlags } from '../FeatureFlag'
import { FeatureFlagState } from '../FeatureFlagAssignment'
import {
  featureGates,
  isCapabilityAvailable,
  isGateAvailable,
  overdueNotificationsGate,
  sessionBreaksGate,
  sessionDurationLearningGate,
  sessionStopwatchGate,
} from '../FeatureFlagGating'
import { makeHardcodedFeatureFlagService } from '../FeatureFlagService'

describe('the AND truth table', () => {
  it('is available only when the flag and the preference both allow it', () => {
    expect(isCapabilityAvailable(true, true)).toBe(true)
  })

  it('is unavailable when the rollout flag is off, whatever the user asked for', () => {
    expect(isCapabilityAvailable(false, true)).toBe(false)
  })

  it('is unavailable when the user switched it off, however far the rollout got', () => {
    expect(isCapabilityAvailable(true, false)).toBe(false)
  })

  it('is unavailable when neither allows it', () => {
    expect(isCapabilityAvailable(false, false)).toBe(false)
  })

  it('needs every preference when a capability names more than one', () => {
    expect(isCapabilityAvailable(true, true, true)).toBe(true)
    expect(isCapabilityAvailable(true, true, false)).toBe(false)
    expect(isCapabilityAvailable(true, false, true)).toBe(false)
  })

  it('degrades to the flag alone when a capability names no preference', () => {
    expect(isCapabilityAvailable(true)).toBe(true)
    expect(isCapabilityAvailable(false)).toBe(false)
  })
})

describe('the declared gates', () => {
  it('pairs the stopwatch flag with the stopwatch preference', () => {
    expect(sessionStopwatchGate.flag).toBe(FeatureFlags.sessionStopwatch)
    expect(sessionStopwatchGate.options.map((option) => option.key)).toEqual([
      'session.enableStopwatch',
    ])
  })

  it('pairs the break flag with the break preference', () => {
    expect(sessionBreaksGate.flag).toBe(FeatureFlags.sessionBreak)
    expect(sessionBreaksGate.options.map((option) => option.key)).toEqual([
      'session.enableBreaks',
    ])
  })

  it('pairs the notifications flag with both overdue toggles', () => {
    expect(overdueNotificationsGate.flag).toBe(FeatureFlags.notifications)
    expect(
      overdueNotificationsGate.options.map((option) => option.key),
    ).toEqual(['general.overdueAlerts', 'do.notifyOnOverdue'])
  })

  it('records duration learning as a flag-only capability, not an oversight', () => {
    expect(sessionDurationLearningGate.options).toEqual([])
  })

  it('gives every gate a distinct id', () => {
    const ids = featureGates.map((gate) => gate.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('evaluating a gate', () => {
  const preferencesWith = (
    overrides: Readonly<Record<string, boolean>> = {},
  ) => {
    const seed = Object.fromEntries(
      Object.entries(overrides).map(([key, value]) => [`kro:${key}`, value]),
    )
    return makePreferences(makeInMemoryKeyValueStore(seed))
  }

  it('holds the stopwatch back on a ship build, even though the user wants it', () => {
    const service = makeHardcodedFeatureFlagService()
    // The preference defaults to on; the flag is what is holding it.
    expect(
      isGateAvailable(sessionStopwatchGate, service, preferencesWith()),
    ).toBe(false)
  })

  it('offers the stopwatch once the flag is turned on and the preference is still on', () => {
    const service = makeHardcodedFeatureFlagService()
    service.change(FeatureFlags.sessionStopwatch, FeatureFlagState.enabled)
    expect(
      isGateAvailable(sessionStopwatchGate, service, preferencesWith()),
    ).toBe(true)
  })

  it('withholds the stopwatch when the flag is on but the user switched it off', () => {
    const service = makeHardcodedFeatureFlagService()
    service.change(FeatureFlags.sessionStopwatch, FeatureFlagState.enabled)
    const preferences = preferencesWith({ 'session.enableStopwatch': false })
    expect(isGateAvailable(sessionStopwatchGate, service, preferences)).toBe(
      false,
    )
  })

  it('applies the same rule to breaks', () => {
    const service = makeHardcodedFeatureFlagService()
    expect(isGateAvailable(sessionBreaksGate, service, preferencesWith())).toBe(
      false,
    )
    service.change(FeatureFlags.sessionBreak, FeatureFlagState.enabled)
    expect(isGateAvailable(sessionBreaksGate, service, preferencesWith())).toBe(
      true,
    )
  })

  it('needs the flag and both toggles before an overdue alert is scheduled', () => {
    const service = makeHardcodedFeatureFlagService()
    service.change(FeatureFlags.notifications, FeatureFlagState.enabled)

    expect(
      isGateAvailable(overdueNotificationsGate, service, preferencesWith()),
    ).toBe(true)
    expect(
      isGateAvailable(
        overdueNotificationsGate,
        service,
        preferencesWith({ 'general.overdueAlerts': false }),
      ),
    ).toBe(false)
    expect(
      isGateAvailable(
        overdueNotificationsGate,
        service,
        preferencesWith({ 'do.notifyOnOverdue': false }),
      ),
    ).toBe(false)
  })

  it('withholds overdue alerts on a ship build, where the notifications flag is off', () => {
    expect(
      isGateAvailable(
        overdueNotificationsGate,
        makeHardcodedFeatureFlagService(),
        preferencesWith(),
      ),
    ).toBe(false)
  })

  it('follows the flag alone for a capability with no preference', () => {
    const service = makeHardcodedFeatureFlagService()
    expect(
      isGateAvailable(sessionDurationLearningGate, service, preferencesWith()),
    ).toBe(false)
    service.change(
      FeatureFlags.sessionDurationLearning,
      FeatureFlagState.enabled,
    )
    expect(
      isGateAvailable(sessionDurationLearningGate, service, preferencesWith()),
    ).toBe(true)
  })

  it('opens every gate under the all-enabled development baseline', () => {
    const service = makeHardcodedFeatureFlagService({
      baseline: 'allEnabled',
    })
    for (const gate of featureGates) {
      expect(isGateAvailable(gate, service, preferencesWith())).toBe(true)
    }
  })
})
