/**
 * PopupButton.
 *
 * NOTHING HERE OPENS THE MENU. Mounting DropdownMenuContent under jsdom
 * stalls the Vitest worker — see `system/primitives/__tests__/radixEnvironment.tsx`.
 * These tests assert the trigger (current selection, disabled, ARIA) with
 * `open` left false so Content never mounts. The panel belongs to Storybook
 * in a real browser.
 */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PopupButton, PopupChoiceRow, selectedPopupLabel } from './PopupButton'

afterEach(cleanup)

const KINDS = [
  { value: 'task', label: 'Task' },
  { value: 'habit', label: 'Habit' },
  { value: 'event', label: 'Event' },
]

describe('PopupButton', () => {
  it('shows the current selection on the trigger', () => {
    render(
      <PopupButton value="habit" options={KINDS} onValueChange={vi.fn()} />,
    )

    const trigger = screen.getByRole('button', { name: 'Habit' })
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(
      document.querySelector('[data-slot="dropdown-menu-content"]'),
    ).toBeNull()
  })

  it('does not open when disabled, and the fade lives on the control once', () => {
    render(
      <PopupButton
        value="task"
        options={KINDS}
        disabled
        onValueChange={vi.fn()}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Task' })
    expect(trigger).toHaveProperty('disabled', true)
    const fades = trigger.className
      .split(/\s+/)
      .filter(
        (token) => token === 'disabled:opacity-[var(--kro-opacity-disabled)]',
      )
    expect(fades).toHaveLength(1)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('honours an aria-label without losing the visible selection', () => {
    render(
      <PopupButton
        value="event"
        options={KINDS}
        aria-label="Endeavor kind"
        onValueChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Endeavor kind' })).toBeTruthy()
    expect(screen.getByRole('button').textContent).toContain('Event')
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(
      <PopupButton value="habit" options={KINDS} onValueChange={vi.fn()} />,
    )
    const trigger = screen.getByRole('button', { name: 'Habit' })
    expect(trigger.getAttribute('data-density')).toBe('compact')
    expect(trigger.className).toContain('h-7')

    rerender(
      <PopupButton
        value="habit"
        options={KINDS}
        density="comfortable"
        onValueChange={vi.fn()}
      />,
    )
    const comfortable = screen.getByRole('button', { name: 'Habit' })
    expect(comfortable.getAttribute('data-density')).toBe('comfortable')
    expect(comfortable.className).toContain('h-9')
  })

  it('falls back to the raw value when the choice is not in the list', () => {
    expect(selectedPopupLabel(KINDS, 'blueprint')).toBe('blueprint')
    render(
      <PopupButton value="blueprint" options={KINDS} onValueChange={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: 'blueprint' })).toBeTruthy()
  })

  it('marks the current choice with a check, without mounting the panel', () => {
    const habit = { value: 'habit', label: 'Habit' }
    const task = { value: 'task', label: 'Task' }
    const { rerender } = render(<PopupChoiceRow option={habit} selected />)

    expect(screen.getByText('Habit')).toBeTruthy()
    expect(document.querySelector('svg.lucide-check')).toBeTruthy()

    rerender(<PopupChoiceRow option={task} selected={false} />)
    expect(screen.getByText('Task')).toBeTruthy()
    expect(document.querySelector('svg.lucide-check')).toBeNull()
  })
})
