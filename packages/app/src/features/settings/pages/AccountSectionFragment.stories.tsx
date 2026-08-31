import type { ReactNode } from 'react'
import { authUserMocks } from '../../auth/AuthMocks'
import { AccountSectionFragment } from './AccountSectionFragment'

/**
 * The Profile and Subscription panes.
 *
 * The Subscription story is the point of the *"canon has a row, no flow —
 * mirror it"* instruction: it is one row and one sentence, and it says why
 * there is nothing to press rather than offering a button wired to nothing.
 */
export default {
  title: 'Settings/Account',
  component: AccountSectionFragment,
  parameters: { layout: 'fullscreen' },
}

const noop = () => {}

function Stage({
  theme = 'light',
  width = 760,
  children,
}: {
  theme?: 'light' | 'dark'
  width?: number
  children: ReactNode
}) {
  return (
    <div
      data-theme={theme}
      style={{
        width,
        padding: 16,
        background: 'var(--kro-color-back)',
        border: '1px solid var(--kro-color-hairline)',
      }}
    >
      {children}
    </div>
  )
}

const pane = (
  overrides: Partial<Parameters<typeof AccountSectionFragment>[0]> = {},
) => (
  <AccountSectionFragment
    pane="profile"
    user={authUserMocks.typical}
    onTapSignIn={noop}
    onTapSignOut={noop}
    {...overrides}
  />
)

/** The signed-in Profile pane. */
export const Profile = {
  render: () => <Stage>{pane()}</Stage>,
}

/** An account with two connected providers and no personal info set. */
export const ProfileWithTwoProviders = {
  render: () => <Stage>{pane({ user: authUserMocks.google })}</Stage>,
}

/** An account with no display name at all — initials fall back to the email. */
export const ProfileUnnamed = {
  render: () => <Stage>{pane({ user: authUserMocks.unnamed })}</Stage>,
}

/** Signed out — canon's placeholder, with a way out of it. */
export const ProfileSignedOut = {
  render: () => <Stage>{pane({ user: null })}</Stage>,
}

/** Subscription: canon's row, and no flow behind it. */
export const Subscription = {
  render: () => <Stage>{pane({ pane: 'subscription' })}</Stage>,
}

/** Both schemes on the signed-in pane. */
export const BothSchemes = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <Stage theme="light" width={520}>
        {pane()}
      </Stage>
      <Stage theme="dark" width={520}>
        {pane()}
      </Stage>
    </div>
  ),
}

/** The handheld width. */
export const Handheld = {
  render: () => <Stage width={390}>{pane()}</Stage>,
}
