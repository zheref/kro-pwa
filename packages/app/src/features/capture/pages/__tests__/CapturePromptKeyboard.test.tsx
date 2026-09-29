/**
 * Keyboard-only capture, end to end: the mounted Page on the desktop popover,
 * driven by `userEvent.keyboard` alone — no pointer — through the real slice
 * and Producer, asserting what was stored.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installRadixEnvironment } from '../../../../design/system/primitives/__tests__/radixEnvironment'
import {
  FeatureFlags,
  enabledAssignment,
  makeHardcodedFeatureFlagService,
} from '@kro/core'
import { stubbedThunkExtra } from '../../../../library/store'
import {
  onCaptureRouteDelivered,
  userDidPickValue,
  userDidRequestCapture,
} from '../../CaptureFeature'
import { CAPTURE_INBOX_DELAY_MS } from '../../CaptureRules'
import { ActiveToastHost } from '../../../../design/chrome/toast/ActiveToastHost'
import { CaptureOverlays } from '../CaptureOverlays'
import {
  loadCaptureContextThunk,
  setSuggestionsShownThunk,
} from '../../CaptureProducer'
import { makeInMemoryLocalStore } from '../../../../services/localStore/InMemoryLocalStore'
import { CAPTURE_MOCK_NOW } from '../../CaptureMocks'
import { CaptureKind } from '../../CaptureRules'
import { LiquidGlassFABMenu } from '../../../../design/chrome/fab/LiquidGlassFABMenu'
import { CapturePromptPage } from '../CapturePromptPage'
import {
  type CaptureStore,
  CaptureStoreStage,
  desktopSurface,
  installCaptureEnvironment,
  makeCaptureStore,
} from './captureHarness'

let teardownRadix: () => void
let teardownCapture: () => void

beforeEach(() => {
  teardownRadix = installRadixEnvironment()
  teardownCapture = installCaptureEnvironment()
})

afterEach(() => {
  cleanup()
  teardownRadix()
  teardownCapture()
})

/** The web's shipping flags for this suite: the accelerators it exercises. */
const acceleratorFlags = () =>
  makeHardcodedFeatureFlagService({
    base: stubbedThunkExtra.featureFlags,
    overrides: [enabledAssignment(FeatureFlags.keyboardAccelerators)],
  })

const start = async (keyboardAccelerators = true) => {
  const store = makeCaptureStore({
    endeavors: [],
    surface: desktopSurface,
    extra: keyboardAccelerators ? { featureFlags: acceleratorFlags() } : {},
  })
  render(
    <CaptureStoreStage store={store}>
      <CapturePromptPage />
    </CaptureStoreStage>,
  )
  await store.dispatch(loadCaptureContextThunk({ now: CAPTURE_MOCK_NOW }))
  store.dispatch(
    userDidRequestCapture({ kind: CaptureKind.task, now: CAPTURE_MOCK_NOW }),
  )
  const title = await screen.findByTestId('capture-title')
  await waitFor(() => expect(document.activeElement).toBe(title))
  return { store, title }
}

const stored = async (store: CaptureStore) => {
  await waitFor(() => {
    expect(store.getState().capture.endeavors).toHaveLength(1)
  })
  const endeavor = store.getState().capture.endeavors[0]
  if (endeavor === undefined) throw new Error('nothing was captured')
  return endeavor
}

/**
 * Enter a value into the focused native date/time field. jsdom has no
 * segmented date/time editing, so the browser's own keyboard entry is
 * modelled as the change event it produces — still no pointer involved.
 */
const enterNative = (value: string) => {
  const field = document.activeElement
  if (!(field instanceof HTMLInputElement)) throw new Error('no field focused')
  fireEvent.change(field, { target: { value } })
}

const focused = (label: string) =>
  waitFor(() =>
    expect(document.activeElement?.getAttribute('aria-label')).toBe(label),
  )

