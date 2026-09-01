import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmptyDayStateView, InboxTrayEmptyState } from './EmptyDayStateView'

afterEach(cleanup)

describe('EmptyDayStateView — the Do tab promotion inset', () => {
  it('leads with canon’s headline and its explanation', () => {
    render(<EmptyDayStateView />)

    expect(screen.getByText('Start Building Your Day')).not.toBeNull()
    expect(
      screen.getByText(/Connect your calendar and reminders/),
    ).not.toBeNull()
  })

  it('raises the create intent, at the 44px touch floor', async () => {
    const onCreate = vi.fn()
    render(<EmptyDayStateView onCreateEndeavor={onCreate} />)

    const button = screen.getByRole('button', { name: /Create/ })
    expect(button.style.minHeight).toBe('var(--kro-size-min-touch-target)')

    await userEvent.click(button)
    expect(onCreate).toHaveBeenCalledOnce()
  })

  it('omits the CTA entirely when no handler is given, rather than rendering a dead button', () => {
    render(<EmptyDayStateView />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('draws the CTA from the indigoGrape header tokens, so it cannot drift from the slab', () => {
    render(<EmptyDayStateView onCreateEndeavor={() => undefined} />)

    const button = screen.getByRole('button', { name: /Create/ })
    expect(button.style.backgroundImage).toContain(
      '--kro-color-header-gradient-indigo',
    )
    expect(button.style.backgroundImage).toContain(
      '--kro-color-header-gradient-grape',
    )
  })

  it('draws the inset as a pressed-in surface, not a raised card', () => {
    const { container } = render(<EmptyDayStateView />)

    const inset = container.querySelector(
      '[data-slot="empty-day-state"]',
    ) as HTMLElement
    expect(inset.style.boxShadow).toContain('inset')
  })

  it('lets a surface supply its own copy without forking the component', () => {
    render(
      <EmptyDayStateView
        title="Nothing scheduled"
        message="Your day is clear."
      />,
    )

    expect(screen.getByText('Nothing scheduled')).not.toBeNull()
  })
})

describe('InboxTrayEmptyState', () => {
  it('says what the tray is and what will land in it', () => {
    render(<InboxTrayEmptyState />)

    expect(screen.getByText('Inbox is empty')).not.toBeNull()
    expect(
      screen.getByText('Recently added endeavors will appear here'),
    ).not.toBeNull()
  })

  it('centres itself in whatever height the pinned header leaves — canon’s Spacer/Spacer', () => {
    const { container } = render(<InboxTrayEmptyState />)

    const block = container.querySelector(
      '[data-slot="inbox-tray-empty-state"]',
    ) as HTMLElement
    expect(block.className).toContain('flex-1')
    expect(block.className).toContain('justify-center')
  })

  it('offers no action — an empty inbox is not a problem to fix', () => {
    render(<InboxTrayEmptyState />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
