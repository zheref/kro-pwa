/**
 * The two account panes' render tests, mirroring
 * `AccountSectionFragment.stories.tsx` (`RC-11`).
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { authUserMocks } from '../../../auth/AuthMocks'
import { AccountSectionFragment } from '../AccountSectionFragment'

afterEach(cleanup)

const renderPane = (
  overrides: Partial<Parameters<typeof AccountSectionFragment>[0]> = {},
) =>
  render(
    <AccountSectionFragment
      pane="profile"
      user={authUserMocks.typical}
      onTapSignIn={() => {}}
      onTapSignOut={() => {}}
      {...overrides}
    />,
  )

describe('the signed-in Profile pane', () => {
  it('leads with the identity and the initials avatar', () => {
    renderPane()

    expect(screen.getByTestId('avatar-initials').textContent).toBe('AL')
    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ada@example.com').length).toBeGreaterThan(0)
  })

  it("names canon Account rows, including the sign-in method", () => {
    renderPane()

    expect(screen.getByText('Account')).toBeTruthy()
    expect(screen.getByText('Member since')).toBeTruthy()
    // The typical fixture signed in with email/password AND lists it as a
    // connected provider, so the string is on screen twice by design.
    expect(screen.getAllByText('Email & Password')).toHaveLength(2)
  })

  it('shows "Not set" rather than an empty row for absent personal info', () => {
    renderPane()

    expect(screen.getAllByText('Not set').length).toBeGreaterThan(0)
  })

  it('lists a second connected provider by name', () => {
    renderPane({ user: authUserMocks.google })

    expect(screen.getByText('Google, Email & Password')).toBeTruthy()
  })

  it('offers Sign Out and reports the tap', async () => {
    const onTapSignOut = vi.fn()
    renderPane({ onTapSignOut })

    await userEvent.click(screen.getByTestId('sign-out'))

    expect(onTapSignOut).toHaveBeenCalledTimes(1)
  })

  it('warns that signing out clears this device preferences', () => {
    renderPane()

    expect(
      screen.getByText(/clears the preferences saved on this device/),
    ).toBeTruthy()
  })
})

describe('the signed-out Profile pane', () => {
  it("shows canon Not Signed In placeholder", () => {
    renderPane({ user: null })

    expect(screen.getByText('Not Signed In')).toBeTruthy()
    expect(
      screen.getByText('Sign in to view and manage your profile.'),
    ).toBeTruthy()
  })

  it('offers a way out of the placeholder rather than a dead end', async () => {
    const onTapSignIn = vi.fn()
    renderPane({ user: null, onTapSignIn })

    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(onTapSignIn).toHaveBeenCalledTimes(1)
  })

  it('offers no Sign Out when there is no session', () => {
    renderPane({ user: null })

    expect(screen.queryByTestId('sign-out')).toBeNull()
  })
})

describe('the Subscription pane mirrors canon row-with-no-flow', () => {
  it('names the current plan', () => {
    renderPane({ pane: 'subscription' })

    expect(screen.getByText('Current plan')).toBeTruthy()
    expect(screen.getByText('Free')).toBeTruthy()
  })

  it('offers no management control, because there is nothing behind one', () => {
    renderPane({ pane: 'subscription' })

    expect(
      screen.queryByRole('button', { name: /Manage Subscription/ }),
    ).toBeNull()
  })

  it('says why rather than leaving the absence unexplained', () => {
    renderPane({ pane: 'subscription' })

    expect(screen.getByText(/Kro has no paid plan yet/)).toBeTruthy()
  })

  it('renders the same content whether or not anyone is signed in', () => {
    const signedIn = renderPane({ pane: 'subscription' })
    const withPlan = screen.getByText('Free')
    expect(withPlan).toBeTruthy()
    signedIn.unmount()

    renderPane({ pane: 'subscription', user: null })
    expect(screen.getByText('Free')).toBeTruthy()
  })
})
