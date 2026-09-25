/**
 * The session surface in the trailing detail pane — canon #517's Session
 * segment, mounted on the real store the way the shell mounts it (`RC-11`).
 * Each scene's store is `sessionPaneScenes`', shared with the render tests.
 */
import { Harness } from '../../find/pages/__tests__/pagesHarness'
import { PaneFrame } from '../../endeavorDetail/pages/__tests__/paneHarness'
import { SessionOverlays } from './SessionOverlays'
import { sessionPaneScenes } from './__tests__/sessionPaneScenes'

export default {
  title: 'Session/In the detail pane',
  component: SessionOverlays,
  parameters: { layout: 'fullscreen' },
}

/** Execute on a card: Session Setup for that endeavor, its name as subtitle. */
export const SessionSetupForEndeavor = {
  render: () => (
    <Harness store={sessionPaneScenes.forEndeavor()}>
      <PaneFrame>
        <SessionOverlays />
      </PaneFrame>
    </Harness>
  ),
}

/** The toolbar's Session with nothing selected: New Session, a blank task. */
export const NewSession = {
  render: () => (
    <Harness store={sessionPaneScenes.newTask()}>
      <PaneFrame>
        <SessionOverlays />
      </PaneFrame>
    </Harness>
  ),
}

/** A session running with the pane hidden: the pill is the way back in. */
export const RunningWithPaneHidden = {
  render: () => (
    <Harness store={sessionPaneScenes.running()}>
      <PaneFrame>
        <SessionOverlays />
      </PaneFrame>
    </Harness>
  ),
}
