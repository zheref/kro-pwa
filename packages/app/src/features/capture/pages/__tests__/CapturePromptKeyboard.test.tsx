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
import { userDidRequestCapture } from '../../CaptureFeature'
import { loadCaptureContextThunk } from '../../CaptureProducer'
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

const start = async () => {
  const store = makeCaptureStore({ endeavors: [], surface: desktopSurface })
  render(
    <CaptureStoreStage store={store}>
      <CapturePromptPage />
    </CaptureStoreStage>,
  )
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
  }, 30_000)

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

describe('the suggestions pane from the keyboard', () => {
  const startWithSuggestions = async () => {
    const store = makeCaptureStore({
      endeavors: [],
      surface: desktopSurface,
      extra: {
        featureFlags: makeHardcodedFeatureFlagService({
          base: stubbedThunkExtra.featureFlags,
          overrides: [enabledAssignment(FeatureFlags.captureSuggestions)],
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
    await screen.findByTestId('capture-suggestions')
    return { store, title }
  }

  it('⌥S, Space picks a card, then Return walks to Value, 3, Return adds it', async () => {
    const { store, title } = await startWithSuggestions()

    await userEvent.keyboard('{Alt>}s{/Alt}')
    await waitFor(() =>
      expect(document.activeElement?.getAttribute('data-kro-row-pick')).toBe(
        'task-prepare-presentation-slides',
      ),
    )
    await userEvent.keyboard(' ')
    await waitFor(() => expect(document.activeElement).toBe(title))
    expect((title as HTMLInputElement).value).toBe(
      'Prepare presentation slides',
    )

    await userEvent.keyboard('{Enter}3{Enter}')

    const endeavor = await stored(store)
    expect(endeavor.title).toBe('📊 Prepare presentation slides')
    expect(endeavor.sessionPoints).toBe(30)
    expect(endeavor.value).toBe(3)
  })

  it('⇧Space ticks two cards and ⇧⏎ adds both to the Inbox, prompt still open', async () => {
    const { store } = await startWithSuggestions()

    await userEvent.keyboard('{Alt>}s{/Alt}')
    await waitFor(() =>
      expect(document.activeElement?.hasAttribute('data-kro-row-pick')).toBe(
        true,
      ),
    )
    await userEvent.keyboard('{Shift>} {/Shift}{ArrowDown}{Shift>} {/Shift}')
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}')

    await waitFor(() => {
      expect(store.getState().capture.endeavors).toHaveLength(2)
    })
    const rows = store.getState().capture.endeavors
    expect(rows.every((row) => row.due === null && row.start === null)).toBe(
      true,
    )
    expect(store.getState().capture.prompt).not.toBeNull()
    expect(screen.getByTestId('capture-blocked-reason').textContent).toBe(
      'Added 2 to Inbox.',
    )
  })

  it('shows no pane with the flag off', async () => {
    await start()
    expect(screen.queryByTestId('capture-suggestions')).toBeNull()
  })
})
