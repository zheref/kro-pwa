import { Calendar, LayoutGrid } from 'lucide-react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Nav } from './Nav'

afterEach(cleanup)

const ITEMS = [
  {
    id: 'do',
    label: 'Do',
    icon: Calendar,
    children: [
      { id: 'today', label: 'Today' },
      { id: 'inbox', label: 'Inbox' },
    ],
  },
  { id: 'plan', label: 'Plan', icon: LayoutGrid },
] as const

describe('Nav', () => {
  it('marks the selected row as the current page with pressed glass', () => {
    render(<Nav items={[...ITEMS]} selectedId="plan" onSelect={() => {}} />)

    const selected = screen.getByRole('button', { name: 'Plan' })
    expect(selected.getAttribute('aria-current')).toBe('page')
    expect(selected.className).toContain('kro-glass')
    expect(selected.className).toContain('kro-glass--pressed')
    expect(screen.getByLabelText('Navigation').getAttribute('data-slot')).toBe(
      'nav',
    )
  })

  it('reports the tapped destination id and never navigates', async () => {
    const onSelect = vi.fn()
    render(<Nav items={[...ITEMS]} onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('button', { name: 'Plan' }))

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith('plan')
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('expands a nested category and reveals children', async () => {
    const onSelect = vi.fn()
    render(<Nav items={[...ITEMS]} onSelect={onSelect} />)

    const category = screen.getByRole('button', { name: 'Do' })
    expect(category.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('button', { name: 'Today' })).toBeNull()

    await userEvent.click(category)

    expect(category.getAttribute('aria-expanded')).toBe('true')
    expect(category.querySelector('svg')?.classList.contains('rotate-90')).toBe(
      true,
    )
    expect(screen.getByRole('button', { name: 'Today' })).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(onSelect).toHaveBeenCalledWith('today')
  })

  it('opens a category that contains the selected child', () => {
    render(<Nav items={[...ITEMS]} selectedId="inbox" onSelect={() => {}} />)

    expect(
      screen.getByRole('button', { name: 'Do' }).getAttribute('aria-expanded'),
    ).toBe('true')
    const selected = screen.getByRole('button', { name: 'Inbox' })
    expect(selected.getAttribute('aria-current')).toBe('page')
    expect(selected.className).toContain('kro-glass--pressed')
  })

  it('maps size onto density and records appearance', () => {
    const { rerender } = render(
      <Nav items={[...ITEMS]} selectedId="plan" onSelect={() => {}} />,
    )

    const pane = () => screen.getByLabelText('Navigation')
    expect(pane().getAttribute('data-density')).toBe('comfortable')
    expect(pane().getAttribute('data-appearance')).toBe('default')
    expect(screen.getByRole('button', { name: 'Plan' }).className).toContain(
      'min-h-9',
    )

    rerender(
      <Nav
        items={[...ITEMS]}
        selectedId="plan"
        onSelect={() => {}}
        size="small"
        appearance="subtle"
      />,
    )
    expect(pane().getAttribute('data-density')).toBe('compact')
    expect(pane().getAttribute('data-appearance')).toBe('subtle')
    expect(screen.getByRole('button', { name: 'Plan' }).className).toContain(
      'min-h-6',
    )
  })
})
