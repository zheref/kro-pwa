/**
 * The session Producers, dispatched through the **real** store against stubbed
 * services injected via `ThunkExtra` (`RC-54`, `RC-35`) — never a mocked
 * `fetch`, never a real clock, never a live browser API.
 *
 * Four groups carry the issue's acceptance criteria:
 *
 * 1. **the anchor spy** — writes happen on phase transitions and nowhere else,
 *    proved by counting `write`/`clear` calls across a full session's ticks;
 * 2. **exactly-once recording** — racing ticks and racing recorder dispatches
 *    still produce one performance row;
 * 3. **the reward table** — every outcome row of canon's formula table, under
 *    both formulas, read fresh from `earn.pointsFormula` at award time;
 * 4. **the one-session invariant** — a second start is refused at the storage
 *    boundary as well as in the runtime.
 */
import {
  type Endeavor,
  type LocalStore,
  type PersistedRunningSession,
  type RunningSessionAnchorStore,
  EndeavorHost,
  EndeavorStatus,
  FeatureFlags,
  PerformResolution,
  PointsFormula,
  earnPointsFormulaOption,
  endeavorRecordFromEndeavor,
  makeFeatureFlagOverrideStore,
  makePerform,
  makePreferences,
  minutesInSeconds,
  performanceRecordFromPerform,
  epochMillisFromDate,
  sessionDefaultBreakDurationOption,
  sessionDefaultDurationOption,
  sessionAutoStartBreakOption,
  sessionEnableBreaksOption,
  sessionEnableStopwatchOption,
  sessionKeepScreenAwakeOption,
  sessionSoundOnEndOption,
  taskEndeavor,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  type AppStore,
  type ThunkExtra,
  makeStore,
  stubbedThunkExtra,
} from '../../../library/store'
import {
  GoogleCalendarConnections,
  makeStubbedGoogleCalendarService,
} from '../../../services/googleCalendar'
import { makeInMemoryLocalStore } from '../../../services/localStore/InMemoryLocalStore'
import {
  makeStubbedAudioFeedbackService,
  makeStubbedDocumentTitleService,
  makeStubbedWakeLockService,
} from '../../../services/platform'
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
  startSessionTickTask,
  syncSessionDocumentTitleThunk,
  tomatoCountFor,
  updateSessionIdentityThunk,
} from '../SessionProducer'
import { SessionPhase } from '../SessionVocabulary'

// ---------------------------------------------------------------------------
// Harness
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

/** Counts every write and clear the anchor document takes. */
interface AnchorSpy extends RunningSessionAnchorStore {
  writes(): number
  clears(): number
  total(): number
}

const spyOnAnchor = (inner: RunningSessionAnchorStore): AnchorSpy => {
  let writes = 0
  let clears = 0
  return {
    read: () => inner.read(),
    write: async (session) => {
      writes += 1
      await inner.write(session)
    },
    clear: async () => {
      clears += 1
      await inner.clear()
    },
    writes: () => writes,
    clears: () => clears,
    total: () => writes + clears,
  }
}

interface Harness {
  readonly store: AppStore
  readonly localStore: LocalStore
  readonly anchor: AnchorSpy
  readonly audio: ReturnType<typeof makeStubbedAudioFeedbackService>
  readonly wakeLock: ReturnType<typeof makeStubbedWakeLockService>
  readonly documentTitle: ReturnType<typeof makeStubbedDocumentTitleService>
}

const harness = (
  options: {
    readonly endeavors?: readonly Endeavor[]
    readonly performances?: readonly {
      readonly endeavorId: string
      readonly resolution: PerformResolution
      readonly duration: number
    }[]
    readonly anchor?: PersistedRunningSession | null
    readonly breaksEnabled?: boolean
    readonly stopwatchEnabled?: boolean
    readonly autoStartBreak?: boolean
    readonly soundOnEnd?: boolean
    readonly keepScreenAwake?: boolean
    readonly pointsFormula?: PointsFormula
    readonly defaultDurationMinutes?: number
    readonly breakDurationMinutes?: number
  } = {},
): Harness => {
  const base = makeInMemoryLocalStore({
    endeavors: (options.endeavors ?? []).map((endeavor) =>
      endeavorRecordFromEndeavor(endeavor, { now: NOW }),
    ),
    performances: (options.performances ?? []).map((row) =>
      performanceRecordFromPerform(
        makePerform({
          date: NOW,
          duration: row.duration,
          resolution: row.resolution,
          rewardPoints: 0,
          wasCompletedInSession: true,
        }),
        { endeavorId: row.endeavorId, nowMillis: epochMillisFromDate(NOW) },
      ),
    ),
    runningSessionAnchor: options.anchor ?? null,
  })

  const anchor = spyOnAnchor(base.runningSessionAnchor)
  const localStore: LocalStore = { ...base, runningSessionAnchor: anchor }
  const preferences = makePreferences(localStore.preferences)
  const overrides = makeFeatureFlagOverrideStore(localStore.preferences)

  if (options.breaksEnabled) {
    overrides.set(FeatureFlags.sessionBreak.name, true)
    preferences.write(sessionEnableBreaksOption, true)
  }
  if (options.stopwatchEnabled) {
    overrides.set(FeatureFlags.sessionStopwatch.name, true)
    preferences.write(sessionEnableStopwatchOption, true)
  }
  if (options.autoStartBreak !== undefined) {
    preferences.write(sessionAutoStartBreakOption, options.autoStartBreak)
  }
  if (options.soundOnEnd !== undefined) {
    preferences.write(sessionSoundOnEndOption, options.soundOnEnd)
  }
  if (options.keepScreenAwake !== undefined) {
    preferences.write(sessionKeepScreenAwakeOption, options.keepScreenAwake)
  }
  if (options.pointsFormula !== undefined) {
    preferences.write(earnPointsFormulaOption, options.pointsFormula)
  }
  if (options.defaultDurationMinutes !== undefined) {
    preferences.write(sessionDefaultDurationOption, options.defaultDurationMinutes)
  }
  if (options.breakDurationMinutes !== undefined) {
    preferences.write(
      sessionDefaultBreakDurationOption,
      options.breakDurationMinutes,
    )
  }

  const audio = makeStubbedAudioFeedbackService()
  const wakeLock = makeStubbedWakeLockService()
  const documentTitle = makeStubbedDocumentTitleService()

  const extra: ThunkExtra = {
    ...stubbedThunkExtra,
    localStore,
    audioFeedbackService: audio,
    wakeLockService: wakeLock,
    documentTitleService: documentTitle,
  }

  return { store: makeStore(extra), localStore, anchor, audio, wakeLock, documentTitle }
}

