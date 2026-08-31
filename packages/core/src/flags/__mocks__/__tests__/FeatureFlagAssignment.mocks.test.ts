import { describe, expect, it } from 'vitest'
import { allKnownFlagNames } from '../../FeatureFlag'
import { statusQuoSet } from '../../FeatureFlagAssignments'
import {
  allFeatureFlagAssignmentMocks,
  featureFlagAssignmentMocks,
} from '../FeatureFlagAssignment.mocks'

const shipState = (name: string) =>
  statusQuoSet.find((assignment) => assignment.flag.name === name)?.state ??
  null

describe('the FeatureFlagAssignment mock spread', () => {
  it('ships the seven variants RC-13 requires', () => {
    expect(allFeatureFlagAssignmentMocks).toHaveLength(7)
  })

  it('covers both states', () => {
    const states = new Set(
      allFeatureFlagAssignmentMocks.map((assignment) => assignment.state),
    )
    expect(states).toEqual(new Set(['enabled', 'disabled']))
  })

  it('names only flags the registry declares', () => {
    const declared = new Set(allKnownFlagNames)
    for (const assignment of allFeatureFlagAssignmentMocks) {
      expect(declared.has(assignment.flag.name)).toBe(true)
    }
  })

  it('agrees with the ship set on the three convenient fixtures', () => {
    expect(featureFlagAssignmentMocks.sessionEnabled.state).toBe(
      shipState('session'),
    )
    expect(featureFlagAssignmentMocks.endeavorDetailDisabled.state).toBe(
      shipState('endeavorDetail'),
    )
    expect(featureFlagAssignmentMocks.doActivityRingsEnabled.state).toBe(
      shipState('doActivityRings'),
    )
  })

  it('contradicts the ship set on the two override fixtures — that is what makes them inconvenient', () => {
    expect(featureFlagAssignmentMocks.sessionBreakOverrideOn.state).not.toBe(
      shipState('sessionBreak'),
    )
    expect(featureFlagAssignmentMocks.sessionOverrideOff.state).not.toBe(
      shipState('session'),
    )
  })

  it('includes a flag the ship set never assigns at all', () => {
    expect(shipState('matrix')).toBeNull()
    expect(featureFlagAssignmentMocks.matrixOverrideOn.state).toBe('enabled')
  })

  it('includes developmentActions, which is neither a ship assignment nor a user toggle', () => {
    expect(shipState('developmentActions')).toBeNull()
    expect(featureFlagAssignmentMocks.developmentActionsEnabled.state).toBe(
      'enabled',
    )
  })
})
