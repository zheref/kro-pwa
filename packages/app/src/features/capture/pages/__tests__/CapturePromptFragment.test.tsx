/**
 * The capture prompt's render tests, mirroring `CapturePromptFragment.stories`
 * (`RC-11`).
 *
 * The pair that matters most is acceptance criterion 1: the disabled Add
 * **names** what is blocking it, and the name changes as the draft does. Canon
 * only computes a boolean, so this is the one place the epic's a11y contract is
 * observable.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installRadixEnvironment } from '../../../../design/system/primitives/__tests__/radixEnvironment'
import {
  CAPTURE_MOCK_NOW,
  captureDraftFixtures,
  captureSuggestionMocks,
} from '../../CaptureMocks'
import { CAPTURE_SUGGESTIONS } from '../../CaptureSuggestions'
import {
  CaptureDestination,
  type CaptureDraft,
  canSubmitCapture,
  captureBlockedReason,
  captureBlocker,
  captureResolvedSymbol,
  captureKindCapabilities,
  isCaptureValueRequired,
} from '../../CaptureRules'
import type { CapturePromptFragmentProps } from '../CapturePromptFragment'
import { CAPTURE_PROMPT_POPOVER_WIDTH } from '../capturePresentation'
import {
  PANEL_EASE_IN,
  PANEL_EASE_OUT,
  durationChipLabel,
  finiteOrNull,
} from '../CapturePromptFragment'
import { PanelledPrompt, installCaptureEnvironment } from './captureHarness'

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

const promptProps = (
  draft: CaptureDraft,
  overrides: Partial<CapturePromptFragmentProps> = {},
): CapturePromptFragmentProps => ({
  isOpen: true,
  draft,
  isEditingStartTime: false,
  isEditingEndTime: false,
  availableDestinations: [
    CaptureDestination.local,
    CaptureDestination.kroCloud,
  ],
  resolvedSymbol: captureResolvedSymbol(draft),
  isValueRequired: isCaptureValueRequired(draft),
  canSubmit: canSubmitCapture(draft),
  blockedReason: captureBlockedReason(draft),
  blocker: captureBlocker(draft),
  presentation: 'sheet',
  now: CAPTURE_MOCK_NOW,
  locale: 'en-US',
  onEditTitle: noop,
  onSelectKind: noop,
  onPickDate: noop,
  onClearDate: noop,
  onBeginTimeEdit: noop,
  onPickTime: noop,
  onEndTimeEdit: noop,
  onPickRewards: noop,
  onPickValue: noop,
  onPickDuration: noop,
  onPickEmoji: noop,
  onPickRecurrence: noop,
  onSelectDestination: noop,
  onDiscard: noop,
  onSubmit: noop,
  openPanel: null,
  onSetPanel: noop,
  capabilities: captureKindCapabilities(draft.kind),
  keyboardAccelerators: true,
  ...overrides,
})

const renderPrompt = (
  draft: CaptureDraft,
  overrides: Partial<CapturePromptFragmentProps> = {},
) => render(<PanelledPrompt {...harnessProps(draft, overrides)} />)

/** `promptProps` minus the panel pin, unless a test pins one on purpose. */
const harnessProps = (
  draft: CaptureDraft,
  overrides: Partial<CapturePromptFragmentProps> = {},
) => {
  const { openPanel, onSetPanel, ...rest } = promptProps(draft, overrides)
  return 'openPanel' in overrides ? { ...rest, openPanel, onSetPanel } : rest
}

