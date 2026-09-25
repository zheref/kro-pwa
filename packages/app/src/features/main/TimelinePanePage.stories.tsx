/**
 * The read-only timeline segment on a real store (`RC-11`). Each scene drives
 * the pane the way the app does, once the shell load has turned the pane on;
 * `__tests__/TimelinePanePage.test.tsx` asserts the same scenes.
 */
import type { UnknownAction } from '@reduxjs/toolkit'
import {
  PaneFrame,
  makePaneHostStore,
} from '../endeavorDetail/pages/__tests__/paneHarness'
import { Harness } from '../find/pages/__tests__/pagesHarness'
import {
  userDidDrillIntoDetailPane,
  userDidSelectDetailPaneSegment,
} from './MainFeature'
import { loadShellThunk } from './MainProducer'
import { TimelinePanePage } from './TimelinePanePage'

const scene = (intent: UnknownAction) => {
  const store = makePaneHostStore()
  void store.dispatch(loadShellThunk()).then(() => store.dispatch(intent))
  return (
    <Harness store={store}>
      <PaneFrame>
        <TimelinePanePage locale="en-US" />
      </PaneFrame>
    </Harness>
  )
}

export default {
  title: 'Shell/Detail pane/Timeline',
  component: TimelinePanePage,
  parameters: { layout: 'fullscreen' },
}

export const ReadOnlyTimeline = {
  render: () => scene(userDidSelectDetailPaneSegment({ segment: 'plan' })),
}

export const SteppedAsideForEndeavor = {
  render: () =>
    scene(
      userDidDrillIntoDetailPane({
        location: {
          segment: 'plan',
          endeavor: { id: 'e-1', title: 'Write the quarterly report' },
        },
      }),
    ),
}

export const OnAnotherSegment = {
  render: () =>
    scene(userDidSelectDetailPaneSegment({ segment: 'performance' })),
}
