import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MessageBar } from './MessageBar'

afterEach(cleanup)

const announced = () => screen.getByRole('status').textContent

describe('MessageBar', () => {
  it('speaks its intent, so the colour is not the only carrier', () => {
    render(<MessageBar title="Calendar is read-only." />)
    expect(announced()).toBe('Note: Calendar is read-only.')
    expect(screen.getByRole('status').getAttribute('data-slot')).toBe(
      'message-bar',
    )
    expect(screen.getByRole('status').getAttribute('aria-label')).toBeNull()
  })

  it('prefixes each intent with its own spoken word', () => {
    const { rerender } = render(<MessageBar intent="success" title="Saved." />)
    expect(announced()).toBe('Success: Saved.')

    rerender(<MessageBar intent="warning" title="Past expiry." />)
    expect(announced()).toBe('Warning: Past expiry.')

    rerender(<MessageBar intent="error" title="Rejected." />)
    expect(announced()).toBe('Error: Rejected.')
  })

  it('fills opaquely with banner tokens, never a translucent mix', () => {
    const { container, rerender } = render(
      <MessageBar intent="warning" title="Past expiry." />,
    )
    const bar = () =>
      container.querySelector('[data-slot="message-bar"]') as HTMLElement

    expect(bar().style.backgroundColor).toBe('var(--kro-color-banner-warning)')
    expect(bar().style.backgroundColor).not.toContain('color-mix')

    rerender(<MessageBar intent="error" title="Rejected." />)
    expect(bar().style.backgroundColor).toBe('var(--kro-color-banner-danger)')

    rerender(<MessageBar intent="success" title="Saved." />)
    expect(bar().style.backgroundColor).toBe('var(--kro-color-focus-green)')

    rerender(<MessageBar intent="info" title="Read only." />)
    expect(bar().style.backgroundColor).toBe('var(--kro-color-back-inner)')
  })

  it('pairs the title with a hidden glyph', () => {
    const { container } = render(<MessageBar title="Offline." />)
    const glyph = container.querySelector('svg')
    expect(glyph).not.toBeNull()
    expect(glyph?.getAttribute('aria-hidden')).toBe('true')
  })

  it('offers an action and a dismiss, both named', async () => {
    const onAction = vi.fn()
    const onDismiss = vi.fn()
    render(
      <MessageBar
        title="Sync failed."
        body="The host rejected the change."
        action={{ label: 'Try again', onAction }}
        onDismiss={onDismiss}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(onAction).toHaveBeenCalledOnce()
    expect(onDismiss).toHaveBeenCalledOnce()
    expect(announced()).toContain('The host rejected the change.')
  })

  it('marks multiline layout so the body can wrap', () => {
    render(
      <MessageBar
        layout="multiline"
        title="A long notice."
        body="More detail than a single line can hold."
      />,
    )
    expect(screen.getByRole('status').getAttribute('data-layout')).toBe(
      'multiline',
    )
  })
})
