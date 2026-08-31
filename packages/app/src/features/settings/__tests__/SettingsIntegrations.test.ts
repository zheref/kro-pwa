/**
 * The Integrations pane's rows — canon `applyItemsLoaded` plus the two states
 * the web adds.
 */
import { describe, expect, it } from 'vitest'
import {
  IntegrationAction,
  IntegrationId,
  googleIntegrationSubtitle,
  integrationRows,
} from '../SettingsIntegrations'
import type { GoogleConnectionState } from '../SettingsState'

const rowsFor = (
  connection: GoogleConnectionState,
  overrides: { isBusy?: boolean; isGoogleEnabled?: boolean } = {},
) =>
  integrationRows({
    connection,
    isBusy: overrides.isBusy ?? false,
    isGoogleEnabled: overrides.isGoogleEnabled ?? true,
  })

describe('the row list mirrors canon four items', () => {
  it('lists Kro Cloud, Google and the two Apple rows, in canon order', () => {
    expect(rowsFor({ kind: 'disconnected' }).map((row) => row.id)).toEqual([
      IntegrationId.kroCloud,
      IntegrationId.google,
      IntegrationId.appleCalendar,
      IntegrationId.appleReminders,
    ])
  })

  it('omits the Google row when the flag is off — canon flag gate', () => {
    const ids = rowsFor({ kind: 'disconnected' }, { isGoogleEnabled: false }).map(
      (row) => row.id,
    )

    expect(ids).not.toContain(IntegrationId.google)
    expect(ids).toContain(IntegrationId.kroCloud)
  })

  it('reports Kro Cloud as always-on with nothing to press', () => {
    const row = rowsFor({ kind: 'connected' }).find(
      (candidate) => candidate.id === IntegrationId.kroCloud,
    )

    expect(row?.isConnected).toBe(true)
    expect(row?.action).toBe(IntegrationAction.none)
  })
})

describe('the Apple rows are ported as canon inert Connects', () => {
  it('offers no working action on either Apple row', () => {
    const rows = rowsFor({ kind: 'connected' })

    for (const id of [IntegrationId.appleCalendar, IntegrationId.appleReminders]) {
      const row = rows.find((candidate) => candidate.id === id)
      expect(row?.action).toBe(IntegrationAction.unavailable)
      expect(row?.isConnected).toBe(false)
    }
  })

  it('says why rather than repeating canon "EventKit on this device"', () => {
    const row = rowsFor({ kind: 'connected' }).find(
      (candidate) => candidate.id === IntegrationId.appleCalendar,
    )

    expect(row?.subtitle).toContain('Not available on the web')
  })

  it('keeps them listed even when Google is hidden — the list is not conditional', () => {
    const ids = rowsFor({ kind: 'disconnected' }, { isGoogleEnabled: false }).map(
      (row) => row.id,
    )

    expect(ids).toContain(IntegrationId.appleCalendar)
    expect(ids).toContain(IntegrationId.appleReminders)
  })
})

describe('the Google row distinguishes all four connection states', () => {
  const googleRow = (
    connection: GoogleConnectionState,
    isBusy = false,
  ) =>
    rowsFor(connection, { isBusy }).find(
      (row) => row.id === IntegrationId.google,
    )

  it('offers Connect to a user who has never granted the scope', () => {
    expect(googleRow({ kind: 'disconnected' })?.action).toBe(
      IntegrationAction.connect,
    )
  })

  it('offers Disconnect on a live grant', () => {
    const row = googleRow({ kind: 'connected' })
    expect(row?.action).toBe(IntegrationAction.disconnect)
    expect(row?.isConnected).toBe(true)
  })

  it('offers Reconnect — never Connect — after a grant stops working', () => {
    expect(googleRow({ kind: 'needsReconnect' })?.action).toBe(
      IntegrationAction.reconnect,
    )
  })

  it('offers nothing pressable on a deployment with no Google client', () => {
    const row = googleRow({ kind: 'unconfigured', missing: ['GOOGLE_CLIENT_ID'] })

    expect(row?.action).toBe(IntegrationAction.unavailable)
    expect(row?.subtitle).toContain('no Google client is configured')
  })

  it('shows the busy affordance while an attempt is in flight', () => {
    expect(googleRow({ kind: 'disconnected' }, true)?.action).toBe(
      IntegrationAction.busy,
    )
  })

  it('shows the busy affordance before the first answer arrives', () => {
    expect(googleRow({ kind: 'unknown' })?.action).toBe(IntegrationAction.busy)
  })
})

describe('the subtitle explains the state rather than repeating the title', () => {
  it('keeps canon copy for the disconnected case', () => {
    expect(googleIntegrationSubtitle({ kind: 'disconnected' })).toBe(
      'See all your events in one place.',
    )
  })

  it('names the deployment problem for an unconfigured build', () => {
    expect(
      googleIntegrationSubtitle({ kind: 'unconfigured', missing: [] }),
    ).toContain('no Google client is configured')
  })

  it('tells a revoked user what to do rather than what happened', () => {
    expect(googleIntegrationSubtitle({ kind: 'needsReconnect' })).toContain(
      'Reconnect',
    )
  })
})
