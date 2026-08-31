/**
 * The session feature's Producers (`RC-3`, `RC-6`, `RC-7`, `RC-25`, `RC-27`) —
 * the port of `SessionSetupProducer.swift` plus the `MainFeature` arms that
 * actually record a performance, award its points and close the endeavor.
 *
 * ## The shape every lifecycle thunk shares, and why
 *
 * **The transition is decided synchronously in `.pending`; the payload creator
 * does only I/O.**
 *
 * ```
 * dispatch(pauseSessionThunk({ now }))
 *   → .pending   → Object.assign(state, withSessionPaused(state, now))   [pure, atomic]
 *   → creator    → write the anchor as state now holds it; fire the cues  [effects]
 *   → .fulfilled → nothing, or the exception on failure
 * ```
 *
 * RTK dispatches `.pending` **synchronously**, inside the `dispatch(...)` call,
 * before the payload creator's first line runs. That is what makes the
 * exactly-once guarantees structural rather than hopeful: two ticks racing to
 * observe the same countdown reaching zero are serialized by the dispatch
 * queue, so the first claims the conclusion and the second finds a claim
 * already in flight. Deciding the transition inside the async creator instead
 * would reopen exactly that race.
 *
 * The creator then persists **whatever state holds**, rather than recomputing
 * the transition — so the document on disk and the runtime can never disagree
 * about which fragments were closed.
 *
 * ## Anchor writes happen on transitions, and only on transitions
 *
 * `writeAnchorFor` is called from the arms that move the phase. The display
 * tick (`advanceSessionThunk`) calls it **only when the tick produced a
 * transition** — which is why a 25-minute session performs a handful of writes
 * rather than fifteen hundred (`docs/Features/Session.md` § Persistence;
 * #10's `RunningSessionAnchorStore` header). The one non-phase write is an
 * identity edit during a live session, which canon performs too — see
 * `withIdentityApplied`.
 *
 * ## Why sounds and the wake lock go through the platform feature's thunks
 *
 * `playSessionSoundThunk` and `setScreenAwakeThunk` already hold canon's
 * preference gates (`session.soundOnEnd`, `session.keepScreenAwake`), read
 * fresh at the effect site. `PlatformProducer`'s own header states that it
 * consolidated those checks so *"a caller that forgets it"* cannot exist — and
 * names this feature as the caller it was built for. Re-reading the two
 * preferences here would recreate precisely the divergence that consolidation
 * removed, so these thunks dispatch the platform ones instead. That is Producer
 * composition, not a cross-slice state import (`RC-20` forbids reading another
 * slice's shape; nothing here does).
 *
 * ## Nothing here reads a clock
 *
 * Every thunk takes `now` as an argument, exactly as `DoProducer`,
 * `EarnProducer` and `EndeavorDetailProducer` do. The one clock in the feature
 * is injected into `startSessionTickTask` at the bottom of this file, and a
 * suite passes a fake.
 */
import {
  type Endeavor,
  type EndeavorRecord,
  type LocalStore,
  type Perform,
  type PersistedRunningSession,
  type Result,
  type SessionLaunchRecommendation,
  EndeavorStatus,
  FocusTimerMode,
  PerformResolution,
  awardRewardPoints,
  deferFromRecord,
  earnPointsFormulaOption,
  endeavorFromRecord,
  endeavorRecordFromEndeavor,
  epochMillisFromDate,
  err,
  isGateAvailable,
  livingChildRecords,
  makeFeatureFlagOverrideStore,
  makeHardcodedFeatureFlagService,
  makePerform,
  makePreferences,
  makeReconciliationContext,
  minutesInSeconds,
  ok,
  performFromRecord,
  performanceRecordFromPerform,
  pointsFormulaFromRawValue,
  preferenceBool,
  preferenceInt,
  preferencePick,
  resolveFinishEarlyOutcome,
  resolvedKind,
  sessionAutoStartBreakOption,
  sessionBreaksGate,
  sessionDefaultBreakDurationOption,
  sessionDefaultDurationOption,
  sessionDurationLearningGate,
  sessionKeepScreenAwakeOption,
  sessionLaunchRecommendation,
  sessionSoundOnEndOption,
  sessionStopwatchGate,
  overridesAsAssignments,
  toPerformFragment,
  withAddedPerformance,
} from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { AppDispatch, RootState, ThunkExtra } from '../../library/store'
import {
  playSessionSoundThunk,
  setScreenAwakeThunk,
} from '../platform/PlatformProducer'
import {
  type SessionException,
  SessionExceptions,
  sessionExceptionMessage,
} from './SessionException'
import {
  type SessionIdentity,
  anonymousSessionIdentity,
  identityWithSymbol,
  identityWithTitle,
  isCommittableSessionTitle,
  promotedEndeavorForIdentity,
  sessionIdentityForEndeavor,
  trimSessionTitle,
} from './SessionIdentity'
import {
  type SessionCalendarLog,
  type SessionOutcome,
  SessionOutcomeReason,
  sessionCalendarLogFor,
} from './SessionOutcome'
import type {
  SessionAvailability,
  SessionPreferences,
  SessionState,
} from './SessionState'
import { SessionPhase } from './SessionVocabulary'

type SessionResult<T> = Result<T, SessionException>

/** The narrow, named read `RC-3` sanctions — this slice and nothing else. */
const sessionOf = (getState: () => unknown): SessionState =>
  (getState() as RootState).session

// ---------------------------------------------------------------------------
// Storage helpers — the same two every feature that touches endeavors carries
// ---------------------------------------------------------------------------

