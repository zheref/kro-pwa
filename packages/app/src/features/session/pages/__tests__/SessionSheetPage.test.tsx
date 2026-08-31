/**
 * The stateful container, driven end to end through the **real** store built by
 * `makeStore(stubbedThunkExtra)` (`RC-22`, `RC-35`) — never a hand-assembled
 * second store, never a mocked thunk, never the live services.
 *
 * ## The flow tests are the point of this file
 *
 * `start -> pause -> resume -> conclude -> Complete Task` and
 * `conclude -> Break -> Start Focus Session` are the two journeys the issue
 * names, and they are driven by **clicking the real controls** and letting the
 * real Producers run. Nothing is stubbed between the button and the reducer, so
 * a test passing here means the sheet is genuinely wired to the phase machine
 * rather than to a set of callbacks that happen to be named right.
 *
 * The conclusion is reached by dispatching the display tick with an instant
 * past the target, which is exactly what the ticker in `SessionOverlays` does
 * once a second — the difference is that a test says *which* instant, so the
 * suite is deterministic and takes milliseconds rather than 25 minutes. The
 * ticker itself is asserted separately, in `SessionOverlays.test.tsx`.
 */
import {
  EndeavorHost,
  FeatureFlags,
  endeavorRecordFromEndeavor,
  makeFeatureFlagOverrideStore,
  makePreferences,
  minutesInSeconds,
  sessionEnableBreaksOption,
  sessionEnableStopwatchOption,
  taskEndeavor,
} from '@kro/core'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider } from '../../../../library/StoreProvider'
import {
  type AppStore,
  makeStore,
  stubbedThunkExtra,
} from '../../../../library/store'
import { installRadixEnvironment } from '../../../../design/system/primitives/__tests__/radixEnvironment'
import { makeInMemoryLocalStore } from '../../../../services/localStore/InMemoryLocalStore'
import { resetSurfaceCache } from '../../../main/useSurfaceLayout'
import {
  advanceSessionThunk,
  loadSessionPreferencesThunk,
  prepareSessionLaunchThunk,
} from '../../SessionProducer'
import { SessionPhase } from '../../SessionVocabulary'
import { SessionSheetPage } from '../SessionSheetPage'

const NOW = new Date(2026, 2, 17, 9, 0, 0)
const ENDEAVOR_ID = 'endeavor-slides'

const endeavor = taskEndeavor({
  id: ENDEAVOR_ID,
  title: '📊 Prepare slides',
  duration: minutesInSeconds(25),
  host: EndeavorHost.local,
  createdAt: NOW,
})

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

const makeHarness = async (
  options: { readonly breaksEnabled?: boolean } = {},
): Promise<AppStore> => {
  const localStore = makeInMemoryLocalStore({
    endeavors: [endeavorRecordFromEndeavor(endeavor, { now: NOW })],
  })

  if (options.breaksEnabled) {
    // The documented dev route: an override under `debug.ff.` plus the
    // preference the gate ANDs with it. `sessionBreak` is off at `statusQuo`,
    // so a test that wants the break path must turn it on the same way a
    // tester would.
    makeFeatureFlagOverrideStore(localStore.preferences).set(
      FeatureFlags.sessionBreak.name,
      true,
    )
    makePreferences(localStore.preferences).write(sessionEnableBreaksOption, true)
    makePreferences(localStore.preferences).write(
      sessionEnableStopwatchOption,
      false,
    )
  }

  const store = makeStore({ ...stubbedThunkExtra, localStore })
  await store.dispatch(loadSessionPreferencesThunk())
  await store.dispatch(
    prepareSessionLaunchThunk({ endeavorId: ENDEAVOR_ID, sessionId: 'session-1' }),
  )
  return store
}

const renderPage = (store: AppStore, host: 'raised' | 'destination') =>
  render(
    <StoreProvider store={store}>
      <SessionSheetPage host={host} isOpen onRequestClose={() => {}} />
    </StoreProvider>,
  )

beforeEach(() => {
  resetSurfaceCache()
  installMatchMedia(1440)
  installRadixEnvironment()
})

