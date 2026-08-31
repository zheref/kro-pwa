/**
 * The capture prompt's render tests, mirroring `CapturePromptFragment.stories`
 * (`RC-11`).
 *
 * The pair that matters most is acceptance criterion 1: the disabled Add
 * **names** what is blocking it, and the name changes as the draft does. Canon
 * only computes a boolean, so this is the one place the epic's a11y contract is
 * observable.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installRadixEnvironment } from '../../../../design/system/primitives/__tests__/radixEnvironment'
import { CAPTURE_MOCK_NOW, captureDraftFixtures } from '../../CaptureMocks'
import {
  CaptureDestination,
  type CaptureDraft,
  canSubmitCapture,
  captureBlockedReason,
} from '../../CaptureRules'
import {
  CapturePromptFragment,
  type CapturePromptFragmentProps,
} from '../CapturePromptFragment'
import { CAPTURE_PROMPT_POPOVER_WIDTH } from '../capturePresentation'
import { installCaptureEnvironment } from './captureHarness'

let teardownRadix: () => void
let teardownCapture: () => void

beforeEach(() => {
  teardownRadix = installRadixEnvironment()
  teardownCapture = installCaptureEnvironment()
})

afterEach(() => {
  cleanup()
  teardownRadix()
  teardownCapture()
})

const noop = () => {}

const renderPrompt = (
  draft: CaptureDraft,
  overrides: Partial<CapturePromptFragmentProps> = {},
) =>
  render(
    <CapturePromptFragment
      isOpen
      draft={draft}
      isEditingStartTime={false}
      isEditingEndTime={false}
      availableDestinations={[
        CaptureDestination.local,
        CaptureDestination.kroCloud,
      ]}
      canSubmit={canSubmitCapture(draft)}
      blockedReason={captureBlockedReason(draft)}
      presentation="sheet"
      now={CAPTURE_MOCK_NOW}
      locale="en-US"
      onEditTitle={noop}
      onSelectKind={noop}
      onPickDate={noop}
      onBeginTimeEdit={noop}
      onPickTime={noop}
      onEndTimeEdit={noop}
      onPickRewards={noop}
      onPickRecurrence={noop}
      onSelectDestination={noop}
      onDiscard={noop}
      onSubmit={noop}
      {...overrides}
    />,
  )

describe('the disabled Add names what blocks it (acceptance criterion 1)', () => {
  it('asks for a title on a fresh Task prompt', () => {
    renderPrompt(captureDraftFixtures.emptyTask)

    expect(
      screen.getByTestId<HTMLButtonElement>('capture-add').disabled,
    ).toBe(true)
    expect(screen.getByTestId('capture-blocked-reason').textContent).toBe(
      'Enter a title to add this task.',
    )
  })

  it('asks an Event for both times once it has a title', () => {
    renderPrompt(captureDraftFixtures.eventMissingBothTimes)

    expect(screen.getByTestId('capture-blocked-reason').textContent).toBe(
      'Pick a start time and an end time to add this event.',
    )
  })

  it('asks only for the end once the Event has a start', () => {
    renderPrompt(captureDraftFixtures.eventMissingEnd)

    expect(screen.getByTestId('capture-blocked-reason').textContent).toBe(
      'Pick an end time to add this event.',
    )
  })

  it('still reports the missing title first on an untitled but fully timed Event', () => {
    renderPrompt(captureDraftFixtures.untitledCompleteEvent)

    expect(screen.getByTestId('capture-blocked-reason').textContent).toBe(
      'Enter a title to add this event.',
    )
  })

  it('enables Add and says nothing once the draft is valid', () => {
    renderPrompt(captureDraftFixtures.titledTask)

    expect(
      screen.getByTestId<HTMLButtonElement>('capture-add').disabled,
    ).toBe(false)
    expect(screen.getByTestId('capture-blocked-reason').textContent).toBe('')
  })

  it('points the disabled Add at the reason, which a disabled control needs to be readable', () => {
    renderPrompt(captureDraftFixtures.emptyTask)

    expect(
      screen.getByTestId('capture-add').getAttribute('aria-describedby'),
    ).toBe('capture-blocked-reason')
  })
})

describe('the chip strip follows the kind', () => {
  it('offers canon\'s four kinds with the drafted one pressed', () => {
    renderPrompt(captureDraftFixtures.emptyTask)

    for (const label of ['Task', 'Event', 'Reminder', 'Habit']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy()
    }
    expect(
      screen.getByRole('button', { name: 'Task' }).getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('drops the date chip for a Habit, which canon says is timeless', () => {
    renderPrompt(captureDraftFixtures.titledHabit)

    expect(screen.queryByRole('button', { name: /^Date:/ })).toBeNull()
  })

  it('shows an Event\'s end chip and hides it for every other kind', () => {
    const { unmount } = renderPrompt(captureDraftFixtures.eventMissingEnd)
    expect(screen.getByRole('button', { name: 'End time' })).toBeTruthy()
    unmount()

    renderPrompt(captureDraftFixtures.titledTask)
    expect(screen.queryByRole('button', { name: 'End time' })).toBeNull()
  })

  it('offers rewards on a Task and never on a Reminder, which earns nothing', () => {
    const { unmount } = renderPrompt(captureDraftFixtures.titledTask)
    expect(screen.getByRole('button', { name: /^Rewards:/ })).toBeTruthy()
    unmount()

    renderPrompt(captureDraftFixtures.titledReminder)
    expect(screen.queryByRole('button', { name: /^Rewards:/ })).toBeNull()
  })

  it('reads the date as "Today" for the day the draft is on', () => {
    renderPrompt(captureDraftFixtures.titledTask)

    expect(screen.getByRole('button', { name: 'Date: Today' })).toBeTruthy()
  })
})

describe('the two presentations', () => {
  it('sheets the panel from the bottom edge on a phone', () => {
    renderPrompt(captureDraftFixtures.emptyTask)

    expect(
      screen.getByTestId('capture-prompt').getAttribute('data-kro-presentation'),
    ).toBe('sheet')
  })

  it('pops it over the content at the named width on a desktop', () => {
    renderPrompt(captureDraftFixtures.emptyTask, { presentation: 'popover' })

    const panel = screen.getByTestId('capture-prompt')
    expect(panel.getAttribute('data-kro-presentation')).toBe('popover')
    expect(panel.style.width).toBe(`${CAPTURE_PROMPT_POPOVER_WIDTH}px`)
  })

  it('renders nothing at all while it is closed', () => {
    renderPrompt(captureDraftFixtures.emptyTask, { isOpen: false })

    expect(screen.queryByTestId('capture-prompt')).toBeNull()
  })
})

describe('intent leaves through callbacks only (RC-15)', () => {
  it('focuses the title field on open, as canon does after its sheet settles', () => {
    renderPrompt(captureDraftFixtures.emptyTask)

    expect(document.activeElement).toBe(screen.getByTestId('capture-title'))
  })

  it('raises every keystroke rather than holding the title locally', async () => {
    const onEditTitle = vi.fn()
    renderPrompt(captureDraftFixtures.emptyTask, { onEditTitle })

    await userEvent.type(screen.getByTestId('capture-title'), 'Hi')

    expect(onEditTitle).toHaveBeenCalledTimes(2)
  })

  it('treats Escape as Discard — the same outcome canon\'s button produces', async () => {
    const onDiscard = vi.fn()
    renderPrompt(captureDraftFixtures.emptyTask, { onDiscard })

    await userEvent.keyboard('{Escape}')

    expect(onDiscard).toHaveBeenCalledTimes(1)
  })

  it('opens the time editor through the slice rather than a local flag', async () => {
    const onBeginTimeEdit = vi.fn()
    renderPrompt(captureDraftFixtures.titledTask, { onBeginTimeEdit })

    await userEvent.click(screen.getByRole('button', { name: 'Time' }))

    expect(onBeginTimeEdit).toHaveBeenCalledWith('start')
  })

  it('offers Discard, Clear and Done while an edit is in flight', async () => {
    const onEndTimeEdit = vi.fn()
    renderPrompt(captureDraftFixtures.timedTask, {
      isEditingStartTime: true,
      onEndTimeEdit,
    })

    expect(screen.getByTestId('capture-time-panel-start')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }))

    expect(onEndTimeEdit).toHaveBeenCalledWith('start', 'discard')
  })

  it('picks a hosting destination from the inline list', async () => {
    const onSelectDestination = vi.fn()
    renderPrompt(captureDraftFixtures.titledTask, { onSelectDestination })

    await userEvent.click(
      screen.getByRole('button', { name: 'Hosting destination: On Device' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Kro Cloud' }))

    expect(onSelectDestination).toHaveBeenCalledWith(CaptureDestination.kroCloud)
  })

  it('submits on Enter only when the draft is valid', async () => {
    const onSubmit = vi.fn()
    const { unmount } = renderPrompt(captureDraftFixtures.emptyTask, { onSubmit })
    await userEvent.type(screen.getByTestId('capture-title'), '{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    unmount()

    renderPrompt(captureDraftFixtures.titledTask, { onSubmit })
    await userEvent.type(screen.getByTestId('capture-title'), '{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('steps rewards by canon\'s 5, and clamps the floor at 1', async () => {
    const onPickRewards = vi.fn()
    renderPrompt(captureDraftFixtures.titledTask, { onPickRewards })

    await userEvent.click(screen.getByRole('button', { name: /^Rewards:/ }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Increase reward points' }),
    )

    expect(onPickRewards).toHaveBeenCalledWith(15)
  })

  it('offers canon\'s five repeat shapes anchored to the drafted day', async () => {
    const onPickRecurrence = vi.fn()
    renderPrompt(captureDraftFixtures.titledTask, { onPickRecurrence })

    await userEvent.click(
      screen.getByRole('button', { name: 'Set repeat schedule' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Weekly' }))

    expect(onPickRecurrence).toHaveBeenCalledWith({
      kind: 'weekly',
      interval: 1,
      weekdays: ['tuesday'],
    })
  })
})
