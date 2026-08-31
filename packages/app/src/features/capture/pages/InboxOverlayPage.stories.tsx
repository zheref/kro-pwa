/**
 * The Inbox overlay Page, driven by a real store: the pool arrives through
 * `loadCaptureContextThunk` on mount, exactly as it does in the browser.
 *
 * `InboxOverlayPage.test.tsx` mirrors this set (`RC-11`).
 */

import { ActiveToastHost } from '../../../design/chrome/toast/ActiveToastHost'
import type { DoSurface } from '../../main/DoSurfaceLayout'
import { userDidTapOpenInbox } from '../CaptureFeature'
import { captureFixtureRecords } from '../CaptureMocks'
import { InboxOverlayPage } from './InboxOverlayPage'
import {
  CaptureStoreStage,
  ThemeScope,
  desktopSurface,
  handheldSurface,
  makeCaptureStore,
} from './__tests__/captureHarness'

export default {
  title: 'Capture/Inbox overlay page',
  component: InboxOverlayPage,
  parameters: { layout: 'fullscreen' },
}

const opened = (surface: DoSurface, seeded = true) => {
  const store = makeCaptureStore({
    endeavors: seeded ? captureFixtureRecords() : [],
    surface,
  })
  store.dispatch(userDidTapOpenInbox())
  return store
}

const overlay = (store: ReturnType<typeof opened>, theme: 'light' | 'dark') => (
  <ThemeScope theme={theme}>
    <CaptureStoreStage store={store}>
      <ActiveToastHost>
        <InboxOverlayPage />
      </ActiveToastHost>
    </CaptureStoreStage>
  </ThemeScope>
)

/** The phone sheet, with rows loaded from the seeded store. */
export const SheetOnPhone = {
  render: () => overlay(opened(handheldSurface), 'light'),
}

/** The desktop popover at canon's 560 x 620, with the compact row. */
export const PopoverOnDesktop = {
  render: () => overlay(opened(desktopSurface), 'light'),
}

/** Nothing to triage: the pinned header over a centred tray. */
export const EmptyTray = {
  render: () => overlay(opened(desktopSurface, false), 'light'),
}

/** The desktop popover in the dark scheme. */
export const PopoverDark = {
  render: () => overlay(opened(desktopSurface), 'dark'),
}
