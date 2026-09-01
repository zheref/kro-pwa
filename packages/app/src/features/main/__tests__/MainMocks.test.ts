/**
 * The canned states, checked for the two properties everything else relies on:
 * they are built from the slice's own initial state, and the shipping gate set
 * is the one the flag registry actually resolves.
 */
import { makeHardcodedFeatureFlagService } from '@kro/core'
import { FeatureFlags } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { initialMainState } from '../MainFeature'
import {
  MainMocks,
  allOpenGates,
  desktopSurface,
  handheldSurface,
  projectMocks,
  statusQuoGates,
  tabletSurface,
} from '../MainMocks'

describe('the gate sets', () => {
  it('matches what the shipping flag service actually resolves', () => {
    // The mock is a literal so a story reads clearly; this is what keeps the
    // literal honest against `FeatureFlagAssignment.statusQuoSet`.
    const flags = makeHardcodedFeatureFlagService()
    expect({
      tasks: flags.isEnabled(FeatureFlags.tasks),
      matrix: flags.isEnabled(FeatureFlags.matrix),
      day: flags.isEnabled(FeatureFlags.day),
      habits: flags.isEnabled(FeatureFlags.habits),
      session: flags.isEnabled(FeatureFlags.session),
      board: flags.isEnabled(FeatureFlags.board),
      rewards: flags.isEnabled(FeatureFlags.rewards),
      blueprints: flags.isEnabled(FeatureFlags.blueprints),
      settings: flags.isEnabled(FeatureFlags.settings),
      lists: flags.isEnabled(FeatureFlags.lists),
      now: flags.isEnabled(FeatureFlags.now),
    }).toEqual(statusQuoGates)
  })

  it('keeps the four staged-off destinations closed at the baseline', () => {
    expect(statusQuoGates.matrix).toBe(false)
    expect(statusQuoGates.habits).toBe(false)
    expect(statusQuoGates.board).toBe(false)
    expect(statusQuoGates.blueprints).toBe(false)
  })

  it('opens every gate in the development set', () => {
    expect(Object.values(allOpenGates).every(Boolean)).toBe(true)
  })
})

describe('the canned states', () => {
  it("are built from the slice's own initial state", () => {
    expect(MainMocks.idle).toEqual(initialMainState)
  })

  it('cover both shells on the same selection', () => {
    expect(MainMocks.desktopLoaded.surface).toEqual(desktopSurface)
    expect(MainMocks.handheldLoaded.surface).toEqual(handheldSurface)
    expect(MainMocks.desktopLoaded.selected).toEqual(
      MainMocks.handheldLoaded.selected,
    )
  })

  it('include a failure, a draft row and a collapsed sidebar', () => {
    expect(MainMocks.desktopListsFailed.load.kind).toBe('failed')
    expect(MainMocks.desktopAddingProject.isAddingProject).toBe(true)
    expect(MainMocks.desktopSidebarHidden.isSidebarVisible).toBe(false)
  })

  it('offer a touch surface that is still sidebar-shaped', () => {
    expect(tabletSurface).toEqual({ idiom: 'tablet', width: 'regular' })
  })

  it('offer project titles that stress a 200px column', () => {
    expect(projectMocks.long.title.length).toBeGreaterThan(40)
    expect(projectMocks.unicode.title).toContain('🌸')
  })
})