/** Hydrates one stored endeavor with its two child relations. */
const readEndeavor = async (
  localStore: LocalStore,
  endeavorId: string,
): Promise<Endeavor | null> => {
  const record = await localStore.endeavors.get(endeavorId)
  if (record === null) return null
  const [deferRecords, performanceRecords] = await Promise.all([
    localStore.defers.forEndeavor(endeavorId),
    localStore.performances.forEndeavor(endeavorId),
  ])
  const hydrated = endeavorFromRecord(record, {
    defers: livingChildRecords(deferRecords).map(deferFromRecord),
    performances: livingChildRecords(performanceRecords).map(performFromRecord),
  })
  return hydrated.ok ? hydrated.value : null
}

/**
 * Rewrites one stored endeavor, preserving its sync watermark — dropping
 * `lastSyncedAtEpochMillis` would present an already-synced row to the next
 * push sweep as if it had never left the device.
 */
const persistEndeavor = async (
  localStore: LocalStore,
  endeavor: Endeavor,
  now: Date,
): Promise<void> => {
  const context = makeReconciliationContext({ now })
  const existing: EndeavorRecord | null = await localStore.endeavors.get(
    endeavor.id,
  )
  await localStore.endeavors.put(
    endeavorRecordFromEndeavor(endeavor, {
      now,
      lastSyncedAtEpochMillis: existing?.lastSyncedAtEpochMillis ?? null,
      resolvedKind: resolvedKind(endeavor, context),
    }),
  )
}

/**
 * Canon's `completedSessionsCount(forEndeavorId:)` — the tomato row.
 * `complete` and `finished` count; `aborted` does not
 * (`docs/Features/Session.md`: *"Aborted attempts are not counted"*).
 */
export const tomatoCountFor = (endeavor: Endeavor | null): number =>
  endeavor === null
    ? 0
    : endeavor.performances.filter(
        (performance) => performance.resolution !== PerformResolution.aborted,
      ).length

/**
 * Writes the anchor as the runtime now holds it, or clears it when the session
 * has ended. Call from a phase transition; never from a tick that produced none.
 */
const writeAnchorFor = async (
  extra: ThunkExtra,
  anchor: PersistedRunningSession | null,
): Promise<void> => {
  if (anchor === null) {
    await extra.localStore.runningSessionAnchor.clear()
    return
  }
  await extra.localStore.runningSessionAnchor.write(anchor)
}

/** The flag service, built the way `PlatformProducer` builds it (#11 + #34). */
const flagServiceFor = (extra: ThunkExtra) =>
  makeHardcodedFeatureFlagService({
    overrides: overridesAsAssignments(
      makeFeatureFlagOverrideStore(extra.localStore.preferences).all(),
    ),
  })

// ---------------------------------------------------------------------------
// Preferences & availability
// ---------------------------------------------------------------------------

export interface SessionSetupInputs {
  readonly preferences: SessionPreferences
  readonly availability: SessionAvailability
}

/**
 * Canon's `sessionSetupInputs` — the five `session.*` preferences and the three
 * gates, in one pass.
 *
 * The gates are #11's named `FeatureGate`s, resolved through `isGateAvailable`
 * rather than re-spelled: canon writes `ff.state(.sessionStopwatch) == .enabled
 * && settingsProvider.bool(.sessionEnableStopwatch)` inline at each site, and
 * the port made it a gate *precisely* so a second site could not quietly check
 * one half. Duration learning is flag-only, and its gate carries an empty
 * option list to say so.
 *
 * At `statusQuo` all three flags are disabled, so this resolves to
 * countdown-only, no breaks, no learning — the shipped behaviour.
 */
export const loadSessionPreferencesThunk = createAsyncThunk<
  SessionResult<SessionSetupInputs>,
  void,
  { extra: ThunkExtra }
>('session/onSessionPreferencesLoadCompleted', async (_arg, { extra }) => {
  try {
    const store = extra.localStore.preferences
    const preferences = makePreferences(store)
    const flags = flagServiceFor(extra)

    return ok({
      preferences: {
        defaultDuration: minutesInSeconds(
          preferenceInt(preferences, sessionDefaultDurationOption),
        ),
        defaultBreakDuration: minutesInSeconds(
          preferenceInt(preferences, sessionDefaultBreakDurationOption),
        ),
        autoStartBreak: preferenceBool(preferences, sessionAutoStartBreakOption),
        keepScreenAwake: preferenceBool(
          preferences,
          sessionKeepScreenAwakeOption,
        ),
        soundOnEnd: preferenceBool(preferences, sessionSoundOnEndOption),
      },
      availability: {
        isStopwatchAvailable: isGateAvailable(
          sessionStopwatchGate,
          flags,
          preferences,
        ),
        areBreaksAvailable: isGateAvailable(
          sessionBreaksGate,
          flags,
          preferences,
        ),
        isDurationLearningEnabled: isGateAvailable(
          sessionDurationLearningGate,
          flags,
          preferences,
        ),
      },
    })
  } catch (error) {
    return err(
      SessionExceptions.preferencesLoadFailed(sessionExceptionMessage(error)),
    )
  }
})

// ---------------------------------------------------------------------------
// Launch
// ---------------------------------------------------------------------------

export interface SessionLaunchPreparation {
  readonly identity: SessionIdentity
  readonly recommendation: SessionLaunchRecommendation
  readonly completedSessionsCount: number
}

/**
 * The ready-phase setup every launch surface shares — canon's
 * `sessionSetupState(for:)`.
 *
 * `endeavorId === null` raises a **blank focus session**: no stored row, an id
 * the caller minted, and the fallback recommendation. Editing its title or
 * symbol later promotes it (`updateSessionIdentityThunk`).
 *
 * The recommendation is #8's `sessionLaunchRecommendation`, handed the two
 * gates it needs. With duration learning off — the `statusQuo` default — an
 * endeavor with plenty of history still opens at its preferred duration or the
 * configured fallback, never an empirical one, which is exactly what the flag
 * being off is supposed to mean.
 */
