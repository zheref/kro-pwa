import { Calendar, Circle, LayoutGrid } from 'lucide-react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Sidebar } from './Sidebar'

afterEach(cleanup)

const ITEMS = [
  { id: 'today', label: 'Today', icon: Calendar, section: 'Do' },
  { id: 'plan', label: 'Plan', icon: LayoutGrid, section: 'Do' },
  { id: 'earn', label: 'Earn', icon: Circle, section: 'Reflect' },
] as const

describe('Sidebar', () => {
  it('lists destinations under small-caps section labels', () => {
    render(<Sidebar title="Kro" items={[...ITEMS]} onSelect={() => {}} />)

    expect(screen.getByText('Kro')).toBeTruthy()
    expect(screen.getByText('Do')).toBeTruthy()
    expect(screen.getByText('Reflect')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Today' })).toBeTruthy()
    expect(screen.getByText('Do').className).toContain('uppercase')
    expect(screen.getByText('Do').className).toContain(
      'text-kro-fore-secondary',
    )
  })

  it('marks the selected row as the current page with pressed glass, not colour alone', () => {
    render(
      <Sidebar items={[...ITEMS]} selectedId="today" onSelect={() => {}} />,
    )

    const selected = screen.getByRole('button', { name: 'Today' })
    expect(selected.getAttribute('aria-current')).toBe('page')
    expect(selected.className).toContain('kro-glass')
    expect(selected.className).toContain('kro-glass--pressed')
    expect(selected.className).toContain('min-h-6')
    expect(
      screen.getByRole('button', { name: 'Plan' }).getAttribute('aria-current'),
    ).toBeNull()
  })

  it('reports the tapped destination id and never navigates', async () => {
    const onSelect = vi.fn()
    render(<Sidebar items={[...ITEMS]} onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('button', { name: 'Earn' }))

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith('earn')
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('defaults to a 240-wide glass sidebar', () => {
    render(<Sidebar items={[...ITEMS]} onSelect={() => {}} />)

    const pane = screen.getByLabelText('Sidebar')
    expect(pane.style.width).toBe('240px')
    expect(pane.className).toContain('kro-glass')
  })

  it('renders items without a section or icon', () => {
    render(
      <Sidebar
        items={[{ id: 'find', label: 'Find endeavors' }]}
        onSelect={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'Find endeavors' })).toBeTruthy()
    expect(screen.queryByText('Do')).toBeNull()
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(
      <Sidebar items={[...ITEMS]} selectedId="today" onSelect={() => {}} />,
    )

    expect(screen.getByLabelText('Sidebar').getAttribute('data-density')).toBe(
      'compact',
    )
    expect(screen.getByRole('button', { name: 'Today' }).className).toContain(
      'min-h-6',
    )

    rerender(
      <Sidebar
        items={[...ITEMS]}
        selectedId="today"
        onSelect={() => {}}
        density="comfortable"
      />,
    )
    expect(screen.getByLabelText('Sidebar').getAttribute('data-density')).toBe(
      'comfortable',
    )
    expect(screen.getByRole('button', { name: 'Today' }).className).toContain(
      'min-h-9',
    )
  })

  it('expands a nested category and reveals children', async () => {
    const onSelect = vi.fn()
    const nested = [
      {
        id: 'do',
        label: 'Do',
        children: [
          { id: 'today', label: 'Today' },
          { id: 'inbox', label: 'Inbox' },
        ],
      },
      { id: 'plan', label: 'Plan' },
    ]
    render(<Sidebar items={nested} onSelect={onSelect} />)

    const category = screen.getByRole('button', { name: 'Do' })
    expect(category.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('button', { name: 'Today' })).toBeNull()

    await userEvent.click(category)

    expect(category.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('button', { name: 'Today' })).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(onSelect).toHaveBeenCalledWith('today')
  })

  it('opens a category that contains the selected child', () => {
    render(
      <Sidebar
        items={[
          {
            id: 'do',
            label: 'Do',
            children: [
              { id: 'today', label: 'Today' },
              { id: 'inbox', label: 'Inbox' },
            ],
          },
        ]}
        selectedId="inbox"
        onSelect={() => {}}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Do' }).getAttribute('aria-expanded'),
    ).toBe('true')
    expect(
      screen
        .getByRole('button', { name: 'Inbox' })
        .getAttribute('aria-current'),
    ).toBe('page')
  })
})
