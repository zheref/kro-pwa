/**
 * The Inbox's stateful wrapper.
 *
 * Exercised through a probe component rather than a renderer-less hook harness,
 * because what is under test is the view model both Pages read — the sections,
 * the row layout, the clock the rows are classified against, and the fact that
 * every callback goes to the slice.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { userDidTapOpenInbox } from '../../CaptureFeature'
import { captureFixtureRecords } from '../../CaptureMocks'
import { loadCaptureContextThunk } from '../../CaptureProducer'
import { useInboxSurface } from '../useInboxSurface'
import {
  type CaptureStore,
  CaptureStoreStage,
  desktopSurface,
  handheldSurface,
  installCaptureEnvironment,
  makeCaptureStore,
} from './captureHarness'

let teardownCapture: () => void

beforeEach(() => {
  teardownCapture = installCaptureEnvironment()
})

afterEach(() => {
  cleanup()
  teardownCapture()
})

/** Prints the view model so a test can read it without a renderer harness. */
function Probe() {
  const inbox = useInboxSurface()
  return (
    <dl>
      <dt>rowLayout</dt>
      <dd data-testid="rowLayout">{inbox.rowLayout}</dd>
      <dt>totalCount</dt>
      <dd data-testid="totalCount">{inbox.totalCount}</dd>
      <dt>isEmpty</dt>
      <dd data-testid="isEmpty">{String(inbox.isEmpty)}</dd>
      <dt>isOpen</dt>
      <dd data-testid="isOpen">{String(inbox.isOpen)}</dd>
      <dt>pending</dt>
      <dd data-testid="pending">
        {inbox.pendingTriage.map((card) => card.title).join('|')}
      </dd>
      <dt>capabilities</dt>
      <dd data-testid="capabilities">
        {inbox.capabilities.operations
          .map((binding) => binding.operation)
          .join('|')}
      </dd>
      <button type="button" onClick={() => inbox.onTapTriage('fresh-task')}>
        triage
      </button>
      <button
        type="button"
        onClick={() => inbox.onRequestAddForToday('fresh-task')}
      >
        add
      </button>
    </dl>
  )
}

const mount = (store: CaptureStore) =>
  render(
    <CaptureStoreStage store={store}>
      <Probe />
    </CaptureStoreStage>,
  )

describe('the view model', () => {
  it('reads the row layout off the ported decision table', () => {
    const { unmount } = mount(
      makeCaptureStore({ endeavors: [], surface: desktopSurface }),
    )
    expect(screen.getByTestId('rowLayout').textContent).toBe('compactDesktop')
    unmount()

    mount(makeCaptureStore({ endeavors: [], surface: handheldSurface }))
    expect(screen.getByTestId('rowLayout').textContent).toBe('comfortable')
  })

  it('reports an empty tray on a store with nothing in it', () => {
    mount(makeCaptureStore({ endeavors: [] }))

    expect(screen.getByTestId('isEmpty').textContent).toBe('true')
    expect(screen.getByTestId('totalCount').textContent).toBe('0')
  })

  it("carries the Inbox vista's own operations, never a hand-written pair", () => {
    mount(makeCaptureStore({ endeavors: [] }))

    expect(screen.getByTestId('capabilities').textContent).toBe(
      'markComplete|delete',
    )
  })

  it('follows the slice when the Inbox opens', async () => {
    const store = makeCaptureStore({ endeavors: [] })
    mount(store)
    expect(screen.getByTestId('isOpen').textContent).toBe('false')

    store.dispatch(userDidTapOpenInbox())

    await waitFor(() => {
      expect(screen.getByTestId('isOpen').textContent).toBe('true')
    })
  })
})

describe('the intents it raises', () => {
  it("seeds a Triage request with today's first free gap, computed at the tap", async () => {
    const store = makeCaptureStore({ endeavors: captureFixtureRecords() })
    mount(store)
    // The probe is not a Page, so nothing loads the pool for it — and a row id
    // means nothing until it has landed. The Pages do this on mount.
    await store.dispatch(loadCaptureContextThunk({ now: new Date() }))
    await waitFor(() => {
      expect(store.getState().capture.load.kind).toBe('loaded')
    })

    screen.getByRole('button', { name: 'triage' }).click()

    const request = store.getState().capture.triageRequest
    expect(request?.endeavorId).toBe('fresh-task')
    expect((request?.nextFreeSlotToday.getMinutes() ?? 1) % 15).toBe(0)
  })

  it('opens Add for Today on the row that asked, pre-filled by the slice', async () => {
    const store = makeCaptureStore({ endeavors: captureFixtureRecords() })
    mount(store)
    await store.dispatch(loadCaptureContextThunk({ now: new Date() }))
    await waitFor(() => {
      expect(store.getState().capture.load.kind).toBe('loaded')
    })

    screen.getByRole('button', { name: 'add' }).click()

    expect(store.getState().capture.addForToday?.endeavorId).toBe('fresh-task')
    expect(
      (store.getState().capture.addForToday?.pickedTime.getMinutes() ?? 1) % 15,
    ).toBe(0)
  })

  it('is a no-op on a row the pool does not hold — a stale tap opens nothing', () => {
    const store = makeCaptureStore({ endeavors: [] })
    mount(store)

    screen.getByRole('button', { name: 'add' }).click()

    expect(store.getState().capture.addForToday).toBeNull()
  })
})
