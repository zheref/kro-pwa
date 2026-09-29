/**
 * A session in flight stays in the pane's Session reading after the
 * selection ends; only a session still at `ready` falls back to New Session.
 * Driven through the real store (`RC-22`, `RC-35`).
 */
import { describe, expect, it } from 'vitest'
import { userDidReleaseDetailPaneSelection } from '../MainFeature'
import { hydrateRunningSessionThunk } from '../../session/SessionProducer'
import {
  SCENE_START,
  sessionPaneScenes,
  slidesEndeavor,
} from '../../session/pages/__tests__/sessionPaneScenes'
import { userDidSelectDetailPaneSegment } from '../MainFeature'
import { loadShellThunk, openSessionSurfaceThunk } from '../MainProducer'
import {
  selectDetailPaneSegment,
  selectDetailPaneSubtitle,
  selectDetailPaneTitle,
  selectInFlightSessionPaneTarget,
} from '../MainSelectors'

const runningInPane = async () => {
  const store = sessionPaneScenes.running()
  await store.dispatch(loadShellThunk())
  await store.dispatch(hydrateRunningSessionThunk({ now: SCENE_START }))
  await store.dispatch(openSessionSurfaceThunk({ endeavor: null }))
  return store
}

describe('deselecting while a session runs', () => {
  it('keeps the Session reading on the running session — title and subtitle', async () => {
    const store = await runningInPane()
    store.dispatch(userDidReleaseDetailPaneSelection())

    const state = store.getState()
    expect(state.main.detailPane.endeavor).toBeNull()
    expect(selectDetailPaneSegment(state)).toBe('sessionSetup')
    expect(selectDetailPaneTitle(state)).toBe('Session Setup')
    expect(selectDetailPaneSubtitle(state)).toBe(slidesEndeavor.title)
    expect(state.session.phase).toBe('running')
    expect(selectInFlightSessionPaneTarget(state)?.endeavor?.id).toBe(
      slidesEndeavor.id,
    )
  })

  it('still falls Performance back to Day Progress — only Session follows the run', async () => {
    const store = await runningInPane()
    store.dispatch(userDidReleaseDetailPaneSelection())
    store.dispatch(userDidSelectDetailPaneSegment({ segment: 'performance' }))
    expect(selectDetailPaneTitle(store.getState())).toBe('Day Progress')
    expect(selectDetailPaneSubtitle(store.getState())).toBeNull()
  })

  it('falls back to New Session when no session is in flight', async () => {
    const store = sessionPaneScenes.forEndeavor()
    await store.dispatch(loadShellThunk())
    expect(selectDetailPaneSubtitle(store.getState())).toBe(
      slidesEndeavor.title,
    )
    store.dispatch(userDidReleaseDetailPaneSelection())
    expect(selectDetailPaneTitle(store.getState())).toBe('New Session')
    expect(selectDetailPaneSubtitle(store.getState())).toBeNull()
  })
})
