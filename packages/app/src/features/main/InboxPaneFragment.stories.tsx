/**
 * The pane's web-only Inbox segment Fragment, props only — no store
 * (`RC-11`). `__tests__/InboxPaneFragment.test.tsx` asserts the same scenes.
 */
import { InboxPaneFragment } from './InboxPaneFragment'
import { InboxPaneFragmentMocks, PaneBody } from './PaneFragmentMocks'

export default {
  title: 'Shell/Detail pane/Inbox fragment',
  component: InboxPaneFragment,
}

export const Shown = {
  render: () => (
    <PaneBody>
      <InboxPaneFragment {...InboxPaneFragmentMocks.shown} />
    </PaneBody>
  ),
}

export const Empty = {
  render: () => (
    <PaneBody>
      <InboxPaneFragment {...InboxPaneFragmentMocks.empty} />
    </PaneBody>
  ),
}

export const OnAnotherSegment = {
  render: () => (
    <PaneBody>
      <InboxPaneFragment {...InboxPaneFragmentMocks.hidden} />
    </PaneBody>
  ),
}