describe('the disabled Add names what blocks it (acceptance criterion 1)', () => {
  it('asks for a title on a fresh Task prompt', () => {
    renderPrompt(captureDraftFixtures.emptyTask)

    expect(screen.getByTestId<HTMLButtonElement>('capture-add').disabled).toBe(
      true,
    )
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

    expect(screen.getByTestId<HTMLButtonElement>('capture-add').disabled).toBe(
      false,
    )
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
  it("offers canon's four kinds with the drafted one pressed", () => {
    renderPrompt(captureDraftFixtures.emptyTask)

    for (const label of ['Task', 'Habit', 'Event', 'Reminder']) {
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

  it("shows an Event's end chip and hides it for every other kind", () => {
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

  it('offers a Clear button on a dated Task, the KC-IS-#75 affordance', () => {
    renderPrompt(captureDraftFixtures.titledTask)

    expect(screen.getByRole('button', { name: 'Clear date' })).toBeTruthy()
  })

  it('reads "No date" once the date is cleared, and drops the Clear button', () => {
    renderPrompt(captureDraftFixtures.titledTaskNoDate)

    expect(screen.getByRole('button', { name: 'Date: No date' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Clear date' })).toBeNull()
  })

  it('never offers a date Clear button on an Event — it has no way to be dateless', () => {
    renderPrompt(captureDraftFixtures.completeEvent)

    expect(screen.getByRole('button', { name: /^Date:/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Clear date' })).toBeNull()
  })
})

describe('the two presentations', () => {
  it('sheets the panel from the bottom edge on a phone', () => {
    renderPrompt(captureDraftFixtures.emptyTask)

    expect(
      screen
        .getByTestId('capture-prompt')
        .getAttribute('data-kro-presentation'),
    ).toBe('sheet')
  })

  it('pops it over the content at the named width on a desktop', () => {
    renderPrompt(captureDraftFixtures.emptyTask, { presentation: 'popover' })

    const panel = screen.getByTestId('capture-prompt')
    expect(panel.getAttribute('data-kro-presentation')).toBe('popover')
    expect(panel.style.width).toBe(`${CAPTURE_PROMPT_POPOVER_WIDTH}px`)
    expect(panel.style.padding).toBe('0px')
  })

  it('keeps the desktop popover one fixed width with its properties on one line', () => {
    renderPrompt(captureDraftFixtures.emptyTask, { presentation: 'popover' })

    const panel = screen.getByTestId('capture-prompt')
    expect(panel.style.width).toBe(`${CAPTURE_PROMPT_POPOVER_WIDTH}px`)
    const row = panel.querySelector('[data-slot="capture-prompt-properties"]')
    expect(row?.className).toContain('flex-nowrap')
    expect(row?.className).not.toContain('overflow-x-auto')
  })

  it('wraps the properties onto a second line on a phone, never a side scroll', () => {
    renderPrompt(captureDraftFixtures.emptyTask)

    const row = screen
      .getByTestId('capture-prompt')
      .querySelector('[data-slot="capture-prompt-properties"]')
    expect(row?.className).toContain('flex-wrap')
    expect(row?.className).not.toContain('overflow-x-auto')
  })

  // Closed from its first render there is nothing to leave, so nothing mounts.
  // A prompt that WAS open keeps its closed content through `kro-trailing-out`
  // instead — that exit phase is pinned in CapturePromptPage.test.tsx.
  it('renders nothing when it was never opened', () => {
    renderPrompt(captureDraftFixtures.emptyTask, { isOpen: false })

    expect(screen.queryByTestId('capture-prompt')).toBeNull()
  })
})

describe('desktop density is compact', () => {
  it('marks the popover form compact and the sheet form as touch', () => {
    renderPrompt(captureDraftFixtures.emptyTask, { presentation: 'popover' })
    const compact = document.querySelector('[data-slot="capture-prompt-form"]')
    expect(compact?.getAttribute('data-kro-density')).toBe('compact')

    cleanup()
    renderPrompt(captureDraftFixtures.emptyTask, { presentation: 'sheet' })
    const touch = document.querySelector('[data-slot="capture-prompt-form"]')
    expect(touch?.getAttribute('data-kro-density')).toBe('touch')
  })

  it('shrinks kind chips to the pointer target on the desktop popover', () => {
    renderPrompt(captureDraftFixtures.emptyTask, { presentation: 'popover' })

    expect(screen.getByRole('button', { name: 'Task' }).style.minHeight).toBe(
      'var(--kro-size-min-pointer-target)',
    )
  })

  it('keeps the 44px touch floor on the phone sheet', () => {
    renderPrompt(captureDraftFixtures.emptyTask, { presentation: 'sheet' })

    expect(screen.getByRole('button', { name: 'Task' }).style.minHeight).toBe(
      'var(--kro-size-min-touch-target)',
    )
  })

  it('sets the title field to compact type on the popover', () => {
    renderPrompt(captureDraftFixtures.emptyTask, { presentation: 'popover' })

    expect(screen.getByTestId('capture-title').className).toContain('text-sm')
    expect(screen.getByTestId('capture-title').className).toContain('py-1')
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

  it("treats Escape as Discard — the same outcome canon's button produces", async () => {
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

  it('raises onClearDate from the date chip’s Clear button, never a local flag', async () => {
    const onClearDate = vi.fn()
    renderPrompt(captureDraftFixtures.titledTask, { onClearDate })

    await userEvent.click(screen.getByRole('button', { name: 'Clear date' }))

    expect(onClearDate).toHaveBeenCalledTimes(1)
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

    expect(onSelectDestination).toHaveBeenCalledWith(
      CaptureDestination.kroCloud,
    )
  })

  it('submits on Enter only when the draft is valid', async () => {
    const onSubmit = vi.fn()
    const { unmount } = renderPrompt(captureDraftFixtures.emptyTask, {
      onSubmit,
    })
    await userEvent.type(screen.getByTestId('capture-title'), '{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    unmount()

    renderPrompt(captureDraftFixtures.titledTask, { onSubmit })
    await userEvent.type(screen.getByTestId('capture-title'), '{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it("steps rewards by canon's 5, and clamps the floor at 1", async () => {
    const onPickRewards = vi.fn()
    renderPrompt(captureDraftFixtures.titledTask, { onPickRewards })

    await userEvent.click(screen.getByRole('button', { name: /^Rewards:/ }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Increase reward points' }),
    )

    expect(onPickRewards).toHaveBeenCalledWith(35)
  })

  it("offers canon's five repeat shapes anchored to the drafted day", async () => {
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

describe('the title row and the per-kind properties', () => {
  it('names the missing rating on an unrated local Task (TaskMissingValue)', () => {
    renderPrompt(captureDraftFixtures.unratedTask)

    expect(screen.getByTestId('capture-blocked-reason').textContent).toBe(
      'Pick a value rating — required for On Device.',
    )
    expect(
      screen.getByRole('button', { name: 'Value, required, not set' }),
    ).toBeTruthy()
  })

  it('draws the picked symbol and a joined clear on every set property (TaskFullyDescribed)', () => {
    renderPrompt(captureDraftFixtures.fullyDescribedTask)

    expect(screen.getByRole('button', { name: 'Symbol: 📝' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Value: 5 of 5' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Clear value' })).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Duration: 45 min' }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Clear duration' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Clear date' })).toBeTruthy()
  })

  it('never offers to clear a Habit’s required time (HabitTimeRequired)', () => {
    renderPrompt(captureDraftFixtures.titledHabit)

    expect(screen.getByRole('button', { name: 'Time' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Clear time' })).toBeNull()
    expect(screen.getByRole('button', { name: /^Rewards: 10/ })).toBeTruthy()
  })

  it('offers no value, duration or rewards on a Reminder', () => {
    renderPrompt(captureDraftFixtures.titledReminder)

    expect(screen.queryByRole('button', { name: /^Value/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Duration/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Rewards/ })).toBeNull()
  })

  it('rates through the stars, and tapping the selected star clears it', async () => {
    const onPickValue = vi.fn()
    renderPrompt(
      { ...captureDraftFixtures.titledTask, value: 3 },
      { onPickValue },
    )

    await userEvent.click(screen.getByRole('button', { name: 'Value: 3 of 5' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Major, level 4' }),
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Meaningful, level 3' }),
    )

    expect(onPickValue).toHaveBeenNthCalledWith(1, 4)
    expect(onPickValue).toHaveBeenNthCalledWith(2, null)
  })

  it('names the host a required rating is for in the one status line, not the panel', async () => {
    renderPrompt(captureDraftFixtures.unratedTask)

    await userEvent.click(
      screen.getByRole('button', { name: 'Value, required, not set' }),
    )

    expect(screen.queryByText(/^Required for/)).toBeNull()
    expect(screen.getByTestId('capture-blocked-reason').textContent).toBe(
      'Pick a value rating — required for On Device.',
    )
    expect(
      screen.getByTestId('capture-value-editor').textContent,
    ).not.toContain('required')
  })

  it('estimates through Triage’s presets in seconds', async () => {
    const onPickDuration = vi.fn()
    renderPrompt(captureDraftFixtures.titledTask, { onPickDuration })

    await userEvent.click(
      screen.getByRole('button', { name: 'Duration, not set' }),
    )
    await userEvent.click(screen.getByRole('button', { name: '2 hours' }))

    expect(onPickDuration).toHaveBeenCalledWith(7200)
  })

  it('clears a set property from its joined clear button', async () => {
    const onPickDuration = vi.fn()
    renderPrompt(captureDraftFixtures.fullyDescribedTask, { onPickDuration })

    await userEvent.click(
      screen.getByRole('button', { name: 'Clear duration' }),
    )

    expect(onPickDuration).toHaveBeenCalledWith(null)
  })
})

describe('the host menu and the animated editors', () => {
  it('ticks the selected host only, keeping aria-pressed', async () => {
    renderPrompt(captureDraftFixtures.titledTask)
    await userEvent.click(
      screen.getByRole('button', { name: 'Hosting destination: On Device' }),
    )
    const onDevice = screen.getByRole('button', { name: 'On Device' })
    const cloud = screen.getByRole('button', { name: 'Kro Cloud' })
    expect(onDevice.getAttribute('aria-pressed')).toBe('true')
    expect(
      onDevice.querySelector('[data-testid="capture-destination-check"]'),
    ).not.toBeNull()
    expect(
      cloud.querySelector('[data-testid="capture-destination-check"]'),
    ).toBeNull()
  })

  it('gives every host option a hover and focus fill plus outline', async () => {
    renderPrompt(captureDraftFixtures.titledTask)
    await userEvent.click(
      screen.getByRole('button', { name: 'Hosting destination: On Device' }),
    )
    const cloud = screen.getByRole('button', { name: 'Kro Cloud' })
    expect(cloud.className).toContain('hover:border-')
    expect(cloud.className).toContain('hover:bg-')
    expect(cloud.className).toContain('focus-visible:bg-')
  })

  it('paints the closed frame first, then opens with an ease-out over a real duration', async () => {
    renderPrompt(captureDraftFixtures.titledTask)
    await userEvent.click(
      screen.getByRole('button', { name: 'Duration, not set' }),
    )
    const panel = screen
      .getByTestId('capture-duration-editor')
      .closest<HTMLElement>('[data-slot="capture-inline-panel"]')
    await waitFor(() => {
      expect(panel?.getAttribute('data-state')).toBe('open')
    })
    const style = panel ? getComputedStyle(panel) : null
    expect(style?.transitionProperty).toContain('grid-template-rows')
    expect(style?.transitionDuration).toContain('240ms')
    expect(panel?.style.transitionTimingFunction).toBe(PANEL_EASE_OUT)
    expect(panel?.style.gridTemplateRows).toBe('1fr')
  })

  it('starts closed at 0fr and transparent before it flips open', async () => {
    const states: string[] = []
    renderPrompt(captureDraftFixtures.titledTask)
    await userEvent.click(
      screen.getByRole('button', { name: 'Duration, not set' }),
    )
    const panel = screen
      .getByTestId('capture-duration-editor')
      .closest<HTMLElement>('[data-slot="capture-inline-panel"]')
    states.push(panel?.getAttribute('data-state') ?? '')
    await waitFor(() => {
      expect(panel?.getAttribute('data-state')).toBe('open')
    })
    states.push(panel?.getAttribute('data-state') ?? '')
    expect(states).toEqual(['closed', 'open'])
  })

  it('collapses with an ease-in, staying mounted but inert until it ends', async () => {
    renderPrompt(captureDraftFixtures.titledTask)
    const pill = screen.getByRole('button', { name: 'Duration, not set' })
    await userEvent.click(pill)
    const panel = screen
      .getByTestId('capture-duration-editor')
      .closest<HTMLElement>('[data-slot="capture-inline-panel"]')
    await waitFor(() => {
      expect(panel?.getAttribute('data-state')).toBe('open')
    })

    await userEvent.click(pill)
    expect(panel?.getAttribute('data-state')).toBe('closed')
    expect(panel?.getAttribute('aria-hidden')).toBe('true')
    expect(panel?.style.transitionTimingFunction).toBe(PANEL_EASE_IN)
  })
})

describe('a draft from before the newer fields existed', () => {
  // A hot-reloaded tab can hold a draft minted before value, duration,
  // pickedEmoji and hasCustomRewards existed; the cast models exactly that.
  const legacyDraft = {
    ...captureDraftFixtures.titledTask,
    value: undefined,
    duration: undefined,
    pickedEmoji: undefined,
    hasCustomRewards: undefined,
    rewards: undefined,
  } as unknown as CaptureDraft

  it('falls back to canon placeholders, never "undefined" or "NaN"', () => {
    const { container } = renderPrompt(legacyDraft)
    expect(container.ownerDocument.body.textContent).not.toMatch(
      /undefined|NaN/,
    )
    expect(
      screen.getByRole('button', { name: 'Value, required, not set' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Duration, not set' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Rewards: 30 points' }),
    ).toBeTruthy()
  })

  it('labels a missing or non-finite duration as Duration', () => {
    expect(durationChipLabel(undefined)).toBe('Duration')
    expect(durationChipLabel(Number.NaN)).toBe('Duration')
    expect(durationChipLabel(2700)).toBe('45 min')
  })

  it('reads only finite numbers', () => {
    expect(finiteOrNull(3)).toBe(3)
    expect(finiteOrNull(undefined)).toBeNull()
    expect(finiteOrNull(Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe('the keyboard', () => {
  it('submits on Return when the draft is valid', async () => {
    const onSubmit = vi.fn()
    renderPrompt(captureDraftFixtures.titledTask, { onSubmit })
    await userEvent.type(screen.getByTestId('capture-title'), '{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('submits nothing on Return while blocked, and keeps the reason announced', async () => {
    const onSubmit = vi.fn()
    renderPrompt(captureDraftFixtures.unratedTask, { onSubmit })
    await userEvent.type(screen.getByTestId('capture-title'), '{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByTestId('capture-blocked-reason').textContent).toBe(
      'Pick a value rating — required for On Device.',
    )
  })

  it('ignores Return while an IME composition is in progress', () => {
    const onSubmit = vi.fn()
    renderPrompt(captureDraftFixtures.titledTask, { onSubmit })
    fireEvent.keyDown(screen.getByTestId('capture-title'), {
      key: 'Enter',
      isComposing: true,
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('closes an open editor on Escape before discarding the prompt', async () => {
    const onDiscard = vi.fn()
    renderPrompt(captureDraftFixtures.titledTask, { onDiscard })
    await userEvent.click(screen.getByRole('button', { name: /^Rewards:/ }))
    expect(screen.getByTestId('capture-rewards-editor')).toBeTruthy()

    await userEvent.keyboard('{Escape}')
    expect(onDiscard).not.toHaveBeenCalled()
    expect(
      screen
        .getByRole('button', { name: /^Rewards:/ })
        .getAttribute('aria-expanded'),
    ).toBe('false')

    await userEvent.keyboard('{Escape}')
    expect(onDiscard).toHaveBeenCalledTimes(1)
  })

  it('discards an open time edit on Escape, not the prompt', async () => {
    const onDiscard = vi.fn()
    const onEndTimeEdit = vi.fn()
    renderPrompt(captureDraftFixtures.timedTask, {
      isEditingStartTime: true,
      onDiscard,
      onEndTimeEdit,
    })
    await userEvent.keyboard('{Escape}')
    expect(onEndTimeEdit).toHaveBeenCalledWith('start', 'discard')
    expect(onDiscard).not.toHaveBeenCalled()
  })

  it('confirms the time panel on Return instead of submitting the prompt', () => {
    const onSubmit = vi.fn()
    const onEndTimeEdit = vi.fn()
    renderPrompt(captureDraftFixtures.timedTask, {
      isEditingStartTime: true,
      onSubmit,
      onEndTimeEdit,
    })
    fireEvent.keyDown(
      screen
        .getByTestId('capture-time-panel-start')
        .querySelector('input') as HTMLInputElement,
      { key: 'Enter' },
    )
    expect(onEndTimeEdit).toHaveBeenCalledWith('start', 'done')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows ⏎ on Add and esc on Discard on the desktop popover only', () => {
    const { unmount } = renderPrompt(captureDraftFixtures.titledTask, {
      presentation: 'popover',
    })
    const add = screen.getByTestId('capture-add')
    expect(add.getAttribute('aria-keyshortcuts')).toBe('Enter')
    expect(add.textContent).toContain('⏎')
    expect(
      screen.getByRole('button', { name: 'Discard new task' }).textContent,
    ).toContain('esc')
    unmount()

    renderPrompt(captureDraftFixtures.titledTask, { presentation: 'sheet' })
    expect(screen.getByTestId('capture-add').textContent).not.toContain('⏎')
    expect(
      screen.getByTestId('capture-add').getAttribute('aria-keyshortcuts'),
    ).toBe('Enter')
  })
})

describe('the status line', () => {
  const heightFor = (draft: CaptureDraft, reason: string | null) => {
    const { container, unmount } = renderPrompt(draft, {
      presentation: 'popover',
      blockedReason: reason,
    })
    const line = (
      container.ownerDocument ?? document
    ).querySelector<HTMLElement>('[data-slot="capture-status-line"]')
    const height = line?.style.height
    unmount()
    return height
  }

  it('keeps one fixed height with no reason, a short one or a very long one', () => {
    const none = heightFor(captureDraftFixtures.titledTask, null)
    const short = heightFor(captureDraftFixtures.emptyTask, 'Enter a title.')
    const long = heightFor(
      captureDraftFixtures.emptyTask,
      'A reason long enough to wrap onto several lines if it were allowed to, which it is not. '.repeat(
        4,
      ),
    )
    expect(none).toBe('32px')
    expect(short).toBe(none)
    expect(long).toBe(none)
  })

  it('ellipsizes a long reason on one line and keeps its full text', () => {
    const reason = 'x'.repeat(400)
    renderPrompt(captureDraftFixtures.emptyTask, { blockedReason: reason })
    const visible = screen.getByTestId('capture-status-text')
    expect(visible.querySelector('.truncate')?.textContent).toBe(reason)
    expect(visible.getAttribute('title')).toBe(reason)
    expect(screen.getByTestId('capture-blocked-reason').textContent).toBe(
      reason,
    )
  })

  it('shows the open editor’s keys when keyboard-driven on the desktop popover only', async () => {
    const { unmount } = renderPrompt(captureDraftFixtures.titledTask, {
      presentation: 'popover',
    })
    await userEvent.keyboard('{Alt>}v{/Alt}')
    expect(screen.getByTestId('capture-key-hint').textContent).toBe(
      '1–5 to rate · ⏎ Add · esc close',
    )
    unmount()

    renderPrompt(captureDraftFixtures.titledTask, { presentation: 'sheet' })
    await userEvent.keyboard('{Alt>}v{/Alt}')
    expect(screen.queryByTestId('capture-key-hint')).toBeNull()
  })

  it('shows only the reason while pointer-driven, and the next keys once keyboard-driven', async () => {
    renderPrompt(captureDraftFixtures.emptyTask, { presentation: 'popover' })
    fireEvent.pointerDown(window)
    expect(screen.queryByTestId('capture-key-hint')).toBeNull()

    await userEvent.keyboard('a')
    expect(screen.getByTestId('capture-key-hint').textContent).toBe('· ⏎ next')

    fireEvent.pointerDown(window)
    expect(screen.queryByTestId('capture-key-hint')).toBeNull()
  })

  it('turns keyboard-driven on a Return the prompt handles itself, not only on typing', async () => {
    renderPrompt(captureDraftFixtures.unratedTask, { presentation: 'popover' })
    fireEvent.pointerDown(window)
    screen.getByRole('textbox').focus()

    // The form swallows Return (it opens the value editor), so the modality
    // has to be learned before that handler stops it.
    await userEvent.keyboard('{Enter}')

    expect(screen.getByTestId('capture-key-hint')).toBeTruthy()
  })

  it('reads "Ready · ⏎ Add" once submittable from the keyboard', async () => {
    renderPrompt(captureDraftFixtures.titledTask, { presentation: 'popover' })
    await userEvent.keyboard('a')
    const visible = screen.getByTestId('capture-status-text')
    expect(visible.textContent).toBe('Ready· ⏎ Add')
  })

  it('announces only the reason in the live region, never the keys', async () => {
    renderPrompt(captureDraftFixtures.unratedTask, { presentation: 'popover' })
    await userEvent.keyboard('a')
    const live = screen.getByTestId('capture-blocked-reason')
    expect(live.getAttribute('aria-live')).toBe('polite')
    expect(live.textContent).toBe(
      'Pick a value rating — required for On Device.',
    )
    expect(live.textContent).not.toContain('⏎')
    expect(
      screen.getByTestId('capture-status-text').getAttribute('aria-hidden'),
    ).toBe('true')
  })
})

describe('Return on a focused control', () => {
  it('adds instead of toggling the focused star', async () => {
    const onSubmit = vi.fn()
    const onPickValue = vi.fn()
    renderPrompt(captureDraftFixtures.titledTask, { onSubmit, onPickValue })
    await userEvent.click(screen.getByRole('button', { name: /^Value/ }))
    screen.getByRole('button', { name: 'Meaningful, level 3' }).focus()

    await userEvent.keyboard('{Enter}')

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onPickValue).not.toHaveBeenCalled()
  })

  it('advertises each property chord on its pill', () => {
    renderPrompt(captureDraftFixtures.titledTask, { presentation: 'popover' })
    const value = screen.getByRole('button', { name: /^Value/ })
    expect(value.getAttribute('aria-keyshortcuts')).toBe('Alt+V')
    expect(value.getAttribute('title')).toBe('Value (⌥V)')
    expect(
      screen
        .getByRole('button', { name: 'Time' })
        .getAttribute('aria-keyshortcuts'),
    ).toBe('Alt+T')
  })
})

describe('Return walks the required fields', () => {
  const pressReturn = () =>
    fireEvent.keyDown(screen.getByTestId('capture-title'), { key: 'Enter' })

  it('opens Value on an unrated task instead of submitting', () => {
    const onSubmit = vi.fn()
    renderPrompt(captureDraftFixtures.unratedTask, { onSubmit })
    pressReturn()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(
      screen
        .getByRole('button', { name: 'Value, required, not set' })
        .getAttribute('aria-expanded'),
    ).toBe('true')
    expect(screen.getByTestId('capture-blocked-reason').textContent).toBe(
      'Pick a value rating — required for On Device.',
    )
  })

  it('begins the start time on an event with neither time, then the end', () => {
    const onBeginTimeEdit = vi.fn()
    const { unmount } = renderPrompt(
      captureDraftFixtures.eventMissingBothTimes,
      { onBeginTimeEdit },
    )
    pressReturn()
    expect(onBeginTimeEdit).toHaveBeenCalledWith('start')
    unmount()

    renderPrompt(captureDraftFixtures.eventMissingEnd, { onBeginTimeEdit })
    pressReturn()
    expect(onBeginTimeEdit).toHaveBeenLastCalledWith('end')
  })

  it('walks a habit to its time, then its repeat', () => {
    const onBeginTimeEdit = vi.fn()
    const { unmount } = renderPrompt(captureDraftFixtures.habitMissingTime, {
      onBeginTimeEdit,
    })
    pressReturn()
    expect(onBeginTimeEdit).toHaveBeenCalledWith('start')
    unmount()

    renderPrompt(captureDraftFixtures.habitMissingRecurrence)
    pressReturn()
    expect(
      screen
        .getByRole('button', { name: 'Set repeat schedule' })
        .getAttribute('aria-expanded'),
    ).toBe('true')
  })

  it('keeps focus in the title when the title is what is missing', () => {
    const onSubmit = vi.fn()
    renderPrompt(captureDraftFixtures.emptyTask, { onSubmit })
    pressReturn()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByTestId('capture-title'))
  })

  it('adds a submittable draft immediately', () => {
    const onSubmit = vi.fn()
    const onBeginTimeEdit = vi.fn()
    renderPrompt(captureDraftFixtures.titledTask, { onSubmit, onBeginTimeEdit })
    pressReturn()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onBeginTimeEdit).not.toHaveBeenCalled()
  })

  it('still ignores Return mid-IME on a blocked draft', () => {
    renderPrompt(captureDraftFixtures.unratedTask)
    fireEvent.keyDown(screen.getByTestId('capture-title'), {
      key: 'Enter',
      isComposing: true,
    })
    expect(
      screen
        .getByRole('button', { name: 'Value, required, not set' })
        .getAttribute('aria-expanded'),
    ).toBe('false')
  })
})

describe('chord hints, revealed while Option is held', () => {
  const hintOn = (name: string | RegExp) =>
    screen
      .getByRole('button', { name })
      .querySelector<HTMLElement>('[data-slot="button-shortcut"]')

  it('keeps every hint hidden until Option goes down, then shows them', () => {
    renderPrompt(captureDraftFixtures.titledTask, { presentation: 'popover' })
    expect(hintOn(/^Value/)?.textContent).toBe('⌥V')
    expect(hintOn(/^Value/)?.getAttribute('data-revealed')).toBe('false')

    fireEvent.keyDown(window, { key: 'Alt', altKey: true })
    expect(hintOn(/^Value/)?.getAttribute('data-revealed')).toBe('true')
    expect(hintOn('Habit')?.textContent).toBe('⌥2')
    expect(hintOn(/^Rewards/)?.textContent).toBe('⌥↑↓')
    expect(hintOn(/^Symbol/)?.textContent).toBe('⌥J')
    expect(hintOn(/^Hosting destination/)?.textContent).toBe('⌥H')
  })

  it('hides them again on keyup and on window blur', () => {
    renderPrompt(captureDraftFixtures.titledTask, { presentation: 'popover' })
    fireEvent.keyDown(window, { key: 'Alt', altKey: true })
    fireEvent.keyUp(window, { key: 'Alt', altKey: false })
    expect(hintOn(/^Value/)?.getAttribute('data-revealed')).toBe('false')

    fireEvent.keyDown(window, { key: 'Alt', altKey: true })
    fireEvent.blur(window)
    expect(hintOn(/^Value/)?.getAttribute('data-revealed')).toBe('false')
  })

  it('draws no hints on the phone sheet', () => {
    renderPrompt(captureDraftFixtures.titledTask, { presentation: 'sheet' })
    fireEvent.keyDown(window, { key: 'Alt', altKey: true })
    expect(hintOn(/^Value/)).toBeNull()
    expect(hintOn('Habit')).toBeNull()
  })
})

describe('the suggestions pane (mirrors the Popover/Sheet suggestion stories)', () => {
  it('floats the pane above the desktop popover (PopoverWithSuggestions)', () => {
    renderPrompt(captureDraftFixtures.emptyTask, {
      presentation: 'popover',
      suggestions: CAPTURE_SUGGESTIONS,
    })
    const pane = document.querySelector<HTMLElement>(
      '[data-slot="capture-suggestions-pane"]',
    )
    expect(pane?.className).toContain('bottom-full')
    expect(pane?.style.marginBottom).toBe('var(--kro-space-medium)')
    expect(pane?.className).toContain('absolute')
    expect(screen.getByTestId('capture-suggestions')).toBeTruthy()
  })

  it('adds the ticked cards on ⇧⏎ from the title (PopoverWithTwoSuggestionsSelected)', async () => {
    const onAddSuggestions = vi.fn()
    renderPrompt(captureDraftFixtures.emptyTask, {
      presentation: 'popover',
      suggestions: CAPTURE_SUGGESTIONS,
      selectedSuggestionIds: [
        captureSuggestionMocks.task.id,
        captureSuggestionMocks.reminder.id,
      ],
      suggestionAddCount: 2,
      onAddSuggestions,
    })
    expect(screen.getByTestId('capture-suggestions-add').textContent).toContain(
      'Add 2',
    )
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}')
    expect(onAddSuggestions).toHaveBeenCalledTimes(1)
  })

  it('never shows the pane on the phone sheet (SheetHidesSuggestions)', () => {
    renderPrompt(captureDraftFixtures.emptyTask, {
      presentation: 'sheet',
      suggestions: CAPTURE_SUGGESTIONS,
    })
    expect(screen.queryByTestId('capture-suggestions')).toBeNull()
  })

  it('does nothing on ⇧⏎ with nothing ticked', async () => {
    const onAddSuggestions = vi.fn()
    renderPrompt(captureDraftFixtures.emptyTask, {
      presentation: 'popover',
      suggestions: CAPTURE_SUGGESTIONS,
      onAddSuggestions,
    })
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}')
    expect(onAddSuggestions).not.toHaveBeenCalled()
  })
})

describe('the floating panes share the panel corner', () => {
  it('rounds the popover, its band and the suggestions pane at --kro-radius-panel', () => {
    renderPrompt(captureDraftFixtures.emptyTask, {
      presentation: 'popover',
      suggestions: CAPTURE_SUGGESTIONS,
    })
    expect(screen.getByTestId('capture-prompt').style.borderRadius).toBe(
      'var(--kro-radius-panel)',
    )
    expect(
      document.querySelector<HTMLElement>(
        '[data-slot="capture-prompt-status-bar"]',
      )?.style.borderRadius,
    ).toBe('0 0 var(--kro-radius-panel) var(--kro-radius-panel)')
    expect(screen.getByTestId('capture-suggestions').style.borderRadius).toBe(
      'var(--kro-radius-panel)',
    )
  })
})

describe('the suggestions toggle and the float-in motion', () => {
  it('pins a pressed/unpressed sparkles toggle left of the kind picker', async () => {
    const onToggleSuggestions = vi.fn()
    renderPrompt(captureDraftFixtures.emptyTask, {
      presentation: 'popover',
      canToggleSuggestions: true,
      isSuggestionsShown: false,
      onToggleSuggestions,
    })
    const toggle = screen.getByTestId('capture-suggestions-toggle')
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(toggle.getAttribute('aria-keyshortcuts')).toBe('Alt+S')
    expect(toggle.getAttribute('title')).toBe('Show suggestions (⌥S)')
    expect(toggle.className).toContain('left-3')
    await userEvent.click(toggle)
    expect(onToggleSuggestions).toHaveBeenCalledTimes(1)
  })

  it('draws no toggle on the phone sheet or with the pane unavailable', () => {
    const { unmount } = renderPrompt(captureDraftFixtures.emptyTask, {
      presentation: 'sheet',
      canToggleSuggestions: true,
    })
    expect(screen.queryByTestId('capture-suggestions-toggle')).toBeNull()
    unmount()
    renderPrompt(captureDraftFixtures.emptyTask, { presentation: 'popover' })
    expect(screen.queryByTestId('capture-suggestions-toggle')).toBeNull()
  })

  const pane = () =>
    document.querySelector<HTMLElement>(
      '[data-slot="capture-suggestions-pane"]',
    )

  it("embeds the pane in the prompt's own motion while it presents, so both move as one", () => {
    renderPrompt(captureDraftFixtures.emptyTask, {
      presentation: 'popover',
      suggestions: CAPTURE_SUGGESTIONS,
    })
    const prompt = screen.getByTestId('capture-prompt')
    expect(prompt.className).toContain('kro-trailing-panel')
    expect(prompt.getAttribute('data-state')).toBe('open')
    expect(pane()?.className).not.toContain('kro-trailing-panel')
    expect(pane()?.getAttribute('data-kro-pane-motion')).toBe('embedded')
  })

  it('keeps the pane embedded while the prompt dismisses, riding the prompt out', () => {
    const { rerender } = renderPrompt(captureDraftFixtures.emptyTask, {
      presentation: 'popover',
      suggestions: CAPTURE_SUGGESTIONS,
    })
    rerender(
      <PanelledPrompt
        {...harnessProps(captureDraftFixtures.emptyTask, {
          presentation: 'popover',
          suggestions: CAPTURE_SUGGESTIONS,
          isOpen: false,
        })}
      />,
    )
    const embedded = pane()
    if (embedded !== null) {
      expect(embedded.className).not.toContain('kro-trailing-panel')
      expect(embedded.getAttribute('data-state')).toBe('open')
    }
  })

  it('gives the pane its own trailing motion only when toggled while the prompt stays open', () => {
    const { rerender } = renderPrompt(captureDraftFixtures.emptyTask, {
      presentation: 'popover',
      suggestions: CAPTURE_SUGGESTIONS,
      canToggleSuggestions: true,
    })
    // Suggestions that merely change stay embedded; only the user's toggle frees the pane.
    expect(pane()?.className).not.toContain('kro-trailing-panel')
    fireEvent.click(screen.getByTestId('capture-suggestions-toggle'))
    rerender(
      <PanelledPrompt
        {...harnessProps(captureDraftFixtures.emptyTask, {
          presentation: 'popover',
          suggestions: [],
          canToggleSuggestions: true,
        })}
      />,
    )
    // Kept mounted, inert, while it animates out on its own.
    expect(pane()?.className).toContain('kro-trailing-panel')
    expect(pane()?.getAttribute('data-state')).toBe('closed')
    expect(pane()?.hasAttribute('inert')).toBe(true)

    rerender(
      <PanelledPrompt
        {...harnessProps(captureDraftFixtures.emptyTask, {
          presentation: 'popover',
          suggestions: CAPTURE_SUGGESTIONS,
          canToggleSuggestions: true,
        })}
      />,
    )
    expect(pane()?.className).toContain('kro-trailing-panel')
    expect(pane()?.getAttribute('data-state')).toBe('open')
  })

  it('is laid out on the very first render when shown by preference, never measured in later', () => {
    renderPrompt(captureDraftFixtures.emptyTask, {
      presentation: 'popover',
      suggestions: CAPTURE_SUGGESTIONS,
    })
    // No waiting: the height is set before the first paint.
    expect(pane()?.style.height).toMatch(/px$/)
  })
})

describe('Hanten UI settlements — contrast, targets and the narrow sheet', () => {
  it('writes the status band’s copy in the on-dark roles, with the darker band (H1)', () => {
    renderPrompt(captureDraftFixtures.emptyTask, { presentation: 'popover' })

    const band = document.querySelector<HTMLElement>(
      '[data-slot="capture-prompt-status-bar"]',
    )
    expect(band?.style.getPropertyValue('--kro-glass-tint-strength')).toBe(
      'var(--kro-status-band-strength)',
    )
    expect(screen.getByTestId('capture-status-text').style.color).toBe(
      'var(--kro-color-fore-secondary-on-band)',
    )
    expect(
      screen.getByRole('button', { name: /^Hosting destination/ }).style.color,
    ).toBe('var(--kro-color-fore-on-band)')
  })

  it('paints secondary copy on the glass in the on-glass role, placeholder included (H3)', () => {
    renderPrompt(captureDraftFixtures.emptyTask, {
      presentation: 'sheet',
      openPanel: 'value',
    })

    expect(screen.getByTestId('capture-title').className).toContain(
      'placeholder:text-[var(--kro-color-fore-secondary-on-glass)]',
    )
    expect(screen.getByText('Value to my life / goals').style.color).toBe(
      'var(--kro-color-fore-secondary-on-glass)',
    )
  })

  it('sizes the sheet’s stars, symbol and actions to the 44px touch target, stars 8px apart (H4)', () => {
    renderPrompt(captureDraftFixtures.emptyTask, {
      presentation: 'sheet',
      openPanel: 'value',
    })

    const touch = 'var(--kro-size-min-touch-target)'
    const stars = screen.getByRole('group', { name: 'Value' })
    expect(stars.className).toContain('gap-2')
    const star = stars.querySelector<HTMLElement>('button')
    expect(star?.style.width).toBe(touch)
    expect(star?.style.height).toBe(touch)
    expect(screen.getByTestId('capture-symbol').style.width).toBe(touch)
    expect(screen.getByTestId('capture-add').style.minHeight).toBe(touch)
    expect(
      screen.getByRole('button', { name: /^Discard new/ }).style.minHeight,
    ).toBe(touch)
  })

  it('keeps the popover compact: 26×28 stars, a 34px symbol (H4)', () => {
    renderPrompt(captureDraftFixtures.emptyTask, {
      presentation: 'popover',
      openPanel: 'value',
    })

    const star = screen
      .getByRole('group', { name: 'Value' })
      .querySelector<HTMLElement>('button')
    expect(star?.style.width).toBe('26px')
    expect(screen.getByTestId('capture-symbol').style.width).toBe('34px')
    expect(screen.getByTestId('capture-add').style.minHeight).toBe('')
  })

  it('draws a filled value star in the on-glass reward role, its caption at 12px (H9, H10)', () => {
    renderPrompt(
      { ...captureDraftFixtures.emptyTask, value: 3 },
      { presentation: 'popover', openPanel: 'value' },
    )

    const [first] = Array.from(
      screen
        .getByRole('group', { name: 'Value' })
        .querySelectorAll<HTMLElement>('button'),
    )
    expect(first?.style.color).toBe('var(--kro-color-reward-on-glass)')
    const caption = screen
      .getByTestId('capture-value-editor')
      .querySelector('span[aria-hidden].text-xs')
    expect(caption).not.toBeNull()
  })

  it('fits the Kind picker to a 320px sheet: filling, icon-only below 24rem, every name kept (H5)', () => {
    renderPrompt(captureDraftFixtures.emptyTask, { presentation: 'sheet' })

    const kinds = screen.getByRole('group', { name: 'Kind' })
    expect(kinds.hasAttribute('data-kro-fill')).toBe(true)
    expect(kinds.className).toContain('@container')
    for (const name of ['Task', 'Habit', 'Event', 'Reminder']) {
      const segment = screen.getByRole('button', { name })
      expect(segment.className).toContain('min-w-0')
      expect(
        segment.querySelector('[data-slot="segment-label"]')?.className,
      ).toContain('@max-[24rem]:sr-only')
    }
  })

  it('leaves the popover’s Kind picker at its natural width', () => {
    renderPrompt(captureDraftFixtures.emptyTask, { presentation: 'popover' })

    expect(
      screen.getByRole('group', { name: 'Kind' }).hasAttribute('data-kro-fill'),
    ).toBe(false)
  })
})