export const prepareSessionLaunchThunk = createAsyncThunk<
  SessionResult<SessionLaunchPreparation>,
  {
    readonly endeavorId: string | null
    /** The id a blank focus session takes. Callers mint ids, never this tier. */
    readonly sessionId: string
    readonly symbol?: string
  },
  { extra: ThunkExtra; state: RootState }
>(
  'session/onSessionLaunchPrepareCompleted',
  async ({ endeavorId, sessionId, symbol }, { extra, getState }) => {
    try {
      const slice = sessionOf(getState)
      const stopwatch = slice.availability.isStopwatchAvailable
      const learning = slice.availability.isDurationLearningEnabled
      const fallback = slice.preferences.defaultDuration

      if (endeavorId === null) {
        const identity = anonymousSessionIdentity(sessionId)
        return ok({
          identity,
          recommendation: sessionLaunchRecommendation(
            promotedEndeavorForIdentity(identity, new Date(0)),
            {
              isStopwatchAvailable: stopwatch,
              isDurationLearningEnabled: learning,
              fallbackDuration: fallback,
            },
          ),
          completedSessionsCount: 0,
        })
      }

      const endeavor = await readEndeavor(extra.localStore, endeavorId)
      if (endeavor === null) {
        return err(
          SessionExceptions.launchPrepareFailed(
            `No endeavor with id '${endeavorId}' is stored.`,
          ),
        )
      }

      return ok({
        identity: sessionIdentityForEndeavor(endeavor, symbol),
        recommendation: sessionLaunchRecommendation(endeavor, {
          isStopwatchAvailable: stopwatch,
          isDurationLearningEnabled: learning,
          fallbackDuration: fallback,
        }),
        completedSessionsCount: tomatoCountFor(endeavor),
      })
    } catch (error) {
      return err(
        SessionExceptions.launchPrepareFailed(sessionExceptionMessage(error)),
      )
    }
  },
)

// ---------------------------------------------------------------------------
// Reload recovery
// ---------------------------------------------------------------------------

export interface SessionHydration {
  readonly anchor: PersistedRunningSession | null
  readonly identity: SessionIdentity | null
  readonly completedSessionsCount: number
  /**
   * Whether this conclusion's performance row is already on disk — the one
   * fact `withAnchorHydrated` needs and a pure Shifter cannot read.
   */
  readonly isConclusionRecorded: boolean
}

/**
 * Whether the concluded anchor's performance has already been written.
 *
 * The session's **first fragment start** is its identity here:
 * `recordSessionPerformanceThunk` writes exactly that instant as the row's
 * `date`, and two sessions of one endeavor cannot begin at the same
 * millisecond. That is what lets a reload tell "concluded, never recorded"
 * (rebuild the claim, the performance is still owed) from "concluded, already
 * recorded" (leave it alone) — and it is why re-hydrating any number of times
 * still yields exactly one row.
 *
 * A running/paused/break anchor is never a conclusion, so it answers `false`
 * and the caller's phase test does the rest.
 */
const isConclusionRecordedFor = (
  endeavor: Endeavor | null,
  anchor: PersistedRunningSession,
): boolean => {
  const start = anchor.fragments[0]?.start
  if (endeavor === null || start === undefined) return false
  return endeavor.performances.some(
    (performance) => performance.date.getTime() === start.getTime(),
  )
}

/**
 * Reload recovery — `docs/Features/Session.md` flow 5, *"Resume across an app
 * kill"*.
 *
 * Dispatched by the shell on boot, before first paint. It re-reads the anchor,
 * rebuilds the runtime around it and stamps `now`, so the pill's very first
 * frame shows a wall-clock-correct figure rather than the number the tab held
 * when it was closed. Nothing is recomputed *into* the anchor: elapsed time is
 * derived from the fragments on every read, which is what makes the recovery
 * correct for an arbitrary gap.
 *
 * A corrupt document decodes to `null` (#10's decision, not this file's) and
 * lands the user on `ready` — the one state a cleared anchor already means.
 *
 * It also answers the one question a **concluded** document raises: was its
 * performance ever written? The anchor is persisted at `concluded` *before* the
 * recorder runs, so a reload in that window (or after a record that failed)
 * recovers a session that still owes a row. `isConclusionRecorded` is what lets
 * `withAnchorHydrated` rebuild the claim in the first case and leave it alone
 * in the second — exactly once, however many reloads happen.
 */
export const hydrateRunningSessionThunk = createAsyncThunk<
  SessionResult<SessionHydration>,
  { readonly now: Date },
  { extra: ThunkExtra }
>('session/onRunningSessionHydrationCompleted', async (_arg, { extra }) => {
  try {
    const anchor = await extra.localStore.runningSessionAnchor.read()
    if (anchor === null) {
      return ok({
        anchor: null,
        identity: null,
        completedSessionsCount: 0,
        isConclusionRecorded: false,
      })
    }
    const endeavor = await readEndeavor(extra.localStore, anchor.endeavor.id)
    return ok({
      anchor,
      isConclusionRecorded: isConclusionRecordedFor(endeavor, anchor),
      identity:
        endeavor === null
          ? {
              endeavorId: anchor.endeavor.id,
              symbol: anchor.endeavor.symbol,
              title: anchor.endeavor.title,
              duration: anchor.endeavor.duration,
              isAnonymous: true,
            }
          : sessionIdentityForEndeavor(endeavor, anchor.endeavor.symbol),
      completedSessionsCount: tomatoCountFor(endeavor),
    })
  } catch (error) {
    return err(
      SessionExceptions.anchorReadFailed(sessionExceptionMessage(error)),
    )
  }
})

// ---------------------------------------------------------------------------
// The phase machine
// ---------------------------------------------------------------------------

