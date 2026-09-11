import { Calendar, Circle, LayoutGrid } from 'lucide-react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TabBar } from './TabBar'

afterEach(cleanup)

const ITEMS = [
  { id: 'plan', label: 'Plan', icon: LayoutGrid },
  { id: 'do', label: 'Do', icon: Calendar },
  { id: 'earn', label: 'Earn', icon: Circle },
] as const

describe('TabBar', () => {
  it('is a nav dock with compact destinations', () => {
    render(<TabBar items={[...ITEMS]} selectedId="do" onSelect={() => {}} />)

    const nav = screen.getByRole('navigation', { name: 'Tabs' })
    expect(nav.className).toContain('kro-glass')
    expect(nav.getAttribute('data-density')).toBe('compact')
    expect(screen.getByRole('button', { name: 'Do' }).className).toContain(
      'min-h-6',
    )
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('grows destinations for comfortable density', () => {
    render(
      <TabBar
        items={[...ITEMS]}
        selectedId="do"
        onSelect={() => {}}
        density="comfortable"
      />,
    )

    expect(
      screen
        .getByRole('navigation', { name: 'Tabs' })
        .getAttribute('data-density'),
    ).toBe('comfortable')
    expect(screen.getByRole('button', { name: 'Do' }).className).toContain(
      'min-h-9',
    )
  })

  it('signals the selected tab with accent, weight, current page and a dot', () => {
    render(<TabBar items={[...ITEMS]} selectedId="do" onSelect={() => {}} />)

    const selected = screen.getByRole('button', { name: 'Do' })
    expect(selected.getAttribute('aria-current')).toBe('page')
    expect(selected.className).toContain('text-kro-accent')
    expect(selected.className).toContain('font-semibold')
    const dot = selected.querySelector('.bg-kro-accent')
    expect(dot).not.toBeNull()
    expect(
      screen.getByRole('button', { name: 'Plan' }).getAttribute('aria-current'),
    ).toBeNull()
  })

  it('reports the tapped tab id and never navigates', async () => {
    const onSelect = vi.fn()
    render(<TabBar items={[...ITEMS]} selectedId="do" onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('button', { name: 'Earn' }))

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith('earn')
    expect(screen.queryByRole('link')).toBeNull()
  })
})
