/**
 * The Performance segment Fragment, props only — no store (`RC-11`).
 */
import { PaneBody, PerformancePaneFragmentMocks } from './PaneFragmentMocks'
import { PerformancePaneFragment } from './PerformancePaneFragment'

export default {
  title: 'Shell/Detail pane/Performance fragment',
  component: PerformancePaneFragment,
}

export const DayProgress = {
  render: () => (
    <PaneBody>
      <PerformancePaneFragment {...PerformancePaneFragmentMocks.dayProgress} />
    </PaneBody>
  ),
}

export const EndeavorActivity = {
  render: () => (
    <PaneBody>
      <PerformancePaneFragment
        {...PerformancePaneFragmentMocks.endeavorActivity}
      />
    </PaneBody>
  ),
}

export const OnAnotherSegment = {
  render: () => (
    <PaneBody>
      <PerformancePaneFragment {...PerformancePaneFragmentMocks.hidden} />
    </PaneBody>
  ),
}
