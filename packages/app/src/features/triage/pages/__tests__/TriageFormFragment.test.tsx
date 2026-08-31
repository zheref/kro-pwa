/**
 * The Triage form's render tests, mirroring `TriageFormFragment.stories`
 * 1:1 (`RC-11`).
 *
 * Every state comes from the same `triageFormProps` seam the stories use, so a
 * divergence between the two sets is a real disagreement rather than two
 * different hand-built prop bags.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EisenhowerQuadrant } from '@kro/core'
import { triageStateMocks } from '../../TriageMocks'
import { TriageExpiryPreset } from '../../TriageExpiry'
import { TriageFormFragment } from '../TriageFormFragment'
import { triageFormProps, triagePageStateMocks } from './triageHarness'
import type { TriageFormFragmentProps } from '../TriageFormFragment'

afterEach(cleanup)

const mount = (
  slice: Parameters<typeof triageFormProps>[0],
  overrides: Partial<TriageFormFragmentProps> = {},
) => render(<TriageFormFragment {...triageFormProps(slice, overrides)} />)

describe('Pristine — the story of the same name', () => {
  it('shows the endeavor in the header with its live reward badge', () => {
    mount(triageStateMocks.pristine)

    expect(screen.getByText('Draft Q3 product plan')).toBeTruthy()
    expect(
      screen.getByTestId('triage-reward-badge').getAttribute('aria-label'),
    ).toBe('Reward: 10 points')
  })

  it('disables Complete Triage and NAMES what blocks it', () => {
    mount(triageStateMocks.pristine)

    const confirm = screen.getByTestId('triage-confirm')
    expect(confirm.hasAttribute('disabled')).toBe(true)
    // The epic's a11y contract: the reason is reachable text, and the disabled
    // control points at it.
    expect(screen.getByTestId('triage-blocked-reason').textContent).toBe(
      'Pick a quadrant to complete this triage.',
    )
    expect(confirm.getAttribute('aria-describedby')).toBe('triage-blocked-reason')
    expect(confirm.getAttribute('aria-label')).toBe(
      'Complete Triage, unavailable',
    )
  })

  it('offers the full duration chip row and no Skip affordance', () => {
    mount(triageStateMocks.pristine)

    const chips = within(screen.getByTestId('triage-duration-chips'))
    expect(chips.getByText('A minute')).toBeTruthy()
    expect(chips.getByText('25 min')).toBeTruthy()
    expect(chips.getByText('3 hours')).toBeTruthy()
    expect(chips.queryByText('Skip')).toBeNull()
  })

  it('shows no secondary action until a quadrant is picked', () => {
    mount(triageStateMocks.pristine)

    expect(screen.queryByTestId('triage-secondary-startNow')).toBeNull()
    expect(screen.queryByTestId('triage-secondary-share')).toBeNull()
    expect(screen.queryByTestId('triage-secondary-archive')).toBeNull()
  })
})

describe('ValuePromotesToSchedule — acceptance criterion 2', () => {
  it('lights the Schedule tile after four rockets, without the user touching the matrix', () => {
    mount(triagePageStateMocks.valuePromotedToSchedule)

    expect(
      screen
        .getByTestId(`triage-quadrant-${EisenhowerQuadrant.decide}`)
        .getAttribute('aria-pressed'),
    ).toBe('true')
    expect(
      screen
        .getByTestId(`triage-quadrant-${EisenhowerQuadrant.prioritize}`)
        .getAttribute('aria-pressed'),
    ).toBe('false')
  })

  it('shows the rating\'s own descriptor beside the rockets', () => {
    mount(triagePageStateMocks.valuePromotedToSchedule)
    expect(screen.getByTestId('triage-value-label').textContent).toBe('Major')
  })

  it('moves the blocker on from the quadrant to the missing date', () => {
    mount(triagePageStateMocks.valuePromotedToSchedule)

    expect(screen.getByTestId('triage-blocked-reason').textContent).toBe(
      'Add a scheduled date to complete this triage.',
    )
    expect(screen.getByTestId('triage-confirm').hasAttribute('disabled')).toBe(
      true,
    )
  })
})

describe('SchedulePicked — quadrant + seeded date', () => {
  it('enables Complete Only, with no secondary beside it', () => {
    mount(triageStateMocks.scheduled)

    const confirm = screen.getByTestId('triage-confirm')
    expect(confirm.hasAttribute('disabled')).toBe(false)
    expect(confirm.textContent).toContain('Complete Only')
    expect(screen.queryByTestId('triage-secondary-startNow')).toBeNull()
    expect(screen.queryByTestId('triage-secondary-share')).toBeNull()
  })

  it('renders the scheduled date and its expiry as editable moments', () => {
    mount(triageStateMocks.scheduled)

    expect(screen.getByTestId('triage-due-date-input')).toBeTruthy()
    expect(screen.getByTestId('triage-expiry-input')).toBeTruthy()
  })

  it('lights the "An hour later" preset the seed produced', () => {
    mount(triageStateMocks.scheduled)

    const row = within(screen.getByTestId('triage-expiry-row'))
    expect(
      row.getByText('An hour later').getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('hides Clear on the expiry while a scheduled date holds the invariant', () => {
    mount(triageStateMocks.scheduled)

    const expiry = within(screen.getByTestId('triage-expiry'))
    expect(expiry.queryByText('Clear')).toBeNull()
  })
})

describe('the three quadrant-specific secondary actions', () => {
  it('offers the green Start Now on Prioritize', () => {
    mount(triageStateMocks.prioritizedOnBusyDay)
    expect(screen.getByTestId('triage-secondary-startNow').textContent).toContain(
      'Start Now',
    )
  })

  it('offers the orange Share on Delegate', () => {
    mount(triagePageStateMocks.delegatePicked)
    expect(screen.getByTestId('triage-secondary-share').textContent).toContain(
      'Share',
    )
  })

  it('offers the gray Archive on Archive, and Complete needs no date there', () => {
    mount(triageStateMocks.archivePicked)

    expect(screen.getByTestId('triage-secondary-archive').textContent).toContain(
      'Archive',
    )
    // Archive is the exemption: no scheduled date and the gate is open anyway.
    expect(screen.getByTestId('triage-confirm').hasAttribute('disabled')).toBe(
      false,
    )
    expect(screen.getByTestId('triage-blocked-reason').className).toContain(
      'sr-only',
    )
  })

  it('routes each secondary to its own intent, never to the primary', () => {
    const onTapShare = vi.fn()
    const onTapConfirm = vi.fn()
    mount(triagePageStateMocks.delegatePicked, { onTapShare, onTapConfirm })

    fireEvent.click(screen.getByTestId('triage-secondary-share'))

    expect(onTapShare).toHaveBeenCalledTimes(1)
    expect(onTapConfirm).not.toHaveBeenCalled()
  })
})

describe('CustomExpiry — selected-first ordering', () => {
  it('lights the informational Custom pill for a bespoke moment', () => {
    mount(triagePageStateMocks.customExpiry)

    expect(
      screen.getByTestId('triage-expiry-custom').getAttribute('aria-label'),
    ).toBe('Custom date selected')
  })

  it('puts the selected token first in the row, ahead of the declared order', () => {
    mount(triagePageStateMocks.customExpiry)

    const row = screen.getByTestId('triage-expiry-row')
    // The picker is the row's leading control; the first *token* after it is
    // the selection. Canon: "the matching pill jumps to the front of the row".
    const labels = Array.from(row.children)
      .map((child) => child.textContent?.trim() ?? '')
      .filter((text) => text.length > 0)
    expect(labels[0]).toBe('Custom')
  })

  it('keeps the declared order behind the selection', () => {
    mount(triagePageStateMocks.customExpiry)

    const row = screen.getByTestId('triage-expiry-row')
    const labels = Array.from(row.children)
      .map((child) => child.textContent?.trim() ?? '')
      .filter((text) => text.length > 0)
    expect(labels.slice(1)).toEqual([
      'At the moment',
      'An hour later',
      '2h later',
      '4h later',
      'EoD',
      'EoW',
    ])
  })

  it('re-orders when a preset is selected instead', () => {
    mount(triageStateMocks.scheduled)

    const row = screen.getByTestId('triage-expiry-row')
    const labels = Array.from(row.children)
      .map((child) => child.textContent?.trim() ?? '')
      .filter((text) => text.length > 0)
    expect(labels[0]).toBe('An hour later')
  })

  it('raises the preset intent, never a raw date, when a pill is tapped', () => {
    const onTapExpiryPreset = vi.fn()
    mount(triageStateMocks.scheduled, { onTapExpiryPreset })

    fireEvent.click(screen.getByText('EoD'))

    expect(onTapExpiryPreset).toHaveBeenCalledWith(TriageExpiryPreset.endOfDay)
  })
})

describe('EditReachable — the dark-launched bottom row', () => {
  it('shows the Edit affordance only when the parent marked it reachable', () => {
    mount(triagePageStateMocks.editReachable)
    expect(screen.getByTestId('triage-edit')).toBeTruthy()
  })

  it('hides it in the shipped configuration', () => {
    mount(triageStateMocks.scheduled)
    expect(screen.queryByTestId('triage-edit')).toBeNull()
  })

  it('raises the edit intent without applying a decision', () => {
    const onTapEdit = vi.fn()
    const onTapConfirm = vi.fn()
    mount(triagePageStateMocks.editReachable, { onTapEdit, onTapConfirm })

    fireEvent.click(screen.getByTestId('triage-edit'))

    expect(onTapEdit).toHaveBeenCalledTimes(1)
    expect(onTapConfirm).not.toHaveBeenCalled()
  })
})

describe('the two save outcomes', () => {
  it('shows the deferred-push notice without calling the decision lost', () => {
    mount(triageStateMocks.savedPushDeferred)

    expect(screen.getByTestId('triage-notice').textContent).toBeTruthy()
    expect(screen.queryByTestId('triage-save-error')).toBeNull()
  })

  it('raises a local save failure as an alert', () => {
    mount(triageStateMocks.saveFailed)

    const alert = screen.getByTestId('triage-save-error')
    expect(alert.getAttribute('role')).toBe('alert')
    expect(alert.textContent).toContain('QuotaExceededError')
  })

  it('does not re-prompt: the form is untouched behind the failure', () => {
    mount(triageStateMocks.saveFailed)
    expect(
      screen
        .getByTestId(`triage-quadrant-${EisenhowerQuadrant.decide}`)
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })
})

describe('the intents the form raises', () => {
  it('raises the back intent from the header chevron', () => {
    const onTapCancel = vi.fn()
    mount(triageStateMocks.pristine, { onTapCancel })

    fireEvent.click(screen.getByTestId('triage-back'))

    expect(onTapCancel).toHaveBeenCalledTimes(1)
  })

  it('raises a duration in minutes, never a label', () => {
    const onSelectDuration = vi.fn()
    mount(triageStateMocks.pristine, { onSelectDuration })

    fireEvent.click(screen.getByText('25 min'))

    expect(onSelectDuration).toHaveBeenCalledWith(25)
  })

  it('spends the minus control at the floor and the plus control at the ceiling', () => {
    // Canon's `.disabled(points <= lowerBound)` / `.disabled(points >=
    // upperBound)`. A real `disabled` attribute, not only the class: without it
    // the control keeps its click and the 1–999 range is a claim the UI never
    // makes.
    mount(triagePageStateMocks.rewardAtFloor)
    expect(
      screen.getByLabelText('Decrease reward points').hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen.getByLabelText('Increase reward points').hasAttribute('disabled'),
    ).toBe(false)

    cleanup()

    mount(triagePageStateMocks.rewardAtCeiling)
    expect(
      screen.getByLabelText('Decrease reward points').hasAttribute('disabled'),
    ).toBe(false)
    expect(
      screen.getByLabelText('Increase reward points').hasAttribute('disabled'),
    ).toBe(true)
  })

  it('leaves both controls live between the bounds', () => {
    mount(triageStateMocks.pristine)
    expect(
      screen.getByLabelText('Decrease reward points').hasAttribute('disabled'),
    ).toBe(false)
    expect(
      screen.getByLabelText('Increase reward points').hasAttribute('disabled'),
    ).toBe(false)
  })

  it('raises no step from a spent control', () => {
    const onStepReward = vi.fn()
    mount(triagePageStateMocks.rewardAtFloor, { onStepReward })

    fireEvent.click(screen.getByLabelText('Decrease reward points'))

    expect(onStepReward).not.toHaveBeenCalled()
  })

  it('raises the stepper direction and lets the slice decide the grain', () => {
    const onStepReward = vi.fn()
    mount(triageStateMocks.pristine, { onStepReward })

    fireEvent.click(screen.getByLabelText('Increase reward points'))
    fireEvent.click(screen.getByLabelText('Decrease reward points'))

    expect(onStepReward).toHaveBeenNthCalledWith(1, 'increment')
    expect(onStepReward).toHaveBeenNthCalledWith(2, 'decrement')
  })

  it('raises the tapped rating step for both rows', () => {
    const onTapValueRating = vi.fn()
    const onTapEffortRating = vi.fn()
    mount(triageStateMocks.pristine, { onTapValueRating, onTapEffortRating })

    fireEvent.click(screen.getByTestId('triage-value-step-4'))
    fireEvent.click(screen.getByTestId('triage-effort-step-2'))

    expect(onTapValueRating).toHaveBeenCalledWith(4)
    expect(onTapEffortRating).toHaveBeenCalledWith(2)
  })

  it('raises a quadrant from its tile', () => {
    const onSelectQuadrant = vi.fn()
    mount(triageStateMocks.pristine, { onSelectQuadrant })

    fireEvent.click(
      screen.getByTestId(`triage-quadrant-${EisenhowerQuadrant.prioritize}`),
    )

    expect(onSelectQuadrant).toHaveBeenCalledWith(EisenhowerQuadrant.prioritize)
  })

  it('reveals the date picker through the CTA when no date is set', () => {
    const onSelectDueDate = vi.fn()
    mount(triageStateMocks.pristine, { onSelectDueDate })

    fireEvent.click(screen.getByTestId('triage-add-due-date'))

    expect(onSelectDueDate).toHaveBeenCalledTimes(1)
    expect(onSelectDueDate.mock.calls[0]?.[0]).toBeInstanceOf(Date)
  })
})