/**
 * Canon's `userDidTapPlay`.
 *
 * The **one-session invariant** is enforced twice, and neither is a check a
 * caller could skip:
 *
 * - `condition` refuses synchronously while the runtime already holds an
 *   anchor, so the thunk never even reaches `.pending`;
 * - the creator re-reads the **stored** anchor and refuses if one is there,
 *   which is what stops a second browser tab from starting a rival session
 *   against the same single-key document.
 *
 * On the second refusal the runtime rolls back to `ready`, because `.pending`
 * has already started the session optimistically — a session that was never
 * persisted must not go on counting down.
 *
 * ## Why the anchor is read twice, and what `ok(null)` means
 *
 * This is the one creator in the file with an `await` **between** the
 * transition and the write it owes. Persisting the anchor captured before that
 * `await` resurrects a session the user has already ended: abort clears the
 * runtime anchor synchronously and its own creator clears the document, and a
 * start still suspended on the rival-tab read would then write the stale value
 * straight back — a ghost session the next reload hydrates and counts down.
 *
 * So the value written is the one the runtime holds **at the write site**,
 * which is the pattern this whole file states ("the creator persists whatever
 * state holds") rather than a new one; `sessionOf` is the narrow, named read
 * `RC-3` sanctions, not a whole-state reach. When the runtime has moved on, the
 * start resolves `ok(null)` — nothing was persisted, nothing is claimed, and
 * the `.fulfilled` arm leaves the abort's own state exactly where it is. It is
 * deliberately **not** an `err`: `withSessionStartRefused` would roll the
 * runtime back through `conclusion: none` and throw away the aborted attempt's
 * claim before it could be recorded.
 */
export const startSessionThunk = createAsyncThunk<
  SessionResult<PersistedRunningSession | null>,
  { readonly now: Date },
  { extra: ThunkExtra; state: RootState }
>(
  'session/onSessionStartCompleted',
  async (_arg, { extra, dispatch, getState }) => {
    const started = sessionOf(getState).anchor
    if (started === null) return err(SessionExceptions.noRunningSession())
    try {
      const stored = await extra.localStore.runningSessionAnchor.read()
      // `condition` proved this tab held no anchor, and hydration installs any
      // document that exists — so a document here belongs to somebody else
      // (a second tab). Ours has not been written yet, so refusing costs
      // nothing and is the only way the single-key document stays one session.
      if (stored !== null) {
        return err(SessionExceptions.sessionAlreadyRunning())
      }
      // The read was awaited; the runtime may have been aborted, concluded or
      // restarted while it was in flight. Write what state holds now, or
      // nothing at all — never the value captured above (see the header).
      const live = sessionOf(getState).anchor
      if (live === null || live !== started) return ok(null)
      await writeAnchorFor(extra, live)
      await dispatch(setScreenAwakeThunk({ enabled: true }))
      return ok(live)
    } catch (error) {
      return err(
        SessionExceptions.anchorWriteFailed(sessionExceptionMessage(error)),
      )
    }
  },
  {
    condition: (_arg, { getState }) => {
      const slice = sessionOf(getState as () => unknown)
      return slice.anchor === null && slice.identity !== null
    },
  },
)

/** Canon's `userDidTapPause` — freeze, persist, release the screen. */
export const pauseSessionThunk = createAsyncThunk<
  SessionResult<PersistedRunningSession>,
  { readonly now: Date },
  { extra: ThunkExtra; state: RootState }
>(
  'session/onSessionPauseCompleted',
  async (_arg, { extra, dispatch, getState }) => {
    const anchor = sessionOf(getState).anchor
    if (anchor === null) return err(SessionExceptions.noRunningSession())
    try {
      await writeAnchorFor(extra, anchor)
      await dispatch(setScreenAwakeThunk({ enabled: false }))
      return ok(anchor)
    } catch (error) {
      return err(
        SessionExceptions.anchorWriteFailed(sessionExceptionMessage(error)),
      )
    }
  },
)

/** Canon's `userDidTapResume` — a fresh fragment, persisted, screen held again. */
export const resumeSessionThunk = createAsyncThunk<
  SessionResult<PersistedRunningSession>,
  { readonly now: Date },
  { extra: ThunkExtra; state: RootState }
>(
  'session/onSessionResumeCompleted',
  async (_arg, { extra, dispatch, getState }) => {
    const anchor = sessionOf(getState).anchor
    if (anchor === null) return err(SessionExceptions.noRunningSession())
    try {
      await writeAnchorFor(extra, anchor)
      await dispatch(setScreenAwakeThunk({ enabled: true }))
      return ok(anchor)
    } catch (error) {
      return err(
        SessionExceptions.anchorWriteFailed(sessionExceptionMessage(error)),
      )
    }
  },
)

/**
 * What one display tick did — the report `advanceSessionThunk` resolves so a
 * suite can assert on the *absence* of a write rather than on state.
 */
export interface SessionTickReport {
  /** Whether the tick moved the phase, and therefore wrote the anchor. */
  readonly didTransition: boolean
  /** How many times this tick wrote or cleared the anchor document. 0 or 1. */
  readonly anchorWrites: number
}

/**
 * The display tick — canon's `._timerTicked`, driven by `startSessionTickTask`.
 *
 * `.pending` runs `withDisplayAdvanced` synchronously, which is where the
 * countdown-elapsed decision and its exactly-once claim happen. The creator
 * then does only what a transition owes: persist the anchor once, play the
 * terminal cue once, release the screen, and hand the conclusion to the
 * recorder.
 *
 * An ordinary tick — the overwhelming majority — transitions nothing and
 * therefore **writes nothing**. That is the property the anchor spy pins.
 */