describe('capturing from the keyboard alone', () => {
  it('builds a Task with every property and adds it with Return', async () => {
    const { store, title } = await start()

    await userEvent.keyboard('Book the flights')

    // ⌥J — the emoji picker; Return picks the focused (first) emoji.
    await userEvent.keyboard('{Alt>}j{/Alt}')
    const firstEmoji = await waitFor(() => {
      const active = document.activeElement
      expect(active?.closest('[data-kro-emoji-picker]')).not.toBeNull()
      return active as HTMLElement
    })
    const emoji = firstEmoji.getAttribute('aria-label')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(document.activeElement).toBe(title))

    await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}') // rewards 30 → 35
    await userEvent.keyboard('{Alt>}v{/Alt}4') // value 4
    await userEvent.keyboard('{Alt>}u{/Alt}3') // 15 min
    expect(document.activeElement).toBe(title)

    await userEvent.keyboard('{Alt>}d{/Alt}')
    await focused('Due date')
    enterNative('2026-03-20')

    await userEvent.keyboard('{Alt>}t{/Alt}')
    await focused('Time')
    enterNative('09:30')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(document.activeElement).toBe(title))

    await userEvent.keyboard('{Alt>}r{/Alt}2') // Daily
    await userEvent.keyboard('{Alt>}h{/Alt}1') // On Device
    await userEvent.keyboard('{Enter}')

    const endeavor = await stored(store)
    expect(endeavor.title).toBe(`${emoji} Book the flights`)
    expect(endeavor.sessionPoints).toBe(35)
    expect(endeavor.value).toBe(4)
    expect(endeavor.duration).toBe(15 * 60)
    expect(endeavor.due).toEqual(new Date(2026, 2, 20, 9, 30))
    expect(endeavor.repeatConfig).not.toBeNull()
    // The emoji popover mounts Radix's popper, which is slow under jsdom and
    // slower still under the full suite's parallel load.
  }, 90_000)

  it('builds an Event with a start and an end', async () => {
    const { store, title } = await start()

    await userEvent.keyboard('{Alt>}3{/Alt}Team sync')
    await userEvent.keyboard('{Alt>}t{/Alt}')
    await focused('Start time')
    enterNative('13:00')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(document.activeElement).toBe(title))
    await userEvent.keyboard('{Alt>}e{/Alt}')
    await focused('End time')
    enterNative('14:30')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(document.activeElement).toBe(title))
    await userEvent.keyboard('{Enter}')

    const endeavor = await stored(store)
    expect(endeavor.title).toBe('Team sync')
    expect(endeavor.start?.getHours()).toBe(13)
    expect(endeavor.duration).toBe(90 * 60)
  }, 30_000)

  it('builds a Habit with its time and a weekly repeat', async () => {
    const { store, title } = await start()

    await userEvent.keyboard('{Alt>}2{/Alt}Stretch')
    await userEvent.keyboard('{Alt>}t{/Alt}')
    await focused('Time')
    enterNative('07:15')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(document.activeElement).toBe(title))
    await userEvent.keyboard('{Alt>}r{/Alt}3') // Weekly
    await userEvent.keyboard('{Enter}')

    const endeavor = await stored(store)
    expect(endeavor.title).toBe('Stretch')
    expect(endeavor.repeatConfig).not.toBeNull()
    expect(endeavor.sessionPoints).toBe(10)
  }, 30_000)
})

describe('Return alone walks the required fields', () => {
  it('Task: title, Return opens Value, 3, Return adds', async () => {
    const { store } = await start()

    await userEvent.keyboard('Buy milk{Enter}')
    expect(store.getState().capture.endeavors).toHaveLength(0)
    await userEvent.keyboard('3{Enter}')

    const endeavor = await stored(store)
    expect(endeavor.title).toBe('Buy milk')
    expect(endeavor.value).toBe(3)
  })

  it('Event: Return walks the start, then the end, then adds', async () => {
    const { store, title } = await start()

    await userEvent.keyboard('{Alt>}3{/Alt}Sync{Enter}')
    await focused('Start time')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(document.activeElement).toBe(title))
    await userEvent.keyboard('{Enter}')
    await focused('End time')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(document.activeElement).toBe(title))
    await userEvent.keyboard('{Enter}')

    const endeavor = await stored(store)
    expect(endeavor.title).toBe('Sync')
    expect(endeavor.start).not.toBeNull()
    expect(endeavor.duration).toBe(3600)
  })

  it('Habit: its seeded time and repeat need no visit — Return adds', async () => {
    const { store } = await start()

    await userEvent.keyboard('{Alt>}2{/Alt}Stretch{Enter}')

    const endeavor = await stored(store)
    expect(endeavor.title).toBe('Stretch')
    expect(endeavor.repeatConfig).not.toBeNull()
  })
})

