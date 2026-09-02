/**
 * The stateful container, rendered against a real store built with
 * `makeStore(stubbedThunkExtra)` (`RC-22`, `RC-35`) — never a hand-assembled
 * second store, never the live services.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useActiveToasts } from '../../../design/chrome'
import { StoreProvider } from '../../../library/StoreProvider'
import {
  type ThunkExtra,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import { makeRecordingNavigationService } from '../../../services/navigation/NavigationService'
import {
  EndeavorHost,
  endeavorRecordFromEndeavor,
  minutesInSeconds,
  taskEndeavor,
} from '@kro/core'
import {
  loadSessionPreferencesThunk,
  prepareSessionLaunchThunk,
  startSessionThunk,
} from '../../session/SessionProducer'
import { MainShellPage } from '../MainShellPage'
import {
  CHROME_LAYOUT,
  SHELL_GUTTER,
  toastBottomOffset,
  toastLiftAbovePill,
} from '../../../design/chrome'
import { shellBottomInset } from '../DoSurfaceLayout'
import { SIDEBAR_IDEAL_WIDTH } from '../SidebarFragment'
import { selectLayout } from '../MainSelectors'
import { resetSurfaceCache } from '../useSurfaceLayout'

type Listener = () => void
const media = new Map<string, { matches: boolean; listeners: Set<Listener> }>()

const installMatchMedia = (coarse: boolean, width: number): void => {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    configurable: true,
  })
  media.clear()
  media.set('(pointer: coarse)', { matches: coarse, listeners: new Set() })
  media.set('(min-width: 768px)', {
    matches: width >= 768,
    listeners: new Set(),
  })

  window.matchMedia = ((query: string) => {
    const entry = media.get(query) ?? { matches: false, listeners: new Set() }
    media.set(query, entry)
    return {
      get matches() {
        return entry.matches
      },
      media: query,
      addEventListener: (_: string, listener: Listener) =>
        entry.listeners.add(listener),
      removeEventListener: (_: string, listener: Listener) =>
        entry.listeners.delete(listener),
      addListener: (listener: Listener) => entry.listeners.add(listener),
      removeListener: (listener: Listener) => entry.listeners.delete(listener),
      dispatchEvent: () => true,
      onchange: null,
    } as unknown as MediaQueryList
  }) as typeof window.matchMedia
}

const renderShell = (extra: ThunkExtra = stubbedThunkExtra) => {
  const store = makeStore(extra)
  const view = render(
    <StoreProvider store={store}>
      <MainShellPage isDevelopment={false}>
        <p>destination content</p>
      </MainShellPage>
    </StoreProvider>,
  )
  return { store, view }
}

beforeEach(() => {
  resetSurfaceCache()
  installMatchMedia(false, 1440)
})

afterEach(cleanup)

describe('mount', () => {
  it('resolves the gates and renders the shipping sidebar', async () => {
    const { store } = renderShell()

    await waitFor(() => {
      expect(store.getState().main.load.kind).toBe('loaded')
    })

    expect(screen.getByRole('button', { name: 'Today' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Jot Down' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Habits' })).toBeNull()
  })

  it('stamps the measured surface into the slice', async () => {
    const { store } = renderShell()

    await waitFor(() => {
      expect(store.getState().main.surface).toEqual({
        idiom: 'desktop',
        width: 'regular',
      })
    })
  })

  it('renders the destination its route handed it', () => {
    renderShell()
    expect(screen.getByText('destination content')).toBeTruthy()
  })
})

describe("navigation is a Producer's, never a component's (RC-17)", () => {
  it('navigates when a sidebar row is tapped, and selects it immediately', async () => {
    const navigation = makeRecordingNavigationService()
    const { store } = renderShell({ ...stubbedThunkExtra, navigation })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Jot Down' })).toBeTruthy()
    })
    await userEvent.click(screen.getByRole('button', { name: 'Jot Down' }))

    expect(store.getState().main.selected.kind).toBe('inbox')
    await waitFor(() => {
      expect(navigation.calls).toContainEqual({
        kind: 'navigate',
        path: '/inbox',
      })
    })
  })

  it('routes the Inbox toolbar control through the same path', async () => {
    const navigation = makeRecordingNavigationService()
    renderShell({ ...stubbedThunkExtra, navigation })

    await userEvent.click(screen.getByRole('button', { name: 'Inbox' }))

    await waitFor(() => {
      expect(navigation.calls).toContainEqual({
        kind: 'navigate',
        path: '/inbox',
      })
    })
  })

  it("sends the sidebar's search field to the Search destination", async () => {
    const navigation = makeRecordingNavigationService()
    renderShell({ ...stubbedThunkExtra, navigation })

    const field = screen.getByRole('searchbox', { name: 'Search' })
    await userEvent.type(field, 'tax{Enter}')

    await waitFor(() => {
      expect(navigation.calls).toContainEqual({
        kind: 'navigate',
        path: '/search',
      })
    })
  })
})

describe('the shell shape follows the surface', () => {
  it('renders the sidebar on a wide pointer window', async () => {
    renderShell()
    await waitFor(() => {
      expect(screen.getByTestId('shell-sidebar')).toBeTruthy()
    })
    expect(screen.queryByTestId('shell-tab-bar')).toBeNull()
  })

  it('renders the tab bar on a phone-width window', async () => {
    installMatchMedia(true, 390)
    resetSurfaceCache()

    renderShell()

    await waitFor(() => {
      expect(screen.getByTestId('shell-tab-bar')).toBeTruthy()
    })
    expect(screen.queryByTestId('shell-sidebar')).toBeNull()
  })
})

describe('the Lists section', () => {
  it('opens the inline row on "+" and keeps what is typed', async () => {
    const { store } = renderShell()

    await waitFor(() => {
      expect(store.getState().main.load.kind).toBe('loaded')
    })

    await userEvent.click(screen.getByRole('button', { name: 'Add Project' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: 'New project' }),
      'Garden',
    )

    expect(store.getState().main.draftProjectTitle).toBe('Garden')
  })

  it('creates the project on Enter and closes the inline row', async () => {
    const { store } = renderShell()

    await waitFor(() => {
      expect(store.getState().main.load.kind).toBe('loaded')
    })

    await userEvent.click(screen.getByRole('button', { name: 'Add Project' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: 'New project' }),
      'Garden{Enter}',
    )

    await waitFor(() => {
      expect(
        store.getState().main.projects.map((project) => project.title),
      ).toEqual(['Garden'])
    })
    expect(store.getState().main.isAddingProject).toBe(false)
  })
})

/**
 * The Active Toast host lives at the shell (KC-IS-#71 item 15).
 *
 * Before this, two hosts were mounted inside surfaces — `CaptureOverlays` and
 * `DoSurfaceFragment` — so a toast raised anywhere else had no host at all,
 * neither was anchored to the viewport, and no host could be told whether the
 * Session Pill was on screen. These are the three properties that fixes.
 */