export const advanceSessionThunk = createAsyncThunk<
  SessionResult<SessionTickReport>,
  { readonly now: Date },
  { extra: ThunkExtra; state: RootState }
>(
  'session/onDisplayTickCompleted',
  async ({ now }, { extra, dispatch, getState }) => {
    const slice = sessionOf(getState)
    try {
      if (slice.conclusion.kind === 'pending') {
        // The claim was made by this tick's own `.pending` arm: park the
        // concluded anchor, silence the screen, sound the chime, record once.
        await writeAnchorFor(extra, slice.anchor)
        await dispatch(setScreenAwakeThunk({ enabled: false }))
        await dispatch(playSessionSoundThunk({ role: 'sessionComplete' }))
        // Canon dispatches `taskMarkedComplete` straight from `._timerTicked`,
        // unconditionally — the whole session is recorded the instant it
        // concludes, *before* the user is offered Complete / Start New /
        // Break. Recording here rather than at the choice is what makes
        // "choosing … never records a duplicate" true by construction.
        await dispatch(recordSessionPerformanceThunk({ now }))
        if (
          slice.preferences.autoStartBreak &&
          slice.availability.areBreaksAvailable
        ) {
          // Canon's auto-start branch: the fragment is already closed, so the
          // recorded performance is identical to the manual conclude → Break
          // path, and only the presentation differs.
          await dispatch(startBreakThunk({ now }))
        }
        return ok({ didTransition: true, anchorWrites: 1 })
      }

      if (slice.conclusion.kind === 'breakElapsed') {
        await writeAnchorFor(extra, null)
        await dispatch(setScreenAwakeThunk({ enabled: false }))
        await dispatch(playSessionSoundThunk({ role: 'breakComplete' }))
        return ok({ didTransition: true, anchorWrites: 1 })
      }

      return ok({ didTransition: false, anchorWrites: 0 })
    } catch (error) {
      return err(
        SessionExceptions.anchorWriteFailed(sessionExceptionMessage(error)),
      )
    }
  },
)

/**
 * Canon's `userDidTapFinishEarly`, whose **30 % threshold** decides which of
 * two very different things happens.
 *
 * The decision itself is #8's `resolveFinishEarlyOutcome` — consumed, not
 * reimplemented — so the comparison stays `elapsed >= target * 0.3` with
 * *exactly* 30 % passing, and stopwatch sessions always passing because there
 * is no target to fall short of. `.pending` applies the matching Shifter; this
 * creator only persists and sounds.
 *
 * Below threshold the session closes outright and records an **aborted
 * attempt** — recorded (so the history is honest), zero points under both
 * formulas, and excluded from duration learning by
 * `empiricalDurationPerformances`. Above it the session parks at `concluded`
 * and the user picks Complete / Start New / Break.
 */
export const finishSessionEarlyThunk = createAsyncThunk<
  SessionResult<{ readonly metThreshold: boolean }>,
  { readonly now: Date },
  { extra: ThunkExtra; state: RootState }
>(
  'session/onSessionFinishEarlyCompleted',
  async ({ now }, { extra, dispatch, getState }) => {
    const slice = sessionOf(getState)
    const metThreshold = slice.phase !== SessionPhase.ready
    try {
      await writeAnchorFor(extra, slice.anchor)
      await dispatch(setScreenAwakeThunk({ enabled: false }))
      if (metThreshold) {
        await dispatch(playSessionSoundThunk({ role: 'sessionComplete' }))
      }
      await dispatch(recordSessionPerformanceThunk({ now }))
      return ok({ metThreshold })
    } catch (error) {
      return err(
        SessionExceptions.anchorWriteFailed(sessionExceptionMessage(error)),
      )
    }
  },
)

/** Canon's `userDidTapAbort` — close, clear, record an aborted attempt. */
export const abortSessionThunk = createAsyncThunk<
  SessionResult<void>,
  { readonly now: Date },
  { extra: ThunkExtra; state: RootState }
>(
  'session/onSessionAbortCompleted',
  async ({ now }, { extra, dispatch, getState }) => {
    try {
      await writeAnchorFor(extra, null)
      await dispatch(setScreenAwakeThunk({ enabled: false }))
      // A break carries no claim, so this is a no-op there — canon records no
      // performance for an aborted break either.
      if (sessionOf(getState).conclusion.kind === 'pending') {
        await dispatch(recordSessionPerformanceThunk({ now }))
      }
      return ok(undefined)
    } catch (error) {
      return err(
        SessionExceptions.anchorWriteFailed(sessionExceptionMessage(error)),
      )
    }
  },
)

// ---------------------------------------------------------------------------
// Break
// ---------------------------------------------------------------------------

/** Canon's `userDidTapBreak` — a 5-minute countdown that is never a performance. */
export const startBreakThunk = createAsyncThunk<
  SessionResult<PersistedRunningSession>,
  { readonly now: Date },
  { extra: ThunkExtra; state: RootState }
>(
  'session/onBreakStartCompleted',
  async (_arg, { extra, dispatch, getState }) => {
    const anchor = sessionOf(getState).anchor
    if (anchor === null) return err(SessionExceptions.noRunningSession())
    try {
      await writeAnchorFor(extra, anchor)
      await dispatch(setScreenAwakeThunk({ enabled: true }))
      return ok(anchor)
    } catch (error) {
      return err(
        SessionExceptions.anchorWriteFailed(sessionExceptionMessage(error)),
      )
    }
  },
  {
    condition: (_arg, { getState }) =>
      sessionOf(getState as () => unknown).availability.areBreaksAvailable,
  },
)

/**
 * Canon's `userDidTapEndBreak` — back to `ready`, anchor cleared, no cue.
 * Canon plays `breakComplete` only when the break *timer* runs out, which is
 * `advanceSessionThunk`'s `breakElapsed` branch.
 */
