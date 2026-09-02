import type { ReactNode } from 'react'
import { StoreProvider } from '../../../library/StoreProvider'
import {
  type ThunkExtra,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import { GoogleCalendarConnections } from '../../../services/googleCalendar/GoogleCalendarConnection'
import { makeStubbedGoogleCalendarService } from '../../../services/googleCalendar/GoogleCalendarService'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { userDidTapSection } from '../SettingsFeature'
import { SettingsSectionId } from '../SettingsSection'
import { SettingsHubPage } from './SettingsHubPage'

/**
 * The whole surface, wired to a real store built with `makeStore(extra)`
 * (`RC-22`) and fixture-backed Services (`RC-35`).
 *
 * The Fragment stories above show each pane in isolation; these show the
 * surface a user actually meets — the hub on open, a pane after a tap, and the
 * Integrations pane on the deployment a checkout starts as.
 */
export default {
  title: 'Settings/Surface',
  component: SettingsHubPage,
  parameters: { layout: 'fullscreen' },
}

function Stage({
  theme = 'light',
  width = 900,
  extra = stubbedThunkExtra,
  section,
  children,
}: {
  theme?: 'light' | 'dark'
  width?: number
  extra?: ThunkExtra
  section?: SettingsSectionId
  children?: ReactNode
}) {
  const store = makeStore(extra)
  if (section !== undefined) store.dispatch(userDidTapSection(section))

  return (
    <div
      data-theme={theme}
      style={{
        width,
        minHeight: 620,
        background: 'var(--kro-color-back)',
        border: '1px solid var(--kro-color-hairline)',
      }}
    >
      <StoreProvider store={store}>
        {children ?? <SettingsHubPage />}
      </StoreProvider>
    </div>
  )
}

const seededExtra: ThunkExtra = {
  ...stubbedThunkExtra,
  localStore: makeInMemoryLocalStore({
    preferences: {
      'kro:session.defaultDuration': 45,
      'kro:session.soundOnEnd': false,
    },
  }),
}

/** The hub, as `/adjust` opens. */
export const Hub = {
  render: () => <Stage />,
}

/** The General pane, with every schema row on it. */
export const GeneralPane = {
  render: () => <Stage section={SettingsSectionId.general} />,
}

/** Appearance — Theme and the four palettes. */
export const AppearancePane = {
  render: () => <Stage section={SettingsSectionId.appearance} />,
}

/** The Session pane over stored values rather than defaults. */
export const SessionPane = {
  render: () => (
    <Stage extra={seededExtra} section={SettingsSectionId.sessionPreferences} />
  ),
}

/** Integrations on a deployment with no Google client — the honest state. */
export const IntegrationsUnconfigured = {
  render: () => (
    <Stage
      section={SettingsSectionId.integrations}
      extra={{
        ...stubbedThunkExtra,
        googleCalendar: makeStubbedGoogleCalendarService({
          connection: GoogleCalendarConnections.unconfigured([
            'GOOGLE_CLIENT_ID',
            'GOOGLE_CLIENT_SECRET',
          ]),
        }),
      }}
    />
  ),
}

/** Integrations with a live grant. */
export const IntegrationsConnected = {
  render: () => (
    <Stage
      section={SettingsSectionId.integrations}
      extra={{
        ...stubbedThunkExtra,
        googleCalendar: makeStubbedGoogleCalendarService({
          connection: GoogleCalendarConnections.connected(),
        }),
      }}
    />
  ),
}

/** The handheld width, where the surface fills the destination. */
export const Handheld = {
  render: () => <Stage width={390} />,
}

/** Both schemes at the desktop frame. */
export const BothSchemes = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <Stage theme="light" width={520} />
      <Stage theme="dark" width={520} />
    </div>
  ),
}
