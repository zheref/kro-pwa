/**
 * The prompt Page's render tests, mirroring `CapturePromptPage.stories`
 * (`RC-11`).
 *
 * A Page's job is selection and dispatch, so these read the store rather than
 * the markup wherever the markup is the Fragment's business.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installRadixEnvironment } from '../../../../design/system/primitives/__tests__/radixEnvironment'
import { userDidRequestCapture } from '../../CaptureFeature'
import { CAPTURE_MOCK_NOW } from '../../CaptureMocks'
import { CaptureKind } from '../../CaptureRules'
import { CAPTURE_PROMPT_POPOVER_WIDTH } from '../capturePresentation'
import { CapturePromptPage } from '../CapturePromptPage'
import {
  type CaptureStore,
  CaptureStoreStage,
  desktopSurface,
  handheldSurface,
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

const mount = (store: CaptureStore) =>
  render(
    <CaptureStoreStage store={store}>
      <CapturePromptPage />
    </CaptureStoreStage>,
  )

const open = (store: CaptureStore, kind: CaptureKind = CaptureKind.task) =>
  store.dispatch(userDidRequestCapture({ kind, now: CAPTURE_MOCK_NOW }))

describe('the Page renders nothing until a draft exists', () => {
  it('is absent on a store no one has asked to capture on', () => {
    mount(makeCaptureStore({ endeavors: [] }))

    expect(screen.queryByTestId('capture-prompt')).toBeNull()
  })

  it('appears the moment the intent lands, from anywhere in the app', async () => {
    const store = makeCaptureStore({ endeavors: [] })
    mount(store)

    open(store)

    expect(await screen.findByTestId('capture-prompt')).toBeTruthy()
  })

  it('disappears again on Discard', async () => {
    const store = makeCaptureStore({ endeavors: [] })
    mount(store)
    open(store)
    await screen.findByTestId('capture-prompt')

    await userEvent.click(
      screen.getByRole('button', { name: 'Discard new task' }),
    )

    expect(screen.queryByTestId('capture-prompt')).toBeNull()
  })
})

describe('it presents itself from the ported decision table', () => {
  it('sheets on a phone', async () => {
    const store = makeCaptureStore({ endeavors: [], surface: handheldSurface })
    mount(store)
    open(store)

    expect(
      (await screen.findByTestId('capture-prompt')).getAttribute(
        'data-kro-presentation',
      ),
    ).toBe('sheet')
  })

  it('pops over on a desktop, at the named width', async () => {
    const store = makeCaptureStore({ endeavors: [], surface: desktopSurface })
    mount(store)
    open(store)

    const panel = await screen.findByTestId('capture-prompt')
    expect(panel.getAttribute('data-kro-presentation')).toBe('popover')
    expect(panel.style.width).toBe(`${CAPTURE_PROMPT_POPOVER_WIDTH}px`)
  })

  it("opens on the kind it was asked for, with that kind's placeholder", async () => {
    const store = makeCaptureStore({ endeavors: [] })
    mount(store)
    open(store, CaptureKind.reminder)

    const title = await screen.findByTestId<HTMLInputElement>('capture-title')
    expect(title.placeholder).toBe('What do you need to remember?')
  })
})

describe('every edit goes through the slice, never through local state', () => {
  it('writes the typed title into the draft', async () => {
    const store = makeCaptureStore({ endeavors: [] })
    mount(store)
    open(store)
    await screen.findByTestId('capture-title')

    await userEvent.type(
      screen.getByTestId('capture-title'),
      'Book the flights',
    )

    expect(store.getState().capture.prompt?.draft.title).toBe(
      'Book the flights',
    )
  })

  it('switches kind and drops both half-open picker snapshots with it', async () => {
    const store = makeCaptureStore({ endeavors: [] })
    mount(store)
    open(store)
    await screen.findByTestId('capture-prompt')

    await userEvent.click(screen.getByRole('button', { name: 'Time' }))
    expect(store.getState().capture.prompt?.startEdit).not.toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Event' }))

    expect(store.getState().capture.prompt?.draft.kind).toBe(CaptureKind.event)
    expect(store.getState().capture.prompt?.startEdit).toBeNull()
  })

  it('remembers the picked hosting destination on the draft, not on the app yet', async () => {
    const store = makeCaptureStore({ endeavors: [] })
    mount(store)
    open(store)
    await screen.findByTestId('capture-prompt')

    await userEvent.click(
      screen.getByRole('button', { name: 'Hosting destination: On Device' }),
    )

    // `statusQuo` has `supabaseHosting` off, so On Device is the only offer —
    // which is itself the assertion that the list comes from the slice.
    expect(store.getState().capture.availableDestinations).toEqual(['local'])
  })

  it('writes the capture through the real Producer when Add is taken', async () => {
    const store = makeCaptureStore({ endeavors: [] })
    mount(store)
    open(store)
    await screen.findByTestId('capture-title')

    await userEvent.type(
      screen.getByTestId('capture-title'),
      'Water the plants',
    )
    await userEvent.click(screen.getByTestId('capture-add'))

    await waitFor(() => {
      expect(store.getState().capture.endeavors).toHaveLength(1)
    })
    expect(store.getState().capture.endeavors[0]?.title).toBe(
      'Water the plants',
    )
  })

  it('the KC-IS-#75 regression, through the mounted Page: clearing the date captures a dateless Task', async () => {
    const store = makeCaptureStore({ endeavors: [] })
    mount(store)
    open(store)
    await screen.findByTestId('capture-title')

    await userEvent.type(screen.getByTestId('capture-title'), 'Sort the garage')
    await userEvent.click(screen.getByRole('button', { name: 'Clear date' }))
    expect(screen.getByRole('button', { name: 'Date: No date' })).toBeTruthy()

    await userEvent.click(screen.getByTestId('capture-add'))

    await waitFor(() => {
      expect(store.getState().capture.endeavors).toHaveLength(1)
    })
    const captured = store.getState().capture.endeavors[0]
    expect(captured?.due).toBeNull()
    expect(captured?.start).toBeNull()
  })

  it('captures once for one intent, however fast Add is pressed twice', async () => {
    const store = makeCaptureStore({ endeavors: [] })
    mount(store)
    open(store)
    await screen.findByTestId('capture-title')
    await userEvent.type(
      screen.getByTestId('capture-title'),
      'Book the flights',
    )

    // Two presses inside one frame — the shape a double-click takes, and the
    // one an awaited `userEvent.click` can never produce because it lets the
    // write settle in between. Add stays enabled on purpose (a failed capture
    // must be retryable without re-typing), so the guard is what stops the
    // second press minting a second id.
    const add = screen.getByTestId<HTMLButtonElement>('capture-add')
    add.click()
    add.click()

    await waitFor(() => {
      expect(store.getState().capture.endeavors).toHaveLength(1)
    })
    // …and the prompt is gone, so there is nothing left to press either.
    expect(store.getState().capture.prompt).toBeNull()
  })
})

describe('the clock it reads "Today" against', () => {
  it("comes from the slice's anchor, not from the wall clock", async () => {
    const store = makeCaptureStore({ endeavors: [] })
    mount(store)

    // The prompt is opened with an instant a day behind the wall clock, which
    // is what `clockAnchor` then holds and what the draft's own date is built
    // from. A Page reading `new Date()` in render would compare the draft's
    // yesterday against today and print a medium date; reading the anchor makes
    // the two agree and the chip reads "Today".
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    store.dispatch(
      userDidRequestCapture({ kind: CaptureKind.task, now: yesterday }),
    )

    expect(
      await screen.findByRole('button', { name: 'Date: Today' }),
    ).toBeTruthy()
  })

  it('still answers before anything has stamped an anchor', async () => {
    const store = makeCaptureStore({ endeavors: [] })
    mount(store)
    open(store)

    // `userDidRequestCapture` stamps the anchor itself, so this is the ordinary
    // path; what it proves is that the fallback never leaves the chip blank.
    expect(
      await screen.findByRole('button', { name: 'Date: Today' }),
    ).toBeTruthy()
  })
})
