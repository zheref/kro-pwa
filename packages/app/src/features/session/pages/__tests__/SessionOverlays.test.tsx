/**
 * The shell-level mount, against the real store and the real Producers.
 *
 * Four of these are the only automated evidence for behaviour that is
 * otherwise invisible until it is broken in production:
 *
 * - **Reload recovery.** A stored anchor plus a `now` twelve minutes later has
 *   to paint a *wall-clock-correct* figure on the first frame, not the number
 *   the tab held when it closed. That is the whole claim of anchored time
 *   accounting, and the pill is where a user would notice it failing.
 * - **The ticker.** Started only while time is accruing, stopped otherwise —
 *   canon is explicit that paused and concluded have no ticker.
 * - **The document title.** The web's stand-in for the macOS menu-bar extra,
 *   asserted through the stub's recording rather than through `document.title`,
 *   so the release (`null`) is visible as a distinct event.
 * - **The wake lock after a reload.** Hydration is not a transition, so nothing
 *   else in the feature asks for the screen back.
 */
import {
  EndeavorHost,
  PersistedSessionPhase,
  endeavorRecordFromEndeavor,
  makePersistedRunningSession,
  makePersistedSessionEndeavor,
  minutesInSeconds,
  resumeSessionAt,
  taskEndeavor,
} from '@kro/core'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installRadixEnvironment } from '../../../../design/system/primitives/__tests__/radixEnvironment'
import { StoreProvider } from '../../../../library/StoreProvider'
import {
  type AppStore,
  makeStore,
  stubbedThunkExtra,
} from '../../../../library/store'
import { makeInMemoryLocalStore } from '../../../../services/localStore/InMemoryLocalStore'
import {
  type StubbedDocumentTitleService,
  makeStubbedDocumentTitleService,
} from '../../../../services/platform/documentTitle/DocumentTitleService'
import {
  type StubbedWakeLockService,
  makeStubbedWakeLockService,
} from '../../../../services/platform/wakeLock/WakeLockService'
import { onDestinationRouteMounted } from '../../../main/MainFeature'
import { DestinationKind } from '../../../main/SidebarDestination'
import { resetSurfaceCache } from '../../../main/useSurfaceLayout'
import { SessionPhase } from '../../SessionVocabulary'
import { SessionOverlays } from '../SessionOverlays'

const START = new Date(2026, 2, 17, 9, 0, 0)
const ENDEAVOR_ID = 'endeavor-slides'

const endeavor = taskEndeavor({
  id: ENDEAVOR_ID,
  title: '📊 Prepare slides',
  duration: minutesInSeconds(25),
  host: EndeavorHost.local,
  createdAt: START,
})

/** A session that was left running at `START` — the document a reload finds. */
const runningAnchor = resumeSessionAt(
  makePersistedRunningSession({
    endeavor: makePersistedSessionEndeavor({
      id: ENDEAVOR_ID,
      symbol: '📊',
      title: '📊 Prepare slides',
      duration: minutesInSeconds(25),
    }),
    targetDuration: minutesInSeconds(25),
    mode: 'countdown',
    fragments: [],
    phase: PersistedSessionPhase.running,
  }),
  START,
)

interface Harness {
  readonly store: AppStore
  readonly titles: StubbedDocumentTitleService
  readonly wakeLock: StubbedWakeLockService
}

const makeHarness = (
  options: { readonly anchor?: typeof runningAnchor | null } = {},
): Harness => {
  const localStore = makeInMemoryLocalStore({
    endeavors: [endeavorRecordFromEndeavor(endeavor, { now: START })],
    runningSessionAnchor: options.anchor ?? null,
  })
  const titles = makeStubbedDocumentTitleService({ baseTitle: 'Kro for Web' })
  const wakeLock = makeStubbedWakeLockService({ supported: true })
  const store = makeStore({
    ...stubbedThunkExtra,
    localStore,
    documentTitleService: titles,
    wakeLockService: wakeLock,
  })
  return { store, titles, wakeLock }
}

const installMatchMedia = (width: number): void => {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    configurable: true,
  })
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes('min-width') ? width >= 768 : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
      onchange: null,
    }) as unknown as MediaQueryList) as typeof window.matchMedia
}

const renderOverlays = (store: AppStore) =>
  render(
    <StoreProvider store={store}>
      <SessionOverlays />
    </StoreProvider>,
  )

