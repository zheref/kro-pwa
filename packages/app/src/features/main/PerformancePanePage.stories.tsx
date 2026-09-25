/**
 * The Performance segment on a real store (`RC-11`). Each scene drives the
 * pane the way the app does, once the shell load has turned the pane on;
 * `__tests__/PerformancePanePage.test.tsx` asserts the same three scenes.
 */
import type { UnknownAction } from '@reduxjs/toolkit'
import {
  PaneFrame,
  makePaneHostStore,
} from '../endeavorDetail/pages/__tests__/paneHarness'
import { Harness } from '../find/pages/__tests__/pagesHarness'
import {
  userDidDrillIntoDetailPane,
  userDidRequestDayProgress,
  userDidSelectDetailPaneSegment,
} from './MainFeature'
import { loadShellThunk } from './MainProducer'
import { PerformancePanePage } from './PerformancePanePage'

const scene = (intent: UnknownAction) => {
  const store = makePaneHostStore()
  void store.dispatch(loadShellThunk()).then(() => store.dispatch(intent))
  return (
    <Harness store={store}>
      <PaneFrame>
        <PerformancePanePage locale="en-US" />
      </PaneFrame>
    </Harness>
  )
}

export default {
  title: 'Shell/Detail pane/Performance',
  component: PerformancePanePage,
  parameters: { layout: 'fullscreen' },
}

export const DayProgress = {
  render: () => scene(userDidRequestDayProgress()),
}

export const EndeavorActivity = {
  render: () =>
    scene(
      userDidDrillIntoDetailPane({
        location: {
          segment: 'performance',
          endeavor: { id: 'e-1', title: 'Write the quarterly report' },
        },
      }),
    ),
}

export const OnAnotherSegment = {
  render: () => scene(userDidSelectDetailPaneSegment({ segment: 'plan' })),
}
