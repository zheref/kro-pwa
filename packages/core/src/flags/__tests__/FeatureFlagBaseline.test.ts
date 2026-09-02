import { describe, expect, it } from 'vitest'
import {
  FeatureFlagBaseline,
  baselineAssignments,
} from '../FeatureFlagBaseline'
import { allEnabledSet, statusQuoSet } from '../FeatureFlagAssignments'

const namesIn = (assignments: readonly { flag: { name: string } }[]) =>
  assignments.map((assignment) => assignment.flag.name)

describe('the statusQuo baseline', () => {
  it('is the ship set, unmodified, in a production build', () => {
    expect(baselineAssignments(FeatureFlagBaseline.statusQuo)).toEqual(
      statusQuoSet,
    )
  })

  it('adds developmentActions when the caller says this is a development build', () => {
    const assignments = baselineAssignments(FeatureFlagBaseline.statusQuo, {
      developmentActionsEnabled: true,
    })
    expect(assignments).toHaveLength(statusQuoSet.length + 1)
    expect(namesIn(assignments).at(-1)).toBe('developmentActions')
  })

  it('appends it last, so it wins over anything the ship set said', () => {
    const assignments = baselineAssignments(FeatureFlagBaseline.statusQuo, {
      developmentActionsEnabled: true,
    })
    expect(assignments.at(-1)?.state).toBe('enabled')
  })

  it('leaves it out when the caller says nothing — a build that forgets stays dark', () => {
    expect(
      namesIn(baselineAssignments(FeatureFlagBaseline.statusQuo, {})),
    ).not.toContain('developmentActions')
  })
})

describe('the allEnabled baseline', () => {
  it('turns every declared flag on and ignores the per-flag ship defaults', () => {
    expect(baselineAssignments(FeatureFlagBaseline.allEnabled)).toEqual(
      allEnabledSet,
    )
  })

  it('does not add a second developmentActions entry, even when asked', () => {
    const assignments = baselineAssignments(FeatureFlagBaseline.allEnabled, {
      developmentActionsEnabled: true,
    })
    expect(
      namesIn(assignments).filter((name) => name === 'developmentActions'),
    ).toHaveLength(1)
    expect(assignments).toHaveLength(29)
  })

  it('leaves nothing unassigned, which is what makes it the development baseline', () => {
    expect(baselineAssignments(FeatureFlagBaseline.allEnabled)).toHaveLength(29)
  })
})
