import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DO_NOTIFICATIONS_PANEL,
  DoNotificationsFragment,
} from '../DoNotificationsFragment'
import {
  DO_SURFACE_MOCK_LOCALE,
  DO_SURFACE_MOCK_NOW,
  doSurfaceMocks,
  doSurfaceProps,
} from '../doSurfaceMocks'

afterEach(cleanup)

const day = doSurfaceProps(doSurfaceMocks.typicalDay)

const noop = () => {}

describe('the panel lists what needs attention', () => {
  it('shows both sections when the day has overdue and expired work', () => {
    render(
      <DoNotificationsFragment
        overdue={day.lanes.overdue}
        expired={day.lanes.expired}
        now={DO_SURFACE_MOCK_NOW}
        locale={DO_SURFACE_MOCK_LOCALE}
        onDismiss={noop}
      />,
    )

    expect(screen.getByTestId('do-notifications-overdue')).toBeTruthy()
    expect(screen.getByTestId('do-notifications-expired')).toBeTruthy()
    expect(screen.queryByTestId('do-notifications-empty')).toBeNull()
  })

  it('summarises the combined count in the header, matching the bell', () => {
    render(
      <DoNotificationsFragment
        overdue={day.lanes.overdue}
        expired={day.lanes.expired}
        now={DO_SURFACE_MOCK_NOW}
        onDismiss={noop}
      />,
    )

    const total = day.lanes.overdue.length + day.lanes.expired.length
    expect(screen.getByText(`${total} need attention`)).toBeTruthy()
  })

  it('omits a section the day has nothing for', () => {
    render(
      <DoNotificationsFragment
        overdue={day.lanes.overdue}
        expired={[]}
        now={DO_SURFACE_MOCK_NOW}
        onDismiss={noop}
      />,
    )

    expect(screen.queryByTestId('do-notifications-expired')).toBeNull()
  })
})

describe('the empty panel', () => {
  it('shows the caught-up state rather than an empty list', () => {
    render(
      <DoNotificationsFragment
        overdue={[]}
        expired={[]}
        now={DO_SURFACE_MOCK_NOW}
        onDismiss={noop}
      />,
    )

    expect(screen.getByTestId('do-notifications-empty')).toBeTruthy()
    expect(screen.getByText(/You’re All Caught Up/)).toBeTruthy()
  })
})

describe('the panel owns its own chrome', () => {
  it('carries the close control the desktop popover needs', async () => {
    const onDismiss = vi.fn()
    render(
      <DoNotificationsFragment
        overdue={day.lanes.overdue}
        expired={[]}
        now={DO_SURFACE_MOCK_NOW}
        onDismiss={onDismiss}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it("reserves canon's 380 x 440 minimum frame", () => {
    render(
      <DoNotificationsFragment
        overdue={[]}
        expired={[]}
        now={DO_SURFACE_MOCK_NOW}
        onDismiss={noop}
      />,
    )

    const panel = screen.getByTestId('do-notifications-panel')
    expect(panel.style.width).toBe(`${DO_NOTIFICATIONS_PANEL.width}px`)
    expect(panel.style.minHeight).toBe(`${DO_NOTIFICATIONS_PANEL.minHeight}px`)
  })
})