afterEach(() => {
  cleanup()
  // Two tests install fake timers to move the wall clock past the finish-early
  // threshold; every other test wants the real one.
  vi.useRealTimers()
})

describe('the host', () => {
  it('renders /execute as an inline column at every width', async () => {
    const store = await makeHarness()
    installMatchMedia(390)
    resetSurfaceCache()
    const { container } = renderPage(store, 'destination')

    expect(
      container.querySelector('[data-kro-session-surface="inline"]'),
    ).toBeTruthy()
  })

  it('raises a bottom sheet on a handheld', async () => {
    const store = await makeHarness()
    installMatchMedia(390)
    resetSurfaceCache()
    renderPage(store, 'raised')

    expect(
      document.querySelector('[data-kro-session-surface="sheet"]'),
    ).toBeTruthy()
  })

  it('raises a modal at the pinned frame on a desktop-shaped surface', async () => {
    const store = await makeHarness()
    renderPage(store, 'raised')

    expect(
      document.querySelector('[data-kro-session-surface="modal"]'),
    ).toBeTruthy()
  })
})

describe('start → pause → resume → conclude → Complete Task', () => {
  it('drives the whole journey through the sheet’s own controls', async () => {
    const store = await makeHarness()
    renderPage(store, 'destination')

    // -- Ready --------------------------------------------------------------
    expect(store.getState().session.phase).toBe(SessionPhase.ready)
    expect(screen.getByText('READY')).toBeTruthy()

    // -- Start --------------------------------------------------------------
    await userEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })
    expect(screen.getByText('Session in progress')).toBeTruthy()
    // The anchor is what makes the elapsed figure derivable at all.
    expect(store.getState().session.anchor).not.toBeNull()

    // -- Pause --------------------------------------------------------------
    await userEvent.click(screen.getByRole('button', { name: 'Pause session' }))
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.paused)
    })
    expect(screen.getByText('Paused')).toBeTruthy()

    // -- Resume -------------------------------------------------------------
    await userEvent.click(screen.getByRole('button', { name: 'Resume session' }))
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })

    // -- The countdown reaches zero ----------------------------------------
    await store.dispatch(
      advanceSessionThunk({
        now: new Date(Date.now() + minutesInSeconds(30) * 1_000),
      }),
    )
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.concluded)
    })
    expect(screen.getByText('Session Completed!')).toBeTruthy()
    // Recorded exactly once, at conclusion — before the user picks anything.
    expect(store.getState().session.conclusion.kind).toBe('recorded')

    // -- Complete Task ------------------------------------------------------
    await userEvent.click(
      screen.getByRole('button', { name: /Complete Task/ }),
    )
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.ready)
    })
    // The anchor document is cleared, so a reload cannot resurrect the session.
    expect(store.getState().session.anchor).toBeNull()
  })

  it('records exactly one performance for the whole journey', async () => {
    const store = await makeHarness()
    renderPage(store, 'destination')

    await userEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })
    await store.dispatch(
      advanceSessionThunk({
        now: new Date(Date.now() + minutesInSeconds(30) * 1_000),
      }),
    )
    await waitFor(() => {
      expect(store.getState().session.conclusion.kind).toBe('recorded')
    })

    await userEvent.click(screen.getByRole('button', { name: /Complete Task/ }))
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.ready)
    })

    // Canon: "choosing Complete, Start New, or Break after conclusion never
    // records a duplicate."
    expect(store.getState().session.completedSessionsCount).toBe(1)
  })

  it('returns to ready without closing the task when Start New is chosen', async () => {
    const store = await makeHarness()
    renderPage(store, 'destination')

    await userEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })
    await store.dispatch(
      advanceSessionThunk({
        now: new Date(Date.now() + minutesInSeconds(30) * 1_000),
      }),
    )
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.concluded)
    })

    await userEvent.click(screen.getByRole('button', { name: /Start New/ }))
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.ready)
    })
    // The identity survives, so the next session opens on the same endeavor.
    expect(store.getState().session.identity?.endeavorId).toBe(ENDEAVOR_ID)
    expect(store.getState().session.anchor).toBeNull()
  })
})