/**
 * Fake timers for the whole file, with `shouldAdvanceTime` so `waitFor` and
 * `userEvent` still make progress.
 *
 * Installed in `beforeEach` rather than per test because `vi.setSystemTime`
 * mocks `Date` on its own, and switching between the two mid-test throws. One
 * clock, installed once, moved by `setSystemTime` and pumped by
 * `advanceTimersByTimeAsync` — which is also what lets a 25-minute session be
 * driven to its conclusion in a millisecond.
 */
beforeEach(() => {
  resetSurfaceCache()
  installMatchMedia(1440)
  installRadixEnvironment()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('boot', () => {
  it('lands on ready with nothing on screen when no session was left running', async () => {
    const { store } = makeHarness()
    renderOverlays(store)

    await waitFor(() => {
      expect(store.getState().session.load.kind).toBe('loaded')
    })
    expect(store.getState().session.phase).toBe(SessionPhase.ready)
    expect(screen.queryByRole('button', { name: /Pause session/ })).toBeNull()
  })

  it('recovers a session left running, with a wall-clock-correct first frame', async () => {
    const { store } = makeHarness({ anchor: runningAnchor })
    // Twelve minutes of wall clock passed while the tab was closed.
    vi.setSystemTime(new Date(START.getTime() + minutesInSeconds(12) * 1_000))
    renderOverlays(store)

    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })
    // 25 − 12 = 13 minutes left, derived from the fragments rather than from a
    // counter that stopped when the tab did.
    expect(
      screen.getByRole('button', { name: '📊 Prepare slides, 13:00' }),
    ).toBeTruthy()
  })

  it('asks for the screen back after a reload into a live session', async () => {
    const { store, wakeLock } = makeHarness({ anchor: runningAnchor })
    vi.setSystemTime(new Date(START.getTime() + minutesInSeconds(1) * 1_000))
    renderOverlays(store)

    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })
    await waitFor(() => {
      expect(wakeLock.recordedRequests()).toContain(true)
    })
  })
})

describe('the document title', () => {
  it('publishes the live countdown while a session runs', async () => {
    const { store, titles } = makeHarness({ anchor: runningAnchor })
    vi.setSystemTime(new Date(START.getTime() + minutesInSeconds(5) * 1_000))
    renderOverlays(store)

    await waitFor(() => {
      expect(titles.recordedTitles()).toContain('20:00 — Kro')
    })
  })

  it('releases the tab’s title when nothing is advancing', async () => {
    const { store, titles } = makeHarness()
    renderOverlays(store)

    await waitFor(() => {
      expect(store.getState().session.load.kind).toBe('loaded')
    })
    expect(titles.recordedTitles()).toContain(null)
  })
})

describe('the display tick', () => {
  it('advances the pill’s clock once a second while a session runs', async () => {
    const { store } = makeHarness({ anchor: runningAnchor })
    vi.setSystemTime(new Date(START.getTime() + minutesInSeconds(1) * 1_000))
    renderOverlays(store)

    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })
    const first = store.getState().session.now

    vi.setSystemTime(new Date(START.getTime() + minutesInSeconds(2) * 1_000))
    await vi.advanceTimersByTimeAsync(1_100)

    expect(store.getState().session.now?.getTime()).toBeGreaterThan(
      first?.getTime() ?? 0,
    )
  })

  it('runs no ticker at all once the session is paused', async () => {
    const { store } = makeHarness({ anchor: runningAnchor })
    vi.setSystemTime(new Date(START.getTime() + minutesInSeconds(1) * 1_000))
    renderOverlays(store)

    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })
    await userEvent.click(screen.getByRole('button', { name: 'Pause session' }))
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.paused)
    })

    const frozen = store.getState().session.now
    vi.setSystemTime(new Date(START.getTime() + minutesInSeconds(9) * 1_000))
    await vi.advanceTimersByTimeAsync(5_000)

    // Canon: "Paused and concluded phases intentionally have no sheet ticker."
    expect(store.getState().session.now?.getTime()).toBe(frozen?.getTime())
  })
})