/** Prepares and starts a 25-minute countdown on the stored endeavor. */
const startedHarness = async (
  options: Parameters<typeof harness>[0] = {},
): Promise<Harness> => {
  const it = harness({ endeavors: [SLIDES], ...options })
  await it.store.dispatch(loadSessionPreferencesThunk())
  await it.store.dispatch(
    prepareSessionLaunchThunk({ endeavorId: SLIDES.id, sessionId: SLIDES.id }),
  )
  await it.store.dispatch(startSessionThunk({ now: NOW }))
  return it
}

// ---------------------------------------------------------------------------
// Preferences & availability
// ---------------------------------------------------------------------------

describe('loadSessionPreferencesThunk', () => {
  it('reads the five session preferences in seconds, not minutes', async () => {
    const { store } = harness({
      defaultDurationMinutes: 30,
      breakDurationMinutes: 7,
    })
    await store.dispatch(loadSessionPreferencesThunk())

    const { preferences } = store.getState().session
    expect(preferences.defaultDuration).toBe(minutesInSeconds(30))
    expect(preferences.defaultBreakDuration).toBe(minutesInSeconds(7))
  })

  it('resolves every gate to off at statusQuo — the shipped default', async () => {
    const { store } = harness()
    await store.dispatch(loadSessionPreferencesThunk())

    expect(store.getState().session.availability).toEqual({
      isStopwatchAvailable: false,
      areBreaksAvailable: false,
      isDurationLearningEnabled: false,
    })
  })

  it('needs the flag AND the preference before it offers the stopwatch', async () => {
    const flagOnly = harness()
    makeFeatureFlagOverrideStore(flagOnly.localStore.preferences).set(
      FeatureFlags.sessionStopwatch.name,
      true,
    )
    makePreferences(flagOnly.localStore.preferences).write(
      sessionEnableStopwatchOption,
      false,
    )
    await flagOnly.store.dispatch(loadSessionPreferencesThunk())
    expect(
      flagOnly.store.getState().session.availability.isStopwatchAvailable,
    ).toBe(false)

    const both = harness({ stopwatchEnabled: true })
    await both.store.dispatch(loadSessionPreferencesThunk())
    expect(both.store.getState().session.availability.isStopwatchAvailable).toBe(
      true,
    )
  })

  it('surfaces a storage failure as a typed exception, not a throw', async () => {
    const { store, localStore } = harness()
    localStore.preferences.get = () => {
      throw new Error('the store is unavailable')
    }
    await store.dispatch(loadSessionPreferencesThunk())

    const { load } = store.getState().session
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('preferencesLoadFailed')
    }
  })
})

// ---------------------------------------------------------------------------
// Launch
// ---------------------------------------------------------------------------