export const endBreakThunk = createAsyncThunk<
  SessionResult<void>,
  { readonly now: Date },
  { extra: ThunkExtra; state: RootState }
>('session/onBreakEndCompleted', async (_arg, { extra, dispatch }) => {
  try {
    await writeAnchorFor(extra, null)
    await dispatch(setScreenAwakeThunk({ enabled: false }))
    return ok(undefined)
  } catch (error) {
    return err(
      SessionExceptions.anchorWriteFailed(sessionExceptionMessage(error)),
    )
  }
})

// ---------------------------------------------------------------------------
// Recording — the exactly-once half
// ---------------------------------------------------------------------------

/** What one recorded conclusion produced. */
export interface SessionRecordingReport {
  readonly performance: Perform
  readonly rewardPoints: number
  readonly completedSessionsCount: number
  /** What was sent to Google Calendar, or `null` when there was no span to log. */
  readonly calendarLog: SessionCalendarLog | null
  /**
   * Whether the calendar event actually landed.
   *
   * `false` covers the ordinary case as well as the exceptional one: at
   * `statusQuo` nobody has connected Google, so `logSession` refuses with
   * `notConnected` and this is simply `false`. It is **not** a failure of the
   * recording — see the call site.
   */
  readonly wasCalendarLogged: boolean
}

/**
 * Records the whole session **exactly once** — canon's `taskMarkedComplete`
 * arm in `MainFeature`, folded into one atomic operation.
 *
 * ## The two synchronous claims that make "once" structural
 *
 * 1. The conclusion was claimed `none → pending` by a **synchronous** reducer
 *    arm (`withSessionAwaitingResolution` / `withSessionAborted`), so only one
 *    `pending` outcome per conclusion ever exists.
 * 2. `condition` below runs synchronously *before* `.pending` is dispatched and
 *    refuses unless the claim is still `pending`; the `.pending` arm then moves
 *    it to `recording` — also synchronously. A second dispatch, even inside the
 *    same JavaScript turn, sees `recording` and aborts without running its
 *    payload creator at all.
 *
 * Together those cover the racing-tick case the issue names: ten ticks past
 * zero and five concurrent recorder dispatches still write one row.
 *
 * ## What it writes, in order
 *
 * The parent endeavor first (canon's `upsertLocal` before inserting the child —
 * a blank focus session is promoted here if it was never edited, so no
 * performance is ever orphaned), then the performance row, then the endeavor
 * again with the performance attached.
 *
 * Points come from the **active** formula, read fresh from
 * `earn.pointsFormula` at award time — never from a copy taken when the session
 * started, so switching the formula in Earn preferences applies to the very
 * next completion (`docs/Features/Performances.md` § Points formula preference).
 */
export const recordSessionPerformanceThunk = createAsyncThunk<
  SessionResult<SessionRecordingReport>,
  { readonly now: Date; readonly timeZone?: string },
  { extra: ThunkExtra; state: RootState }
>(
  'session/onSessionPerformanceRecordCompleted',
  async ({ now, timeZone }, { extra, getState }) => {
    const conclusion = sessionOf(getState).conclusion
    // `.pending` has already moved the claim to `recording`; anything else
    // means the claim was consumed elsewhere.
    if (conclusion.kind !== 'recording') {
      return err(SessionExceptions.noRunningSession())
    }
    const outcome: SessionOutcome = conclusion.outcome

    try {
      const stored = await readEndeavor(extra.localStore, outcome.endeavorId)
      const endeavor =
        stored ??
        promotedEndeavorForIdentity(
          {
            endeavorId: outcome.endeavorId,
            symbol: sessionOf(getState).identity?.symbol ?? '',
            title: outcome.intention,
            duration: null,
            isAnonymous: true,
          },
          now,
        )

      const formula = pointsFormulaFromRawValue(
        preferencePick(
          makePreferences(extra.localStore.preferences),
          earnPointsFormulaOption,
        ),
      )
      const rewardPoints = awardRewardPoints({
        formula,
        endeavor,
        resolution: outcome.resolution,
        targetDuration: outcome.targetDuration,
        elapsedDuration: outcome.elapsedDuration,
        now,
      })

      const lastEnd =
        outcome.fragments[outcome.fragments.length - 1]?.end ?? null
      const performance = makePerform({
        date: outcome.fragments[0]?.start ?? outcome.endedAt,
        duration: outcome.elapsedDuration,
        resolution: outcome.resolution,
        sessionFragments: outcome.fragments.map(toPerformFragment),
        rewardPoints,
        completedAt:
          outcome.resolution === PerformResolution.finished ? now : null,
        // The whole point of the flag: only a real focus session teaches
        // `empiricalDuration`, and this is one.
        wasCompletedInSession: true,
      })

      // Canon's `upsertLocal(endeavor, ownerUserId)` — the parent row must
      // exist before its child does, which is also the automatic
      // Kro-enhancement boundary for an externally-hosted endeavor.
      await persistEndeavor(extra.localStore, endeavor, now)
      await extra.localStore.performances.put(
        performanceRecordFromPerform(performance, {
          endeavorId: outcome.endeavorId,
          nowMillis: epochMillisFromDate(now),
          endedAt: lastEnd,
        }),
      )
      const withPerformance = withAddedPerformance(endeavor, performance)
      await persistEndeavor(extra.localStore, withPerformance, now)

      // ---- Calendar logging (KC-IS-#33) -----------------------------------
      // Canon logs a concluded session through
      // `systemCalendar.registerSession(summary)`, inside a `do/catch` that
      // reports the failure and leaves the recorded performance alone. #33
      // landed its Google binding while this issue was in flight, so the seam
      // is **bound** rather than parked: `logSession` takes exactly the four
      // values `sessionCalendarLogFor` derives, and composes canon's
      // `"Session: <intention>"` title itself.
      //
      // It runs **after** the two writes above and can never undo them. At
      // `statusQuo` nobody has connected Google, so this refuses with
      // `notConnected` every time — an ordinary state of an unconfigured
      // integration, not an error the user can act on, and certainly not a
      // reason to lose the performance they just earned. The outcome is
      // reported rather than thrown, exactly as canon's `catch` does.
      const calendarLog = sessionCalendarLogFor(outcome, timeZone ?? 'UTC')
      let wasCalendarLogged = false
      if (calendarLog !== null) {
        try {
          await extra.googleCalendar.logSession(calendarLog)
          wasCalendarLogged = true
        } catch {
          wasCalendarLogged = false
        }
      }

      return ok({
        performance,
        rewardPoints,
        completedSessionsCount: tomatoCountFor(withPerformance),
        calendarLog,
        wasCalendarLogged,
      })
    } catch (error) {
      return err(
        SessionExceptions.performanceRecordFailed(
          sessionExceptionMessage(error),
        ),
      )
    }
  },
  {
    condition: (_arg, { getState }) =>
      sessionOf(getState as () => unknown).conclusion.kind === 'pending',
  },
)