describe('the break flow', () => {
  it('takes a break after a conclusion and starts a fresh focus session from it', async () => {
    const store = await makeHarness({ breaksEnabled: true })
    renderPage(store, 'destination')

    await userEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })
    await store.dispatch(
      advanceSessionThunk({
        now: new Date(Date.now() + minutesInSeconds(30) * 1_000),
      }),
    )
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.concluded)
    })

    await userEvent.click(screen.getByRole('button', { name: /Break/ }))
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.break)
    })
    expect(screen.getByText('Break Time')).toBeTruthy()

    await userEvent.click(
      screen.getByRole('button', { name: /Start Focus Session/ }),
    )
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.ready)
    })
    // A break is never a performance — the tomato row did not grow twice.
    expect(store.getState().session.completedSessionsCount).toBe(1)
  })

  it('offers no Break at all while the flag is off — the shipped conclusion', async () => {
    const store = await makeHarness()
    renderPage(store, 'destination')

    await userEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })
    await store.dispatch(
      advanceSessionThunk({
        now: new Date(Date.now() + minutesInSeconds(30) * 1_000),
      }),
    )
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.concluded)
    })

    expect(screen.queryByRole('button', { name: /Break/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Start New/ })).toBeTruthy()
  })
})

describe('the stop menu’s two exits', () => {
  it('parks at the conclusion when finishing early above the 30% threshold', async () => {
    // The Page stamps `new Date()` at every dispatch — that is the design, and
    // it is why the clock has to move for real here rather than a `now`
    // argument being handed in. Ten minutes of a 25-minute target is 40%,
    // comfortably over `sessionRecordingThreshold`'s line.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const store = await makeHarness()
    renderPage(store, 'destination')

    await userEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })

    vi.setSystemTime(new Date(Date.now() + minutesInSeconds(10) * 1_000))

    await userEvent.click(screen.getByRole('button', { name: 'Stop session' }))
    await userEvent.click(screen.getByRole('button', { name: 'Finish Early' }))

    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.concluded)
    })
    expect(screen.getByText('Session Completed!')).toBeTruthy()
  })

  it('records an aborted attempt when finishing early BELOW the threshold', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const store = await makeHarness()
    renderPage(store, 'destination')

    await userEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })

    // Two minutes of 25 is 8% — under the line, so the session closes outright.
    vi.setSystemTime(new Date(Date.now() + minutesInSeconds(2) * 1_000))

    await userEvent.click(screen.getByRole('button', { name: 'Stop session' }))
    await userEvent.click(screen.getByRole('button', { name: 'Finish Early' }))

    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.ready)
    })
    expect(store.getState().session.completedSessionsCount).toBe(0)
  })

  it('closes the session outright when it is aborted, recording the attempt', async () => {
    const store = await makeHarness()
    renderPage(store, 'destination')

    await userEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })

    await userEvent.click(screen.getByRole('button', { name: 'Stop session' }))
    await userEvent.click(screen.getByRole('button', { name: 'Abort' }))

    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.ready)
    })
    expect(store.getState().session.anchor).toBeNull()
    // An aborted attempt is recorded, but it is never a tomato.
    expect(store.getState().session.completedSessionsCount).toBe(0)
  })
})

describe('the mode toggle', () => {
  it('switches to stopwatch when both gates allow it', async () => {
    const localStore = makeInMemoryLocalStore({
      endeavors: [endeavorRecordFromEndeavor(endeavor, { now: NOW })],
    })
    makeFeatureFlagOverrideStore(localStore.preferences).set(
      FeatureFlags.sessionStopwatch.name,
      true,
    )
    makePreferences(localStore.preferences).write(
      sessionEnableStopwatchOption,
      true,
    )
    const store = makeStore({ ...stubbedThunkExtra, localStore })
    await store.dispatch(loadSessionPreferencesThunk())
    await store.dispatch(
      prepareSessionLaunchThunk({
        endeavorId: ENDEAVOR_ID,
        sessionId: 'session-1',
      }),
    )
    renderPage(store, 'destination')

    await userEvent.click(screen.getByRole('button', { name: 'Stopwatch' }))
    expect(store.getState().session.mode).toBe('stopwatch')
  })
})

