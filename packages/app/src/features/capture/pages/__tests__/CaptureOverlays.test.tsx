/**
 * The two flows KC-IS-#24 names as interaction tests, driven through the real
 * composition: capture -> route, and add-for-today -> undo.
 *
 * Nothing is stubbed except the boundary the architecture already stubs — the
 * `LocalStore`, injected through `ThunkExtra`. The prompt is typed into, Add is
 * clicked, the real Producer writes, the real Shifters classify, and the
 * assertions read the store the browser would read.
 */
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ActiveToastHost } from '../../../../design/chrome/toast/ActiveToastHost'
import { installRadixEnvironment } from '../../../../design/system/primitives/__tests__/radixEnvironment'
import {
  onCaptureRouteDelivered,
  userDidTapOpenInbox,
} from '../../CaptureFeature'
import { captureFixtureRecords } from '../../CaptureMocks'
import { CAPTURE_INBOX_DELAY_MS } from '../../CaptureRules'
import { CaptureOverlays } from '../CaptureOverlays'
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

/**
 * The shell, as far as these overlays can tell: the store, and the one Active
 * Toast host `MainShellPage` mounts around everything (KC-IS-#71 item 15).
 * `CaptureOverlays` used to mount that host itself, which is why this stage did
 * not need one.
 */
const mount = (store: CaptureStore) =>
  render(
    <CaptureStoreStage store={store}>
      <ActiveToastHost position="absolute">
        <CaptureOverlays />
      </ActiveToastHost>
    </CaptureStoreStage>,
  )

/** Walks the user through the disc, the title field and Add. */
const captureTitled = async (title: string, kind = 'Task') => {
  await userEvent.click(screen.getByRole('button', { name: 'Quick add' }))
  if (kind !== 'Task') {
    await userEvent.click(screen.getByRole('button', { name: kind }))
  }
  await userEvent.type(screen.getByTestId('capture-title'), title)
  await userEvent.click(screen.getByTestId('capture-add'))
}

describe('capture -> route (acceptance criterion 3, first half)', () => {
  it('routes a captured Task to the Inbox and opens it with its Just Created row', async () => {
    const store = makeCaptureStore({ endeavors: [], surface: handheldSurface })
    mount(store)

    await captureTitled('Book the flights')

    await waitFor(() => {
      expect(store.getState().capture.navigation?.route.kind).toBe('inbox')
    })
    // The wait is the behaviour, so the shell's delivery is simulated at the
    // deadline the slice itself computed rather than by sleeping.
    const decidedAt = store.getState().capture.navigation?.decidedAt as Date
    store.dispatch(
      onCaptureRouteDelivered({
        now: new Date(decidedAt.getTime() + CAPTURE_INBOX_DELAY_MS),
      }),
    )

    const created = await screen.findByTestId('inbox-section-just-created')
    expect(within(created).getByText('Book the flights')).toBeTruthy()
    expect(store.getState().capture.prompt).toBeNull()
  })

  it('routes a captured Event to Plan instead, and never opens the Inbox for it', async () => {
    const store = makeCaptureStore({ endeavors: [], surface: handheldSurface })
    mount(store)

    await userEvent.click(screen.getByRole('button', { name: 'Quick add' }))
    await userEvent.click(screen.getByRole('button', { name: 'Event' }))
    await userEvent.type(screen.getByTestId('capture-title'), 'Design review')
    // Canon's stricter kind: an event needs both a start and an end before Add
    // is even enabled, so the two chips are opened and confirmed here.
    await userEvent.click(screen.getByRole('button', { name: 'Start time' }))
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    await userEvent.click(screen.getByRole('button', { name: 'End time' }))
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    await userEvent.click(screen.getByTestId('capture-add'))

    await waitFor(() => {
      expect(store.getState().capture.navigation?.route.kind).toBe('plan')
    })
    expect(store.getState().capture.inbox.isOpen).toBe(false)
    expect(screen.queryByTestId('inbox-surface')).toBeNull()
  })

  it('refuses to submit an Event that is missing a time, and says which one', async () => {
    const store = makeCaptureStore({ endeavors: [], surface: handheldSurface })
    mount(store)

    await userEvent.click(screen.getByRole('button', { name: 'Quick add' }))
    await userEvent.click(screen.getByRole('button', { name: 'Event' }))
    await userEvent.type(screen.getByTestId('capture-title'), 'Design review')

    expect(screen.getByTestId<HTMLButtonElement>('capture-add').disabled).toBe(
      true,
    )
    expect(screen.getByTestId('capture-blocked-reason').textContent).toBe(
      'Pick a start time and an end time to add this event.',
    )
    expect(store.getState().capture.endeavors).toHaveLength(0)
  })

  it('drops the draft whole on Discard, exactly as canon does', async () => {
    const store = makeCaptureStore({ endeavors: [], surface: handheldSurface })
    mount(store)

    await userEvent.click(screen.getByRole('button', { name: 'Quick add' }))
    await userEvent.type(screen.getByTestId('capture-title'), 'Never mind')
    await userEvent.click(
      screen.getByRole('button', { name: 'Discard new task' }),
    )

    expect(store.getState().capture.prompt).toBeNull()
    expect(store.getState().capture.endeavors).toHaveLength(0)
    expect(screen.queryByTestId('capture-prompt')).toBeNull()
  })
})

