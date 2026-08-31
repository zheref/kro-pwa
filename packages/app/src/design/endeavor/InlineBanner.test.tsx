import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InlineBanner } from './InlineBanner'

afterEach(cleanup)

describe('InlineBanner', () => {
  it('speaks its severity, so the colour is not the only carrier of it', () => {
    render(<InlineBanner message="Google Calendar rejected the change." />)

    expect(
      screen.getByLabelText('Error: Google Calendar rejected the change.'),
    ).not.toBeNull()
  })

  it('prefixes each kind with its own spoken word', () => {
    const { rerender } = render(<InlineBanner kind="warning" message="Past expiry." />)
    expect(screen.getByLabelText('Warning: Past expiry.')).not.toBeNull()

    rerender(<InlineBanner kind="info" message="Read only." />)
    expect(screen.getByLabelText('Note: Read only.')).not.toBeNull()
  })

  it('pairs the message with a glyph, hidden from readers because the label carries it', () => {
    const { container } = render(<InlineBanner message="Offline." />)

    const glyph = container.querySelector('svg')
    expect(glyph).not.toBeNull()
    expect(glyph?.getAttribute('aria-hidden')).toBe('true')
  })

  it('fills OPAQUELY with the banner token — a translucent fill cannot be verified once', () => {
    const { container } = render(<InlineBanner kind="warning" message="Past expiry." />)

    const banner = container.querySelector('[data-kind="warning"]') as HTMLElement
    expect(banner.style.backgroundColor).toBe('var(--kro-color-banner-warning)')
    expect(banner.style.backgroundColor).not.toContain('color-mix')
  })

  it('paints danger on the danger token, not on the warning one', () => {
    const { container } = render(<InlineBanner message="Deleted on the host." />)

    const banner = container.querySelector('[data-kind="error"]') as HTMLElement
    expect(banner.style.backgroundColor).toBe('var(--kro-color-banner-danger)')
  })

  it('draws info on the recessed surface instead of inventing a third banner colour', () => {
    const { container } = render(<InlineBanner kind="info" message="Read only." />)

    const banner = container.querySelector('[data-kind="info"]') as HTMLElement
    expect(banner.style.backgroundColor).toBe('var(--kro-color-back-inner)')
  })

  it('offers a recovery path — canon: an error with no next step is a defect', async () => {
    const onAction = vi.fn()
    render(
      <InlineBanner
        message="Google Calendar rejected the change."
        actionTitle="Try again"
        onAction={onAction}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(onAction).toHaveBeenCalledOnce()
  })

  it('omits the action entirely when only one half of the pair is given', () => {
    render(<InlineBanner message="Offline." actionTitle="Try again" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('keeps the action at the 44px touch floor', () => {
    render(
      <InlineBanner message="Offline." actionTitle="Retry" onAction={() => undefined} />,
    )

    expect(screen.getByRole('button', { name: 'Retry' }).className).toContain('h-11')
  })
})
