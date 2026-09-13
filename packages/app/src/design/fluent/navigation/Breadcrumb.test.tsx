import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Breadcrumb } from './Breadcrumb'

afterEach(cleanup)

const ITEMS = [
  { id: 'plan', label: 'Plan' },
  { id: 'today', label: 'Today' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'triage', label: 'Triage' },
  { id: 'now', label: 'Write the KroTokens port' },
] as const

describe('Breadcrumb', () => {
  it('marks the last crumb as the current page, not a button', () => {
    render(<Breadcrumb items={[...ITEMS]} />)

    const current = screen.getByText('Write the KroTokens port')
    expect(current.getAttribute('aria-current')).toBe('page')
    expect(current.tagName).not.toBe('BUTTON')
    expect(
      screen.queryByRole('button', {
        name: 'Write the KroTokens port',
      }),
    ).toBeNull()
    expect(
      screen
        .getByRole('navigation', { name: 'Breadcrumb' })
        .getAttribute('data-slot'),
    ).toBe('breadcrumb')
  })

  it('lets a person jump to an ancestor and reports its id', async () => {
    const onSelect = vi.fn()
    render(<Breadcrumb items={[...ITEMS]} onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('button', { name: 'Plan' }))

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith('plan')
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('collapses the middle into a More button and expands on press', async () => {
    render(<Breadcrumb items={[...ITEMS]} maxItems={3} />)

    expect(screen.getByRole('button', { name: 'Plan' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Today' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Inbox' })).toBeNull()
    expect(screen.getByRole('button', { name: 'More' })).toBeTruthy()
    expect(
      screen.getByText('Write the KroTokens port').getAttribute('aria-current'),
    ).toBe('page')

    await userEvent.click(screen.getByRole('button', { name: 'More' }))

    expect(screen.getByRole('button', { name: 'Today' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Inbox' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'More' })).toBeNull()
  })

  it('maps Fluent size names onto Kro density', () => {
    const { rerender } = render(<Breadcrumb items={[...ITEMS]} />)

    const nav = () => screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(nav().getAttribute('data-density')).toBe('compact')
    expect(screen.getByRole('button', { name: 'Plan' }).className).toContain(
      'min-h-6',
    )

    rerender(<Breadcrumb items={[...ITEMS]} size="large" />)
    expect(nav().getAttribute('data-density')).toBe('comfortable')
    expect(screen.getByRole('button', { name: 'Plan' }).className).toContain(
      'min-h-9',
    )
  })
})
