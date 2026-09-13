import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PathControl } from './PathControl'

afterEach(cleanup)

const ITEMS = [
  { id: 'plan', label: 'Plan' },
  { id: 'today', label: 'Today' },
  { id: 'endeavor', label: 'Write the KroTokens port' },
] as const

describe('PathControl', () => {
  it('marks the last crumb as the current page, not a button', () => {
    render(<PathControl items={[...ITEMS]} />)

    const current = screen.getByText('Write the KroTokens port')
    expect(current.getAttribute('aria-current')).toBe('page')
    expect(current.tagName).not.toBe('BUTTON')
    expect(
      screen.queryByRole('button', { name: 'Write the KroTokens port' }),
    ).toBeNull()
  })

  it('lets a person jump to an ancestor and reports its id', async () => {
    const onSelect = vi.fn()
    render(<PathControl items={[...ITEMS]} onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('button', { name: 'Plan' }))

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith('plan')
  })

  it('wraps and separates crumbs with a secondary chevron', () => {
    render(<PathControl items={[...ITEMS]} />)

    const nav = screen.getByRole('navigation', { name: 'Path' })
    expect(nav.className).toContain('flex-wrap')
    expect(nav.querySelectorAll('svg')).toHaveLength(2)
  })

  it('does not fire onSelect for a single current crumb', () => {
    const onSelect = vi.fn()
    render(
      <PathControl
        items={[{ id: 'today', label: 'Today' }]}
        onSelect={onSelect}
      />,
    )

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Today').getAttribute('aria-current')).toBe('page')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('collapses the middle into a More button and expands on press', async () => {
    const long = [
      { id: 'plan', label: 'Plan' },
      { id: 'today', label: 'Today' },
      { id: 'inbox', label: 'Inbox' },
      { id: 'triage', label: 'Triage' },
      { id: 'now', label: 'Write the KroTokens port' },
    ]
    render(<PathControl items={long} maxItems={3} />)

    expect(screen.getByRole('button', { name: 'Plan' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Today' })).toBeNull()
    expect(screen.getByRole('button', { name: 'More' })).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'More' }))

    expect(screen.getByRole('button', { name: 'Today' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Inbox' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'More' })).toBeNull()
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(<PathControl items={[...ITEMS]} />)

    const nav = screen.getByRole('navigation', { name: 'Path' })
    expect(nav.getAttribute('data-density')).toBe('compact')
    expect(screen.getByRole('button', { name: 'Plan' }).className).toContain(
      'min-h-6',
    )

    rerender(<PathControl items={[...ITEMS]} density="comfortable" />)
    expect(
      screen
        .getByRole('navigation', { name: 'Path' })
        .getAttribute('data-density'),
    ).toBe('comfortable')
    expect(screen.getByRole('button', { name: 'Plan' }).className).toContain(
      'min-h-9',
    )
  })
})
