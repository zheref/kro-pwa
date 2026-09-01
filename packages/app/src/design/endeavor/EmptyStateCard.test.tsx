import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmptyStateCard } from './EmptyStateCard'

afterEach(cleanup)

describe('EmptyStateCard', () => {
  it('says what the thing is, rather than showing a blank value', () => {
    render(
      <EmptyStateCard
        icon="clock.arrow.circlepath"
        title="No performances yet"
      />,
    )

    expect(screen.getByText('No performances yet')).not.toBeNull()
  })

  it('explains why it is empty when the caller has a reason to give', () => {
    render(
      <EmptyStateCard
        icon="arrow.uturn.forward.circle"
        title="Never deferred"
        message="Defers appear here each time you push this endeavor's due date back."
      />,
    )

    expect(screen.getByText(/Defers appear here/)).not.toBeNull()
  })

  it('offers the action that fills it, at the 44px touch floor', async () => {
    const onAction = vi.fn()
    render(
      <EmptyStateCard
        icon="network"
        title="Not mirrored anywhere"
        actionTitle="Attach a host"
        onAction={onAction}
      />,
    )

    const button = screen.getByRole('button', { name: 'Attach a host' })
    expect(button.style.minHeight).toBe('var(--kro-size-min-touch-target)')

    await userEvent.click(button)
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('renders no action when only one half of the pair is given', () => {
    render(<EmptyStateCard icon="tray" title="Empty" actionTitle="Do it" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('hides its illustration from readers — the title already says it', () => {
    const { container } = render(
      <EmptyStateCard icon="tray" title="Inbox is empty" />,
    )

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
  })
})
