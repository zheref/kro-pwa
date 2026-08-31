/**
 * The session slice's reducer arms (`RC-12`) and the clock-driven scenario
 * matrices the issue asks for.
 *
 * The sync `reducers` are called directly against `sessionSlice.reducer` — no
 * store, no middleware. The lifecycle arms are driven through the **real**
 * thunks against a store built with stubbed services, because that is the only
 * way to prove the property that matters: the transitions happen in `.pending`,
 * **synchronously**, which is what makes the exactly-once claims hold under
 * racing dispatches.
 */
import {
  type Endeavor,
  EndeavorHost,
  FocusTimerMode,
  PerformResolution,
  endeavorRecordFromEndeavor,
  minutesInSeconds,
  taskEndeavor,
} from '@kro/core'
import type { UnknownAction } from '@reduxjs/toolkit'
import { describe, expect, it } from 'vitest'
import {
  type AppStore,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import {
  sessionSlice,
  userDidCancelTitleEdit,
  userDidChangeTitle,
  userDidDismissConclusion,
  userDidDismissSymbolPicker,
  userDidSelectMode,
  userDidSelectTargetDuration,
  userDidTapEditTitle,
  userDidTapStartNewSession,
  userDidTapSymbol,
} from '../SessionFeature'
import {
  SESSION_MOCK_TARGET,
  sessionIdentityMocks,
  sessionStateMocks,
} from '../SessionMocks'
import {
  abortSessionThunk,
  advanceSessionThunk,
  endBreakThunk,
  finishSessionEarlyThunk,
  hydrateRunningSessionThunk,
  loadSessionPreferencesThunk,
  markEndeavorCompleteFromSessionThunk,
  pauseSessionThunk,
  prepareSessionLaunchThunk,
  recordSessionPerformanceThunk,
  resumeSessionThunk,
  startBreakThunk,
  startSessionThunk,
  syncSessionDocumentTitleThunk,
  updateSessionIdentityThunk,
} from '../SessionProducer'
import { initialSessionState } from '../SessionState'
import { SessionPhase } from '../SessionVocabulary'

const reduce = sessionSlice.reducer

// ---------------------------------------------------------------------------
// Sync reducer arms
// ---------------------------------------------------------------------------

describe('userDidSelectMode', () => {
  it('switches to the stopwatch before the session starts', () => {
    const next = reduce(
      sessionStateMocks.ready,
      userDidSelectMode(FocusTimerMode.stopwatch),
    )
    expect(next.mode).toBe(FocusTimerMode.stopwatch)
  })

  it('is a no-op mid-session — the mode is fixed once time is accruing', () => {
    const next = reduce(
      sessionStateMocks.running,
      userDidSelectMode(FocusTimerMode.stopwatch),
    )
    expect(next.mode).toBe(FocusTimerMode.countdown)
  })

  it('is a no-op at the conclusion screen too', () => {
    const next = reduce(
      sessionStateMocks.concluded,
      userDidSelectMode(FocusTimerMode.stopwatch),
    )
    expect(next.mode).toBe(FocusTimerMode.countdown)
  })
})

describe('userDidSelectTargetDuration', () => {
  it('accepts a preset before the session starts', () => {
    expect(
      reduce(sessionStateMocks.ready, userDidSelectTargetDuration(minutesInSeconds(45)))
        .targetDuration,
    ).toBe(minutesInSeconds(45))
  })

  it('is a no-op mid-session — it would move the finish line', () => {
    expect(
      reduce(sessionStateMocks.running, userDidSelectTargetDuration(900))
        .targetDuration,
    ).toBe(SESSION_MOCK_TARGET)
  })

  it('refuses a zero duration, which would conclude instantly', () => {
    expect(
      reduce(sessionStateMocks.ready, userDidSelectTargetDuration(0)).targetDuration,
    ).toBe(SESSION_MOCK_TARGET)
  })
})

describe('the title editor', () => {
  it('opens prefilled with the current title', () => {
    const next = reduce(sessionStateMocks.ready, userDidTapEditTitle())
    expect(next.isEditingTitle).toBe(true)
    expect(next.editedTitle).toBe(sessionIdentityMocks.slides.title)
  })

  it('tracks what the user types without touching the identity', () => {
    const opened = reduce(sessionStateMocks.ready, userDidTapEditTitle())
    const typed = reduce(opened, userDidChangeTitle('Prepare the deck'))
    expect(typed.editedTitle).toBe('Prepare the deck')
    expect(typed.identity?.title).toBe(sessionIdentityMocks.slides.title)
  })

  it('drops the draft on cancel', () => {
    const typed = reduce(
      reduce(sessionStateMocks.ready, userDidTapEditTitle()),
      userDidChangeTitle('Prepare the deck'),
    )
    const cancelled = reduce(typed, userDidCancelTitleEdit())
    expect(cancelled.isEditingTitle).toBe(false)
    expect(cancelled.editedTitle).toBe('')
  })

  it('does nothing when there is no identity to edit', () => {
    expect(reduce(initialSessionState, userDidTapEditTitle()).isEditingTitle).toBe(
      false,
    )
  })
})

describe('the symbol picker', () => {
  it('opens on the glyph', () => {
    expect(reduce(sessionStateMocks.ready, userDidTapSymbol()).isEditingSymbol).toBe(
      true,
    )
  })

  it('refuses to open during a break', () => {
    expect(
      reduce(sessionStateMocks.onBreak, userDidTapSymbol()).isEditingSymbol,
    ).toBe(false)
  })

  it('closes without touching the identity', () => {
    const opened = reduce(sessionStateMocks.ready, userDidTapSymbol())
    const closed = reduce(opened, userDidDismissSymbolPicker())
    expect(closed.isEditingSymbol).toBe(false)
    expect(closed.identity).toEqual(sessionStateMocks.ready.identity)
  })
})

describe('userDidDismissConclusion', () => {
  it('closes the sheet but keeps the pill and its claim', () => {
    const next = reduce(sessionStateMocks.concluded, userDidDismissConclusion())
    expect(next.isPresentingConclusion).toBe(false)
    expect(next.phase).toBe(SessionPhase.concluded)
    expect(next.conclusion.kind).toBe('pending')
  })

  it('is harmless when nothing is presented', () => {
    expect(
      reduce(sessionStateMocks.running, userDidDismissConclusion())
        .isPresentingConclusion,
    ).toBe(false)
  })

  it('leaves the anchor in place so the pill keeps rendering', () => {
    expect(
      reduce(sessionStateMocks.concluded, userDidDismissConclusion()).anchor,
    ).not.toBeNull()
  })
})

describe('userDidTapStartNewSession', () => {
  const now = new Date(2026, 2, 17, 9, 30, 0)

  it('returns the runtime to ready with the anchor cleared', () => {
    const next = reduce(sessionStateMocks.concluded, userDidTapStartNewSession({ now }))
    expect(next.phase).toBe(SessionPhase.ready)
    expect(next.anchor).toBeNull()
  })

  it('resets the target to the configured default for the next session', () => {
    const next = reduce(sessionStateMocks.concluded, userDidTapStartNewSession({ now }))
    expect(next.targetDuration).toBe(
      sessionStateMocks.concluded.preferences.defaultDuration,
    )
  })

  it('keeps the claim, so the next session cannot record a duplicate', () => {
    expect(
      reduce(sessionStateMocks.concluded, userDidTapStartNewSession({ now }))
        .conclusion.kind,
    ).toBe('pending')
  })
})

// ---------------------------------------------------------------------------
// Clock-driven scenario matrices
// ---------------------------------------------------------------------------

const NOW = new Date(2026, 2, 17, 9, 0, 0)
const at = (seconds: number) => new Date(NOW.getTime() + seconds * 1_000)
const TARGET = minutesInSeconds(25)

const SLIDES: Endeavor = taskEndeavor({
  id: 'endeavor-slides',
  title: '📊 Prepare slides',
  duration: TARGET,
  host: EndeavorHost.local,
})

const liveSession = async (): Promise<{
  readonly store: AppStore
  readonly localStore: ReturnType<typeof makeInMemoryLocalStore>
}> => {
  const localStore = makeInMemoryLocalStore({
    endeavors: [endeavorRecordFromEndeavor(SLIDES, { now: NOW })],
  })
  const store = makeStore({ ...stubbedThunkExtra, localStore })
  await store.dispatch(loadSessionPreferencesThunk())
  await store.dispatch(
    prepareSessionLaunchThunk({ endeavorId: SLIDES.id, sessionId: SLIDES.id }),
  )
  await store.dispatch(startSessionThunk({ now: NOW }))
  return { store, localStore }
}

describe('start → pause → resume → conclude, under a controlled clock', () => {
  it('walks the whole phase machine in canon order', async () => {
    const { store } = await liveSession()
    expect(store.getState().session.phase).toBe(SessionPhase.running)

    await store.dispatch(advanceSessionThunk({ now: at(600) }))
    await store.dispatch(pauseSessionThunk({ now: at(600) }))
    expect(store.getState().session.phase).toBe(SessionPhase.paused)

    await store.dispatch(resumeSessionThunk({ now: at(900) }))
    expect(store.getState().session.phase).toBe(SessionPhase.running)

    // 600 s ran before the pause, so the countdown ends 900 s after the resume.
    await store.dispatch(advanceSessionThunk({ now: at(900 + TARGET - 600) }))
    expect(store.getState().session.phase).toBe(SessionPhase.concluded)
  })

  it('does not count the paused gap toward the target', async () => {
    const { store } = await liveSession()
    await store.dispatch(pauseSessionThunk({ now: at(600) }))
    await store.dispatch(resumeSessionThunk({ now: at(3_600) }))
    // An hour of wall-clock has passed; only ten minutes were focused.
    await store.dispatch(advanceSessionThunk({ now: at(3_601) }))

    expect(store.getState().session.phase).toBe(SessionPhase.running)
  })

  it('re-presents the sheet at the conclusion screen automatically', async () => {
    const { store } = await liveSession()
    await store.dispatch(advanceSessionThunk({ now: at(TARGET) }))

    expect(store.getState().session.isPresentingConclusion).toBe(true)
  })
})

describe('kill and reload, under a controlled clock', () => {
  it('recovers the session mid-flight and pill-corrects on first paint', async () => {
    const { store, localStore } = await liveSession()
    await store.dispatch(advanceSessionThunk({ now: at(30) }))

    const reloaded = makeStore({ ...stubbedThunkExtra, localStore })
    await reloaded.dispatch(hydrateRunningSessionThunk({ now: at(900) }))

    expect(reloaded.getState().session.phase).toBe(SessionPhase.running)
    expect(reloaded.getState().session.now).toEqual(at(900))
  })

  it('concludes correctly when the reload lands after the target elapsed', async () => {
    const { store, localStore } = await liveSession()
    const reloaded = makeStore({ ...stubbedThunkExtra, localStore })
    await reloaded.dispatch(hydrateRunningSessionThunk({ now: at(TARGET + 600) }))
    // The very first tick after recovery observes an already-elapsed countdown.
    await reloaded.dispatch(advanceSessionThunk({ now: at(TARGET + 601) }))

    expect(reloaded.getState().session.phase).toBe(SessionPhase.concluded)
  })

  it('records the whole overrun session exactly once after such a reload', async () => {
    const { store, localStore } = await liveSession()
    const reloaded = makeStore({ ...stubbedThunkExtra, localStore })
    await reloaded.dispatch(hydrateRunningSessionThunk({ now: at(TARGET + 600) }))
    for (let extra = 1; extra <= 10; extra += 1) {
      await reloaded.dispatch(advanceSessionThunk({ now: at(TARGET + 600 + extra) }))
    }

    expect(await localStore.performances.forEndeavor(SLIDES.id)).toHaveLength(1)
    expect(store.getState().session.phase).toBe(SessionPhase.running)
  })
})

describe('abort, under a controlled clock', () => {
  it('records an aborted attempt and returns to ready', async () => {
    const { store, localStore } = await liveSession()
    await store.dispatch(advanceSessionThunk({ now: at(120) }))
    await store.dispatch(abortSessionThunk({ now: at(120) }))

    expect(store.getState().session.phase).toBe(SessionPhase.ready)
    const rows = await localStore.performances.forEndeavor(SLIDES.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.resolution).toBe(PerformResolution.aborted)
  })

  it('clears the anchor so a fresh session can start immediately', async () => {
    const { store, localStore } = await liveSession()
    await store.dispatch(abortSessionThunk({ now: at(120) }))
    await store.dispatch(startSessionThunk({ now: at(130) }))

    expect(store.getState().session.phase).toBe(SessionPhase.running)
    expect(await localStore.runningSessionAnchor.read()).not.toBeNull()
  })

  it('never records twice, however many aborts are dispatched', async () => {
    const { store, localStore } = await liveSession()
    await store.dispatch(abortSessionThunk({ now: at(120) }))
    await store.dispatch(abortSessionThunk({ now: at(121) }))
    await store.dispatch(abortSessionThunk({ now: at(122) }))

    expect(await localStore.performances.forEndeavor(SLIDES.id)).toHaveLength(1)
  })
})

describe('finish early, under a controlled clock', () => {
  it('records a completion above the threshold and parks at concluded', async () => {
    const { store, localStore } = await liveSession()
    await store.dispatch(advanceSessionThunk({ now: at(900) }))
    await store.dispatch(finishSessionEarlyThunk({ now: at(900) }))

    expect(store.getState().session.phase).toBe(SessionPhase.concluded)
    const rows = await localStore.performances.forEndeavor(SLIDES.id)
    expect(rows[0]?.resolution).toBe(PerformResolution.complete)
  })

  it('records an abort below the threshold and returns to ready', async () => {
    const { store, localStore } = await liveSession()
    await store.dispatch(advanceSessionThunk({ now: at(60) }))
    await store.dispatch(finishSessionEarlyThunk({ now: at(60) }))

    expect(store.getState().session.phase).toBe(SessionPhase.ready)
    const rows = await localStore.performances.forEndeavor(SLIDES.id)
    expect(rows[0]?.resolution).toBe(PerformResolution.aborted)
  })

  it('records once even when the finish is dispatched three times', async () => {
    const { store, localStore } = await liveSession()
    await store.dispatch(advanceSessionThunk({ now: at(900) }))
    await Promise.all([
      store.dispatch(finishSessionEarlyThunk({ now: at(900) })),
      store.dispatch(finishSessionEarlyThunk({ now: at(900) })),
      store.dispatch(finishSessionEarlyThunk({ now: at(900) })),
    ])

    expect(await localStore.performances.forEndeavor(SLIDES.id)).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Cancellation is the one silent exit
// ---------------------------------------------------------------------------
//
// `RC-7`/`UZF-14`: a Producer never throws, so `.rejected` is a defensive
// fallback — except for a cancelled dispatch, which is not a failure and must
// never paint an exception. Every other feature in this repo returns early on
// `action.meta.aborted` (`DoFeature`, `EarnFeature`, `PlanFeature`, …); this
// slice now does too, and each arm carries the scenario that proves it.

/** The rejection RTK stamps `meta.aborted` on — what `.abort()` produces. */
const abortError = (): Error =>
  Object.assign(new Error('Aborted'), { name: 'AbortError' })

const REQUEST = 'request-id'

const rejectedArms: readonly {
  readonly name: string
  readonly reject: (error: Error) => UnknownAction
}[] = [
  {
    name: 'loadSessionPreferencesThunk',
    reject: (error) =>
      loadSessionPreferencesThunk.rejected(error, REQUEST, undefined),
  },
  {
    name: 'prepareSessionLaunchThunk',
    reject: (error) =>
      prepareSessionLaunchThunk.rejected(error, REQUEST, {
        endeavorId: SLIDES.id,
        sessionId: SLIDES.id,
      }),
  },
  {
    name: 'hydrateRunningSessionThunk',
    reject: (error) =>
      hydrateRunningSessionThunk.rejected(error, REQUEST, { now: NOW }),
  },
  {
    name: 'startSessionThunk',
    reject: (error) => startSessionThunk.rejected(error, REQUEST, { now: NOW }),
  },
  {
    name: 'pauseSessionThunk',
    reject: (error) => pauseSessionThunk.rejected(error, REQUEST, { now: NOW }),
  },
  {
    name: 'resumeSessionThunk',
    reject: (error) => resumeSessionThunk.rejected(error, REQUEST, { now: NOW }),
  },
  {
    name: 'advanceSessionThunk',
    reject: (error) =>
      advanceSessionThunk.rejected(error, REQUEST, { now: NOW }),
  },
  {
    name: 'finishSessionEarlyThunk',
    reject: (error) =>
      finishSessionEarlyThunk.rejected(error, REQUEST, { now: NOW }),
  },
  {
    name: 'abortSessionThunk',
    reject: (error) => abortSessionThunk.rejected(error, REQUEST, { now: NOW }),
  },
  {
    name: 'startBreakThunk',
    reject: (error) => startBreakThunk.rejected(error, REQUEST, { now: NOW }),
  },
  {
    name: 'endBreakThunk',
    reject: (error) => endBreakThunk.rejected(error, REQUEST, { now: NOW }),
  },
  {
    name: 'recordSessionPerformanceThunk',
    reject: (error) =>
      recordSessionPerformanceThunk.rejected(error, REQUEST, { now: NOW }),
  },
  {
    name: 'markEndeavorCompleteFromSessionThunk',
    reject: (error) =>
      markEndeavorCompleteFromSessionThunk.rejected(error, REQUEST, {
        now: NOW,
      }),
  },
  {
    name: 'syncSessionDocumentTitleThunk',
    reject: (error) =>
      syncSessionDocumentTitleThunk.rejected(error, REQUEST, { title: null }),
  },
  {
    name: 'updateSessionIdentityThunk',
    reject: (error) =>
      updateSessionIdentityThunk.rejected(error, REQUEST, {
        title: 'Renamed',
        now: NOW,
      }),
  },
]

describe('a cancelled dispatch paints no exception', () => {
  it.each(rejectedArms)(
    '$name leaves the running session exactly as it was',
    ({ reject }) => {
      const before = sessionStateMocks.running
      expect(reduce(before, reject(abortError()))).toEqual(before)
    },
  )

  it.each(rejectedArms)(
    '$name still surfaces a genuine failure, so nothing is swallowed',
    ({ reject }) => {
      const next = reduce(
        sessionStateMocks.running,
        reject(new Error('the store is unavailable')),
      )
      expect(next.load.kind).toBe('failed')
    },
  )
})

describe('the recording claim moves only forward', () => {
  it('is none while a session merely runs', async () => {
    const { store } = await liveSession()
    await store.dispatch(advanceSessionThunk({ now: at(60) }))
    expect(store.getState().session.conclusion.kind).toBe('none')
  })

  it('reaches recorded after a conclusion, and stays there', async () => {
    const { store } = await liveSession()
    await store.dispatch(advanceSessionThunk({ now: at(TARGET) }))
    expect(store.getState().session.conclusion.kind).toBe('recorded')

    await store.dispatch(recordSessionPerformanceThunk({ now: at(TARGET + 1) }))
    expect(store.getState().session.conclusion.kind).toBe('recorded')
  })

  it('releases a failed recording back to pending so it can be retried', async () => {
    const localStore = makeInMemoryLocalStore({
      endeavors: [endeavorRecordFromEndeavor(SLIDES, { now: NOW })],
    })
    const store = makeStore({ ...stubbedThunkExtra, localStore })
    await store.dispatch(loadSessionPreferencesThunk())
    await store.dispatch(
      prepareSessionLaunchThunk({ endeavorId: SLIDES.id, sessionId: SLIDES.id }),
    )
    await store.dispatch(startSessionThunk({ now: NOW }))

    localStore.performances.put = async () => {
      throw new Error('the store is unavailable')
    }
    await store.dispatch(advanceSessionThunk({ now: at(TARGET) }))

    const slice = store.getState().session
    expect(slice.conclusion.kind).toBe('pending')
    expect(slice.load.kind).toBe('failed')
  })
})
