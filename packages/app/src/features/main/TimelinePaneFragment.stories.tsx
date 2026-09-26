/**
 * The read-only timeline segment Fragment, props only — no store (`RC-11`).
 */
import { PaneBody, TimelinePaneFragmentMocks } from './PaneFragmentMocks'
import { TimelinePaneFragment } from './TimelinePaneFragment'

export default {
  title: 'Shell/Detail pane/Timeline fragment',
  component: TimelinePaneFragment,
}

export const Shown = {
  render: () => (
    <PaneBody>
      <TimelinePaneFragment {...TimelinePaneFragmentMocks.shown} />
    </PaneBody>
  ),
}

export const EmptyDay = {
  render: () => (
    <PaneBody>
      <TimelinePaneFragment {...TimelinePaneFragmentMocks.emptyDay} />
    </PaneBody>
  ),
}

export const SteppedAside = {
  render: () => (
    <PaneBody>
      <TimelinePaneFragment {...TimelinePaneFragmentMocks.hidden} />
    </PaneBody>
  ),
}
