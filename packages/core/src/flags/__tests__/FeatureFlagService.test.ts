import { describe, expect, it } from 'vitest'
import { featureFlagAssignmentMocks } from '../__mocks__/FeatureFlagAssignment.mocks'
import { FeatureFlags, allKnownFlags } from '../FeatureFlag'
import { FeatureFlagState } from '../FeatureFlagAssignment'
import { FeatureFlagBaseline } from '../FeatureFlagBaseline'
import { makeHardcodedFeatureFlagService } from '../FeatureFlagService'

describe('a service built with no options', () => {
  const service = makeHardcodedFeatureFlagService()

  it('starts from the ship baseline, so unfinished work stays dark by default', () => {
    expect(service.isEnabled(FeatureFlags.session)).toBe(true)
    expect(service.isEnabled(FeatureFlags.triage)).toBe(true)
    expect(service.isEnabled(FeatureFlags.sessionBreak)).toBe(false)
    expect(service.isEnabled(FeatureFlags.habits)).toBe(false)
  })

  it('reports no state at all for a flag the ship set never assigns', () => {
    expect(service.state(FeatureFlags.matrix)).toBeNull()
    expect(service.state(FeatureFlags.board)).toBeNull()
    expect(service.state(FeatureFlags.blueprints)).toBeNull()
    expect(service.state(FeatureFlags.developmentActions)).toBeNull()
  })

  it('reads an unassigned flag as off, even though its state is unknown', () => {
    expect(service.isEnabled(FeatureFlags.matrix)).toBe(false)
    expect(service.enabledResolver(FeatureFlags.blueprints)()).toBe(false)
  })

  it('resolves every declared flag to a definite answer', () => {
    for (const flag of allKnownFlags) {
      expect(typeof service.isEnabled(flag)).toBe('boolean')
    }
  })
})

describe('overrides layered over the baseline', () => {
  it('lets an override turn on a feature the ship set holds back', () => {
    const service = makeHardcodedFeatureFlagService({
      overrides: [featureFlagAssignmentMocks.sessionBreakOverrideOn],
    })
    expect(service.isEnabled(FeatureFlags.sessionBreak)).toBe(true)
  })

  it('lets an override turn off a feature the ship set enables', () => {
    const service = makeHardcodedFeatureFlagService({
      overrides: [featureFlagAssignmentMocks.sessionOverrideOff],
    })
    expect(service.isEnabled(FeatureFlags.session)).toBe(false)
  })

  it('lets an override give a state to a flag the ship set never assigns', () => {
    const service = makeHardcodedFeatureFlagService({
      overrides: [featureFlagAssignmentMocks.matrixOverrideOn],
    })
    expect(service.state(FeatureFlags.matrix)).toBe(FeatureFlagState.enabled)
  })

  it('keeps the baseline visible underneath, so the Debug list can show what was overridden', () => {
    const service = makeHardcodedFeatureFlagService({
      overrides: [featureFlagAssignmentMocks.sessionBreakOverrideOn],
    })
    const sessionBreakEntries = service
      .assignments()
      .filter((assignment) => assignment.flag.name === 'sessionBreak')
    expect(sessionBreakEntries.map((entry) => entry.state)).toEqual([
      'disabled',
      'enabled',
    ])
  })

  it('lets the last of several overrides for one flag win', () => {
    const service = makeHardcodedFeatureFlagService({
      overrides: [
        featureFlagAssignmentMocks.sessionBreakOverrideOn,
        { flag: FeatureFlags.sessionBreak, state: FeatureFlagState.disabled },
      ],
    })
    expect(service.isEnabled(FeatureFlags.sessionBreak)).toBe(false)
  })
})

