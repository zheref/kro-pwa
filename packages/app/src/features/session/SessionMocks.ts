/**
 * The session feature's canned fixtures (`RC-31`, `UZF-18`).
 *
 * Every variant is built by running the **real Shifters** over the real initial
 * state, so a state named here is by construction one the phase machine can
 * actually reach — the same rule `EarnMocks.ts` follows. Hand-assembling a
 * `SessionState` literal would let a story render a combination (say,
 * `phase: 'running'` with `anchor: null`) that no dispatch could produce.
 *
 * The clock is fixed and stated: `SESSION_MOCK_NOW` is the instant every
 * fixture is anchored against, and every derived figure below is arithmetic on
 * it rather than on `Date.now()`.
 */
import { FocusTimerMode, minutesInSeconds } from '@kro/core'
import { SessionExceptions } from './SessionException'
import {
  type SessionIdentity,
  makeSessionIdentity,
} from './SessionIdentity'
import {
  type SessionAvailability,
  type SessionPreferences,
  type SessionState,
  initialSessionState,
} from './SessionState'
import { SessionOutcomeReason } from './SessionOutcome'
import {
  withAnchorHydrated,
  withBreakStarted,
  withDisplayAdvanced,
  withException,
  withLaunchPrepared,
  withPreferencesApplied,
  withSessionAborted,
  withSessionAwaitingResolution,
  withSessionPaused,
  withSessionStarted,
  withTitleEditingStarted,
} from './SessionShifters'

/** Tuesday 17 March 2026, 09:00 local — arbitrary, fixed, and stated. */
export const SESSION_MOCK_NOW = new Date(2026, 2, 17, 9, 0, 0)

/** `n` seconds after the mock now. */
export const sessionMockInstant = (secondsFromNow: number): Date =>
  new Date(SESSION_MOCK_NOW.getTime() + secondsFromNow * 1_000)

/** A 25-minute target, so 30 % of it is a round 450 s. */
export const SESSION_MOCK_TARGET = minutesInSeconds(25)

export const sessionIdentityMocks = {
  /** A real, stored endeavor with a glyph already in its title. */
  slides: makeSessionIdentity({
    endeavorId: 'endeavor-slides',
    symbol: '📊',
    title: '📊 Prepare slides',
    duration: SESSION_MOCK_TARGET,
  }),
  /** The blank focus session, before any edit promotes it. */
  anonymous: makeSessionIdentity({
    endeavorId: 'session-anonymous',
    isAnonymous: true,
  }),
  /** A stored endeavor whose title carries no emoji at all. */
  plain: makeSessionIdentity({
    endeavorId: 'endeavor-plain',
    symbol: '🍅',
    title: 'Write the release notes',
  }),
} satisfies Record<string, SessionIdentity>

/** The shipped preference defaults, plus a break-friendly variant. */
export const sessionPreferenceMocks = {
  shipped: initialSessionState.preferences,
  autoBreak: {
    ...initialSessionState.preferences,
    autoStartBreak: true,
  },
  silent: {
    ...initialSessionState.preferences,
    soundOnEnd: false,
    keepScreenAwake: false,
  },
} satisfies Record<string, SessionPreferences>

/** `statusQuo` (everything off) and the fully-enabled variant. */
export const sessionAvailabilityMocks = {
  statusQuo: initialSessionState.availability,
  everythingOn: {
    isStopwatchAvailable: true,
    areBreaksAvailable: true,
    isDurationLearningEnabled: true,
  },
} satisfies Record<string, SessionAvailability>

const prepared = (
  identity: SessionIdentity,
  availability: SessionAvailability = sessionAvailabilityMocks.statusQuo,
): SessionState =>
  withLaunchPrepared(
    withPreferencesApplied(initialSessionState, {
      preferences: sessionPreferenceMocks.shipped,
      availability,
    }),
    {
      identity,
      recommendation: {
        mode: FocusTimerMode.countdown,
        targetDuration: SESSION_MOCK_TARGET,
        source: { kind: 'preferred' },
      },
      completedSessionsCount: 3,
    },
  )

const running = prepared(sessionIdentityMocks.slides)
const started = withSessionStarted(running, SESSION_MOCK_NOW)

/** The states the session surface claims to support. */
export const sessionStateMocks = {
  /** Cold start — nothing loaded, nothing prepared. */
  idle: initialSessionState,

  /** A preference/anchor read in flight. */
  loading: { ...initialSessionState, load: { kind: 'loading' } } as SessionState,

  /** Ready to start: identity, recommendation and tomato count in place. */
  ready: running,

  /** Ready, with stopwatch and breaks enabled by their flags. */
  readyEverythingOn: prepared(
    sessionIdentityMocks.slides,
    sessionAvailabilityMocks.everythingOn,
  ),

  /** Ready on a blank focus session — nothing stored behind it yet. */
  readyAnonymous: prepared(sessionIdentityMocks.anonymous),

  /** Running, ten minutes in. */
  running: withDisplayAdvanced(started, sessionMockInstant(600)),

  /** Paused ten minutes in — every fragment closed, the figure frozen. */
  paused: withSessionPaused(
    withDisplayAdvanced(started, sessionMockInstant(600)),
    sessionMockInstant(600),
  ),

  /**
   * The countdown reached zero: parked at `concluded`, the sheet
   * auto-presented, and the conclusion claimed exactly once.
   */
  concluded: withDisplayAdvanced(started, sessionMockInstant(SESSION_MOCK_TARGET)),

  /**
   * Concluded, then dismissed without picking — the pill keeps the
   * Mark-complete affordance (`docs/Features/Session.md` flow 7).
   */
  concludedDismissed: {
    ...withDisplayAdvanced(started, sessionMockInstant(SESSION_MOCK_TARGET)),
    isPresentingConclusion: false,
  } as SessionState,

  /** A finish-early **below** the 30 % threshold — an aborted attempt. */
  abortedBelowThreshold: withSessionAborted(
    withDisplayAdvanced(started, sessionMockInstant(60)),
    { now: sessionMockInstant(60), reason: SessionOutcomeReason.belowThreshold },
  ),

  /** A finish-early at exactly 30 % — recorded, not aborted. */
  concludedAtThreshold: withSessionAwaitingResolution(
    withDisplayAdvanced(started, sessionMockInstant(SESSION_MOCK_TARGET * 0.3)),
    {
      now: sessionMockInstant(SESSION_MOCK_TARGET * 0.3),
      reason: SessionOutcomeReason.finishedEarly,
    },
  ),

  /** A break running, two minutes in. */
  onBreak: withDisplayAdvanced(
    withBreakStarted(
      {
        ...prepared(
          sessionIdentityMocks.slides,
          sessionAvailabilityMocks.everythingOn,
        ),
      },
      SESSION_MOCK_NOW,
    ),
    sessionMockInstant(120),
  ),

  /** Recovered from storage after a reload, mid-session. */
  hydrated: withAnchorHydrated(running, {
    anchor: started.anchor,
    identity: sessionIdentityMocks.slides,
    completedSessionsCount: 3,
    now: sessionMockInstant(900),
  }),

  /** The title editor open, prefilled from the identity. */
  editingTitle: withTitleEditingStarted(running),

  /** A failed anchor write on a session that is still counting down correctly. */
  failedWriteWhileRunning: withException(
    withDisplayAdvanced(started, sessionMockInstant(600)),
    SessionExceptions.anchorWriteFailed('the store is unavailable'),
  ),
} satisfies Record<string, SessionState>
