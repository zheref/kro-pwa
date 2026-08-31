/**
 * The `/execute` destination's body.
 *
 * Two behaviours, and both are the kind that only ever break silently: the
 * sidebar highlight following the URL, and a blank focus session being there to
 * start when the user arrives with nothing selected.
 */
import {
  EndeavorHost,
  endeavorRecordFromEndeavor,
  minutesInSeconds,
  taskEndeavor,
} from '@kro/core'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installRadixEnvironment } from '../../../../design/system/primitives/__tests__/radixEnvironment'
import { StoreProvider } from '../../../../library/StoreProvider'
import {
  type AppStore,
  makeStore,
  stubbedThunkExtra,
} from '../../../../library/store'
import { makeInMemoryLocalStore } from '../../../../services/localStore/InMemoryLocalStore'
import { DestinationKind } from '../../../main/SidebarDestination'
import { resetSurfaceCache } from '../../../main/useSurfaceLayout'
import {
  loadSessionPreferencesThunk,
  prepareSessionLaunchThunk,
} from '../../SessionProducer'
import { SessionPhase } from '../../SessionVocabulary'
import { SessionDestinationPage } from '../SessionDestinationPage'

const NOW = new Date(2026, 2, 17, 9, 0, 0)

const installMatchMedia = (): void => {
  Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true })
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
      onchange: null,
    }) as unknown as MediaQueryList) as typeof window.matchMedia
}

const renderPage = (store: AppStore) =>
  render(
    <StoreProvider store={store}>
      <SessionDestinationPage />
    </StoreProvider>,
  )

beforeEach(() => {
  resetSurfaceCache()
  installMatchMedia()
  installRadixEnvironment()
})

afterEach(cleanup)

describe('the destination', () => {
  it('selects Execute in the shell, so a pasted link highlights the right row', async () => {
    const store = makeStore(stubbedThunkExtra)
    renderPage(store)

    await waitFor(() => {
      expect(store.getState().main.selected.kind).toBe(DestinationKind.session)
    })
  })

  it('renders the surface as an inline column, never as a raised sheet', async () => {
    const store = makeStore(stubbedThunkExtra)
    const { container } = renderPage(store)

    await waitFor(() => {
      expect(
        container.querySelector('[data-kro-session-surface="inline"]'),
      ).toBeTruthy()
    })
    expect(
      document.querySelector('[data-kro-session-surface="modal"]'),
    ).toBeNull()
  })
})

describe('the blank focus session', () => {
  it('raises one when the user arrives with nothing selected', async () => {
    const store = makeStore(stubbedThunkExtra)
    await store.dispatch(loadSessionPreferencesThunk())
    renderPage(store)

    await waitFor(() => {
      expect(store.getState().session.identity).not.toBeNull()
    })
    expect(store.getState().session.identity?.isAnonymous).toBe(true)
    expect(store.getState().session.identity?.title).toBe('Focus Session')
    expect(await screen.findByText('READY')).toBeTruthy()
  })

  it('leaves a session that is already prepared exactly as it was', async () => {
    const endeavor = taskEndeavor({
      id: 'endeavor-slides',
      title: '📊 Prepare slides',
      duration: minutesInSeconds(25),
      host: EndeavorHost.local,
      createdAt: NOW,
    })
    const localStore = makeInMemoryLocalStore({
      endeavors: [endeavorRecordFromEndeavor(endeavor, { now: NOW })],
    })
    const store = makeStore({ ...stubbedThunkExtra, localStore })
    await store.dispatch(loadSessionPreferencesThunk())
    await store.dispatch(
      prepareSessionLaunchThunk({
        endeavorId: 'endeavor-slides',
        sessionId: 'unused',
      }),
    )

    renderPage(store)

    await waitFor(() => {
      expect(store.getState().main.selected.kind).toBe(DestinationKind.session)
    })
    expect(store.getState().session.identity?.endeavorId).toBe(
      'endeavor-slides',
    )
    expect(store.getState().session.phase).toBe(SessionPhase.ready)
  })
})
