/**
 * MenuButton.
 *
 * NOTHING HERE OPENS THE MENU — same reason as PullDownButton.test.tsx
 * and the measurement in `radixEnvironment.tsx`. These tests assert the
 * trigger (label, disabled, density) with `open` left false so Content
 * never mounts.
 */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MenuButton,
  MenuButtonChoiceRow,
  menuButtonItemIsDestructive,
} from './MenuButton'

afterEach(cleanup)

const ITEMS = [
  { id: 'task', label: 'Task', onSelect: vi.fn() },
  { id: 'habit', label: 'Habit', onSelect: vi.fn() },
  {
    id: 'delete',
    label: 'Delete endeavor',
    tone: 'destructive' as const,
    onSelect: vi.fn(),
  },
]

const DISABLED_FADE = 'disabled:opacity-[var(--kro-opacity-disabled)]'

describe('MenuButton', () => {
  it('keeps the action name on the trigger — it is not a pop-up', () => {
    render(<MenuButton label="Add" items={ITEMS} />)

    const trigger = screen.getByRole('button', { name: 'Add' })
    expect(trigger.getAttribute('data-slot')).toBe('menu-button')
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.textContent).toContain('Add')
    expect(trigger.textContent).not.toContain('Task')
    expect(
      document.querySelector('[data-slot="dropdown-menu-content"]'),
    ).toBeNull()
  })

  it('does not fire when disabled, and the fade lives on the control once', () => {
    render(<MenuButton label="Add" items={ITEMS} disabled />)

    const trigger = screen.getByRole('button', { name: 'Add' })
    expect(trigger).toHaveProperty('disabled', true)
    const fades = trigger.className
      .split(/\s+/)
      .filter((token) => token === DISABLED_FADE)
    expect(fades).toHaveLength(1)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(<MenuButton label="Add" items={ITEMS} />)
    const trigger = screen.getByRole('button', { name: 'Add' })
    expect(trigger.getAttribute('data-density')).toBe('compact')
    expect(trigger.className).toContain('h-6')

    rerender(<MenuButton label="Add" items={ITEMS} size="large" />)
    const comfortable = screen.getByRole('button', { name: 'Add' })
    expect(comfortable.getAttribute('data-density')).toBe('comfortable')
    expect(comfortable.className).toContain('h-9')
  })

  it('names a destructive item in words, not only by tint', () => {
    const remove = ITEMS.find((item) => item.id === 'delete')
    const task = ITEMS.find((item) => item.id === 'task')
    expect(remove && menuButtonItemIsDestructive(remove)).toBe(true)
    expect(task && menuButtonItemIsDestructive(task)).toBe(false)
    expect(remove?.label).toContain('Delete')
    expect(
      menuButtonItemIsDestructive({
        id: 'keep',
        label: 'Keep',
        tone: 'default',
        onSelect: vi.fn(),
      }),
    ).toBe(false)

    if (remove === undefined || task === undefined) return
    const { rerender } = render(<MenuButtonChoiceRow item={remove} />)
    const row = document.querySelector('[data-slot="menu-button-choice"]')
    expect(row?.textContent).toBe('Delete endeavor')
    expect(row?.getAttribute('data-destructive')).toBe('true')

    rerender(<MenuButtonChoiceRow item={task} />)
    expect(
      document
        .querySelector('[data-slot="menu-button-choice"]')
        ?.getAttribute('data-destructive'),
    ).toBeNull()
  })
})
