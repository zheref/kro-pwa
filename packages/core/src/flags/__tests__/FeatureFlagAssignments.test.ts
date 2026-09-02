/**
 * `statusQuoSet`, transcribed from `KroCore/Domain/FeatureFlags.swift` at
 * `KroApple@2c1ee45`. The two literals below are the ship baseline's whole
 * content, hand-written from the Swift rather than derived from
 * `FeatureFlagAssignments.ts` — the same reasoning as the option-table snapshot:
 * a derived expectation would confirm only that the port has not changed.
 */
import { describe, expect, it } from 'vitest'
import { allKnownFlagNames } from '../FeatureFlag'
import {
  allEnabledSet,
  statusQuoSet,
  unassignedInStatusQuo,
} from '../FeatureFlagAssignments'

const CANON_ENABLED: readonly string[] = [
  'session',
  'tasks',
  'lists',
  'rewards',
  'day',
  'quickDay',
  'remindersIntegration',
  'settings',
  'calendarIntegration',
  'googleCalendarIntegration',
  'googleCalendar',
  'now',
  'triage',
  'doActivityRings',
  'timelineQuickEventCreation',
]

const CANON_DISABLED: readonly string[] = [
  'authenticationEnforced',
  'sessionStopwatch',
  'sessionDurationLearning',
  'sessionBreak',
  'supabaseHosting',
  'habits',
  'notifications',
  'endeavorDetail',
  'outlookCalendarIntegration',
  'appearanceThemes',
]

const namesWithState = (state: 'enabled' | 'disabled') =>
  statusQuoSet
    .filter((assignment) => assignment.state === state)
    .map((assignment) => assignment.flag.name)

describe('statusQuoSet', () => {
  it('turns on exactly the fifteen features KroApple ships today', () => {
    expect(new Set(namesWithState('enabled'))).toEqual(new Set(CANON_ENABLED))
    expect(namesWithState('enabled')).toHaveLength(15)
  })

  it('holds off exactly the ten features KroApple has staged but not shipped', () => {
    expect(new Set(namesWithState('disabled'))).toEqual(new Set(CANON_DISABLED))
    expect(namesWithState('disabled')).toHaveLength(10)
  })

  it('assigns 25 of the 29 declared flags', () => {
    expect(statusQuoSet).toHaveLength(25)
  })

  it('leaves matrix, board, blueprints and developmentActions unassigned — declared, never staged', () => {
    expect(new Set(unassignedInStatusQuo)).toEqual(
      new Set(['matrix', 'board', 'blueprints', 'developmentActions']),
    )
  })

  it('assigns each flag at most once, so its order cannot change what it means', () => {
    const names = statusQuoSet.map((assignment) => assignment.flag.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('names only flags the registry declares', () => {
    const declared = new Set(allKnownFlagNames)
    for (const assignment of statusQuoSet) {
      expect(declared.has(assignment.flag.name)).toBe(true)
    }
  })
})

describe('the allEnabled baseline', () => {
  it('turns on every declared flag, including the four statusQuo never assigns', () => {
    expect(allEnabledSet).toHaveLength(29)
    for (const assignment of allEnabledSet) {
      expect(assignment.state).toBe('enabled')
    }
  })

  it('already seeds developmentActions, which is why the statusQuo branch adds it separately', () => {
    const names = allEnabledSet.map((assignment) => assignment.flag.name)
    expect(names).toContain('developmentActions')
    expect(names.filter((name) => name === 'developmentActions')).toHaveLength(
      1,
    )
  })

  it('covers the registry exactly', () => {
    expect(allEnabledSet.map((assignment) => assignment.flag.name)).toEqual(
      allKnownFlagNames,
    )
  })
})
