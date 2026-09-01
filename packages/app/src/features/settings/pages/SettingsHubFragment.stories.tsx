import type { ReactNode } from 'react'
import { authUserMocks } from '../../auth/AuthMocks'
import {
  type SettingsSyncFooter,
  accountHubSections,
  preferencesHubSections,
  profileHubSection,
} from '../SettingsSelectors'
import { SettingsHubFragment } from './SettingsHubFragment'

/**
 * The hub, in both sessions, at both widths and in both schemes.
 *
 * These are the stories the acceptance criteria are read against: canon's three
 * groups, the profile row in each of its two states, and the sync footer's
 * three reportable states plus the hidden one. Every one is built from the same
 * section table the app renders, so a story cannot show a hub the surface could
 * not produce.
 */
export default {
  title: 'Settings/Hub',
  component: SettingsHubFragment,
  parameters: { layout: 'fullscreen' },
}

const noop = () => {}

function Stage({
  theme = 'light',
  width,
  children,
}: {
  theme?: 'light' | 'dark'
  width: number
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

const signedIn = {
  accountName: authUserMocks.typical.name,
  accountEmail: authUserMocks.typical.emails[0] ?? null,
  accountInitials: 'AL',
}

const hub = (
  overrides: Partial<Parameters<typeof SettingsHubFragment>[0]> = {},
) => (
  <SettingsHubFragment
    profileSection={profileHubSection}
    preferencesSections={preferencesHubSections}
    accountSections={accountHubSections}
    syncFooter={null}
    accountName={null}
    accountEmail={null}
    accountInitials=""
    onTapSection={noop}
    onTapSignIn={noop}
    onTapDone={noop}
    {...overrides}
  />
)

const SYNCED: SettingsSyncFooter = {
  title: 'Synced',
  isWarning: false,
  glyph: 'checkmark.icloud',
}
const OFFLINE: SettingsSyncFooter = {
  title: 'Offline — will sync later',
  isWarning: true,
  glyph: 'icloud.slash',
}
const SIGNED_OUT: SettingsSyncFooter = {
  title: 'Sign in to sync across devices',
  isWarning: false,
  glyph: 'person.crop.circle.badge.questionmark',
}

/** Signed out: the row is an invitation and the footer prompts. */
export const SignedOut = {
  render: () => <Stage width={760}>{hub({ syncFooter: SIGNED_OUT })}</Stage>,
}

/** Signed in with a healthy sync — the ordinary desktop hub. */
export const SignedInSynced = {
  render: () => (
    <Stage width={760}>{hub({ ...signedIn, syncFooter: SYNCED })}</Stage>
  ),
}

/** The offline footer, which is the only one canon tints. */
export const OfflineFooter = {
  render: () => (
    <Stage width={760}>{hub({ ...signedIn, syncFooter: OFFLINE })}</Stage>
  ),
}

/** No footer at all — canon's `syncStatus: nil`, before anything is attempted. */
export const NoFooter = {
  render: () => <Stage width={760}>{hub(signedIn)}</Stage>,
}

/** Both schemes, side by side — the pairing the tokens are read against. */
export const BothSchemes = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <Stage theme="light" width={520}>
        {hub({ ...signedIn, syncFooter: SYNCED })}
      </Stage>
      <Stage theme="dark" width={520}>
        {hub({ ...signedIn, syncFooter: SYNCED })}
      </Stage>
    </div>
  ),
}

/** The handheld width, where the hub is the whole destination. */
export const Handheld = {
  render: () => (
    <Stage width={390}>{hub({ ...signedIn, syncFooter: OFFLINE })}</Stage>
  ),
}
