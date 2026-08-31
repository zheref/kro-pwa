/**
 * The Inbox overlay Page's render tests, mirroring `InboxOverlayPage.stories`
 * (`RC-11`).
 *
 * Its two jobs are the pool (loaded on mount through the real Producer) and the
 * Undo window (the toast, and the tick that closes it).
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ActiveToastHost } from '../../../../design/chrome/toast/ActiveToastHost'
import { installRadixEnvironment } from '../../../../design/system/primitives/__tests__/radixEnvironment'
import { PRESENTATION_SIZE } from '../../../main/MainPresentation'
import { userDidTapOpenInbox } from '../../CaptureFeature'
import { captureFixtureRecords } from '../../CaptureMocks'
import { InboxOverlayPage } from '../InboxOverlayPage'
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
      <ActiveToastHost>
        <InboxOverlayPage />
      </ActiveToastHost>
    </CaptureStoreStage>,
  )

describe('the pool arrives through the real Producer', () => {
  it('loads on mount, so the rows are there the moment the sheet opens', async () => {
    const store = makeCaptureStore({ endeavors: captureFixtureRecords() })
    mount(store)

    await waitFor(() => {
      expect(store.getState().capture.load.kind).toBe('loaded')
    })
    expect(store.getState().capture.endeavors.length).toBeGreaterThan(0)
  })

  it('shows only the unscheduled, non-event, unfinished rows canon\'s selector keeps', async () => {
    const store = makeCaptureStore({ endeavors: captureFixtureRecords() })
    mount(store)
    await waitFor(() => {
      expect(store.getState().capture.load.kind).toBe('loaded')
    })

    store.dispatch(userDidTapOpenInbox())
    const triage = await screen.findByTestId('inbox-section-pending-triage')

    expect(within(triage).getByText('Draft the announcement')).toBeTruthy()
    // Scheduled, completed and calendar-event fixtures never reach the Inbox.
    expect(within(triage).queryByText('Call the bank')).toBeNull()
    expect(within(triage).queryByText('Water the plants')).toBeNull()
    expect(within(triage).queryByText('Design review')).toBeNull()
  })

  it('stays shut until something opens it', async () => {
    const store = makeCaptureStore({ endeavors: captureFixtureRecords() })
    mount(store)
    await waitFor(() => {
      expect(store.getState().capture.load.kind).toBe('loaded')
    })

    expect(screen.queryByTestId('inbox-surface')).toBeNull()
  })
})

describe('it presents itself from the shell\'s own ported frame', () => {
  it('sheets on a phone', async () => {
    const store = makeCaptureStore({
      endeavors: captureFixtureRecords(),
      surface: handheldSurface,
    })
    mount(store)
    store.dispatch(userDidTapOpenInbox())

    expect(
      (await screen.findByTestId('inbox-surface')).getAttribute(
        'data-kro-presentation',
      ),
    ).toBe('sheet')
  })

  it('pops over at canon\'s 560 x 620 on a desktop', async () => {
    const store = makeCaptureStore({
      endeavors: captureFixtureRecords(),
      surface: desktopSurface,
    })
    mount(store)
    store.dispatch(userDidTapOpenInbox())

    const panel = await screen.findByTestId('inbox-surface')
    expect(panel.style.width).toBe(`${PRESENTATION_SIZE.inbox.width}px`)
    expect(panel.style.height).toBe(`${PRESENTATION_SIZE.inbox.height}px`)
  })

  it('drains the Just Created slot when Done is taken, as canon does on dismiss', async () => {
    // The comfortable header is the one that carries "Done"; the pointer-first
    // one carries the compact header's Close instead, which is canon's split.
    const store = makeCaptureStore({
      endeavors: captureFixtureRecords(),
      surface: handheldSurface,
    })
    mount(store)
    await waitFor(() => {
      expect(store.getState().capture.load.kind).toBe('loaded')
    })
    store.dispatch(userDidTapOpenInbox())
    await screen.findByTestId('inbox-surface')

    await userEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(store.getState().capture.inbox.isOpen).toBe(false)
    expect(store.getState().capture.inbox.justCreatedEndeavorId).toBeNull()
  })
})

describe('the Undo window', () => {
  it('raises no toast while nothing has been scheduled', async () => {
    const store = makeCaptureStore({ endeavors: captureFixtureRecords() })
    mount(store)
    await waitFor(() => {
      expect(store.getState().capture.load.kind).toBe('loaded')
    })

    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
  })

  it('raises canon\'s toast, with Undo, the moment a scheduling lands', async () => {
    const store = makeCaptureStore({ endeavors: captureFixtureRecords() })
    mount(store)
    await waitFor(() => {
      expect(store.getState().capture.load.kind).toBe('loaded')
    })
    store.dispatch(userDidTapOpenInbox())
    await screen.findByTestId('inbox-surface')

    await userEvent.click(
      screen.getByRole('button', { name: 'Add Draft the announcement for today' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Schedule' }))

    expect(await screen.findByRole('button', { name: 'Undo' })).toBeTruthy()
  })

  it('arms the window for canon\'s eight seconds, measured from the confirmation', async () => {
    const store = makeCaptureStore({ endeavors: captureFixtureRecords() })
    mount(store)
    await waitFor(() => {
      expect(store.getState().capture.load.kind).toBe('loaded')
    })
    store.dispatch(userDidTapOpenInbox())
    await screen.findByTestId('inbox-surface')

    await userEvent.click(
      screen.getByRole('button', { name: 'Add Draft the announcement for today' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Schedule' }))

    await waitFor(() => {
      expect(store.getState().capture.undo.kind).toBe('armed')
    })
    const undo = store.getState().capture.undo
    if (undo.kind !== 'armed') throw new Error('the window did not arm')
    expect(undo.expiresAt.getTime() - undo.armedAt.getTime()).toBe(8_000)
  })
})
