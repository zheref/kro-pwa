import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InlineBanner } from './InlineBanner'

afterEach(cleanup)

/** What a screen reader announces: the live region's own contents, in order. */
const announced = () => screen.getByRole('status').textContent

describe('InlineBanner', () => {
  it('speaks its severity, so the colour is not the only carrier of it', () => {
    render(<InlineBanner message="Google Calendar rejected the change." />)

    expect(announced()).toBe('Error: Google Calendar rejected the change.')
  })

  it('prefixes each kind with its own spoken word', () => {
    const { rerender } = render(<InlineBanner kind="warning" message="Past expiry." />)
    expect(announced()).toBe('Warning: Past expiry.')

    rerender(<InlineBanner kind="info" message="Read only." />)
    expect(announced()).toBe('Note: Read only.')
  })

  it('announces the DETAIL line too — a two-line banner is two lines of speech', () => {
    // The regression. With the severity in an `aria-label` this line was
    // dropped: a live region is announced from its contents, and the label was
    // only ever the message.
    render(
      <InlineBanner
        message="Google Calendar rejected the change."
        detail="The event was deleted on the host."
      />,
    )

    expect(announced()).toBe(
      'Error: Google Calendar rejected the change.The event was deleted on the host.',
    )
  })

  it('carries NO aria-label — the visible text is the name, nothing to keep in sync', () => {
    render(<InlineBanner message="Offline." detail="Retrying shortly." />)

    const banner = screen.getByRole('status')
    expect(banner.getAttribute('aria-label')).toBeNull()
    // The severity is content, not a label — so it cannot silently disagree
    // with what is rendered.
    expect(banner.querySelector('.sr-only')?.textContent).toBe('Error: ')
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
