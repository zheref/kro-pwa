import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OutlineView } from './OutlineView'

afterEach(cleanup)

const TREE = [
  {
    id: 'plan',
    title: 'Plan',
    children: [
      { id: 'inbox', title: 'Inbox triage' },
      { id: 'review', title: 'Weekly review' },
    ],
  },
  { id: 'do', title: 'Do' },
] as const

describe('OutlineView', () => {
  it('shows the roots and hides nested rows until expanded', () => {
    render(<OutlineView items={TREE} />)

    expect(screen.getByRole('button', { name: 'Plan' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Do' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Inbox triage' })).toBeNull()
  })

  it('reveals children when the expand control is pressed', async () => {
    render(<OutlineView items={TREE} />)

    await userEvent.click(screen.getByRole('button', { name: 'Expand Plan' }))

    expect(screen.getByRole('button', { name: 'Inbox triage' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Weekly review' })).toBeTruthy()
    expect(
      screen
        .getByRole('button', { name: 'Collapse Plan' })
        .getAttribute('aria-expanded'),
    ).toBe('true')
  })

  it('stays controlled when a caller passes expanded', async () => {
    const onExpandedChange = vi.fn()
    render(
      <OutlineView
        items={TREE}
        expanded={[]}
        onExpandedChange={onExpandedChange}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Expand Plan' }))

    expect(onExpandedChange).toHaveBeenCalledWith(['plan'])
    expect(screen.queryByRole('button', { name: 'Inbox triage' })).toBeNull()
  })

  it('reports a selected leaf from the label button', async () => {
    const onSelect = vi.fn()
    render(
      <OutlineView
        items={TREE}
        defaultExpanded={['plan']}
        onSelect={onSelect}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Inbox triage' }))
    expect(onSelect).toHaveBeenCalledWith('inbox')
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(<OutlineView items={TREE} />)

    const root = document.querySelector('[data-slot="outline-view"]')
    expect(root?.getAttribute('data-density')).toBe('compact')
    expect(
      document.querySelector('[data-slot="outline-view-row"]')?.className,
    ).toContain('min-h-6')

    rerender(<OutlineView items={TREE} density="comfortable" />)
    expect(
      document
        .querySelector('[data-slot="outline-view"]')
        ?.getAttribute('data-density'),
    ).toBe('comfortable')
    expect(
      document.querySelector('[data-slot="outline-view-row"]')?.className,
    ).toContain('min-h-9')
  })
})
