/**
 * The seeded stores the Session-in-pane stories and render tests share, so the
 * two can never disagree about a scene (`RC-11`, `RC-31`).
 *
 * Each is the real store on the desktop sidebar with `macDetailPane` at its
 * shipping value (on), holding one stored endeavor — and, for the running
 * scene, the anchor a session left in flight.
 */
import {
  EndeavorHost,
  PersistedSessionPhase,
  endeavorRecordFromEndeavor,
  makePersistedRunningSession,
  makePersistedSessionEndeavor,
  minutesInSeconds,
  resumeSessionAt,
  taskEndeavor,
} from '@kro/core'
import {
  type AppStore,
  makeStore,
  stubbedThunkExtra,
} from '../../../../library/store'
import { makeInMemoryLocalStore } from '../../../../services/localStore/InMemoryLocalStore'
import {
  onShellMounted,
  userDidRequestSessionSetup,
} from '../../../main/MainFeature'
import { desktopSurface } from '../../../main/MainMocks'
import { loadShellThunk } from '../../../main/MainProducer'

export const SCENE_START = new Date(2026, 2, 17, 9, 0, 0)

export const slidesEndeavor = taskEndeavor({
  id: 'endeavor-slides',
  title: '📊 Prepare slides',
  duration: minutesInSeconds(25),
  host: EndeavorHost.local,
  createdAt: SCENE_START,
})

const runningAnchor = resumeSessionAt(
  makePersistedRunningSession({
    endeavor: makePersistedSessionEndeavor({
      id: slidesEndeavor.id,
      symbol: '📊',
      title: slidesEndeavor.title,
      duration: minutesInSeconds(25),
    }),
    targetDuration: minutesInSeconds(25),
    mode: 'countdown',
    fragments: [],
    phase: PersistedSessionPhase.running,
  }),
  SCENE_START,
)

const storeWith = (running: boolean): AppStore => {
  const store = makeStore({
    ...stubbedThunkExtra,
    localStore: makeInMemoryLocalStore({
      endeavors: [
        endeavorRecordFromEndeavor(slidesEndeavor, { now: SCENE_START }),
      ],
      runningSessionAnchor: running ? runningAnchor : null,
    }),
  })
  store.dispatch(
    onShellMounted({ surface: desktopSurface, isDevelopment: false }),
  )
  void store.dispatch(loadShellThunk())
  return store
}

export const sessionPaneScenes = {
  /** Execute on a card: Session Setup for that endeavor. */
  forEndeavor: (): AppStore => {
    const store = storeWith(false)
    store.dispatch(
      userDidRequestSessionSetup({
        endeavor: { id: slidesEndeavor.id, title: slidesEndeavor.title },
      }),
    )
    return store
  },
  /** The toolbar's Session with nothing selected: New Session. */
  newTask: (): AppStore => {
    const store = storeWith(false)
    store.dispatch(userDidRequestSessionSetup({ endeavor: null }))
    return store
  },
  /** A session left running, pane hidden: the pill shows and opens the pane. */
  running: (): AppStore => storeWith(true),
}