describe('the page FAB never steals Return from the prompt', () => {
  it('adds the capture and leaves a mounted FAB menu collapsed', async () => {
    const store = makeCaptureStore({ endeavors: [], surface: desktopSurface })
    render(
      <CaptureStoreStage store={store}>
        <LiquidGlassFABMenu
          items={[
            {
              id: 'quick-add',
              label: 'Quick Add',
              glyph: 'plus',
              shortcut: 'a',
              onSelect: () => {},
            },
          ]}
          mainGlyph="bolt.fill"
          mainAccessibilityLabel="Quick action"
        />
        <CapturePromptPage />
      </CaptureStoreStage>,
    )
    store.dispatch(
      userDidRequestCapture({ kind: CaptureKind.habit, now: CAPTURE_MOCK_NOW }),
    )
    const title = await screen.findByTestId('capture-title')
    await waitFor(() => expect(document.activeElement).toBe(title))

    await userEvent.keyboard('Stretch{Enter}')

    await stored(store)
    expect(
      document
        .querySelector('[data-kro-fab-menu]')
        ?.getAttribute('data-kro-fab-menu'),
    ).toBe('collapsed')
  })
})

describe('the suggestions pane, from the keyboard through the real focus path', () => {
  const open = async () => {
    const localStore = makeInMemoryLocalStore({ endeavors: [] })
    const store = makeCaptureStore({
      endeavors: [],
      surface: desktopSurface,
      extra: {
        localStore,
        featureFlags: makeHardcodedFeatureFlagService({
          base: stubbedThunkExtra.featureFlags,
          overrides: [
            enabledAssignment(FeatureFlags.captureSuggestions),
            enabledAssignment(FeatureFlags.keyboardAccelerators),
          ],
        }),
      },
    })
    render(
      <CaptureStoreStage store={store}>
        <CapturePromptPage />
      </CaptureStoreStage>,
    )
    await store.dispatch(loadCaptureContextThunk({ now: CAPTURE_MOCK_NOW }))
    store.dispatch(
      userDidRequestCapture({ kind: CaptureKind.task, now: CAPTURE_MOCK_NOW }),
    )
    const title = await screen.findByTestId('capture-title')
    await waitFor(() => expect(document.activeElement).toBe(title))
    return { store, title, localStore }
  }
  const activeCard = () =>
    document.activeElement?.getAttribute('data-kro-row-pick')

  it('starts hidden; the sparkles button shows it and the choice is remembered', async () => {
    const { store, localStore } = await open()
    expect(screen.queryByTestId('capture-suggestions')).toBeNull()
    const toggle = screen.getByTestId('capture-suggestions-toggle')
    expect(toggle.getAttribute('aria-pressed')).toBe('false')

    await userEvent.click(toggle)
    await screen.findByTestId('capture-suggestions')
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    expect(store.getState().capture.isSuggestionsShown).toBe(true)
    expect(localStore.preferences.get('kro:captureSuggestionsShown')).toBe(true)
  })

  it('⌥S opens a hidden pane and lands on the first card; Esc returns to the title', async () => {
    const { title } = await open()
    await userEvent.keyboard('{Alt>}s{/Alt}')
    await waitFor(() =>
      expect(activeCard()).toBe('task-prepare-presentation-slides'),
    )
    expect(screen.getByTestId('capture-suggestions-keys').textContent).toBe(
      'Arrows move · Return picks · Space selects · esc back',
    )

    await userEvent.keyboard('{ArrowRight}')
    expect(activeCard()).toBe('task-review-pull-request-changes')
    await userEvent.keyboard('{ArrowLeft}')
    expect(activeCard()).toBe('task-prepare-presentation-slides')

    await userEvent.keyboard('{Escape}')
    expect(document.activeElement).toBe(title)
    expect(screen.queryByTestId('capture-prompt')).not.toBeNull()
  })

  it('reaches the cards with ⌥S even with focus on the dialog itself', async () => {
    const { store } = await open()
    await store.dispatch(setSuggestionsShownThunk({ shown: true }))
    await screen.findByTestId('capture-suggestions')
    screen.getByTestId('capture-prompt').focus()
    await userEvent.keyboard('{Alt>}s{/Alt}')
    expect(activeCard()).toBe('task-prepare-presentation-slides')
  })

  it('Space ticks and unticks (⇧Space too); nothing is picked', async () => {
    const { store } = await open()
    await userEvent.keyboard('{Alt>}s{/Alt}')
    await waitFor(() => expect(activeCard()).not.toBeUndefined())
    await userEvent.keyboard(' ')
    expect(store.getState().capture.prompt?.selectedSuggestionIds).toEqual([
      'task-prepare-presentation-slides',
    ])
    expect(store.getState().capture.prompt?.draft.title).toBe('')
    await userEvent.keyboard('{Shift>} {/Shift}')
    expect(store.getState().capture.prompt?.selectedSuggestionIds).toEqual([])
  })

  it('Return picks the focused card into the title; then Return walks to Value, 3, Return adds', async () => {
    const { store, title } = await open()
    await userEvent.keyboard('{Alt>}s{/Alt}')
    await waitFor(() =>
      expect(activeCard()).toBe('task-prepare-presentation-slides'),
    )

    await userEvent.keyboard('{Enter}')
    expect(document.activeElement).toBe(title)
    expect((title as HTMLInputElement).value).toBe(
      'Prepare presentation slides',
    )
    expect(store.getState().capture.endeavors).toHaveLength(0)

    await userEvent.keyboard('{Enter}3{Enter}')
    const endeavor = await stored(store)
    expect(endeavor.title).toBe('📊 Prepare presentation slides')
    expect(endeavor.value).toBe(3)
  })

  it('Space ticks two, ⇧⏎ adds both, closes the prompt and shows both as Just Created in the Inbox', async () => {
    const localStore = makeInMemoryLocalStore({ endeavors: [] })
    localStore.preferences.set('kro:captureSuggestionsShown', true)
    const store = makeCaptureStore({
      endeavors: [],
      surface: desktopSurface,
      extra: {
        localStore,
        featureFlags: makeHardcodedFeatureFlagService({
          base: stubbedThunkExtra.featureFlags,
          overrides: [
            enabledAssignment(FeatureFlags.captureSuggestions),
            enabledAssignment(FeatureFlags.keyboardAccelerators),
          ],
        }),
      },
    })
    render(
      <CaptureStoreStage store={store}>
        <ActiveToastHost position="absolute">
          <CaptureOverlays />
        </ActiveToastHost>
      </CaptureStoreStage>,
    )
    await store.dispatch(loadCaptureContextThunk({ now: CAPTURE_MOCK_NOW }))
    store.dispatch(
      userDidRequestCapture({ kind: CaptureKind.task, now: CAPTURE_MOCK_NOW }),
    )
    await screen.findByTestId('capture-suggestions')

    await userEvent.keyboard('{Alt>}s{/Alt}')
    await waitFor(() => expect(activeCard()).not.toBeUndefined())
    await userEvent.keyboard(' {ArrowDown} ')
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}')

    await waitFor(() => {
      expect(store.getState().capture.endeavors).toHaveLength(2)
    })
    expect(store.getState().capture.prompt).toBeNull()
    const intent = store.getState().capture.navigation
    if (intent === null) throw new Error('a multi-add must decide a route')
    expect(intent.route.kind).toBe('inbox')

    // The shell delivers the route after the prompt's dismiss delay.
    store.dispatch(
      onCaptureRouteDelivered({
        now: new Date(intent.decidedAt.getTime() + CAPTURE_INBOX_DELAY_MS),
      }),
    )
    const inbox = await screen.findByTestId('inbox-surface')
    const justCreated = within(inbox).getByTestId('inbox-section-just-created')
    expect(
      within(justCreated).getByText(/Prepare presentation slides/),
    ).toBeTruthy()
    // jsdom lays out no grid, so ↓ steps one card: the second in the catalogue.
    expect(
      within(justCreated).getByText(/Review pull request changes/),
    ).toBeTruthy()
  })

  it('shows no toggle and no pane with the flag off', async () => {
    await start()
    expect(screen.queryByTestId('capture-suggestions-toggle')).toBeNull()
    expect(screen.queryByTestId('capture-suggestions')).toBeNull()
  })
})

describe('with keyboardAccelerators off — the status quo', () => {
  it('Return on the title still adds a ready capture', async () => {
    const { store } = await start(false)
    await userEvent.keyboard('Book the flights')
    // A Task on this device needs a value; set it the pointer's way.
    store.dispatch(userDidPickValue({ value: 3 }))

    await userEvent.keyboard('{Enter}')

    const endeavor = await stored(store)
    expect(endeavor.title).toContain('Book the flights')
  })

  it('an ⌥ chord does nothing, and no chord is named to assistive tech', async () => {
    const { store } = await start(false)

    await userEvent.keyboard('{Alt>}d{/Alt}')

    expect(store.getState().capture.prompt?.editor).toBeNull()
    expect(document.querySelector('[aria-keyshortcuts*="Alt"]')).toBeNull()
  })

  it('Return on a blocked draft adds nothing and walks nowhere', async () => {
    const { store } = await start(false)

    await userEvent.keyboard('{Enter}')

    expect(store.getState().capture.endeavors).toEqual([])
    expect(store.getState().capture.prompt?.editor).toBeNull()
  })
})
