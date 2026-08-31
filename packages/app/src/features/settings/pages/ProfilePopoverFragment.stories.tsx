import type { ReactNode } from 'react'
import { PRESENTATION_SIZE } from '../../main/MainPresentation'
import { authUserMocks } from '../../auth/AuthMocks'
import { ProfilePopoverFragment } from './ProfilePopoverFragment'

/**
 * The profile popover's content, at canon's own width.
 *
 * The stage is `PRESENTATION_SIZE.profile.width` rather than a number typed
 * here, so a story cannot show the popover at a width the app never presents
 * it at — canon's `.frame(width: 300)`.
 */
export default {
  title: 'Settings/Profile popover',
  component: ProfilePopoverFragment,
  parameters: { layout: 'centered' },
}

const noop = () => {}

function Stage({
  theme = 'light',
  children,
}: {
  theme?: 'light' | 'dark'
  children: ReactNode
}) {
  return (
    <div
      data-theme={theme}
      style={{
        width: PRESENTATION_SIZE.profile.width,
        background: 'var(--kro-color-absolute)',
        border: '1px solid var(--kro-color-hairline)',
        borderRadius: 'var(--kro-radius-surface)',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  )
}

const popover = (
  overrides: Partial<Parameters<typeof ProfilePopoverFragment>[0]> = {},
) => (
  <ProfilePopoverFragment
    accountName={null}
    accountEmail={null}
    accountInitials=""
    planName="Free"
    onTapSignIn={noop}
    onTapAllEndeavors={noop}
    onTapSettings={noop}
    onTapSignOut={noop}
    {...overrides}
  />
)

/** Signed out — canon's "Sign In to Kro" invitation, no Sign Out row. */
export const SignedOut = {
  render: () => <Stage>{popover()}</Stage>,
}

/** Signed in — identity, initials avatar, the Free badge and Sign Out. */
export const SignedIn = {
  render: () => (
    <Stage>
      {popover({
        accountName: authUserMocks.typical.name,
        accountEmail: authUserMocks.typical.emails[0] ?? null,
        accountInitials: 'AL',
      })}
    </Stage>
  ),
}

/** An unnamed account, whose initials come from the email. */
export const SignedInUnnamed = {
  render: () => (
    <Stage>
      {popover({
        accountName: null,
        accountEmail: authUserMocks.unnamed.emails[0] ?? null,
        accountInitials: 'S',
      })}
    </Stage>
  ),
}

/** Both schemes and both sessions — the four states in one frame. */
export const BothSchemes = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <Stage theme="light">
        {popover({
          accountName: authUserMocks.typical.name,
          accountEmail: authUserMocks.typical.emails[0] ?? null,
          accountInitials: 'AL',
        })}
      </Stage>
      <Stage theme="dark">
        {popover({
          accountName: authUserMocks.typical.name,
          accountEmail: authUserMocks.typical.emails[0] ?? null,
          accountInitials: 'AL',
        })}
      </Stage>
      <Stage theme="light">{popover()}</Stage>
      <Stage theme="dark">{popover()}</Stage>
    </div>
  ),
}
