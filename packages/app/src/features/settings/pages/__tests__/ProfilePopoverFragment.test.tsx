/**
 * The profile popover's render tests, mirroring
 * `ProfilePopoverFragment.stories.tsx` (`RC-11`).
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { authUserMocks } from '../../../auth/AuthMocks'
import { ProfilePopoverFragment } from '../ProfilePopoverFragment'

afterEach(cleanup)

const renderPopover = (
  overrides: Partial<Parameters<typeof ProfilePopoverFragment>[0]> = {},
) =>
  render(
    <ProfilePopoverFragment
      accountName={null}
      accountEmail={null}
      accountInitials=""
      planName="Free"
      onTapSignIn={() => {}}
      onTapAllEndeavors={() => {}}
      onTapSettings={() => {}}
      onTapSignOut={() => {}}
      {...overrides}
    />,
  )

const signedIn = {
  accountName: authUserMocks.typical.name,
  accountEmail: authUserMocks.typical.emails[0] ?? null,
  accountInitials: 'AL',
}

describe('the signed-out header', () => {
  it("invites the user in, in canon words", () => {
    renderPopover()

    expect(screen.getByText('Sign In to Kro')).toBeTruthy()
    expect(screen.getByText('Sync your data across devices')).toBeTruthy()
  })

  it('draws the neutral person glyph rather than an empty initials disc', () => {
    renderPopover()

    expect(screen.getByTestId('avatar-signed-out')).toBeTruthy()
    expect(screen.queryByTestId('avatar-initials')).toBeNull()
  })

  it('opens the auth surface when the header is pressed', async () => {
    const onTapSignIn = vi.fn()
    renderPopover({ onTapSignIn })

    await userEvent.click(screen.getByTestId('profile-popover-sign-in'))

    expect(onTapSignIn).toHaveBeenCalledTimes(1)
  })

  it('offers no Sign Out when there is no session', () => {
    renderPopover()

    expect(screen.queryByRole('button', { name: 'Sign Out' })).toBeNull()
  })
})

describe('the signed-in header', () => {
  it('shows the identity, the initials avatar and canon plan badge', () => {
    renderPopover(signedIn)

    expect(screen.getByText('Ada Lovelace')).toBeTruthy()
    expect(screen.getByText('ada@example.com')).toBeTruthy()
    expect(screen.getByTestId('avatar-initials').textContent).toBe('AL')
    expect(screen.getByTestId('profile-plan-badge').textContent).toBe('Free')
  })

  it('opens Settings when the identity is pressed — canon primary action', async () => {
    const onTapSettings = vi.fn()
    renderPopover({ ...signedIn, onTapSettings })

    await userEvent.click(screen.getByTestId('profile-popover-identity'))

    expect(onTapSettings).toHaveBeenCalledTimes(1)
  })

  it('offers Sign Out, and reports the tap', async () => {
    const onTapSignOut = vi.fn()
    renderPopover({ ...signedIn, onTapSignOut })

    await userEvent.click(screen.getByRole('button', { name: 'Sign Out' }))

    expect(onTapSignOut).toHaveBeenCalledTimes(1)
  })
})

describe('the menu carries only rows with a destination', () => {
  it('offers All Endeavors, Subscription and Settings', () => {
    renderPopover(signedIn)

    const labels = screen
      .getAllByTestId('profile-menu-row')
      .map((row) => row.textContent)

    expect(labels).toContain('All Endeavors')
    expect(labels).toContain('Subscription')
    expect(labels).toContain('Settings')
  })

  it('omits the three canon rows this app has no destination for', () => {
    renderPopover(signedIn)

    for (const absent of ['Sources', 'Sync History', 'Help & Feedback']) {
      expect(screen.queryByText(absent)).toBeNull()
    }
  })

  it('routes All Endeavors to its own handler', async () => {
    const onTapAllEndeavors = vi.fn()
    renderPopover({ ...signedIn, onTapAllEndeavors })

    await userEvent.click(screen.getByRole('button', { name: /All Endeavors/ }))

    expect(onTapAllEndeavors).toHaveBeenCalledTimes(1)
  })
})
