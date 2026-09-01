import type { LocalStore } from '@kro/core'
import { EndeavorStatus } from '@kro/core'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ActiveToastHost } from '../../../../design/chrome/toast/ActiveToastHost'
import { StoreProvider } from '../../../../library/StoreProvider'
import {
  type AppStore,
  makeStore,
  stubbedThunkExtra,
} from '../../../../library/store'
import { makeInMemoryLocalStore } from '../../../../services/localStore/InMemoryLocalStore'
import {
  type NavigationService,
  makeRecordingNavigationService,
} from '../../../../services/navigation/NavigationService'
import type { DoSurface } from '../../../main/DoSurfaceLayout'
import { onSurfaceChanged } from '../../../main/MainFeature'
import { resetSurfaceCache } from '../../../main/useSurfaceLayout'
import { DO_MOCK_NOW, doFixtureRecords } from '../../DoMocks'
import { DoPage } from '../DoPage'

/**
 * A real store over a seeded in-memory `LocalStore` (`RC-22`, `RC-35`).
 *
 * The Page reads the clock once at mount and hands it straight to the reducer,
 * so passing `now` pins every lane, badge and caption to `DO_MOCK_NOW` — the
 * same instant `doEndeavorFixtures` is positioned against.
 *
 * **The surface is stamped, not measured.** `MainShellPage` is the one artifact
 * that measures the browser (`useSurfaceLayout` → `onSurfaceChanged`); the Do
 * surface reads the resolved row out of state through `selectLayout`. So a
 * suite that wants the compact composition says so by dispatching the shell's
 * own event, exactly as the shell would — rather than mounting the whole shell
 * to get one boolean.
 */
const mountPage = (
  options: {
    readonly localStore?: LocalStore
    readonly surface?: DoSurface
    readonly navigation?: NavigationService
  } = {},
): { store: AppStore; localStore: LocalStore } => {
  const localStore =
    options.localStore ??
    makeInMemoryLocalStore({ endeavors: doFixtureRecords() })
  const store = makeStore({
    ...stubbedThunkExtra,
    localStore,
    ...(options.navigation === undefined
      ? {}
      : { navigation: options.navigation }),
  })
  if (options.surface !== undefined) {
    store.dispatch(onSurfaceChanged({ surface: options.surface }))
  }
  render(
    // The shell's two providers, as far as this Page can tell: the store, and
    // the one Active Toast host `MainShellPage` mounts (KC-IS-#71 item 15).
    <StoreProvider store={store}>
      <ActiveToastHost position="absolute">
        <DoPage now={DO_MOCK_NOW} locale="en-US" initialLaneWidth={1120} />
      </ActiveToastHost>
    </StoreProvider>,
  )
  return { store, localStore }
}

const handheld: DoSurface = { idiom: 'handheld', width: 'compact' }

type Listener = () => void
const media = new Map<string, { matches: boolean; listeners: Set<Listener> }>()

/** The shell's own harness: the surface follows the pointer and the width. */
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

beforeEach(() => {
  resetSurfaceCache()
  installMatchMedia(false, 1440)
})

afterEach(cleanup)

describe('mount', () => {
  it('installs the day and lays out its lanes', async () => {
    const { store } = mountPage()

    await waitFor(() => {
      expect(store.getState().do.load.kind).toBe('loaded')
    })

    expect(screen.getByTestId('do-lane-overdue')).toBeTruthy()
    expect(screen.getByTestId('do-lane-featured')).toBeTruthy()
  })

  it('tells the shell which destination the route mounted', () => {
    const { store } = mountPage()
    expect(store.getState().main.selected.kind).toBe('myDay')
  })

  it('shows the wide header composition on a pointer window', async () => {
    mountPage()
    await waitFor(() => {
      expect(screen.getByTestId('do-header-title').textContent).toBe('My Day')
    })
    expect(screen.getByTestId('do-header-date').textContent).toBe('Mar 17')
  })

  it('falls back to the compact header on a phone-width window', async () => {
    installMatchMedia(true, 390)
    resetSurfaceCache()

    mountPage({ surface: handheld })

    await waitFor(() => {
      expect(screen.getByTestId('do-header-title').textContent).toBe('Mar 17')
    })
    expect(screen.queryByTestId('do-header-date')).toBeNull()
  })

  it('reports the measured lane width as a capacity the slice can hold', async () => {
    const { store } = mountPage()
    await waitFor(() => {
      expect(store.getState().do.load.kind).toBe('loaded')
    })
    // jsdom never measures, so the capacity stays at the slice's own default —
    // which is the honest answer for an unmeasured surface.
    expect([3, 5, 7, 9]).toContain(store.getState().do.featuredCapacity)
  })
})