describe('the allEnabled baseline', () => {
  const service = makeHardcodedFeatureFlagService({
    baseline: FeatureFlagBaseline.allEnabled,
  })

  it('turns on every declared flag, including the four with no ship assignment', () => {
    for (const flag of allKnownFlags) expect(service.isEnabled(flag)).toBe(true)
  })

  it('ignores the ship set entirely — a flag disabled there is still on', () => {
    expect(service.isEnabled(FeatureFlags.habits)).toBe(true)
    expect(service.isEnabled(FeatureFlags.authenticationEnforced)).toBe(true)
  })

  it('still yields to an override appended after it', () => {
    const overridden = makeHardcodedFeatureFlagService({
      baseline: FeatureFlagBaseline.allEnabled,
      overrides: [featureFlagAssignmentMocks.sessionOverrideOff],
    })
    expect(overridden.isEnabled(FeatureFlags.session)).toBe(false)
  })
})

describe('development actions', () => {
  it('stays dark unless the caller says this is a development build', () => {
    expect(
      makeHardcodedFeatureFlagService().isEnabled(
        FeatureFlags.developmentActions,
      ),
    ).toBe(false)
  })

  it('lights up when the caller says so', () => {
    const service = makeHardcodedFeatureFlagService({
      developmentActionsEnabled: true,
    })
    expect(service.isEnabled(FeatureFlags.developmentActions)).toBe(true)
  })

  it('does not disturb any other flag', () => {
    const service = makeHardcodedFeatureFlagService({
      developmentActionsEnabled: true,
    })
    expect(service.isEnabled(FeatureFlags.habits)).toBe(false)
    expect(service.isEnabled(FeatureFlags.session)).toBe(true)
  })
})

describe('change', () => {
  it('turns a flag on at runtime', () => {
    const service = makeHardcodedFeatureFlagService()
    service.change(FeatureFlags.sessionBreak, FeatureFlagState.enabled)
    expect(service.isEnabled(FeatureFlags.sessionBreak)).toBe(true)
  })

  it('takes effect on a service that already carries an override for that flag', () => {
    // The bug canon's comment names: rewriting the *first* match would leave
    // the winning override untouched and the change would do nothing.
    const service = makeHardcodedFeatureFlagService({
      overrides: [featureFlagAssignmentMocks.sessionBreakOverrideOn],
    })
    service.change(FeatureFlags.sessionBreak, FeatureFlagState.disabled)
    expect(service.isEnabled(FeatureFlags.sessionBreak)).toBe(false)
  })

  it('assigns a flag the baseline never mentioned', () => {
    const service = makeHardcodedFeatureFlagService()
    service.change(FeatureFlags.blueprints, FeatureFlagState.enabled)
    expect(service.state(FeatureFlags.blueprints)).toBe('enabled')
  })

  it('rewrites in place rather than growing the list on every toggle', () => {
    const service = makeHardcodedFeatureFlagService()
    const before = service.assignments().length
    service.change(FeatureFlags.habits, FeatureFlagState.enabled)
    service.change(FeatureFlags.habits, FeatureFlagState.disabled)
    expect(service.assignments()).toHaveLength(before)
  })

  it('hands out a copy of the assignments, so a caller cannot mutate the service', () => {
    const service = makeHardcodedFeatureFlagService()
    const snapshot = service.assignments()
    service.change(FeatureFlags.habits, FeatureFlagState.enabled)
    expect(snapshot).not.toBe(service.assignments())
    expect(
      snapshot.find((assignment) => assignment.flag.name === 'habits')?.state,
    ).toBe('disabled')
  })
})

describe('enabledResolver', () => {
  it('re-reads the current state each time it is called', () => {
    const service = makeHardcodedFeatureFlagService()
    const resolve = service.enabledResolver(FeatureFlags.sessionBreak)
    expect(resolve()).toBe(false)
    service.change(FeatureFlags.sessionBreak, FeatureFlagState.enabled)
    expect(resolve()).toBe(true)
  })

  it('agrees with isEnabled for a shipped flag', () => {
    const service = makeHardcodedFeatureFlagService()
    expect(service.enabledResolver(FeatureFlags.now)()).toBe(
      service.isEnabled(FeatureFlags.now),
    )
  })

  it('reads an unassigned flag as off', () => {
    const service = makeHardcodedFeatureFlagService()
    expect(service.enabledResolver(FeatureFlags.board)()).toBe(false)
  })
})