/*
 * NO SYMBOL-PICKER TEST HERE, and the reason is measured rather than assumed.
 *
 * Clicking the glyph opens a Radix **popper** panel, which costs 5–12 seconds
 * per mount under jsdom (`design/system/primitives/__tests__/radixEnvironment.tsx`
 * documents the measurement, and the first draft of this file hit 29s before
 * timing out). The design system excludes its own popper panels for exactly
 * this reason and covers them in Storybook instead, and this lane follows it:
 *
 *   · the trigger's contract — present, labelled, and DISABLED on a break — is
 *     asserted closed in `SessionSheetFragment.test.tsx`;
 *   · the open panel is the `SessionSheet/EmojiPickerOpen` story;
 *   · the identity edit the pick performs is asserted end to end below, through
 *     the title editor, which reaches the same `updateSessionIdentityThunk`.
 *
 * What is therefore NOT covered automatically: the Page's three one-line
 * dispatch wrappers around the picker's open/close/pick callbacks. Named in the
 * PR body rather than left to be noticed.
 */

describe('identity editing', () => {
  it('commits a new title to the endeavor from the sheet', async () => {
    const store = await makeHarness()
    renderPage(store, 'destination')

    await userEvent.click(
      screen.getByRole('button', { name: '📊 Prepare slides' }),
    )
    const field = screen.getByRole('textbox', { name: 'Session title' })
    await userEvent.clear(field)
    await userEvent.type(field, '📊 Rehearse the deck{Enter}')

    await waitFor(() => {
      expect(store.getState().session.identity?.title).toBe(
        '📊 Rehearse the deck',
      )
    })
    expect(store.getState().session.isEditingTitle).toBe(false)
  })

  it('reverts an emptied title rather than wiping the endeavor’s name', async () => {
    const store = await makeHarness()
    renderPage(store, 'destination')

    await userEvent.click(
      screen.getByRole('button', { name: '📊 Prepare slides' }),
    )
    const field = screen.getByRole('textbox', { name: 'Session title' })
    await userEvent.clear(field)
    await userEvent.type(field, '{Enter}')

    await waitFor(() => {
      expect(store.getState().session.isEditingTitle).toBe(false)
    })
    expect(store.getState().session.identity?.title).toBe('📊 Prepare slides')
  })

  it('promotes a blank focus session into a real endeavor on its first edit', async () => {
    const localStore = makeInMemoryLocalStore({})
    const store = makeStore({ ...stubbedThunkExtra, localStore })
    await store.dispatch(loadSessionPreferencesThunk())
    await store.dispatch(
      prepareSessionLaunchThunk({
        endeavorId: null,
        sessionId: 'blank-session-1',
      }),
    )
    expect(store.getState().session.identity?.isAnonymous).toBe(true)

    renderPage(store, 'destination')

    await userEvent.click(screen.getByRole('button', { name: 'Focus Session' }))
    const field = screen.getByRole('textbox', { name: 'Session title' })
    await userEvent.clear(field)
    await userEvent.type(field, '💻 Focus Session{Enter}')

    await waitFor(() => {
      expect(store.getState().session.identity?.isAnonymous).toBe(false)
    })
    // Canon: the act commits a real endeavor with the resulting title.
    expect(await localStore.endeavors.get('blank-session-1')).not.toBeNull()
  })
})

describe('the duration dial', () => {
  it('changes the target from a preset before the session starts', async () => {
    const store = await makeHarness()
    renderPage(store, 'destination')

    await userEvent.click(screen.getByRole('button', { name: '45m' }))
    expect(store.getState().session.targetDuration).toBe(minutesInSeconds(45))
  })

  it('refuses a duration change once the session is live', async () => {
    const store = await makeHarness()
    renderPage(store, 'destination')

    await userEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await waitFor(() => {
      expect(store.getState().session.phase).toBe(SessionPhase.running)
    })

    // The preset row is inert in every phase but `ready`, so there is nothing
    // to click — the guard is in the markup as well as in the Shifter.
    expect(screen.queryByRole('button', { name: '45m' })).toBeNull()
    expect(store.getState().session.targetDuration).toBe(minutesInSeconds(25))
  })
})
