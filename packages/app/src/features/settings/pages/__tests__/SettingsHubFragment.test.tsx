/**
 * The hub's render tests, mirroring `SettingsHubFragment.stories.tsx`
 * (`RC-11`) — same states, same fixtures, queried by role and text rather than
 * by markup shape.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { authUserMocks } from '../../../auth/AuthMocks'
import {
  accountHubSections,
  preferencesHubSections,
  profileHubSection,
} from '../../SettingsSelectors'
import type { SettingsSyncFooter } from '../../SettingsSelectors'
import { SettingsHubFragment } from '../SettingsHubFragment'

afterEach(cleanup)

const noop = () => {}

const renderHub = (
  overrides: Partial<Parameters<typeof SettingsHubFragment>[0]> = {},
) =>
  render(
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
    />,
  )

describe('the hub lists canon three groups', () => {
  it('offers a row for every preference section and every account section', () => {
    renderHub()

    for (const section of [...preferencesHubSections, ...accountHubSections]) {
      expect(
        screen.getByRole('button', { name: new RegExp(section.title) }),
      ).toBeTruthy()
    }
  })

  it('labels the Preferences group and leaves the account group unlabelled', () => {
    renderHub()

    expect(screen.getByText('Preferences')).toBeTruthy()
    // Canon's second Section has no header; the only headings are the surface
    // title and the one group label.
    expect(screen.getAllByRole('heading')).toHaveLength(2)
  })

  it('opens the section a row names', async () => {
    const onTapSection = vi.fn()
    renderHub({ onTapSection })

    await userEvent.click(
      screen.getByRole('button', { name: /Session Preferences/ }),
    )

    expect(onTapSection).toHaveBeenCalledWith('sessionPreferences')
  })
})

describe('the profile row reflects the session', () => {
  it('invites a signed-out user to sign in, in canon words', () => {
    renderHub()

    expect(screen.getByText('Sign In to Kro')).toBeTruthy()
    expect(screen.getByText('Sync your data across devices')).toBeTruthy()
    expect(screen.getByTestId('avatar-signed-out')).toBeTruthy()
  })

  it('shows the identity and the initials avatar once signed in', () => {
    renderHub({
      accountName: authUserMocks.typical.name,
      accountEmail: authUserMocks.typical.emails[0] ?? null,
      accountInitials: 'AL',
    })

    expect(screen.getByText('Ada Lovelace')).toBeTruthy()
    expect(screen.getByText('ada@example.com')).toBeTruthy()
    expect(screen.getByTestId('avatar-initials').textContent).toBe('AL')
  })

  it('routes a signed-out tap to sign-in and a signed-in tap to the Profile pane', async () => {
    const onTapSignIn = vi.fn()
    const onTapSection = vi.fn()

    const view = renderHub({ onTapSignIn, onTapSection })
    await userEvent.click(screen.getByTestId('hub-profile-row'))
    expect(onTapSignIn).toHaveBeenCalledTimes(1)
    expect(onTapSection).not.toHaveBeenCalled()

    view.unmount()
    renderHub({
      onTapSignIn,
      onTapSection,
      accountEmail: 'ada@example.com',
      accountName: 'Ada Lovelace',
      accountInitials: 'AL',
    })
    await userEvent.click(screen.getByTestId('hub-profile-row'))
    expect(onTapSection).toHaveBeenCalledWith('profile')
  })
})

describe('the sync footer reports the three states', () => {
  const footer = (value: SettingsSyncFooter | null) =>
    renderHub({ syncFooter: value })

  it('is hidden entirely when there is nothing to report — canon syncStatus nil', () => {
    footer(null)
    expect(screen.queryByTestId('sync-footer')).toBeNull()
  })

  it('reports a successful sync without the warning tint', () => {
    footer({ title: 'Synced', isWarning: false, glyph: 'checkmark.icloud' })

    const element = screen.getByTestId('sync-footer')
    expect(element.textContent).toContain('Synced')
    expect(element.getAttribute('data-warning')).toBe('false')
  })

  it('warns, in canon words, when the last attempt had no connection', () => {
    footer({
      title: 'Offline — will sync later',
      isWarning: true,
      glyph: 'icloud.slash',
    })

    const element = screen.getByTestId('sync-footer')
    expect(element.textContent).toContain('Offline — will sync later')
    expect(element.getAttribute('data-warning')).toBe('true')
  })

  it('prompts a signed-out user rather than warning them', () => {
    footer({
      title: 'Sign in to sync across devices',
      isWarning: false,
      glyph: 'person.crop.circle.badge.questionmark',
    })

    expect(screen.getByTestId('sync-footer').textContent).toContain(
      'Sign in to sync across devices',
    )
  })
})

describe('the Done affordance', () => {
  it('carries canon toolbar label', () => {
    renderHub()
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy()
  })

  it('reports the tap to its owner', async () => {
    const onTapDone = vi.fn()
    renderHub({ onTapDone })

    await userEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(onTapDone).toHaveBeenCalledTimes(1)
  })

  it('does not double as a section tap', async () => {
    const onTapSection = vi.fn()
    renderHub({ onTapSection })

    await userEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(onTapSection).not.toHaveBeenCalled()
  })
})
