/**
 * PullDownButton.
 *
 * NOTHING HERE OPENS THE MENU — same reason as PopupButton.test.tsx and
 * the measurement in `radixEnvironment.tsx`. The trigger label must stay
 * the action name even after a story has been clicked in a real browser;
 * here we only assert that it starts (and stays, while closed) "Add".
 */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PullDownButton,
  PullDownChoiceRow,
  pullDownItemIsDestructive,
} from './PullDownButton'

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

describe('PullDownButton', () => {
  it('keeps the action name on the trigger — it is not a pop-up', () => {
    render(<PullDownButton label="Add" items={ITEMS} />)

    const trigger = screen.getByRole('button', { name: 'Add' })
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.textContent).toContain('Add')
    expect(trigger.textContent).not.toContain('Task')
    expect(
      document.querySelector('[data-slot="dropdown-menu-content"]'),
    ).toBeNull()
  })

  it('does not fire when disabled, and the fade lives on the control once', () => {
    render(<PullDownButton label="Add" items={ITEMS} disabled />)

    const trigger = screen.getByRole('button', { name: 'Add' })
    expect(trigger).toHaveProperty('disabled', true)
    const fades = trigger.className
      .split(/\s+/)
      .filter(
        (token) => token === 'disabled:opacity-[var(--kro-opacity-disabled)]',
      )
    expect(fades).toHaveLength(1)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(<PullDownButton label="Add" items={ITEMS} />)
    const trigger = screen.getByRole('button', { name: 'Add' })
    expect(trigger.getAttribute('data-density')).toBe('compact')
    expect(trigger.className).toContain('h-6')

    rerender(<PullDownButton label="Add" items={ITEMS} density="comfortable" />)
    const comfortable = screen.getByRole('button', { name: 'Add' })
    expect(comfortable.getAttribute('data-density')).toBe('comfortable')
    expect(comfortable.className).toContain('h-9')
  })

  it('still names the action when the menu has a destructive item', () => {
    render(<PullDownButton label="Add" items={ITEMS} />)

    expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy()
    expect(
      document.querySelector('[data-slot="dropdown-menu-content"]'),
    ).toBeNull()
  })

  it('names a destructive row in words, not only by tint', () => {
    const remove = ITEMS.find((item) => item.id === 'delete')
    const task = ITEMS.find((item) => item.id === 'task')
    expect(remove && pullDownItemIsDestructive(remove)).toBe(true)
    expect(task && pullDownItemIsDestructive(task)).toBe(false)
    expect(remove?.label).toContain('Delete')

    if (remove === undefined || task === undefined) return
    const { rerender } = render(<PullDownChoiceRow item={remove} />)
    const row = document.querySelector('[data-slot="pull-down-choice"]')
    expect(row?.textContent).toBe('Delete endeavor')
    expect(row?.getAttribute('data-destructive')).toBe('true')

    rerender(<PullDownChoiceRow item={task} />)
    expect(
      document
        .querySelector('[data-slot="pull-down-choice"]')
        ?.getAttribute('data-destructive'),
    ).toBeNull()
  })
})