/**
 * Canon's `endeavorMarkedComplete` — "Complete Task" from the concluded sheet,
 * and the pill's blue checkmark.
 *
 * The performance is normally already recorded when the session concluded, so
 * this **never records a second one** (`docs/Features/Session.md`: *"choosing
 * Complete, Start New, or Break after conclusion never records a duplicate"*).
 * It does dispatch the recorder, because a claim can still be outstanding — a
 * record that failed released its claim back to `pending`, and a reload inside
 * the recording window rebuilds one — and the recorder's `condition` refuses
 * anything but a `pending` claim, so consuming one here can never duplicate a
 * row. This is the choice that pays the session's outstanding debt rather than
 * discarding it.
 *
 * ## Nothing is closed until the endeavor is on disk
 *
 * The close used to be optimistic, in `.pending`: the sheet and the pill
 * disappeared the instant the user tapped, and a failed write left the task
 * open with no session left to retry from. So the transition moved to the
 * `fulfilled(ok)` arm — a failure now surfaces the exception and leaves the
 * concluded session exactly where it was, still offering Mark complete. The
 * anchor document is cleared here too, so the close survives a reload instead
 * of leaving a concluded document to hydrate back into a phantom pill.
 *
 * `condition` is the matching guard: Complete Task exists only at the
 * conclusion screen and on the pill's checkmark, both `concluded`, so a stale
 * or replayed dispatch cannot close a session that is still running (and would
 * therefore be discarded without ever being recorded).
 *
 * One named divergence: canon sets `status = .closed` and leaves `completed`
 * unset. This also stamps `completed` when it is `null`, because the web's
 * `completedToday` computed state resolves `endeavor.completed ??
 * latestPerformanceCompletion(endeavor)` and the conclusion's performance
 * carries `completedAt: null` under the `complete` resolution — so without the
 * stamp a task completed from a session would vanish from Completed Today. It
 * also matches this repo's own `markEndeavorCompleteThunk` (#16).
 */
export const markEndeavorCompleteFromSessionThunk = createAsyncThunk<
  SessionResult<Endeavor>,
  { readonly now: Date },
  { extra: ThunkExtra; state: RootState }
>(
  'session/onEndeavorMarkCompleteCompleted',
  async ({ now }, { extra, dispatch, getState }) => {
    const identity = sessionOf(getState).identity
    if (identity === null) return err(SessionExceptions.noRunningSession())
    try {
      const stored = await readEndeavor(extra.localStore, identity.endeavorId)
      if (stored === null) {
        return err(
          SessionExceptions.markCompleteFailed(
            `No endeavor with id '${identity.endeavorId}' is stored.`,
          ),
        )
      }
      const closed: Endeavor = {
        ...stored,
        status: EndeavorStatus.closed,
        completed: stored.completed ?? now,
      }
      await persistEndeavor(extra.localStore, closed, now)
      // Settle any outstanding claim before the close discards it. A no-op
      // whenever the conclusion already recorded — that is the `condition`'s job.
      await dispatch(recordSessionPerformanceThunk({ now }))
      await writeAnchorFor(extra, null)
      return ok(closed)
    } catch (error) {
      return err(
        SessionExceptions.markCompleteFailed(sessionExceptionMessage(error)),
      )
    }
  },
  {
    condition: (_arg, { getState }) =>
      sessionOf(getState as () => unknown).phase === SessionPhase.concluded,
  },
)

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/**
 * A committed title edit or a picked glyph — canon's `userDidConfirmTitleEdit`
 * and `userDidPickSymbol`, plus `MainFeature`'s promotion arms.
 *
 * **Anonymous promotion.** When the session has no stored row behind it, the
 * edit *creates* one: picking `💻` on the default `Focus Session` commits an
 * endeavor titled `💻 Focus Session`, after which the tomato counter starts
 * counting and every persistence pipeline picks it up
 * (`docs/Features/Session.md` § Anonymous "Focus Session" promotion). The
 * promoted row keeps the session's own id, so the anchor already written for it
 * stays valid.
 *
 * The glyph substitution is canon's `replacingSymbol`: the emoji is replaced
 * **inside the title, at its original position**, and prepended with a space
 * when the title never carried it.
 */
export const updateSessionIdentityThunk = createAsyncThunk<
  SessionResult<SessionIdentity>,
  {
    readonly title?: string
    readonly symbol?: string
    readonly now: Date
  },
  { extra: ThunkExtra; state: RootState }
