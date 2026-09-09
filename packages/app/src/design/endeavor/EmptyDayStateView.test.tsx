import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmptyDayStateView, InboxTrayEmptyState } from './EmptyDayStateView'

afterEach(cleanup)

describe('EmptyDayStateView — the Do tab promotion on the page field', () => {
  it('leads with canon’s headline and its explanation', () => {
    render(<EmptyDayStateView />)

    expect(screen.getByText('Start Building Your Day')).not.toBeNull()
    expect(
      screen.getByText(/Connect your calendar and reminders/),
    ).not.toBeNull()
  })

  it('raises the create intent from a KroGlass control', async () => {
    const onCreate = vi.fn()
    render(<EmptyDayStateView onCreateEndeavor={onCreate} />)

    const button = screen.getByRole('button', { name: /Create/ })
    expect(button.className).toContain('kro-glass')
    expect(button.className).toContain('kro-glass--control')

    await userEvent.click(button)
    expect(onCreate).toHaveBeenCalledOnce()
  })

  it('omits the CTA entirely when no handler is given, rather than rendering a dead button', () => {
    render(<EmptyDayStateView />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('sits on the page field, centred, with no inset well', () => {
    const { container } = render(<EmptyDayStateView />)

    const field = container.querySelector(
      '[data-slot="empty-day-state"]',
    ) as HTMLElement
    expect(field.className).toContain('items-center')
    expect(field.className).toContain('justify-center')
    expect(field.style.boxShadow).toBe('')
    expect(field.style.backgroundColor).toBe('')
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
