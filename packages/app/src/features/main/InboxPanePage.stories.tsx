/**
 * The pane's web-only Inbox segment on a real store (`RC-11`).
 * `__tests__/InboxPanePage.test.tsx` asserts the same three scenes.
 */
import { PaneFrame } from '../endeavorDetail/pages/__tests__/paneHarness'
import { Harness } from '../find/pages/__tests__/pagesHarness'
import { InboxPanePage } from './InboxPanePage'
import { inboxPaneScenes, inboxPaneStore } from './__tests__/inboxPaneScenes'

const scene = (key: keyof typeof inboxPaneScenes) => {
  const { intents, triageRowId } = inboxPaneScenes[key]
  return (
    <Harness store={inboxPaneStore(intents, triageRowId)}>
      <PaneFrame>
        <InboxPanePage locale="en-US" />
      </PaneFrame>
    </Harness>
  )
}

export default {
  title: 'Shell/Detail pane/Inbox',
  component: InboxPanePage,
  parameters: { layout: 'fullscreen' },
}

export const Inbox = { render: () => scene('inbox') }

export const TriagingARow = { render: () => scene('triaging') }

export const OnAnotherSegment = { render: () => scene('elsewhere') }