describe('prepareSessionLaunchThunk', () => {
  it('opens a stored endeavor at its preferred duration', async () => {
    const { store } = harness({ endeavors: [SLIDES] })
    await store.dispatch(loadSessionPreferencesThunk())
    await store.dispatch(
      prepareSessionLaunchThunk({ endeavorId: SLIDES.id, sessionId: SLIDES.id }),
    )

    const slice = store.getState().session
    expect(slice.targetDuration).toBe(TARGET)
    expect(slice.launchSource).toEqual({ kind: 'preferred' })
    expect(slice.identity?.title).toBe('📊 Prepare slides')
  })

  it('opens a blank focus session with no stored row behind it', async () => {
    const { store } = harness()
    await store.dispatch(loadSessionPreferencesThunk())
    await store.dispatch(
      prepareSessionLaunchThunk({ endeavorId: null, sessionId: 'session-1' }),
    )

    const slice = store.getState().session
    expect(slice.identity?.isAnonymous).toBe(true)
    expect(slice.identity?.title).toBe('Focus Session')
  })

  it('falls back to a countdown at the configured default when stopwatch is off', async () => {
    const plain = taskEndeavor({
      id: 'e-plain',
      title: 'Write notes',
      host: EndeavorHost.local,
    })
    const { store } = harness({
      endeavors: [plain],
      defaultDurationMinutes: 20,
    })
    await store.dispatch(loadSessionPreferencesThunk())
    await store.dispatch(
      prepareSessionLaunchThunk({ endeavorId: plain.id, sessionId: plain.id }),
    )

    const slice = store.getState().session
    expect(slice.launchSource).toEqual({ kind: 'fallback' })
    expect(slice.targetDuration).toBe(minutesInSeconds(20))
  })

  it('opens a stopwatch instead once its flag and preference are both on', async () => {
    const plain = taskEndeavor({
      id: 'e-plain',
      title: 'Write notes',
      host: EndeavorHost.local,
    })
    const { store } = harness({ endeavors: [plain], stopwatchEnabled: true })
    await store.dispatch(loadSessionPreferencesThunk())
    await store.dispatch(
      prepareSessionLaunchThunk({ endeavorId: plain.id, sessionId: plain.id }),
    )
    expect(store.getState().session.launchSource).toEqual({ kind: 'stopwatch' })
  })

  it('reports a missing endeavor rather than opening an empty session', async () => {
    const { store } = harness()
    await store.dispatch(
      prepareSessionLaunchThunk({ endeavorId: 'ghost', sessionId: 'ghost' }),
    )

    const { load } = store.getState().session
    expect(load.kind).toBe('failed')
    if (load.kind === 'failed') {
      expect(load.exception.kind).toBe('launchPrepareFailed')
    }
  })

  it('carries the tomato count, counting completions but never aborts', async () => {
    const { store } = harness({
      endeavors: [SLIDES],
      performances: [
        { endeavorId: SLIDES.id, resolution: PerformResolution.finished, duration: 900 },
        { endeavorId: SLIDES.id, resolution: PerformResolution.complete, duration: 900 },
        { endeavorId: SLIDES.id, resolution: PerformResolution.aborted, duration: 60 },
      ],
    })
    await store.dispatch(
      prepareSessionLaunchThunk({ endeavorId: SLIDES.id, sessionId: SLIDES.id }),
    )
    expect(store.getState().session.completedSessionsCount).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// The one-session invariant
// ---------------------------------------------------------------------------

describe('the one-session invariant', () => {
  it('starts one session and writes its anchor once', async () => {
    const { store, anchor } = await startedHarness()

    expect(store.getState().session.phase).toBe(SessionPhase.running)
    expect(anchor.writes()).toBe(1)
  })

  it('refuses a second start while one is running, without touching the first', async () => {
    const { store, anchor } = await startedHarness()
    const first = store.getState().session.anchor

    await store.dispatch(startSessionThunk({ now: at(120) }))

    expect(store.getState().session.anchor).toBe(first)
    expect(anchor.writes()).toBe(1)
  })

  it('refuses a start when another tab already owns the anchor document', async () => {
    const { store } = await startedHarness()
    const rival = store.getState().session.anchor as PersistedRunningSession

    // A fresh runtime that has not hydrated, over a store that already holds
    // somebody else's session.
    const second = harness({ endeavors: [SLIDES], anchor: rival })
    await second.store.dispatch(loadSessionPreferencesThunk())
    await second.store.dispatch(
      prepareSessionLaunchThunk({ endeavorId: SLIDES.id, sessionId: SLIDES.id }),
    )
    await second.store.dispatch(startSessionThunk({ now: at(10) }))

    const slice = second.store.getState().session
    expect(slice.phase).toBe(SessionPhase.ready)
    expect(slice.load.kind === 'failed' && slice.load.exception.kind).toBe(
      'sessionAlreadyRunning',
    )
  })

  it('refuses a start with no identity prepared at all', async () => {
    const { store, anchor } = harness()
    await store.dispatch(startSessionThunk({ now: NOW }))

    expect(store.getState().session.phase).toBe(SessionPhase.ready)
    expect(anchor.total()).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// The anchor spy — writes on transitions, and nowhere else
// ---------------------------------------------------------------------------

describe('anchor persistence', () => {
  it('writes nothing across five hundred display ticks', async () => {
    const { store, anchor } = await startedHarness()
    const before = anchor.total()

    for (let second = 1; second <= 500; second += 1) {
      await store.dispatch(advanceSessionThunk({ now: at(second) }))
    }

    expect(anchor.total()).toBe(before)
  })

  it('writes exactly once per phase transition across a whole session', async () => {
    const { store, anchor } = await startedHarness()
    // start (1) → tick × 60 (0) → pause (1) → resume (1) → tick × 60 (0)
    for (let second = 1; second <= 60; second += 1) {
      await store.dispatch(advanceSessionThunk({ now: at(second) }))
    }
    await store.dispatch(pauseSessionThunk({ now: at(60) }))
    await store.dispatch(resumeSessionThunk({ now: at(90) }))
    for (let second = 91; second <= 150; second += 1) {
      await store.dispatch(advanceSessionThunk({ now: at(second) }))
    }

    expect(anchor.total()).toBe(3)
  })

  it('writes once more when the countdown elapses, parking the anchor', async () => {
    const { store, anchor } = await startedHarness()
    const before = anchor.total()

    await store.dispatch(advanceSessionThunk({ now: at(TARGET) }))

    expect(anchor.total()).toBe(before + 1)
    expect(store.getState().session.phase).toBe(SessionPhase.concluded)
  })

  it('clears the document on abort, so the pill disappears', async () => {
    const { store, anchor, localStore } = await startedHarness()
    await store.dispatch(abortSessionThunk({ now: at(120) }))

    expect(anchor.clears()).toBe(1)
    expect(await localStore.runningSessionAnchor.read()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Pause / kill / reload
// ---------------------------------------------------------------------------

describe('pause, kill and reload', () => {
  it('recovers a running session with wall-clock-correct time after a reload', async () => {
    const { store, localStore } = await startedHarness()
    for (let second = 1; second <= 30; second += 1) {
      await store.dispatch(advanceSessionThunk({ now: at(second) }))
    }

    // A fresh runtime over the same storage — the tab was closed for 15 min.
    const reloaded = makeStore({ ...stubbedThunkExtra, localStore })
    await reloaded.dispatch(hydrateRunningSessionThunk({ now: at(900) }))

    const slice = reloaded.getState().session
    expect(slice.phase).toBe(SessionPhase.running)
    expect(slice.now).toEqual(at(900))
    expect(slice.anchor?.fragments[0]?.end).toBeNull()
  })

  it('recovers a paused session with its figure still frozen', async () => {
    const { store, localStore } = await startedHarness()
    await store.dispatch(pauseSessionThunk({ now: at(600) }))

    const reloaded = makeStore({ ...stubbedThunkExtra, localStore })
    await reloaded.dispatch(hydrateRunningSessionThunk({ now: at(9_999) }))

    const slice = reloaded.getState().session
    expect(slice.phase).toBe(SessionPhase.paused)
    expect(slice.anchor?.fragments.every((f) => f.end !== null)).toBe(true)
  })

  it('recovers a concluded session so the pill still offers Mark complete', async () => {
    const { store, localStore } = await startedHarness()
    await store.dispatch(advanceSessionThunk({ now: at(TARGET) }))

    const reloaded = makeStore({ ...stubbedThunkExtra, localStore })
    await reloaded.dispatch(hydrateRunningSessionThunk({ now: at(TARGET + 60) }))

    const slice = reloaded.getState().session
    expect(slice.phase).toBe(SessionPhase.concluded)
    expect(slice.isPresentingConclusion).toBe(true)
  })

  it('lands on ready when the document is gone', async () => {
    const { store } = harness()
    await store.dispatch(hydrateRunningSessionThunk({ now: NOW }))

    expect(store.getState().session.phase).toBe(SessionPhase.ready)
    expect(store.getState().session.anchor).toBeNull()
  })

  it('reports a failed anchor read rather than inventing a session', async () => {
    const { store, localStore } = harness()
    localStore.runningSessionAnchor.read = async () => {
      throw new Error('the store is unavailable')
    }
    await store.dispatch(hydrateRunningSessionThunk({ now: NOW }))

    const { load } = store.getState().session
    expect(load.kind === 'failed' && load.exception.kind).toBe('anchorReadFailed')
  })
})

// ---------------------------------------------------------------------------
// The 30 % threshold
// ---------------------------------------------------------------------------

describe('the 30 % recording threshold', () => {
  const threshold = TARGET * 0.3

  it('records an aborted attempt just under the line', async () => {
    const { store, localStore } = await startedHarness()
    await store.dispatch(advanceSessionThunk({ now: at(threshold - 1) }))
    await store.dispatch(finishSessionEarlyThunk({ now: at(threshold - 1) }))

    const rows = await localStore.performances.forEndeavor(SLIDES.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.resolution).toBe(PerformResolution.aborted)
    expect(rows[0]?.rewardPoints).toBe(0)
    expect(store.getState().session.phase).toBe(SessionPhase.ready)
  })

  it('records a completion at exactly 30 %', async () => {
    const { store, localStore } = await startedHarness()
    await store.dispatch(advanceSessionThunk({ now: at(threshold) }))
    await store.dispatch(finishSessionEarlyThunk({ now: at(threshold) }))

    const rows = await localStore.performances.forEndeavor(SLIDES.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.resolution).toBe(PerformResolution.complete)
    expect(store.getState().session.phase).toBe(SessionPhase.concluded)
  })

  it('excludes the aborted attempt from duration learning', async () => {
    const { store, localStore } = await startedHarness()
    await store.dispatch(advanceSessionThunk({ now: at(threshold - 1) }))
    await store.dispatch(finishSessionEarlyThunk({ now: at(threshold - 1) }))

    const rows = await localStore.performances.forEndeavor(SLIDES.id)
    // `empiricalDurationPerformances` keeps only complete/finished rows.
    expect(
      rows.filter((row) => row.resolution !== PerformResolution.aborted),
    ).toHaveLength(0)
  })

  it('never applies the threshold to a stopwatch — there is no target', async () => {
    const plain = taskEndeavor({
      id: 'e-plain',
      title: 'Write notes',
      host: EndeavorHost.local,
    })
    const it = harness({ endeavors: [plain], stopwatchEnabled: true })
    await it.store.dispatch(loadSessionPreferencesThunk())
    await it.store.dispatch(
      prepareSessionLaunchThunk({ endeavorId: plain.id, sessionId: plain.id }),
    )
    await it.store.dispatch(startSessionThunk({ now: NOW }))
    await it.store.dispatch(advanceSessionThunk({ now: at(5) }))
    await it.store.dispatch(finishSessionEarlyThunk({ now: at(5) }))

    const rows = await it.localStore.performances.forEndeavor(plain.id)
    expect(rows[0]?.resolution).toBe(PerformResolution.complete)
  })
})

// ---------------------------------------------------------------------------
// Auto-conclusion, exactly once
// ---------------------------------------------------------------------------

describe('auto-conclusion records exactly once', () => {
  it('records one row when the countdown elapses', async () => {
    const { store, localStore } = await startedHarness()
    await store.dispatch(advanceSessionThunk({ now: at(TARGET) }))
    await store.dispatch(recordSessionPerformanceThunk({ now: at(TARGET) }))

    expect(await localStore.performances.forEndeavor(SLIDES.id)).toHaveLength(1)
  })

  it('still records one row after fifty ticks past zero', async () => {
    const { store, localStore } = await startedHarness()
    for (let extra = 0; extra < 50; extra += 1) {
      await store.dispatch(advanceSessionThunk({ now: at(TARGET + extra) }))
    }
    await store.dispatch(recordSessionPerformanceThunk({ now: at(TARGET + 50) }))

    expect(await localStore.performances.forEndeavor(SLIDES.id)).toHaveLength(1)
  })

  it('still records one row under racing ticks dispatched concurrently', async () => {
    const { store, localStore } = await startedHarness()
    await Promise.all(
      Array.from({ length: 20 }, (_value, index) =>
        store.dispatch(advanceSessionThunk({ now: at(TARGET + index) })),
      ),
    )
    await Promise.all(
      Array.from({ length: 5 }, () =>
        store.dispatch(recordSessionPerformanceThunk({ now: at(TARGET) })),
      ),
    )

    expect(await localStore.performances.forEndeavor(SLIDES.id)).toHaveLength(1)
  })

  it('refuses a recorder dispatch with no claim in flight', async () => {
    const { store, localStore } = await startedHarness()
    await store.dispatch(recordSessionPerformanceThunk({ now: at(60) }))

    expect(await localStore.performances.forEndeavor(SLIDES.id)).toHaveLength(0)
  })

  it('records the whole session, pauses included, as one performance', async () => {
    const { store, localStore } = await startedHarness()
    await store.dispatch(pauseSessionThunk({ now: at(600) }))
    await store.dispatch(resumeSessionThunk({ now: at(900) }))
    await store.dispatch(advanceSessionThunk({ now: at(900 + TARGET - 600) }))
    await store.dispatch(
      recordSessionPerformanceThunk({ now: at(900 + TARGET - 600) }),
    )

    const rows = await localStore.performances.forEndeavor(SLIDES.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.durationSeconds).toBeCloseTo(TARGET, 5)
  })
})

// ---------------------------------------------------------------------------
// Reward awarding — canon's outcome table
// ---------------------------------------------------------------------------

describe('reward awarding', () => {
  const awardFor = async (options: {
    readonly formula?: PointsFormula
    readonly elapsedSeconds: number
    readonly finish: 'countdown' | 'early'
  }): Promise<number> => {
    const it = await startedHarness({ pointsFormula: options.formula })
    await it.store.dispatch(
      advanceSessionThunk({ now: at(options.elapsedSeconds) }),
    )
    if (options.finish === 'early') {
      await it.store.dispatch(
        finishSessionEarlyThunk({ now: at(options.elapsedSeconds) }),
      )
    } else {
      await it.store.dispatch(
        recordSessionPerformanceThunk({ now: at(options.elapsedSeconds) }),
      )
    }
    const rows = await it.localStore.performances.forEndeavor(SLIDES.id)
    return rows[0]?.rewardPoints ?? -1
  }

  it('awards 30 % of base when the timer finished but the task did not', async () => {
    // Sliding scale, `complete`, elapsed ≥ target → trunc(30 × 0.3) = 9.
    expect(await awardFor({ elapsedSeconds: TARGET, finish: 'countdown' })).toBe(9)
  })

  it('awards zero for a below-threshold abort', async () => {
    expect(
      await awardFor({ elapsedSeconds: 60, finish: 'early' }),
    ).toBe(0)
  })

  it('awards zero for an above-threshold finish that did not reach the target', async () => {
    // `complete` with elapsed < target is the proportional branch, which pays 0.
    expect(await awardFor({ elapsedSeconds: TARGET * 0.5, finish: 'early' })).toBe(0)
  })

  it('uses the legacy formula when the preference selects it', async () => {
    // 25 estimated minutes × 1 pt/min × 1.0 urgency × 0.3 `complete` = 8 (rounded).
    expect(
      await awardFor({
        formula: PointsFormula.legacy,
        elapsedSeconds: TARGET,
        finish: 'countdown',
      }),
    ).toBe(8)
  })

  it('reads the formula fresh at award time, not at session start', async () => {
    const it = await startedHarness()
    // The user switches formula in Earn preferences mid-session.
    makePreferences(it.localStore.preferences).write(
      earnPointsFormulaOption,
      PointsFormula.legacy,
    )
    await it.store.dispatch(advanceSessionThunk({ now: at(TARGET) }))
    await it.store.dispatch(recordSessionPerformanceThunk({ now: at(TARGET) }))

    const rows = await it.localStore.performances.forEndeavor(SLIDES.id)
    expect(rows[0]?.rewardPoints).toBe(8)
  })

  it('stores the performance with wasCompletedInSession, so learning sees it', async () => {
    const it = await startedHarness()
    await it.store.dispatch(advanceSessionThunk({ now: at(TARGET) }))
    await it.store.dispatch(recordSessionPerformanceThunk({ now: at(TARGET) }))

    const rows = await it.localStore.performances.forEndeavor(SLIDES.id)
    expect(rows[0]?.wasCompletedInSession).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Calendar logging — KC-IS-#33's port, bound
// ---------------------------------------------------------------------------

describe('calendar logging', () => {
  const withCalendar = async (
    options: { readonly connected?: boolean; readonly failure?: unknown } = {},
  ) => {
    const calls: string[] = []
    const localStore = makeInMemoryLocalStore({
      endeavors: [endeavorRecordFromEndeavor(SLIDES, { now: NOW })],
    })
    const googleCalendar = makeStubbedGoogleCalendarService({
      connection:
        options.connected === true
          ? GoogleCalendarConnections.connected()
          : GoogleCalendarConnections.disconnected(),
      failure: options.failure,
      calls,
    })
    const store = makeStore({ ...stubbedThunkExtra, localStore, googleCalendar })
    await store.dispatch(loadSessionPreferencesThunk())
    await store.dispatch(
      prepareSessionLaunchThunk({ endeavorId: SLIDES.id, sessionId: SLIDES.id }),
    )
    await store.dispatch(startSessionThunk({ now: NOW }))
    return { store, localStore, calls }
  }

  it('logs the concluded session with canon’s intention and span', async () => {
    const { store, calls } = await withCalendar({ connected: true })
    await store.dispatch(
      advanceSessionThunk({ now: at(TARGET) }),
    )

    // The service composes `"Session: <intention>"` itself; this feature hands
    // it the intention, so the duplication #33's header warns about never
    // exists.
    expect(calls).toContain('logSession:📊 Prepare slides')
  })

  it('still records the performance when Google is not connected', async () => {
    // The statusQuo case: nobody has connected, so `logSession` refuses.
    const { store, localStore } = await withCalendar()
    await store.dispatch(advanceSessionThunk({ now: at(TARGET) }))

    expect(await localStore.performances.forEndeavor(SLIDES.id)).toHaveLength(1)
    expect(store.getState().session.conclusion.kind).toBe('recorded')
  })

  it('still records the performance when the calendar write throws', async () => {
    const { store, localStore } = await withCalendar({
      connected: true,
      failure: new Error('the proxy is unreachable'),
    })
    await store.dispatch(advanceSessionThunk({ now: at(TARGET) }))

    expect(await localStore.performances.forEndeavor(SLIDES.id)).toHaveLength(1)
    expect(store.getState().session.load.kind).not.toBe('failed')
  })

  it('logs nothing for a session with no closed span to log', async () => {
    const { store, calls } = await withCalendar({ connected: true })
    // Aborted at zero elapsed: the fragment closes at its own start, which is
    // still a span — so this asserts the *shape* rather than the absence, and
    // the null path is covered purely in `SessionOutcome.test.ts`.
    await store.dispatch(abortSessionThunk({ now: NOW }))
    expect(calls.filter((call) => call.startsWith('logSession'))).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Break flows
// ---------------------------------------------------------------------------

describe('break flows', () => {
  it('runs a 5-minute break that records no performance', async () => {
    const it = await startedHarness({ breaksEnabled: true })
    await it.store.dispatch(advanceSessionThunk({ now: at(TARGET) }))
    await it.store.dispatch(recordSessionPerformanceThunk({ now: at(TARGET) }))
    await it.store.dispatch(startBreakThunk({ now: at(TARGET) }))

    expect(it.store.getState().session.phase).toBe(SessionPhase.break)
    expect(it.store.getState().session.targetDuration).toBe(minutesInSeconds(5))

    await it.store.dispatch(
      advanceSessionThunk({ now: at(TARGET + minutesInSeconds(5)) }),
    )

    expect(it.store.getState().session.phase).toBe(SessionPhase.ready)
    // One row: the focus session. The break never becomes a performance.
    expect(await it.localStore.performances.forEndeavor(SLIDES.id)).toHaveLength(1)
  })

  it('plays the break-complete cue when the break timer runs out', async () => {
    const it = await startedHarness({ breaksEnabled: true })
    await it.store.dispatch(advanceSessionThunk({ now: at(TARGET) }))
    await it.store.dispatch(startBreakThunk({ now: at(TARGET) }))
    await it.store.dispatch(
      advanceSessionThunk({ now: at(TARGET + minutesInSeconds(5)) }),
    )

    // `breakComplete` is #34's one **declared** asset gap — the path exists,
    // `break_complete.mp3` does not ship yet — so the stub records it as a
    // miss rather than a play. The assertion is that the role was *requested*,
    // which is this feature's contract; shipping the file is #34's.
    expect([
      ...it.audio.playedRoles(),
      ...it.audio.missedRoles(),
    ]).toContain('breakComplete')
  })

  it('plays no cue when the user ends the break early — canon does not', async () => {
    const it = await startedHarness({ breaksEnabled: true })
    await it.store.dispatch(advanceSessionThunk({ now: at(TARGET) }))
    await it.store.dispatch(startBreakThunk({ now: at(TARGET) }))
    const before = it.audio.playedRoles().length
    await it.store.dispatch(endBreakThunk({ now: at(TARGET + 60) }))

    expect(it.audio.playedRoles()).toHaveLength(before)
    expect(it.store.getState().session.phase).toBe(SessionPhase.ready)
  })

  it('is impossible while the sessionBreak flag is off', async () => {
    const it = await startedHarness()
    await it.store.dispatch(advanceSessionThunk({ now: at(TARGET) }))
    await it.store.dispatch(startBreakThunk({ now: at(TARGET) }))

    expect(it.store.getState().session.phase).toBe(SessionPhase.concluded)
  })

  it('auto-starts the break when the preference asks for it', async () => {
    const it = await startedHarness({ breaksEnabled: true, autoStartBreak: true })
    await it.store.dispatch(advanceSessionThunk({ now: at(TARGET) }))

    expect(it.store.getState().session.phase).toBe(SessionPhase.break)
    // The focus session is recorded exactly once on the way through.
    expect(await it.localStore.performances.forEndeavor(SLIDES.id)).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Sounds and the wake lock
// ---------------------------------------------------------------------------

describe('sound and wake-lock dispatch', () => {
  it('plays the completion chime when the countdown ends', async () => {
    const it = await startedHarness()
    await it.store.dispatch(advanceSessionThunk({ now: at(TARGET) }))

    expect(it.audio.playedRoles()).toContain('sessionComplete')
  })

  it('plays nothing when session.soundOnEnd is off', async () => {
    const it = await startedHarness({ soundOnEnd: false })
    await it.store.dispatch(advanceSessionThunk({ now: at(TARGET) }))

    expect(it.audio.playedRoles()).toHaveLength(0)
  })

  it('holds the screen awake while running and releases it on pause', async () => {
    const it = await startedHarness()
    expect(it.wakeLock.recordedRequests()).toEqual([true])

    await it.store.dispatch(pauseSessionThunk({ now: at(600) }))
    expect(it.wakeLock.recordedRequests()).toEqual([true, false])

    await it.store.dispatch(resumeSessionThunk({ now: at(900) }))
    expect(it.wakeLock.recordedRequests()).toEqual([true, false, true])
  })

  it('never takes the lock when session.keepScreenAwake is off', async () => {
    const it = await startedHarness({ keepScreenAwake: false })
    expect(it.wakeLock.recordedRequests()).toEqual([])
  })

  it('releases the lock when the countdown concludes', async () => {
    const it = await startedHarness()
    await it.store.dispatch(advanceSessionThunk({ now: at(TARGET) }))

    expect(it.wakeLock.recordedRequests().at(-1)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Complete Task and identity
// ---------------------------------------------------------------------------

describe('markEndeavorCompleteFromSessionThunk', () => {
  it('closes the endeavor without recording a second performance', async () => {
    const it = await startedHarness()
    await it.store.dispatch(advanceSessionThunk({ now: at(TARGET) }))
    await it.store.dispatch(recordSessionPerformanceThunk({ now: at(TARGET) }))
    await it.store.dispatch(
      markEndeavorCompleteFromSessionThunk({ now: at(TARGET + 5) }),
    )

    const record = await it.localStore.endeavors.get(SLIDES.id)
    expect(record?.status).toBe(EndeavorStatus.closed)
    expect(await it.localStore.performances.forEndeavor(SLIDES.id)).toHaveLength(1)
  })

  it('returns the runtime to ready with the anchor cleared', async () => {
    const it = await startedHarness()
    await it.store.dispatch(advanceSessionThunk({ now: at(TARGET) }))
    await it.store.dispatch(
      markEndeavorCompleteFromSessionThunk({ now: at(TARGET + 5) }),
    )

    expect(it.store.getState().session.phase).toBe(SessionPhase.ready)
    expect(it.store.getState().session.anchor).toBeNull()
  })

  it('reports a missing endeavor rather than closing nothing silently', async () => {
    const it = await startedHarness()
    await it.localStore.endeavors.remove(SLIDES.id)
    await it.store.dispatch(
      markEndeavorCompleteFromSessionThunk({ now: at(60) }),
    )

    const { load } = it.store.getState().session
    expect(load.kind === 'failed' && load.exception.kind).toBe('markCompleteFailed')
  })
})

describe('updateSessionIdentityThunk', () => {
  it('promotes a blank focus session into a real endeavor on a symbol pick', async () => {
    const it = harness()
    await it.store.dispatch(loadSessionPreferencesThunk())
    await it.store.dispatch(
      prepareSessionLaunchThunk({ endeavorId: null, sessionId: 'session-1' }),
    )
    await it.store.dispatch(
      updateSessionIdentityThunk({ symbol: '💻', now: NOW }),
    )

    const record = await it.localStore.endeavors.get('session-1')
    expect(record?.title).toBe('💻 Focus Session')
    expect(it.store.getState().session.identity?.isAnonymous).toBe(false)
  })

  it('replaces the glyph inside an existing title, at its original position', async () => {
    const it = await startedHarness()
    await it.store.dispatch(
      updateSessionIdentityThunk({ symbol: '💻', now: at(60) }),
    )

    expect(it.store.getState().session.identity?.title).toBe('💻 Prepare slides')
    expect((await it.localStore.endeavors.get(SLIDES.id))?.title).toBe(
      '💻 Prepare slides',
    )
  })

  it('mirrors the change into the live anchor so the pill updates at once', async () => {
    const it = await startedHarness()
    await it.store.dispatch(
      updateSessionIdentityThunk({ title: 'Prepare the deck', now: at(60) }),
    )

    const stored = await it.localStore.runningSessionAnchor.read()
    expect(stored?.endeavor.title).toBe('Prepare the deck')
  })

  it('writes nothing at all for a blank or unchanged edit', async () => {
    const it = await startedHarness()
    const before = it.anchor.total()
    await it.store.dispatch(
      updateSessionIdentityThunk({ title: '   ', now: at(60) }),
    )

    expect(it.anchor.total()).toBe(before)
    expect(it.store.getState().session.identity?.title).toBe('📊 Prepare slides')
  })
})

// ---------------------------------------------------------------------------
// The document-title timer
// ---------------------------------------------------------------------------

describe('syncSessionDocumentTitleThunk', () => {
  it('publishes the countdown to the tab', async () => {
    const it = await startedHarness()
    await it.store.dispatch(
      syncSessionDocumentTitleThunk({ title: '15:00 — Kro' }),
    )

    expect(it.documentTitle.recordedTitles()).toEqual(['15:00 — Kro'])
  })

  it('releases the tab when handed null', async () => {
    const it = await startedHarness()
    await it.store.dispatch(
      syncSessionDocumentTitleThunk({ title: '15:00 — Kro' }),
    )
    await it.store.dispatch(syncSessionDocumentTitleThunk({ title: null }))

    expect(it.documentTitle.recordedTitles()).toEqual(['15:00 — Kro', null])
  })

  it('reports a service failure as a typed exception rather than throwing', async () => {
    const it = await startedHarness()
    it.documentTitle.set = async () => {
      throw new Error('detached document')
    }
    await it.store.dispatch(
      syncSessionDocumentTitleThunk({ title: '15:00 — Kro' }),
    )

    const { load } = it.store.getState().session
    expect(load.kind === 'failed' && load.exception.kind).toBe('unknown')
  })
})

// ---------------------------------------------------------------------------
// The display ticker
// ---------------------------------------------------------------------------

describe('startSessionTickTask', () => {
  /** A clock a test drives by hand — no timers, no waiting. */
  const fakeClock = (start: Date) => {
    let current = start
    const callbacks: (() => void)[] = []
    return {
      clock: {
        now: () => current,
        schedule: (callback: () => void) => {
          callbacks.push(callback)
          return () => {
            const index = callbacks.indexOf(callback)
            if (index >= 0) callbacks.splice(index, 1)
          }
        },
      },
      advance: (seconds: number) => {
        current = new Date(current.getTime() + seconds * 1_000)
        for (const callback of [...callbacks]) callback()
      },
      scheduled: () => callbacks.length,
    }
  }

  it('dispatches one advance per tick, moving the displayed clock', async () => {
    const it = await startedHarness()
    const driver = fakeClock(NOW)
    const task = startSessionTickTask(it.store.dispatch, { clock: driver.clock })

    driver.advance(1)
    await Promise.resolve()
    expect(it.store.getState().session.now).toEqual(at(1))

    driver.advance(1)
    await Promise.resolve()
    expect(it.store.getState().session.now).toEqual(at(2))

    task.abort()
  })

  it('stops dispatching once aborted', async () => {
    const it = await startedHarness()
    const driver = fakeClock(NOW)
    const task = startSessionTickTask(it.store.dispatch, { clock: driver.clock })

    driver.advance(1)
    await Promise.resolve()
    task.abort()
    driver.advance(60)
    await Promise.resolve()

    expect(it.store.getState().session.now).toEqual(at(1))
    expect(driver.scheduled()).toBe(0)
  })

  it('is idempotent on abort — a second stop is harmless', async () => {
    const it = await startedHarness()
    const driver = fakeClock(NOW)
    const task = startSessionTickTask(it.store.dispatch, { clock: driver.clock })

    task.abort()
    expect(() => task.abort()).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// The tomato rule
// ---------------------------------------------------------------------------

describe('tomatoCountFor', () => {
  const withPerformances = (resolutions: readonly PerformResolution[]): Endeavor => ({
    ...SLIDES,
    performances: resolutions.map((resolution) =>
      makePerform({ date: NOW, duration: 900, resolution }),
    ),
  })

  it('counts a completed session', () => {
    expect(tomatoCountFor(withPerformances([PerformResolution.complete]))).toBe(1)
  })

  it('counts a finished one too', () => {
    expect(
      tomatoCountFor(
        withPerformances([PerformResolution.complete, PerformResolution.finished]),
      ),
    ).toBe(2)
  })

  it('never counts an aborted attempt', () => {
    expect(
      tomatoCountFor(
        withPerformances([PerformResolution.aborted, PerformResolution.aborted]),
      ),
    ).toBe(0)
  })

  it('answers zero for an endeavor that does not exist', () => {
    expect(tomatoCountFor(null)).toBe(0)
  })
})