describe('the pill and the raised surface', () => {
  it('reopens the surface from the pill’s body, and hides the pill while it is up', async () => {
    const { store } = makeHarness({ anchor: runningAnchor })
    vi.setSystemTime(new Date(START.getTime() + minutesInSeconds(1) * 1_000))
    const { container } = renderOverlays(store)

    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })

    await userEvent.click(
      screen.getByRole('button', { name: /📊 Prepare slides, / }),
    )

    await waitFor(() => {
      expect(
        document.querySelector('[data-kro-session-surface="modal"]'),
      ).toBeTruthy()
    })
    // Canon: `runningSession != nil && sessionSetup == nil`.
    expect(
      (
        container.querySelector(
          '[data-kro-session-pill-layer]',
        ) as HTMLElement
      ).getAttribute('data-kro-session-pill-visible'),
    ).toBe('false')
  })

  it('auto-presents the conclusion when the countdown reaches zero', async () => {
    const { store } = makeHarness({ anchor: runningAnchor })
    vi.setSystemTime(new Date(START.getTime() + minutesInSeconds(1) * 1_000))
    renderOverlays(store)

    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })

    vi.setSystemTime(new Date(START.getTime() + minutesInSeconds(26) * 1_000))
    await vi.advanceTimersByTimeAsync(1_100)

    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.concluded)
    })
    await waitFor(() => {
      expect(screen.getByText('Session Completed!')).toBeTruthy()
    })
  })

  it('leaves the pill offering Mark complete when the conclusion is dismissed', async () => {
    const { store } = makeHarness({ anchor: runningAnchor })
    vi.setSystemTime(new Date(START.getTime() + minutesInSeconds(1) * 1_000))
    renderOverlays(store)

    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })

    vi.setSystemTime(new Date(START.getTime() + minutesInSeconds(26) * 1_000))
    await vi.advanceTimersByTimeAsync(1_100)
    await waitFor(() => {
      expect(screen.getByText('Session Completed!')).toBeTruthy()
    })

    await userEvent.keyboard('{Escape}')

    await waitFor(() => {
      expect(store.getState().session.isPresentingConclusion).toBe(false)
    })
    // `docs/Features/Session.md` flow 7 — the pill stays, with the checkmark.
    expect(
      screen.getByRole('button', { name: 'Mark task complete' }),
    ).toBeTruthy()
  })

  it('pauses and resumes from the pill without opening anything', async () => {
    const { store } = makeHarness({ anchor: runningAnchor })
    vi.setSystemTime(new Date(START.getTime() + minutesInSeconds(1) * 1_000))
    renderOverlays(store)

    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })

    await userEvent.click(screen.getByRole('button', { name: 'Pause session' }))
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.paused)
    })
    // The sheet stayed shut — the pill is a control, not a shortcut into it.
    expect(
      document.querySelector('[data-kro-session-surface="modal"]'),
    ).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Resume session' }))
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })
  })

  it('closes the endeavor from the pill’s checkmark, and the pill goes away', async () => {
    const { store } = makeHarness({ anchor: runningAnchor })
    vi.setSystemTime(new Date(START.getTime() + minutesInSeconds(1) * 1_000))
    const { container } = renderOverlays(store)

    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })

    vi.setSystemTime(new Date(START.getTime() + minutesInSeconds(26) * 1_000))
    await vi.advanceTimersByTimeAsync(1_100)
    await waitFor(() => {
      expect(screen.getByText('Session Completed!')).toBeTruthy()
    })

    await userEvent.keyboard('{Escape}')
    await waitFor(() => {
      expect(store.getState().session.isPresentingConclusion).toBe(false)
    })

    await userEvent.click(
      screen.getByRole('button', { name: 'Mark task complete' }),
    )
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.ready)
    })
    expect(
      (
        container.querySelector(
          '[data-kro-session-pill-layer]',
        ) as HTMLElement
      ).getAttribute('data-kro-session-pill-visible'),
    ).toBe('false')
  })

  it('silences both surfaces on /execute, which already shows the sheet', async () => {
    const { store } = makeHarness({ anchor: runningAnchor })
    vi.setSystemTime(new Date(START.getTime() + minutesInSeconds(1) * 1_000))
    store.dispatch(
      onDestinationRouteMounted({
        destination: { kind: DestinationKind.session },
      }),
    )
    const { container } = renderOverlays(store)

    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })

    expect(
      (
        container.querySelector(
          '[data-kro-session-pill-layer]',
        ) as HTMLElement
      ).getAttribute('data-kro-session-pill-visible'),
    ).toBe('false')
    expect(
      document.querySelector('[data-kro-session-surface="modal"]'),
    ).toBeNull()
  })
})