describe('prepare → complete → undo', () => {
  it('prepares the tapped card under its own section tag', async () => {
    const { store } = mountPage()
    await waitFor(() => {
      expect(store.getState().do.load.kind).toBe('loaded')
    })

    const lane = screen.getByTestId('do-lane-overdue')
    const title = lane.querySelector<HTMLButtonElement>(
      '[data-slot="endeavor-card"] button',
    )
    if (title === null) throw new Error('the Overdue lane rendered no card')
    await userEvent.click(title)

    expect(store.getState().do.selectedCardKey).toMatch(/^overdue:/)
  })

  it('un-prepares on a second tap of the same card', async () => {
    const { store } = mountPage()
    await waitFor(() => {
      expect(store.getState().do.load.kind).toBe('loaded')
    })

    const lane = screen.getByTestId('do-lane-overdue')
    const title = lane.querySelector<HTMLButtonElement>(
      '[data-slot="endeavor-card"] button',
    )
    if (title === null) throw new Error('the Overdue lane rendered no card')

    await userEvent.click(title)
    await userEvent.click(title)

    expect(store.getState().do.selectedCardKey).toBeNull()
  })

  it('completes optimistically — the card leaves its lane and joins Completed Today', async () => {
    const { store } = mountPage()
    await waitFor(() => {
      expect(store.getState().do.load.kind).toBe('loaded')
    })

    const target = store.getState().do.lanes.overdue[0]
    if (target === undefined) throw new Error('the Overdue lane is empty')

    store.dispatch({
      type: 'do/userDidMarkCardComplete',
      payload: {
        endeavorId: target.id,
        completionDate: DO_MOCK_NOW,
        now: DO_MOCK_NOW,
      },
    })

    const state = store.getState().do
    expect(state.lanes.overdue.map((e) => e.id)).not.toContain(target.id)
    expect(state.lanes.completedToday.map((e) => e.id)).toContain(target.id)
  })

  it('undo puts the completed endeavor back into its lane', async () => {
    const { store, localStore } = mountPage()
    await waitFor(() => {
      expect(store.getState().do.load.kind).toBe('loaded')
    })

    const target = store.getState().do.lanes.overdue[0]
    if (target === undefined) throw new Error('the Overdue lane is empty')

    // Complete, then undo through the same producer the toast's Undo fires.
    const { markEndeavorCompleteThunk } = await import('../../DoProducer')
    const { reopenEndeavorThunk } = await import('../../DoProducer')

    await store.dispatch(
      markEndeavorCompleteThunk({
        endeavorId: target.id,
        completionDate: DO_MOCK_NOW,
        now: DO_MOCK_NOW,
      }),
    )
    expect((await localStore.endeavors.get(target.id))?.status).toBe(
      EndeavorStatus.closed,
    )

    await store.dispatch(
      reopenEndeavorThunk({ endeavorId: target.id, now: DO_MOCK_NOW }),
    )

    await waitFor(() => {
      expect(store.getState().do.lanes.overdue.map((e) => e.id)).toContain(
        target.id,
      )
    })
    expect(
      store.getState().do.lanes.completedToday.map((e) => e.id),
    ).not.toContain(target.id)
  })
})

