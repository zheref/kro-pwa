/**
 * SplitButton.
 *
 * NOTHING HERE OPENS THE MENU — same reason as MenuButton.test.tsx.
 * The primary face may be clicked; the chevron stays closed so Content
 * never mounts under jsdom.
 */

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { menuButtonItemIsDestructive } from './MenuButton'
import { SplitButton } from './SplitButton'

afterEach(cleanup)

const ITEMS = [
  { id: 'save-copy', label: 'Save a copy', onSelect: vi.fn() },
  {
    id: 'delete',
    label: 'Delete endeavor',
    tone: 'destructive' as const,
    onSelect: vi.fn(),
  },
]

const DISABLED_FADE = 'disabled:opacity-[var(--kro-opacity-disabled)]'

describe('SplitButton', () => {
  it('fires the primary action without opening the menu', async () => {
    const onClick = vi.fn()
    render(
      <SplitButton items={ITEMS} onClick={onClick}>
        Save
      </SplitButton>,
    )

    const cluster = document.querySelector('[data-slot="split-button"]')
    expect(cluster).not.toBeNull()

    const primary = screen.getByRole('button', { name: 'Save' })
    expect(primary.getAttribute('aria-haspopup')).toBeNull()
    await userEvent.click(primary)
    expect(onClick).toHaveBeenCalledOnce()
    expect(
      document.querySelector('[data-slot="dropdown-menu-content"]'),
    ).toBeNull()
  })

  it('names the chevron More actions, and keeps the menu closed', () => {
    render(<SplitButton items={ITEMS}>Save</SplitButton>)

    const more = screen.getByRole('button', { name: 'More actions' })
    expect(more.getAttribute('aria-haspopup')).toBe('menu')
    expect(more.getAttribute('aria-expanded')).toBe('false')
    expect(
      document.querySelector('[data-slot="dropdown-menu-content"]'),
    ).toBeNull()
  })

  it('does not fire when disabled, and the fade lives on each face once', async () => {
    const onClick = vi.fn()
    render(
      <SplitButton items={ITEMS} disabled onClick={onClick}>
        Save
      </SplitButton>,
    )

    const primary = screen.getByRole('button', { name: 'Save' })
    const more = screen.getByRole('button', { name: 'More actions' })
    await userEvent.click(primary)
    expect(onClick).not.toHaveBeenCalled()
    expect(primary).toHaveProperty('disabled', true)
    expect(more).toHaveProperty('disabled', true)

    const cluster = document.querySelector('[data-slot="split-button"]')
    expect(cluster?.className).not.toContain('opacity-')
    expect(
      primary.className.split(/\s+/).filter((token) => token === DISABLED_FADE),
    ).toHaveLength(1)
    expect(
      more.className.split(/\s+/).filter((token) => token === DISABLED_FADE),
    ).toHaveLength(1)
  })

  it('names a destructive item in words, not only by tint', () => {
    const remove = ITEMS.find((item) => item.id === 'delete')
    const copy = ITEMS.find((item) => item.id === 'save-copy')
    expect(remove && menuButtonItemIsDestructive(remove)).toBe(true)
    expect(copy && menuButtonItemIsDestructive(copy)).toBe(false)
    expect(remove?.label).toContain('Delete')
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(<SplitButton items={ITEMS}>Save</SplitButton>)
    const cluster = () => document.querySelector('[data-slot="split-button"]')
    expect(cluster()?.getAttribute('data-density')).toBe('compact')
    expect(screen.getByRole('button', { name: 'Save' }).className).toContain(
      'h-6',
    )

    rerender(
      <SplitButton items={ITEMS} size="large">
        Save
      </SplitButton>,
    )
    expect(cluster()?.getAttribute('data-density')).toBe('comfortable')
    expect(screen.getByRole('button', { name: 'Save' }).className).toContain(
      'h-9',
    )
  })
})
