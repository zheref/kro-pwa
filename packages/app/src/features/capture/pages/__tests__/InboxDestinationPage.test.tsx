/**
 * The `/inbox` destination Page's render tests, mirroring
 * `InboxDestinationPage.stories` (`RC-11`).
 *
 * Three things only this Page can get wrong: the route mount that moves the
 * sidebar's highlight, the inline presentation, and standing down while the
 * overlay is up so the same surface is never on screen twice.
 */
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installRadixEnvironment } from '../../../../design/system/primitives/__tests__/radixEnvironment'
import { DestinationKind } from '../../../main/SidebarDestination'
import { userDidTapOpenInbox } from '../../CaptureFeature'
import { captureFixtureRecords } from '../../CaptureMocks'
import { InboxDestinationPage } from '../InboxDestinationPage'
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
      <InboxDestinationPage />
    </CaptureStoreStage>,
  )

describe('the route mount', () => {
  it('selects Jot Down, so a pasted link moves the sidebar highlight', () => {
    const store = makeCaptureStore({
      endeavors: [],
      destination: { kind: DestinationKind.myDay },
    })
    mount(store)

    expect(store.getState().main.selected.kind).toBe(DestinationKind.inbox)
  })

  it('loads the pool itself, so the page is correct even standing alone', async () => {
    const store = makeCaptureStore({ endeavors: captureFixtureRecords() })
    mount(store)

    await waitFor(() => {
      expect(store.getState().capture.load.kind).toBe('loaded')
    })
  })
})

describe('the inline presentation', () => {
  it('draws the surface with no dialog and no dismiss control', async () => {
    const store = makeCaptureStore({ endeavors: captureFixtureRecords() })
    mount(store)

    const surface = await screen.findByTestId('inbox-surface')
    expect(surface.getAttribute('data-kro-presentation')).toBe('inline')
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull()
  })

  it("lists the rows canon's Pending Triage selector keeps", async () => {
    const store = makeCaptureStore({ endeavors: captureFixtureRecords() })
    mount(store)

    const triage = await screen.findByTestId('inbox-section-pending-triage')
    expect(within(triage).getByText('Draft the announcement')).toBeTruthy()
    expect(within(triage).getByText('Imported from somewhere')).toBeTruthy()
  })

  it('centres the tray under a pinned header when nothing is waiting', async () => {
    const store = makeCaptureStore({ endeavors: [] })
    mount(store)

    expect(await screen.findByText('Inbox is empty')).toBeTruthy()
    expect(screen.queryByTestId('inbox-section-pending-triage')).toBeNull()
  })

  it('draws the compact row on a desktop and the comfortable one on a phone', async () => {
    const desktop = makeCaptureStore({
      endeavors: captureFixtureRecords(),
      surface: desktopSurface,
    })
    const { unmount } = mount(desktop)
    const compactRow = (
      await screen.findAllByTestId('inbox-section-pending-triage')
    )[0]
    expect(
      compactRow?.querySelector('[data-config="compactDesktopInbox"]'),
    ).not.toBeNull()
    unmount()

    const phone = makeCaptureStore({
      endeavors: captureFixtureRecords(),
      surface: handheldSurface,
    })
    mount(phone)
    const comfortableRow = await screen.findByTestId(
      'inbox-section-pending-triage',
    )
    expect(comfortableRow.querySelector('[data-config="inbox"]')).not.toBeNull()
  })
})

describe('it stands down while the overlay is up', () => {
  it('renders nothing rather than a second copy of the same surface', async () => {
    const store = makeCaptureStore({ endeavors: captureFixtureRecords() })
    mount(store)
    await screen.findByTestId('inbox-surface')

    store.dispatch(userDidTapOpenInbox())

    await waitFor(() => {
      expect(screen.queryByTestId('inbox-surface')).toBeNull()
    })
  })
})
