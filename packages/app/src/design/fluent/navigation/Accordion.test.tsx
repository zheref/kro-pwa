import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Accordion } from './Accordion'

afterEach(cleanup)

const ITEMS = [
  { id: 'session', title: 'Session', content: 'Complete with session' },
  { id: 'reminders', title: 'Reminders', content: 'Inbox after the run' },
  { id: 'earn', title: 'Earn', content: 'Points land on complete' },
] as const

describe('Accordion', () => {
  it('opens one panel at a time and marks it with aria-expanded and a rotated chevron', async () => {
    render(<Accordion items={[...ITEMS]} />)

    const session = screen.getByRole('button', { name: 'Session' })
    const reminders = screen.getByRole('button', { name: 'Reminders' })
    expect(session.getAttribute('aria-expanded')).toBe('false')
    expect(session.querySelector('svg')?.classList.contains('rotate-90')).toBe(
      false,
    )

    await userEvent.click(session)
    expect(session.getAttribute('aria-expanded')).toBe('true')
    expect(session.querySelector('svg')?.classList.contains('rotate-90')).toBe(
      true,
    )
    expect(screen.getByText('Complete with session')).toBeTruthy()

    await userEvent.click(reminders)
    expect(reminders.getAttribute('aria-expanded')).toBe('true')
    expect(session.getAttribute('aria-expanded')).toBe('false')
    expect(
      screen.getByText('Complete with session').closest('[hidden]'),
    ).toBeTruthy()
  })

  it('keeps several panels open when multiple, and reports ids', async () => {
    const onOpenChange = vi.fn()
    render(
      <Accordion items={[...ITEMS]} multiple onOpenChange={onOpenChange} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Session' }))
    await userEvent.click(screen.getByRole('button', { name: 'Earn' }))

    expect(
      screen
        .getByRole('button', { name: 'Session' })
        .getAttribute('aria-expanded'),
    ).toBe('true')
    expect(
      screen
        .getByRole('button', { name: 'Earn' })
        .getAttribute('aria-expanded'),
    ).toBe('true')
    expect(onOpenChange).toHaveBeenLastCalledWith(['session', 'earn'])
  })

  it('refuses to close the last panel when collapsible is false', async () => {
    render(
      <Accordion
        items={[...ITEMS]}
        collapsible={false}
        defaultOpenIds={['session']}
      />,
    )

    const session = screen.getByRole('button', { name: 'Session' })
    expect(session.getAttribute('aria-expanded')).toBe('true')

    await userEvent.click(session)
    expect(session.getAttribute('aria-expanded')).toBe('true')
  })

  it('stays controlled when openIds is passed', async () => {
    const onOpenChange = vi.fn()
    render(
      <Accordion
        items={[...ITEMS]}
        openIds={['session']}
        onOpenChange={onOpenChange}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Earn' }))

    expect(onOpenChange).toHaveBeenCalledWith(['earn'])
    expect(
      screen
        .getByRole('button', { name: 'Session' })
        .getAttribute('aria-expanded'),
    ).toBe('true')
    expect(
      screen
        .getByRole('button', { name: 'Earn' })
        .getAttribute('aria-expanded'),
    ).toBe('false')
  })

  it('maps Fluent size names onto Kro density', () => {
    const { rerender } = render(<Accordion items={[...ITEMS]} />)

    const root = () => document.querySelector('[data-slot="accordion"]')
    expect(root()?.getAttribute('data-size')).toBe('medium')
    expect(root()?.getAttribute('data-density')).toBe('comfortable')
    expect(screen.getByRole('button', { name: 'Session' }).className).toContain(
      'min-h-9',
    )

    rerender(<Accordion items={[...ITEMS]} size="small" />)
    expect(root()?.getAttribute('data-density')).toBe('compact')
    expect(screen.getByRole('button', { name: 'Session' }).className).toContain(
      'min-h-6',
    )
  })
})
