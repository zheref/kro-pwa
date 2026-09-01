/**
 * The lens panel's render tests, mirroring
 * `PlanVisibilityPanelFragment.stories` (`RC-11`).
 *
 * The rule worth pinning is the inversion: state stores `hidden…`, a user
 * reads "shown". A row that reported the raw set would be checked when the
 * thing is invisible, which is the kind of bug that reads as correct in code
 * and backwards on screen.
 */
import { EndeavorComputedState, EndeavorHost, EndeavorKind } from '@kro/core'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialPlanVisibility } from '../../PlanState'
import {
  PlanVisibilityPanelFragment,
  areAllPlanFiltersEnabled,
} from '../PlanVisibilityPanelFragment'

afterEach(cleanup)

const mount = (
  overrides: Partial<Parameters<typeof PlanVisibilityPanelFragment>[0]> = {},
) =>
  render(
    <PlanVisibilityPanelFragment
      visibility={initialPlanVisibility}
      onToggle={() => {}}
      {...overrides}
    />,
  )

describe('PlanVisibilityPanelFragment', () => {
  it('offers canon three families and nothing the web cannot honour', () => {
    mount()

    // A labelled `<section>` is a landmark `region`, which is what makes the
    // three families navigable rather than one flat run of switches.
    expect(screen.getByRole('region', { name: 'Show' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Kinds' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Sources' })).toBeTruthy()
    // Apple Calendar and Apple Reminders are out of scope for the web epic; a
    // filter for a host that can never appear is a control with no effect.
    expect(screen.queryByRole('switch', { name: 'Apple Calendar' })).toBeNull()
  })

  it('offers canon four kinds, not the domain seven internal shapes', () => {
    mount()

    for (const label of ['Events', 'Tasks', 'Habits', 'Reminders']) {
      expect(screen.getByRole('switch', { name: label })).toBeTruthy()
    }
    expect(screen.queryByRole('switch', { name: 'Blueprint' })).toBeNull()
  })

  it('shows everything as ON with the vista defaults — nothing is filtered yet', () => {
    mount()

    for (const row of screen.getAllByRole('switch')) {
      expect(row.getAttribute('aria-checked')).toBe('true')
    }
  })

  it('INVERTS the stored set: a hidden kind reads as an unchecked row', () => {
    mount({
      visibility: {
        ...initialPlanVisibility,
        hiddenKinds: [EndeavorKind.habit],
      },
    })

    expect(
      screen
        .getByRole('switch', { name: 'Habits' })
        .getAttribute('aria-checked'),
    ).toBe('false')
    expect(
      screen
        .getByRole('switch', { name: 'Tasks' })
        .getAttribute('aria-checked'),
    ).toBe('true')
  })

  it('emits one axis-tagged toggle per row, never a whole new visibility object', async () => {
    const onToggle = vi.fn()
    mount({ onToggle })

    await userEvent.click(
      screen.getByRole('switch', { name: 'Google Calendar' }),
    )

    expect(onToggle).toHaveBeenCalledWith({
      axis: 'host',
      value: EndeavorHost.googleCalendar,
    })
  })

  it('maps canon "Completed" onto the computed state, not onto a status', async () => {
    const onToggle = vi.fn()
    mount({ onToggle })

    await userEvent.click(screen.getByRole('switch', { name: 'Completed' }))

    expect(onToggle).toHaveBeenCalledWith({
      axis: 'computedState',
      value: EndeavorComputedState.completedToday,
    })
  })
})

describe('areAllPlanFiltersEnabled', () => {
  it('is true on the vista own defaults — the eye is open on a fresh day', () => {
    expect(areAllPlanFiltersEnabled(initialPlanVisibility)).toBe(true)
  })

  it('turns false the moment any single axis hides something', () => {
    expect(
      areAllPlanFiltersEnabled({
        ...initialPlanVisibility,
        hiddenHosts: [EndeavorHost.googleCalendar],
      }),
    ).toBe(false)
  })

  it('counts a hidden calendar too, even though no row offers one yet', () => {
    expect(
      areAllPlanFiltersEnabled({
        ...initialPlanVisibility,
        hiddenCalendarIds: ['work@example.com'],
      }),
    ).toBe(false)
  })
})
