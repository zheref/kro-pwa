/**
 * The Triage carousel Page, driven by a real store: the pool arrives through
 * `loadCaptureContextThunk`, the Inbox's own `userDidTapTriage` parks the
 * request, and this Page opens the session through `openTriageThunk` — exactly
 * the sequence a browser runs.
 *
 * Nothing here preloads a `TriageState`: every story's form is whatever the
 * real Producer, the real Shifters and the real Selectors produce from the
 * seeded rows, which is the point (`RC-31`).
 *
 * `__tests__/TriageCarouselPage.test.tsx` mirrors this set (`RC-11`).
 */

import { triageEndeavorFixtures, triageFixtureRecords } from '../TriageMocks'
import { TriageCarouselPage } from './TriageCarouselPage'
import {
  ThemeScope,
  TriageStoreStage,
  desktopSurface,
  handheldSurface,
  makeTriageStore,
  seedTriageRequest,
} from './__tests__/triageHarness'
import type { DoSurface } from '../../main/DoSurfaceLayout'

export default {
  title: 'Triage/Carousel page',
  component: TriageCarouselPage,
  parameters: { layout: 'fullscreen' },
}

const opened = (
  endeavorId: string | null,
  surface: DoSurface = handheldSurface,
) => {
  const store = makeTriageStore({
    endeavors: triageFixtureRecords(),
    surface,
  })
  if (endeavorId !== null) void seedTriageRequest(store, endeavorId)
  return store
}

const stage = (
  store: ReturnType<typeof opened>,
  theme: 'light' | 'dark' = 'light',
) => (
  <ThemeScope theme={theme}>
    <TriageStoreStage store={store}>
      <div
        style={{
          position: 'relative',
          width: 390,
          height: 720,
          overflow: 'hidden',
          border: '1px solid var(--kro-color-hairline)',
          borderRadius: 'var(--kro-radius-surface)',
          background: 'var(--kro-color-back)',
        }}
      >
        <TriageCarouselPage carouselWidth={390} locale="en-US" />
      </div>
    </TriageStoreStage>
  </ThemeScope>
)

/** No request parked: the layer renders nothing and the Inbox is untouched. */
export const NothingRequested = { render: () => stage(opened(null)) }

/** A plain Inbox row, opened. Pristine, Complete disabled and naming its blocker. */
export const OpenedOnUnscheduledTask = {
  render: () => stage(opened(triageEndeavorFixtures.unscheduledTask.id)),
}

/** The same, dark. */
export const OpenedDark = {
  render: () => stage(opened(triageEndeavorFixtures.unscheduledTask.id), 'dark'),
}

/**
 * A row that already carries every field — reward 55, 25 minutes, a scheduled
 * date and an expiry — so the prefill is visible without a single tap.
 */
export const OpenedOnFullyPrefilled = {
  render: () => stage(opened(triageEndeavorFixtures.fullyPrefilled.id)),
}

/** A Kro-tourist row: opening does not promote it, and the form says nothing about it. */
export const OpenedOnTourist = {
  render: () => stage(opened(triageEndeavorFixtures.touristReminder.id)),
}

/** The desktop popover's width, where 18% of the carousel is a different number. */
export const OpenedOnDesktopWidth = {
  render: () =>
    stage(opened(triageEndeavorFixtures.unscheduledTask.id, desktopSurface)),
}
