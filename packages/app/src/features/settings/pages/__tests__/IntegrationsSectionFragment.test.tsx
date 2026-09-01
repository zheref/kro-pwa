/**
 * The Integrations pane's render tests, mirroring
 * `IntegrationsSectionFragment.stories.tsx` (`RC-11`).
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IntegrationId, integrationRows } from '../../SettingsIntegrations'
import type { GoogleConnectionState } from '../../SettingsState'
import { IntegrationsSectionFragment } from '../IntegrationsSectionFragment'

afterEach(cleanup)

const renderPane = (
  connection: GoogleConnectionState,
  overrides: {
    isBusy?: boolean
    errorCopy?: string | null
    onTapConnect?: (id: string) => void
    onTapDisconnect?: (id: string) => void
  } = {},
) =>
  render(
    <IntegrationsSectionFragment
      rows={integrationRows({
        connection,
        isBusy: overrides.isBusy ?? false,
        isGoogleEnabled: true,
      })}
      errorCopy={overrides.errorCopy ?? null}
      onTapConnect={overrides.onTapConnect ?? (() => {})}
      onTapDisconnect={overrides.onTapDisconnect ?? (() => {})}
    />,
  )

const rowFor = (id: string) =>
  screen
    .getAllByTestId('integration-row')
    .find((row) => row.getAttribute('data-integration') === id) as HTMLElement

describe('the pane lists canon four rows', () => {
  it('renders Kro Cloud, Google and the two Apple rows', () => {
    renderPane({ kind: 'disconnected' })

    expect(screen.getByText('Kro Cloud')).toBeTruthy()
    expect(screen.getByText('Google Calendar')).toBeTruthy()
    expect(screen.getByText('Apple Calendar')).toBeTruthy()
    expect(screen.getByText('Apple Reminders')).toBeTruthy()
  })

  it('marks Kro Cloud connected, with the state spoken as well as tinted', () => {
    renderPane({ kind: 'disconnected' })

    const mark = within(rowFor(IntegrationId.kroCloud)).getByTestId(
      'integration-connected',
    )
    expect(mark.textContent).toContain('Connected')
  })

  it('renders the two Apple rows with a disabled Connect and says why', () => {
    renderPane({ kind: 'connected' })

    const button = within(rowFor(IntegrationId.appleCalendar)).getByRole(
      'button',
      {
        name: 'Connect Apple Calendar',
      },
    ) as HTMLButtonElement

    expect(button.disabled).toBe(true)
    expect(rowFor(IntegrationId.appleCalendar).textContent).toContain(
      'Not available on the web',
    )
  })
})

describe('the Google row offers the affordance its state implies', () => {
  it('offers Connect to a user who has never granted the scope', async () => {
    const onTapConnect = vi.fn()
    renderPane({ kind: 'disconnected' }, { onTapConnect })

    await userEvent.click(
      screen.getByRole('button', { name: 'Connect Google Calendar' }),
    )

    expect(onTapConnect).toHaveBeenCalledWith(IntegrationId.google)
  })

  it('offers Disconnect beside the connected mark on a live grant', async () => {
    const onTapDisconnect = vi.fn()
    renderPane({ kind: 'connected' }, { onTapDisconnect })

    expect(
      within(rowFor(IntegrationId.google)).getByTestId('integration-connected'),
    ).toBeTruthy()
    await userEvent.click(
      screen.getByRole('button', { name: 'Disconnect Google Calendar' }),
    )

    expect(onTapDisconnect).toHaveBeenCalledWith(IntegrationId.google)
  })

  it('offers Reconnect — never Connect — after a grant stops working', () => {
    renderPane({ kind: 'needsReconnect' })

    expect(
      screen.getByRole('button', { name: 'Reconnect Google Calendar' }),
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Connect Google Calendar' }),
    ).toBeNull()
  })

  it('offers a disabled Connect on a deployment with no Google client, and explains', () => {
    renderPane({ kind: 'unconfigured', missing: ['GOOGLE_CLIENT_ID'] })

    const button = within(rowFor(IntegrationId.google)).getByRole('button', {
      name: 'Connect Google Calendar',
    }) as HTMLButtonElement

    expect(button.disabled).toBe(true)
    expect(rowFor(IntegrationId.google).textContent).toContain(
      'no Google client is configured',
    )
  })

  it('replaces the affordance with a busy state while an attempt is in flight', () => {
    renderPane({ kind: 'disconnected' }, { isBusy: true })

    expect(
      within(rowFor(IntegrationId.google)).getByTestId('integration-busy'),
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Connect Google Calendar' }),
    ).toBeNull()
  })
})

describe('a failure is reported without hiding the rows', () => {
  it('renders the banner above the list', () => {
    renderPane(
      { kind: 'connected' },
      { errorCopy: 'The connection could not be changed. Please try again.' },
    )

    expect(
      screen.getByText(
        'The connection could not be changed. Please try again.',
      ),
    ).toBeTruthy()
  })

  it('keeps every row on screen while it warns', () => {
    renderPane({ kind: 'connected' }, { errorCopy: 'Something went wrong.' })

    expect(screen.getAllByTestId('integration-row')).toHaveLength(4)
  })

  it('renders nothing extra when there is no failure', () => {
    renderPane({ kind: 'connected' })

    expect(screen.queryByRole('status')).toBeNull()
  })
})
