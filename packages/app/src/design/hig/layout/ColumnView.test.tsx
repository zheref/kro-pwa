import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColumnView } from './ColumnView'

afterEach(cleanup)

const COLUMNS = [
  {
    id: 'areas',
    title: 'Areas',
    items: [
      { id: 'plan', label: 'Plan' },
      { id: 'do', label: 'Do' },
      { id: 'earn', label: 'Earn' },
    ],
  },
  {
    id: 'endeavors',
    title: 'Endeavors',
    items: [
      { id: 'inbox', label: 'Inbox triage' },
      { id: 'review', label: 'Weekly review' },
    ],
  },
] as const

describe('ColumnView', () => {
  it('renders each column title and its rows', () => {
    render(
      <ColumnView
        columns={COLUMNS}
        selected={{ 0: 'plan' }}
        onSelect={() => {}}
      />,
    )

    expect(screen.getByText('Areas')).toBeTruthy()
    expect(screen.getByText('Endeavors')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Plan' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Inbox triage' })).toBeTruthy()
  })

  it('marks the selected row with accent paint and aria-current', () => {
    render(
      <ColumnView
        columns={COLUMNS}
        selected={{ 0: 'do' }}
        onSelect={() => {}}
      />,
    )

    const row = screen.getByRole('button', { name: 'Do' })
    expect(row.getAttribute('aria-current')).toBe('true')
    expect(row.className).toContain('bg-kro-accent')
    expect(row.className).toContain('text-kro-on-accent')
    expect(
      screen.getByRole('button', { name: 'Plan' }).getAttribute('aria-current'),
    ).toBeNull()
  })

  it('reports the column index and item id when a row is pressed', async () => {
    const onSelect = vi.fn()
    render(<ColumnView columns={COLUMNS} selected={{}} onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('button', { name: 'Earn' }))

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith(0, 'earn')
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(
      <ColumnView
        columns={COLUMNS}
        selected={{ 0: 'plan' }}
        onSelect={() => {}}
      />,
    )

    const root = document.querySelector('[data-slot="column-view"]')
    expect(root?.getAttribute('data-density')).toBe('compact')
    expect(screen.getByRole('button', { name: 'Plan' }).className).toContain(
      'min-h-6',
    )

    rerender(
      <ColumnView
        columns={COLUMNS}
        selected={{ 0: 'plan' }}
        onSelect={() => {}}
        density="comfortable"
      />,
    )
    expect(
      document
        .querySelector('[data-slot="column-view"]')
        ?.getAttribute('data-density'),
    ).toBe('comfortable')
    expect(screen.getByRole('button', { name: 'Plan' }).className).toContain(
      'min-h-9',
    )
  })
})