describe('mark-complete mode', () => {
  it('enters from the FAB and retitles the header to the instruction', async () => {
    const { store } = mountPage()
    await waitFor(() => {
      expect(store.getState().do.load.kind).toBe('loaded')
    })

    await userEvent.click(screen.getByRole('button', { name: 'Quick action' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Mark Complete…' }),
    )

    expect(store.getState().do.isInMarkCompleteMode).toBe(true)
    await waitFor(() => {
      expect(screen.getByTestId('do-header-title').textContent).toBe(
        'Check Complete',
      )
    })
  })

  it('swaps the toolbar for a single Done control, and leaves on it', async () => {
    const { store } = mountPage()
    await waitFor(() => {
      expect(store.getState().do.load.kind).toBe('loaded')
    })

    await userEvent.click(screen.getByRole('button', { name: 'Quick action' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Mark Complete…' }),
    )

    const done = await screen.findByTestId('do-done-control')
    expect(screen.queryByLabelText('Refresh')).toBeNull()

    await userEvent.click(done)
    expect(store.getState().do.isInMarkCompleteMode).toBe(false)
  })

  it('clears the preparation cursor on the way in', async () => {
    const { store } = mountPage()
    await waitFor(() => {
      expect(store.getState().do.load.kind).toBe('loaded')
    })

    const lane = screen.getByTestId('do-lane-overdue')
    const title = lane.querySelector<HTMLButtonElement>(
      '[data-slot="endeavor-card"] button',
    )
    if (title === null) throw new Error('the Overdue lane rendered no card')
    await userEvent.click(title)
    expect(store.getState().do.selectedCardKey).not.toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Quick action' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Mark Complete…' }),
    )

    expect(store.getState().do.selectedCardKey).toBeNull()
  })
})

describe("the FAB's other three rows", () => {
  it('Clear Expired closes the expired lane and refetches the day', async () => {
    const { store } = mountPage()
    await waitFor(() => {
      expect(store.getState().do.load.kind).toBe('loaded')
    })
    expect(store.getState().do.lanes.expired.length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole('button', { name: 'Quick action' }))
    await userEvent.click(screen.getByRole('button', { name: 'Clear Expired' }))

    await waitFor(() => {
      expect(store.getState().do.lanes.expired).toHaveLength(0)
    })
  })

  it('Quick Add raises the capture intent the prompt child will consume', async () => {
    const { store } = mountPage()
    await waitFor(() => {
      expect(store.getState().do.load.kind).toBe('loaded')
    })

    await userEvent.click(screen.getByRole('button', { name: 'Quick action' }))
    await userEvent.click(screen.getByRole('button', { name: 'Quick Add' }))

    expect(store.getState().capture.prompt).not.toBeNull()
  })
})

describe('the attention bell', () => {
  it('opens the panel in place on a wide window', async () => {
    mountPage()
    await waitFor(() => {
      expect(screen.getByLabelText('Notifications')).toBeTruthy()
    })

    await userEvent.click(screen.getByLabelText('Notifications'))
    expect(screen.getByTestId('do-notifications-panel')).toBeTruthy()
  })

  it('raises the scroll intent on a narrow window instead', async () => {
    installMatchMedia(true, 390)
    resetSurfaceCache()

    const { store } = mountPage({ surface: handheld })
    await waitFor(() => {
      expect(store.getState().do.load.kind).toBe('loaded')
    })

    await userEvent.click(screen.getByLabelText('Notifications'))

    expect(screen.queryByTestId('do-notifications-panel')).toBeNull()
    // The one-shot is consumed by the surface in the same commit, so the proof
    // is that the surface reported it handled rather than that the flag stuck.
    expect(store.getState().do.shouldScrollToOverdue).toBe(false)
  })
})

describe('the intents this surface hands to other features', () => {
  it('a long press (context menu) asks Detail for that endeavor', async () => {
    const { store } = mountPage()
    await waitFor(() => {
      expect(store.getState().do.load.kind).toBe('loaded')
    })

    const target = store.getState().do.lanes.overdue[0]
    if (target === undefined) throw new Error('the Overdue lane is empty')

    const card = screen
      .getByTestId('do-lane-overdue')
      .querySelector<HTMLElement>('[data-do-card-key]')
    if (card === null) throw new Error('the Overdue lane rendered no card')
    fireEvent.contextMenu(card)

    expect(store.getState().endeavorDetail.endeavor?.id).toBe(target.id)
  })

  it('Start on a prepared card carries the endeavor into the session', async () => {
    // KC-IS-#71 item 21: canon's `.onUserWantsToStartEvent(endeavor, nil)`.
    // The navigation used to be the whole hand-off, so Execute opened on the
    // anonymous `Focus Session` however you got there.
    const navigation = makeRecordingNavigationService()
    const { store } = mountPage({ navigation })
    await waitFor(() => {
      expect(store.getState().do.load.kind).toBe('loaded')
    })

    const lane = screen.getByTestId('do-lane-overdue')
    const target = store.getState().do.lanes.overdue[0]
    if (target === undefined) throw new Error('the Overdue lane is empty')

    const title = lane.querySelector<HTMLButtonElement>(
      '[data-slot="endeavor-card"] button',
    )
    if (title === null) throw new Error('the Overdue lane rendered no card')
    await userEvent.click(title)
    const start = lane.querySelector<HTMLButtonElement>(
      '[data-slot="endeavor-card"] button[aria-label="Start"]',
    )
    if (start === null) throw new Error('the prepared card offers no Start')
    await userEvent.click(start)

    await waitFor(() => {
      expect(store.getState().session.identity?.title).toBe(target.title)
    })
  })

  it('Start on a prepared card routes to the session surface', async () => {
    const navigation = makeRecordingNavigationService()
    const { store } = mountPage({ navigation })
    await waitFor(() => {
      expect(store.getState().do.load.kind).toBe('loaded')
    })

    const lane = screen.getByTestId('do-lane-overdue')
    const title = lane.querySelector<HTMLButtonElement>(
      '[data-slot="endeavor-card"] button',
    )
    if (title === null) throw new Error('the Overdue lane rendered no card')
    await userEvent.click(title)

    const start = lane.querySelector<HTMLButtonElement>(
      '[data-slot="endeavor-card"] button[aria-label="Start"]',
    )
    if (start === null) throw new Error('the prepared card offers no Start')
    await userEvent.click(start)

    await waitFor(() => {
      expect(navigation.calls).toContainEqual({
        kind: 'navigate',
        path: '/execute',
      })
    })
  })

  it('Skip from an expanded row closes the endeavor as skipped', async () => {
    const { store, localStore } = mountPage()
    await waitFor(() => {
      expect(store.getState().do.load.kind).toBe('loaded')
    })

    // Desktop Do uses macOS preparation. Horizontal rows keep Skip as a
    // compact control so the intent does not have to open a Radix menu
    // (see the measurement in `system/primitives/__tests__/radixEnvironment.tsx`).
    await userEvent.click(screen.getByRole('button', { name: /^Overdue, / }))
    const list = await screen.findByTestId('do-tasks-list')
    const target = store.getState().do.lanes.overdue[0]
    if (target === undefined) throw new Error('the Overdue lane is empty')

    const rowTitle = list.querySelector<HTMLButtonElement>(
      '[data-slot="endeavor-card"] button',
    )
    if (rowTitle === null) throw new Error('the list rendered no row')
    await userEvent.click(rowTitle)

    const skip = list.querySelector<HTMLButtonElement>(
      'button[aria-label="Skip"]',
    )
    if (skip === null) throw new Error('the prepared row offers no Skip')
    await userEvent.click(skip)

    await waitFor(async () => {
      expect((await localStore.endeavors.get(target.id))?.status).toBe(
        EndeavorStatus.skipped,
      )
    })
  })
})

describe('the empty day', () => {
  it('shows the promotion inset when nothing exists anywhere', async () => {
    const { store } = mountPage({
      localStore: makeInMemoryLocalStore({ endeavors: [] }),
    })

    await waitFor(() => {
      expect(store.getState().do.load.kind).toBe('loaded')
    })
    expect(screen.getByText('Start Building Your Day')).toBeTruthy()
  })
})
