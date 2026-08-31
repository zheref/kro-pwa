/**
 * The prompt Page, driven by a real store.
 *
 * Every story opens the prompt the way the app does — by dispatching
 * `userDidRequestCapture` — so what is on screen is a state the reducer
 * actually produced. `CapturePromptPage.test.tsx` mirrors this set (`RC-11`).
 */

import { userDidRequestCapture } from '../CaptureFeature'
import { CAPTURE_MOCK_NOW } from '../CaptureMocks'
import { CaptureKind } from '../CaptureRules'
import { CapturePromptPage } from './CapturePromptPage'
import {
  CaptureStoreStage,
  ThemeScope,
  desktopSurface,
  handheldSurface,
  makeCaptureStore,
} from './__tests__/captureHarness'
import type { DoSurface } from '../../main/DoSurfaceLayout'

export default {
  title: 'Capture/Prompt page',
  component: CapturePromptPage,
  parameters: { layout: 'fullscreen' },
}

const opened = (kind: CaptureKind, surface: DoSurface) => {
  const store = makeCaptureStore({ endeavors: [], surface })
  store.dispatch(userDidRequestCapture({ kind, now: CAPTURE_MOCK_NOW }))
  return store
}

/** A phone: the bottom sheet, sized to the form. */
export const SheetOnPhone = {
  render: () => (
    <ThemeScope theme="light">
      <CaptureStoreStage store={opened(CaptureKind.task, handheldSurface)}>
        <CapturePromptPage />
      </CaptureStoreStage>
    </ThemeScope>
  ),
}

/** A desktop: the glass popover in the FAB's own corner. */
export const PopoverOnDesktop = {
  render: () => (
    <ThemeScope theme="light">
      <CaptureStoreStage store={opened(CaptureKind.task, desktopSurface)}>
        <CapturePromptPage />
      </CaptureStoreStage>
    </ThemeScope>
  ),
}

/** An Event: the one kind canon gates on both a start and an end. */
export const EventBlockedOnTimes = {
  render: () => (
    <ThemeScope theme="light">
      <CaptureStoreStage store={opened(CaptureKind.event, handheldSurface)}>
        <CapturePromptPage />
      </CaptureStoreStage>
    </ThemeScope>
  ),
}

/** The desktop popover in the dark scheme. */
export const PopoverDark = {
  render: () => (
    <ThemeScope theme="dark">
      <CaptureStoreStage store={opened(CaptureKind.habit, desktopSurface)}>
        <CapturePromptPage />
      </CaptureStoreStage>
    </ThemeScope>
  ),
}

/** Nothing asked for: the Page renders nothing at all. */
export const ClosedRendersNothing = {
  render: () => (
    <ThemeScope theme="light">
      <CaptureStoreStage store={makeCaptureStore({ endeavors: [] })}>
        <CapturePromptPage />
      </CaptureStoreStage>
    </ThemeScope>
  ),
}
