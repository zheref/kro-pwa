import { describe, expect, it } from 'vitest'
import {
  FeatureFlags,
  allKnownFlagNames,
  allKnownFlags,
  featureFlagNamed,
  isSameFeatureFlag,
} from '../FeatureFlag'

/**
 * The declared registry, transcribed from `KroCore/Domain/FeatureFlags.swift`'s
 * `FeatureFlag.allKnownFlags` at `KroApple@2c1ee45` — name-sorted, as canon
 * writes it. Hand-written rather than derived from `FeatureFlags`, for the same
 * reason the option table's snapshot is: it is the diff against canon.
 */
const CANON_FLAG_NAMES: readonly string[] = [
  'authenticationEnforced',
  'blueprints',
  'board',
  'calendarIntegration',
  'day',
  'developmentActions',
  'doActivityRings',
  'endeavorDetail',
  'googleCalendar',
  'googleCalendarIntegration',
  'habits',
  'lists',
  'matrix',
  'notifications',
  'now',
  'outlookCalendarIntegration',
  'quickDay',
  'remindersIntegration',
  'rewards',
  'session',
  'sessionBreak',
  'sessionDurationLearning',
  'sessionStopwatch',
  'settings',
  'supabaseHosting',
  'tasks',
  'timelineQuickEventCreation',
  'triage',
]

describe('the declared flag registry', () => {
  it('declares the 28 flags canon declares, and no others', () => {
    expect(allKnownFlagNames).toEqual(CANON_FLAG_NAMES)
    expect(allKnownFlags).toHaveLength(28)
  })

  it('keeps every constant in step with its own name, so a persisted key resolves', () => {
    for (const [property, flag] of Object.entries(FeatureFlags)) {
      expect(flag.name).toBe(property)
    }
  })

  it('sorts the known list by name — the order the Debug flag list renders', () => {
    expect(allKnownFlagNames).toEqual([...allKnownFlagNames].sort())
  })

  it('names every flag exactly once', () => {
    expect(new Set(allKnownFlagNames).size).toBe(allKnownFlagNames.length)
  })
})

describe('featureFlagNamed', () => {
  it('resolves a persisted override name back to its declared flag', () => {
    expect(featureFlagNamed('sessionBreak')).toBe(FeatureFlags.sessionBreak)
  })

  it('resolves nothing for a flag that was deleted between builds', () => {
    expect(featureFlagNamed('legacyOnboardingCarousel')).toBeNull()
  })

  it('does not match on a prefix or on different casing', () => {
    expect(featureFlagNamed('session')).toBe(FeatureFlags.session)
    expect(featureFlagNamed('Session')).toBeNull()
    expect(featureFlagNamed('sessionBrea')).toBeNull()
  })

  it('round-trips every declared flag', () => {
    for (const flag of allKnownFlags) {
      expect(featureFlagNamed(flag.name)).toBe(flag)
    }
  })
})

describe('isSameFeatureFlag', () => {
  it('matches a flag rebuilt from a persisted name against the declared constant', () => {
    expect(isSameFeatureFlag({ name: 'matrix' }, FeatureFlags.matrix)).toBe(
      true,
    )
  })

  it('separates two different flags', () => {
    expect(
      isSameFeatureFlag(FeatureFlags.session, FeatureFlags.sessionBreak),
    ).toBe(false)
  })

  it('is reflexive', () => {
    expect(isSameFeatureFlag(FeatureFlags.triage, FeatureFlags.triage)).toBe(
      true,
    )
  })
})
