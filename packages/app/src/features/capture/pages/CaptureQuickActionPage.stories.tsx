/**
 * The default quick action, driven by a real store: what it draws follows the
 * destination the shell has selected.
 *
 * `CaptureQuickActionPage.test.tsx` mirrors this set (`RC-11`).
 */

import { DestinationKind, type SidebarDestination } from '../../main/SidebarDestination'
import { CaptureQuickActionPage } from './CaptureQuickActionPage'
import {
  CaptureStoreStage,
  ThemeScope,
  makeCaptureStore,
} from './__tests__/captureHarness'

export default {
  title: 'Capture/Quick action page',
  component: CaptureQuickActionPage,
  parameters: { layout: 'fullscreen' },
}

const at = (destination: SidebarDestination, theme: 'light' | 'dark') => (
  <ThemeScope theme={theme}>
    <CaptureStoreStage store={makeCaptureStore({ endeavors: [], destination })}>
      <CaptureQuickActionPage />
    </CaptureStoreStage>
  </ThemeScope>
)

/** All Tasks: nothing else owns a FAB there, so the default disc draws. */
export const OnAllTasks = {
  render: () => at({ kind: DestinationKind.allTasks }, 'light'),
}

/** The same disc in the dark scheme. */
export const Dark = {
  render: () => at({ kind: DestinationKind.allTasks }, 'dark'),
}

/** Plan: KC-IS-#19 owns the unfurling kind menu there, so this stands down. */
export const OnPlanStandsDown = {
  render: () => at({ kind: DestinationKind.plan }, 'light'),
}

/** Search: canon's `isQuickActionAvailable` hides it outright. */
export const OnSearchHidden = {
  render: () => at({ kind: DestinationKind.search }, 'light'),
}
