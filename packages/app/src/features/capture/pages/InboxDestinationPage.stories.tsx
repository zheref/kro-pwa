/**
 * The `/inbox` destination Page — the sidebar's Jot Down row, filling the
 * shell's content area.
 *
 * `InboxDestinationPage.test.tsx` mirrors this set (`RC-11`).
 */

import type { DoSurface } from '../../main/DoSurfaceLayout'
import { captureFixtureRecords } from '../CaptureMocks'
import { InboxDestinationPage } from './InboxDestinationPage'
import {
  CaptureStoreStage,
  ThemeScope,
  desktopSurface,
  handheldSurface,
  makeCaptureStore,
} from './__tests__/captureHarness'

export default {
  title: 'Capture/Inbox destination page',
  component: InboxDestinationPage,
  parameters: { layout: 'fullscreen' },
}

const page = (
  surface: DoSurface,
  theme: 'light' | 'dark',
  seeded = true,
) => (
  <ThemeScope theme={theme}>
    <div style={{ height: 620 }}>
      <CaptureStoreStage
        store={makeCaptureStore({
          endeavors: seeded ? captureFixtureRecords() : [],
          surface,
        })}
      >
        <InboxDestinationPage />
      </CaptureStoreStage>
    </div>
  </ThemeScope>
)

/** The desktop page: compact rows, hover operations, no dismiss control. */
export const DesktopSeeded = {
  render: () => page(desktopSurface, 'light'),
}

/** The phone page: comfortable rows and swipe operations. */
export const PhoneSeeded = {
  render: () => page(handheldSurface, 'light'),
}

/** Nothing captured yet: the pinned header over a centred tray. */
export const EmptyTray = {
  render: () => page(desktopSurface, 'light', false),
}

/** The desktop page in the dark scheme. */
export const DesktopDark = {
  render: () => page(desktopSurface, 'dark'),
}