describe('the Active Toast host, mounted once at the shell', () => {
  /** A destination that raises a toast the moment it mounts. */
  function ToastingDestination({ message }: { readonly message: string }) {
    const { enqueue } = useActiveToasts()
    // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only — re-enqueueing on every render would restart the dismissal timer forever
    useEffect(() => {
      enqueue({ message })
    }, [])
    return <p>destination content</p>
  }

  const renderWithDestination = (message: string) => {
    const store = makeStore(stubbedThunkExtra)
    render(
      <StoreProvider store={store}>
        <MainShellPage isDevelopment={false}>
          <ToastingDestination message={message} />
        </MainShellPage>
      </StoreProvider>,
    )
    return store
  }

  it('renders a toast raised by the destination it wraps', async () => {
    renderWithDestination('Prepare slides marked complete')

    // The message is announced once, by the always-mounted live region, and
    // drawn once by the visible toast.
    expect(
      await screen.findAllByText('Prepare slides marked complete'),
    ).toHaveLength(2)
  })

  it('mounts exactly one layer, pinned to the viewport', () => {
    renderShell()

    const layers = document.querySelectorAll('[data-kro-toast-layer]')
    expect(layers).toHaveLength(1)
    expect((layers[0] as HTMLElement).style.position).toBe('fixed')
  })

  it('clears the tab bar by the shell’s own reservation, not a FAB-derived guess', async () => {
    installMatchMedia(true, 390)
    const { store } = renderShell()

    await waitFor(() => {
      expect(store.getState().main.load.kind).toBe('loaded')
    })

    const layer = document.querySelector(
      '[data-kro-toast-layer]',
    ) as HTMLElement
    const inset = shellBottomInset('tabBar', selectLayout(store.getState()))
    expect(inset).toBeGreaterThan(0)
    // The layer writes `calc(24px + 60px)`; jsdom folds a same-unit sum, so
    // what is asserted is the value that matters — canon's 24pt plus the bar.
    expect(layer.style.bottom).toBe(`calc(${toastBottomOffset(inset)}px)`)
  })

  it('starts the toast at the content column, not under the sidebar', async () => {
    // Canon anchors it 16pt in from the leading edge of the CONTENT column. A
    // viewport-anchored layer on the sidebar shell begins under the sidebar and
    // the message is clipped by it — which is what the first capture of the
    // built app showed (KC-IS-#71 item 15).
    const { store } = renderShell()

    await waitFor(() => {
      expect(store.getState().main.load.kind).toBe('loaded')
    })
    expect(screen.getByTestId('shell-sidebar')).toBeTruthy()

    const layer = document.querySelector(
      '[data-kro-toast-layer]',
    ) as HTMLElement
    expect(layer.style.left).toBe(
      `${SHELL_GUTTER + SIDEBAR_IDEAL_WIDTH + SHELL_GUTTER}px`,
    )
  })

  it('sits against the viewport edge on the shell that has no sidebar', async () => {
    installMatchMedia(true, 390)
    const { store } = renderShell()

    await waitFor(() => {
      expect(store.getState().main.load.kind).toBe('loaded')
    })

    const layer = document.querySelector(
      '[data-kro-toast-layer]',
    ) as HTMLElement
    expect(layer.style.left).toBe(`${SHELL_GUTTER}px`)
  })

  it('does not lift while no session is running', () => {
    renderShell()

    const layer = document.querySelector('[data-kro-toast-layer]')
    expect(layer?.getAttribute('data-kro-toast-lifted')).toBe('false')
  })

  it('lifts clear of the Session Pill once a session is running', async () => {
    const slides = taskEndeavor({
      id: 'endeavor-slides',
      title: '📊 Prepare slides',
      duration: minutesInSeconds(20),
      host: EndeavorHost.local,
    })
    const now = new Date('2026-03-05T09:00:00.000Z')
    const localStore = makeInMemoryLocalStore({
      endeavors: [endeavorRecordFromEndeavor(slides, { now })],
    })
    const { store } = renderShell({ ...stubbedThunkExtra, localStore })

    await store.dispatch(loadSessionPreferencesThunk())
    await store.dispatch(
      prepareSessionLaunchThunk({
        endeavorId: slides.id,
        sessionId: slides.id,
      }),
    )
    await store.dispatch(startSessionThunk({ now }))

    await waitFor(() => {
      const layer = document.querySelector('[data-kro-toast-layer]')
      expect(layer?.getAttribute('data-kro-toast-lifted')).toBe('true')
    })

    const layer = document.querySelector(
      '[data-kro-toast-layer]',
    ) as HTMLElement
    expect(layer.style.transform).toBe(
      `translateY(-${CHROME_LAYOUT.toastVerticalOffset + toastLiftAbovePill()}px)`,
    )
  })
})