>(
  'session/onSessionIdentityUpdateCompleted',
  async ({ title, symbol, now }, { extra, getState }) => {
    const slice = sessionOf(getState)
    const current = slice.identity
    if (current === null) return err(SessionExceptions.noRunningSession())

    let next = current
    if (title !== undefined && isCommittableSessionTitle(current, title)) {
      next = identityWithTitle(next, trimSessionTitle(title))
    }
    if (symbol !== undefined) next = identityWithSymbol(next, symbol)
    // Canon's two guards, combined: an empty/unchanged title and an
    // empty/unchanged symbol both reduce to "nothing happened".
    if (next === current) return ok(current)

    try {
      const stored = await readEndeavor(extra.localStore, next.endeavorId)
      const endeavor: Endeavor =
        stored === null
          ? promotedEndeavorForIdentity(next, now)
          : { ...stored, title: next.title }
      await persistEndeavor(extra.localStore, endeavor, now)

      // The pill reads the anchor, so a live session's document is rewritten
      // with the new identity — canon does the same, so the pill updates
      // immediately rather than at the next pause.
      const anchor = slice.anchor
      if (anchor !== null && anchor.endeavor.id === next.endeavorId) {
        await writeAnchorFor(extra, {
          ...anchor,
          endeavor: {
            ...anchor.endeavor,
            symbol: next.symbol,
            title: next.title,
          },
        })
      }

      return ok({ ...next, isAnonymous: false })
    } catch (error) {
      return err(
        SessionExceptions.promotionFailed(sessionExceptionMessage(error)),
      )
    }
  },
)

// ---------------------------------------------------------------------------
// The document-title timer
// ---------------------------------------------------------------------------

/**
 * Publishes `MM:SS — Kro` to the browser tab while a session runs, and releases
 * it otherwise — the web's stand-in for KroApple's macOS menu-bar extra, named
 * as such by epic KC-IS-#1.
 *
 * The label is a Selector (`selectSessionDocumentTitle`), so the *formatting*
 * is pure and unit-tested without a DOM; this thunk is only the boundary
 * crossing. It takes the label as an argument rather than reading it, so a
 * caller can release the title (`null`) without a live session in state.
 */
export const syncSessionDocumentTitleThunk = createAsyncThunk<
  SessionResult<string | null>,
  { readonly title: string | null },
  { extra: ThunkExtra }
>(
  'session/onSessionDocumentTitleSyncCompleted',
  async ({ title }, { extra }) => {
    try {
      await extra.documentTitleService.set(title)
      return ok(title)
    } catch (error) {
      return err(SessionExceptions.unknown(sessionExceptionMessage(error)))
    }
  },
)

// ---------------------------------------------------------------------------
// The display ticker — a `…Task` (`RC-27`), not a thunk
/**
 * "Start New" — canon's `userDidTapStartNew`, made durable. The concluded
 * anchor deliberately SURVIVES conclusion (the reload-rebuilt claim depends
 * on it), so returning to `ready` must clear the document too — otherwise a
 * reload after Start New re-presents the concluded session as a ghost.
 */
export const startNewSessionThunk = createAsyncThunk<
  SessionResult<void>,
  { readonly now: Date },
  { extra: ThunkExtra; state: RootState }
>('session/onStartNewCompleted', async (_arg, { extra, dispatch }) => {
  try {
    await writeAnchorFor(extra, null)
    await dispatch(setScreenAwakeThunk({ enabled: false }))
    return ok(undefined)
  } catch (error) {
    return err(
      SessionExceptions.anchorWriteFailed(sessionExceptionMessage(error)),
    )
  }
})

// ---------------------------------------------------------------------------

/**
 * The clock a ticker runs on. Injected, never reached for: `RC-27`'s
 * caller-held-cancel case is exactly this, and a suite drives a whole
 * twenty-five-minute session in milliseconds by passing a fake.
 */
export interface SessionTickClock {
  now(): Date
  /** Schedules `callback` every `intervalMillis`; returns its canceller. */
  schedule(callback: () => void, intervalMillis: number): () => void
}

/** The browser's clock. The only place this feature reads real time. */
export const systemSessionTickClock: SessionTickClock = {
  now: () => new Date(),
  schedule: (callback, intervalMillis) => {
    const handle = setInterval(callback, intervalMillis)
    return () => clearInterval(handle)
  },
}

/** Canon's 1-second cadence. */
export const SESSION_TICK_INTERVAL_MILLIS = 1_000

export interface SessionTickTask {
  /** Stops the ticker. Idempotent — canon's `cancelInFlight` in one method. */
  readonly abort: () => void
}

/**
 * Canon's `produceTickEffect` — the one-second display ticker.
 *
 * A hand-rolled `…Task` rather than a `createAsyncThunk` because the caller
 * holds the cancel handle: the shell starts it when a session goes live or the
 * sheet reopens onto one, and stops it on pause, conclusion and unmount
 * (`RC-27`'s second row). Canon reaches for the same shape and calls it
 * `cancellable(id:cancelInFlight:)`.
 *
 * It is deliberately dumb: one dispatch per tick, no state read, no decision.
 * Every decision belongs to `advanceSessionThunk`'s synchronous `.pending` arm,
 * which is what keeps a slow tab from producing two conclusions.
 */
export const startSessionTickTask = (
  dispatch: AppDispatch,
  options: {
    readonly clock?: SessionTickClock
    readonly intervalMillis?: number
  } = {},
): SessionTickTask => {
  const clock = options.clock ?? systemSessionTickClock
  const interval = options.intervalMillis ?? SESSION_TICK_INTERVAL_MILLIS
  let cancelled = false

  const cancel = clock.schedule(() => {
    if (cancelled) return
    void dispatch(advanceSessionThunk({ now: clock.now() }))
  }, interval)

  return {
    abort: () => {
      if (cancelled) return
      cancelled = true
      cancel()
    },
  }
}
