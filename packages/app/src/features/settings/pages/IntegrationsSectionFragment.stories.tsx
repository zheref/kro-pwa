import type { ReactNode } from 'react'
import { integrationRows } from '../SettingsIntegrations'
import type { GoogleConnectionState } from '../SettingsState'
import { IntegrationsSectionFragment } from './IntegrationsSectionFragment'

/**
 * The Integrations pane, in each of Google's four states plus the two the row
 * can be in while an attempt runs.
 *
 * The `Unconfigured` story is the one the epic's `unconfigured` environment
 * produces, and the one worth looking at hardest: it is the state a checkout
 * with no Google client is in, and it must read as "this deployment cannot do
 * this" rather than as "you have not connected".
 */
export default {
  title: 'Settings/Integrations',
  component: IntegrationsSectionFragment,
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
  connection: GoogleConnectionState,
  options: { isBusy?: boolean; errorCopy?: string | null } = {},
) => (
  <IntegrationsSectionFragment
    rows={integrationRows({
      connection,
      isBusy: options.isBusy ?? false,
      isGoogleEnabled: true,
    })}
    errorCopy={options.errorCopy ?? null}
    onTapConnect={noop}
    onTapDisconnect={noop}
  />
)

/** Configured, never connected — canon's Connect. */
export const Disconnected = {
  render: () => <Stage>{pane({ kind: 'disconnected' })}</Stage>,
}

/** A live grant: the connected mark and Disconnect. */
export const Connected = {
  render: () => <Stage>{pane({ kind: 'connected' })}</Stage>,
}

/** No Google client on this deployment — the honest unavailable state. */
export const Unconfigured = {
  render: () => (
    <Stage>
      {pane({ kind: 'unconfigured', missing: ['GOOGLE_CLIENT_ID'] })}
    </Stage>
  ),
}

/** A grant that stopped working — Reconnect, never Connect. */
export const NeedsReconnect = {
  render: () => <Stage>{pane({ kind: 'needsReconnect' })}</Stage>,
}

/** An attempt in flight — canon's `isConnecting`. */
export const Connecting = {
  render: () => (
    <Stage>{pane({ kind: 'disconnected' }, { isBusy: true })}</Stage>
  ),
}

/** A failed attempt: the banner shows and the grant is untouched. */
export const AttemptFailed = {
  render: () => (
    <Stage>
      {pane(
        { kind: 'connected' },
        { errorCopy: 'The connection could not be changed. Please try again.' },
      )}
    </Stage>
  ),
}

/** Both schemes, on the state a checkout actually starts in. */
export const BothSchemes = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <Stage theme="light" width={520}>
        {pane({ kind: 'unconfigured', missing: ['GOOGLE_CLIENT_ID'] })}
      </Stage>
      <Stage theme="dark" width={520}>
        {pane({ kind: 'unconfigured', missing: ['GOOGLE_CLIENT_ID'] })}
      </Stage>
    </div>
  ),
}

/** The handheld width, where the subtitle wraps. */
export const Handheld = {
  render: () => <Stage width={390}>{pane({ kind: 'disconnected' })}</Stage>,
}
