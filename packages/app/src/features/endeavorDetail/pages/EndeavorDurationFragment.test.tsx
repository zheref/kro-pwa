/**
 * The Duration profile's render tests, mirroring its stories (`RC-11`).
 *
 * The claim that matters is the read-only one: the observed average has **no
 * control at all**, so an empirical recommendation can never be turned into an
 * authored preference by accident — which is canon's stated reason for keeping
 * the two apart.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { detailEndeavorMocks } from '../EndeavorDetailMocks'
import {
  type EndeavorDurationDraft,
  durationDraftFor,
  durationValidationMessage,
  observedFocusTime,
} from '../EndeavorDuration'
import { EndeavorDurationFragment } from './EndeavorDurationFragment'

afterEach(cleanup)

type Mock = (typeof detailEndeavorMocks)[keyof typeof detailEndeavorMocks]

const mount = (
  endeavor: Mock,
  overrides: {
    draft?: EndeavorDurationDraft
    isSaving?: boolean
    onToggleBound?: (bound: string, isEnabled: boolean) => void
    onAdjustBound?: (bound: string, seconds: number) => void
  } = {},
) => {
  const draft = overrides.draft ?? durationDraftFor(endeavor)
  return render(
    <EndeavorDurationFragment
      draft={draft}
      observed={observedFocusTime(endeavor)}
      validationMessage={durationValidationMessage(draft)}
      isSaving={overrides.isSaving ?? false}
      onToggleBound={overrides.onToggleBound ?? (() => {})}
      onAdjustBound={overrides.onAdjustBound ?? (() => {})}
    />,
  )
}

describe('the observed focus time is read-only', () => {
  it('states the average once the sample is large enough', () => {
    mount(detailEndeavorMocks.taskWithSessions)

    expect(screen.getByTestId('observed-average').textContent).toBe('30m')
    expect(
      screen.getByText(
        'Average of 3 completed focus sessions, rounded to the nearest minute.',
      ),
    ).toBeTruthy()
  })

  it('says how many more sessions are needed rather than averaging one', () => {
    mount(detailEndeavorMocks.taskWithOneSession)

    expect(screen.queryByTestId('observed-average')).toBeNull()
    expect(
      screen.getByText(
        'Complete at least 3 focus sessions to unlock an empirical recommendation.',
      ),
    ).toBeTruthy()
  })

  it('offers no control on that card at all — the observation is never authored', () => {
    mount(detailEndeavorMocks.taskWithSessions)

    // Every control on the screen belongs to one of the three BOUNDS.
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox.dataset.durationToggle).toBeDefined()
    }
  })
})

describe('the three bounds', () => {
  it("offers a switch per bound, in canon's order", () => {
    mount(detailEndeavorMocks.taskWithSessions)

    expect(
      screen.getAllByRole('checkbox').map((box) => box.dataset.durationToggle),
    ).toEqual(['preferred', 'minimum', 'maximum'])
  })

  it('shows a dial only for the bounds the user has enabled', () => {
    mount(detailEndeavorMocks.taskWithSessions, {
      draft: {
        ...durationDraftFor(detailEndeavorMocks.taskWithSessions),
        isPreferredEnabled: true,
      },
    })

    expect(screen.getAllByRole('slider')).toHaveLength(1)
    expect(
      screen.getByRole('slider', { name: 'Preferred duration' }),
    ).toBeTruthy()
  })

  it('reports a switch flip as an explicit act on that bound', async () => {
    const onToggleBound = vi.fn()
    mount(detailEndeavorMocks.taskWithSessions, { onToggleBound })

    const minimum = screen
      .getAllByRole('checkbox')
      .find((box) => box.dataset.durationToggle === 'minimum')
    if (minimum === undefined) throw new Error('no minimum toggle')
    await userEvent.click(minimum)

    expect(onToggleBound).toHaveBeenCalledWith('minimum', true)
  })

  it('reports a dial adjustment in seconds, keyboard included', async () => {
    const onAdjustBound = vi.fn()
    mount(detailEndeavorMocks.taskWithSessions, {
      draft: {
        ...durationDraftFor(detailEndeavorMocks.taskWithSessions),
        isPreferredEnabled: true,
      },
      onAdjustBound,
    })

    screen.getByRole('slider', { name: 'Preferred duration' }).focus()
    await userEvent.keyboard('{ArrowRight}')

    expect(onAdjustBound).toHaveBeenCalledWith('preferred', expect.any(Number))
  })
})

describe('validation', () => {
  it("says a minimum above a maximum is incoherent, in canon's words", () => {
    mount(detailEndeavorMocks.taskWithSessions, {
      draft: {
        ...durationDraftFor(detailEndeavorMocks.taskWithSessions),
        isMinimumEnabled: true,
        isMaximumEnabled: true,
        minimumSeconds: 3600,
        maximumSeconds: 1200,
      },
    })

    expect(
      screen.getByText('Minimum duration must not exceed maximum duration.'),
    ).toBeTruthy()
  })

  it('says nothing when the profile is coherent', () => {
    mount(detailEndeavorMocks.taskWithSessions)

    expect(
      screen.queryByText('Minimum duration must not exceed maximum duration.'),
    ).toBeNull()
  })

  it('makes the dials read-only while a save is in flight', () => {
    mount(detailEndeavorMocks.taskWithSessions, {
      draft: {
        ...durationDraftFor(detailEndeavorMocks.taskWithSessions),
        isPreferredEnabled: true,
      },
      isSaving: true,
    })

    expect(
      screen
        .getByRole('slider', { name: 'Preferred duration' })
        .getAttribute('aria-readonly'),
    ).toBe('true')
  })
})
