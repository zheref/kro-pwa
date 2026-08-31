/**
 * The stateful container, rendered against a real store built with
 * `makeStore(stubbedThunkExtra)` (`RC-22`, `RC-35`) — never a hand-assembled
 * second store, never the live services.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { StoreProvider } from '../../../library/StoreProvider'
import {
  type ThunkExtra,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import { makeRecordingNavigationService } from '../../../services/navigation/NavigationService'
import { MainShellPage } from '../MainShellPage'
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

describe('navigation is a Producer\'s, never a component\'s (RC-17)', () => {
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

  it('sends the sidebar\'s search field to the Search destination', async () => {
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

    await userEvent.click(
      screen.getByRole('button', { name: 'Add Project' }),
    )
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