describe('add for today -> undo (acceptance criterion 3, second half)', () => {
  const openInboxWithRows = async (store: CaptureStore) => {
    mount(store)
    await waitFor(() => {
      expect(store.getState().capture.load.kind).toBe('loaded')
    })
    store.dispatch(userDidTapOpenInbox())
    return screen.findByTestId('inbox-surface')
  }

  it('pre-fills the next quarter-hour slot, schedules, and raises an Undo toast', async () => {
    const store = makeCaptureStore({
      endeavors: captureFixtureRecords(),
      surface: desktopSurface,
    })
    await openInboxWithRows(store)

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Add Draft the announcement for today',
      }),
    )
    const picked = store.getState().capture.addForToday?.pickedTime as Date
    expect(picked.getMinutes() % 15).toBe(0)

    await userEvent.click(screen.getByRole('button', { name: 'Schedule' }))

    await waitFor(() => {
      expect(store.getState().capture.undo.kind).toBe('armed')
    })
    // Canon's copy, quotes included, with the slot named in the user's locale.
    // The host prints it twice on purpose — once drawn, once into its live
    // region — so the assertion is on the set, not on a single node.
    expect(
      (await screen.findAllByText(/"Draft the announcement" scheduled for /))
        .length,
    ).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy()
    // Canon dismisses the sheet and routes to Plan in the same step.
    expect(store.getState().capture.inbox.isOpen).toBe(false)
    expect(store.getState().capture.navigation?.route.kind).toBe('plan')
  })

  it('puts the row back exactly as it was when Undo is taken', async () => {
    const store = makeCaptureStore({
      endeavors: captureFixtureRecords(),
      surface: desktopSurface,
    })
    await openInboxWithRows(store)

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Add Draft the announcement for today',
      }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Schedule' }))
    await waitFor(() => {
      expect(store.getState().capture.undo.kind).toBe('armed')
    })

    const scheduled = store
      .getState()
      .capture.endeavors.find((endeavor) => endeavor.id === 'fresh-task')
    expect(scheduled?.due).not.toBeNull()

    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))

    await waitFor(() => {
      expect(store.getState().capture.undo.kind).toBe('undone')
    })
    const restored = store
      .getState()
      .capture.endeavors.find((endeavor) => endeavor.id === 'fresh-task')
    expect(restored?.due).toBeNull()
    // The audit entry the scheduling appended goes with it, or the row would
    // claim it had been deferred to a slot it was never on.
    expect(restored?.defers).toHaveLength(0)
  })

  it('does nothing on a second Undo, because the window is already spent', async () => {
    const store = makeCaptureStore({
      endeavors: captureFixtureRecords(),
      surface: desktopSurface,
    })
    await openInboxWithRows(store)

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Add Draft the announcement for today',
      }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Schedule' }))
    await waitFor(() => {
      expect(store.getState().capture.undo.kind).toBe('armed')
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(() => {
      expect(store.getState().capture.undo.kind).toBe('undone')
    })

    // The toast goes with the window, so there is nothing left to press.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
    })
    expect(store.getState().capture.undo.kind).toBe('undone')
  })

  it('cancels without touching the row', async () => {
    const store = makeCaptureStore({
      endeavors: captureFixtureRecords(),
      surface: desktopSurface,
    })
    await openInboxWithRows(store)

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Add Draft the announcement for today',
      }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(store.getState().capture.addForToday).toBeNull()
    expect(store.getState().capture.undo.kind).toBe('idle')
    expect(
      store.getState().capture.endeavors.find((e) => e.id === 'fresh-task')
        ?.due,
    ).toBeNull()
  })
})
