/**
 * The settings surface's container, rendered against a real store built with
 * `makeStore(stubbedThunkExtra)` (`RC-22`, `RC-35`) — never a hand-assembled
 * second store, never the live services.
 *
 * The second block is the issue's *"settings close triggers the push (#31
 * observable)"* acceptance criterion: the assertion is on the stubbed
 * `SettingsSyncService` recording a push, which is the only place that fact is
 * observable from outside the auth slice.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { StoreProvider } from '../../../../library/StoreProvider'
import {
  type ThunkExtra,
  makeStore,
  stubbedThunkExtra,
} from '../../../../library/store'
import { GoogleCalendarConnections } from '../../../../services/googleCalendar/GoogleCalendarConnection'
import { makeStubbedGoogleCalendarService } from '../../../../services/googleCalendar/GoogleCalendarService'
import { makeInMemoryLocalStore } from '../../../../services/localStore/InMemoryLocalStore'
import { makeRecordingNavigationService } from '../../../../services/navigation/NavigationService'
import { makeStubbedSettingsSyncService } from '../../../../services/sync/SettingsSyncService'
import { SettingsHubPage } from '../SettingsHubPage'

afterEach(cleanup)

const renderPage = (extra: ThunkExtra = stubbedThunkExtra) => {
  const store = makeStore(extra)
  const view = render(
    <StoreProvider store={store}>
      <SettingsHubPage />
    </StoreProvider>,
  )
  return { store, view }
}

describe('opening the surface', () => {
  it('lands on the hub with canon three groups', async () => {
    renderPage()

    expect(await screen.findByTestId('settings-hub')).toBeTruthy()
    expect(screen.getByText('Preferences')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Integrations/ })).toBeTruthy()
  })

  it('reads the stored preferences so a pane opens on real values', async () => {
    const { store } = renderPage({
      ...stubbedThunkExtra,
      localStore: makeInMemoryLocalStore({
        preferences: { 'kro:session.defaultDuration': 45 },
      }),
    })

    await waitFor(() => {
      expect(store.getState().settings.load.kind).toBe('loaded')
    })
    expect(store.getState().settings.values['session.defaultDuration']).toBe(45)
  })

  it('asks the deployment about Google rather than assuming a state', async () => {
    const calls: string[] = []
    renderPage({
      ...stubbedThunkExtra,
      googleCalendar: makeStubbedGoogleCalendarService({
        calls,
        connection: GoogleCalendarConnections.connected(),
      }),
    })

    await waitFor(() => {
      expect(calls).toContain('connection')
    })
  })

  it('does NOT pull settings on open — canon rule, made observable', async () => {
    const settingsSync = makeStubbedSettingsSyncService()
    renderPage({ ...stubbedThunkExtra, settingsSync })

    await screen.findByTestId('settings-hub')

    expect(settingsSync.pullCount()).toBe(0)
    expect(settingsSync.pushes()).toHaveLength(0)
  })
})

describe('closing the surface pushes the synced preferences', () => {
  it('sends the cloud-scoped values back when the surface goes away', async () => {
    const settingsSync = makeStubbedSettingsSyncService()
    const { view } = renderPage({ ...stubbedThunkExtra, settingsSync })

    await screen.findByTestId('settings-hub')
    expect(settingsSync.pushes()).toHaveLength(0)

    view.unmount()

    await waitFor(() => {
      expect(settingsSync.pushes().length).toBeGreaterThan(0)
    })
  })

  it('pushes the values the user actually changed', async () => {
    const settingsSync = makeStubbedSettingsSyncService()
    const { store, view } = renderPage({
      ...stubbedThunkExtra,
      settingsSync,
      localStore: makeInMemoryLocalStore({
        preferences: { 'kro:session.defaultDuration': 45 },
      }),
    })

    await waitFor(() => {
      expect(store.getState().settings.load.kind).toBe('loaded')
    })
    view.unmount()

    await waitFor(() => {
      const [first] = settingsSync.pushes()
      expect(
        first?.find((entry) => entry.key === 'session.defaultDuration')?.value,
      ).toBe(45)
    })
  })

  it('never pushes a device-local option — the five stay on the device', async () => {
    const settingsSync = makeStubbedSettingsSyncService()
    const { view } = renderPage({ ...stubbedThunkExtra, settingsSync })

    await screen.findByTestId('settings-hub')
    view.unmount()

    await waitFor(() => {
      expect(settingsSync.pushes().length).toBeGreaterThan(0)
    })
    const keys = (settingsSync.pushes()[0] ?? []).map((entry) => entry.key)
    for (const local of [
      'general.appearance',
      'general.haptics',
      'earn.milestoneHaptics',
      'session.keepScreenAwake',
      'session.soundOnEnd',
    ]) {
      expect(keys).not.toContain(local)
    }
  })
})

describe('drilling into a pane', () => {
  it('opens the General pane with every schema row on it', async () => {
    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: /General/ }),
    )

    expect(screen.getByTestId('preferences-section')).toBeTruthy()
    expect(screen.getByLabelText('Start')).toBeTruthy()
    expect(screen.getByRole('switch', { name: 'Overdue alerts' })).toBeTruthy()
  })

  it('opens the Integrations pane with the honest unconfigured Google row', async () => {
    renderPage({
      ...stubbedThunkExtra,
      googleCalendar: makeStubbedGoogleCalendarService({
        connection: GoogleCalendarConnections.unconfigured([
          'GOOGLE_CLIENT_ID',
        ]),
      }),
    })

    await userEvent.click(
      await screen.findByRole('button', { name: /Integrations/ }),
    )

    expect(screen.getByTestId('integrations-section')).toBeTruthy()
    await waitFor(() => {
      expect(
        (
          screen.getByRole('button', {
            name: 'Connect Google Calendar',
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true)
    })
  })

  it('returns to the hub from a pane', async () => {
    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: /Earn Preferences/ }),
    )
    expect(screen.queryByTestId('settings-hub')).toBeNull()

    await userEvent.click(screen.getByTestId('pane-back'))
    expect(screen.getByTestId('settings-hub')).toBeTruthy()
  })

  it('keeps the form editable when the preference store cannot be read', async () => {
    // Canon's "load failed" state: defaults show and edits still save. The
    // pre-load guard exists to stop an in-flight load overwriting an edit, and
    // a failed load is not in flight. (Reported by Copilot on KC-PR-#70.)
    const broken = makeInMemoryLocalStore({})
    const { store } = renderPage({
      ...stubbedThunkExtra,
      localStore: {
        ...broken,
        preferences: {
          ...broken.preferences,
          get() {
            throw new Error('storage disabled')
          },
        },
      },
    })

    await userEvent.click(
      await screen.findByRole('button', { name: /General/ }),
    )
    await waitFor(() => {
      expect(store.getState().settings.load.kind).toBe('failed')
    })

    const toggle = screen.getByRole('switch', { name: 'Overdue alerts' })
    expect((toggle as HTMLButtonElement).disabled).toBe(false)
    // And the declared default is what it shows.
    expect(toggle.getAttribute('aria-checked')).toBe('true')
  })

  it('writes a changed preference through to the store', async () => {
    const localStore = makeInMemoryLocalStore({})
    const { store } = renderPage({ ...stubbedThunkExtra, localStore })

    await userEvent.click(
      await screen.findByRole('button', { name: /Session Preferences/ }),
    )
    await waitFor(() => {
      expect(store.getState().settings.load.kind).toBe('loaded')
    })
    await userEvent.click(
      screen.getByRole('button', { name: 'Increase Session' }),
    )

    await waitFor(() => {
      expect(localStore.preferences.get('kro:session.defaultDuration')).toBe(25)
    })
  })
})

describe('the desktop frame', () => {
  it('carries canon minimum sheet size on a pointer-driven surface', async () => {
    const { store } = renderPage()

    await screen.findByTestId('settings-surface')
    // The default surface is the SSR one; the shell stamps the real measurement.
    // Either way the frame comes from the ported table, never from a media query
    // written in this Page.
    expect(store.getState().main.surface).toBeTruthy()
    const panel = screen.getByTestId('settings-surface')
    expect(['modal', 'sheet']).toContain(
      panel.getAttribute('data-presentation'),
    )
  })

  it('tells the shell which destination is mounted, so the URL stays the authority', async () => {
    const { store } = renderPage()

    await screen.findByTestId('settings-hub')

    expect(store.getState().main.selected.kind).toBe('settings')
  })

  it('offers Done, which navigates away rather than dismissing nothing', async () => {
    const navigation = makeRecordingNavigationService()
    renderPage({ ...stubbedThunkExtra, navigation })

    await userEvent.click(await screen.findByRole('button', { name: 'Done' }))

    // Navigation goes through the injected Service (`RC-17`); the route change
    // is what re-selects the destination, which is why this asserts on the call
    // rather than on `main.selected`.
    await waitFor(() => {
      expect(navigation.calls).toEqual([{ kind: 'navigate', path: '/my-day' }])
    })
  })
})
