/**
 * The status column's render tests, mirroring `PlanBannersFragment.stories`
 * (`RC-11`).
 *
 * The pair that matters: the two banners are NOT interchangeable. Stale sync
 * says the day is showing older events and offers nothing to press; reconnect
 * says the grant stopped working and is the one with an action.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlanBannersFragment } from '../PlanBannersFragment'

afterEach(cleanup)

const STALE = 'Rate limit hit. Last synced 3 min ago'

const mount = (
  overrides: Partial<Parameters<typeof PlanBannersFragment>[0]> = {},
) =>
  render(
    <PlanBannersFragment
      staleSyncLabel={null}
      needsReconnect={false}
      onTapReconnect={() => {}}
      {...overrides}
    />,
  )

describe('PlanBannersFragment', () => {
  it('renders nothing at all on a healthy day — no empty container to space around', () => {
    const { container } = mount()

    expect(container.firstChild).toBeNull()
  })

  it('shows the rate-limit line without an action, because there is nothing to press', () => {
    mount({ staleSyncLabel: STALE })

    expect(screen.getByTestId('plan-stale-sync-banner')).toBeTruthy()
    expect(screen.getByText(STALE)).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows the reconnect banner WITH its recovery path — an error with no next step is a defect', async () => {
    const onTapReconnect = vi.fn()
    mount({ needsReconnect: true, onTapReconnect })

    expect(screen.getByText('Google Calendar disconnected')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Reconnect' }))
    expect(onTapReconnect).toHaveBeenCalledTimes(1)
  })

  it('carries the reason into the supporting line when the server named one', () => {
    mount({
      needsReconnect: true,
      reconnectDetail:
        'Kro no longer has access to your Google Calendar. Reconnect to see your events.',
    })

    expect(
      screen.getByText(/no longer has access to your Google Calendar/),
    ).toBeTruthy()
  })

  it('falls back to the generic line when the reason is unknown', () => {
    mount({ needsReconnect: true, reconnectDetail: null })

    expect(screen.getByText(/Your session expired/)).toBeTruthy()
  })

  it('stacks both when Google is rate-limited AND the grant has lapsed', () => {
    mount({ staleSyncLabel: STALE, needsReconnect: true })

    expect(screen.getByTestId('plan-stale-sync-banner')).toBeTruthy()
    expect(screen.getByTestId('plan-reconnect-banner')).toBeTruthy()
  })

  it('speaks the severity, so the colour is never the only signal', () => {
    mount({ staleSyncLabel: STALE, needsReconnect: true })

    // `InlineBanner` renders the prefix `sr-only` INSIDE the live region, as
    // `"<Severity>: "` — trailing space and colon included, because it is read
    // as the head of one sentence rather than as a separate label.
    expect(screen.getByText('Warning:', { exact: false })).toBeTruthy()
    expect(screen.getByText('Error:', { exact: false })).toBeTruthy()
  })

  it('never offers Connect — a revoked grant is not a first connection', () => {
    mount({ needsReconnect: true })

    expect(screen.queryByRole('button', { name: 'Connect' })).toBeNull()
  })
})
