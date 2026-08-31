/**
 * `PersistedRunningSession` and `PersistedSessionEndeavor` fixtures — `RC-13`,
 * seven each.
 *
 * Every anchor is expressed relative to `SESSION_MOCK_NOW`, so a test can say
 * "recompute at `SESSION_MOCK_NOW`" and "recompute an hour later" and get two
 * figures it can reason about exactly. The two inconsistent fixtures at the
 * end exist because #10 will hydrate this shape from disk, where a crash mid
 * write can leave it in a state canon's runtime never produces.
 */
import { minutesInSeconds } from '../../shared/TimeInterval'
import { makeFocusSessionFragment } from '../FocusSessionFragment'
import { FocusTimerMode } from '../FocusTimerMode'
import {
  type PersistedRunningSession,
  type PersistedSessionEndeavor,
  PersistedSessionPhase,
  makePersistedRunningSession,
  makePersistedSessionEndeavor,
} from '../PersistedRunningSession'
import { SESSION_MOCK_NOW } from './FocusSessionFragment.mocks'

const fromNow = (seconds: number): Date =>
  new Date(SESSION_MOCK_NOW.getTime() + seconds * 1000)

export const persistedSessionEndeavorMocks = {
  // ---------------------------------------------------------------- convenient

  /** The happy path: identity plus an estimate the launch policy can use. */
  writeBrief: makePersistedSessionEndeavor({
    id: 'endeavor-write-brief',
    symbol: '📝',
    title: 'Write the quarterly brief',
    duration: minutesInSeconds(45),
  }),

  /** A shorter task, also estimated. */
  inboxSweep: makePersistedSessionEndeavor({
    id: 'endeavor-inbox-sweep',
    symbol: '📥',
    title: 'Sweep the inbox',
    duration: minutesInSeconds(15),
  }),

  /** The anonymous session canon raises with no backing endeavor yet. */
  anonymous: makePersistedSessionEndeavor({
    id: 'endeavor-anonymous',
    symbol: '🎯',
    title: 'Focus Session',
  }),

  // ------------------------------------------------------------------- neutral

  /** The minimum: identity only, no estimate. */
  bare: makePersistedSessionEndeavor({
    id: 'endeavor-bare',
    symbol: '•',
    title: 'Untitled',
  }),

  // -------------------------------------------------------------- inconvenient

  /** An empty title and an empty symbol — nothing at all to render. */
  blank: makePersistedSessionEndeavor({
    id: 'endeavor-blank',
    symbol: '',
    title: '',
  }),

  /** A multi-codepoint glyph and a title far wider than the pill. */
  overlong: makePersistedSessionEndeavor({
    id: 'endeavor-overlong',
    symbol: '👨‍👩‍👧‍👦',
    title:
      'Reconcile the ledger against every external host, then write it up, then tell everyone about it at length',
    duration: minutesInSeconds(240),
  }),

  /** A zero estimate — present, but useless to the launch policy. */
  zeroEstimate: makePersistedSessionEndeavor({
    id: 'endeavor-zero-estimate',
    symbol: '⏳',
    title: 'Zero estimate',
    duration: 0,
  }),
} satisfies Record<string, PersistedSessionEndeavor>

/** Every endeavor fixture. */
export const allPersistedSessionEndeavorMocks: readonly PersistedSessionEndeavor[] =
  Object.values(persistedSessionEndeavorMocks)

export const persistedRunningSessionMocks = {
  // ---------------------------------------------------------------- convenient

  /**
   * The happy path: a 25-minute countdown running for 10 minutes as of
   * `SESSION_MOCK_NOW`, one open fragment. Elapsed 600, remaining 900.
   */
  runningPomodoro: makePersistedRunningSession({
    endeavor: persistedSessionEndeavorMocks.writeBrief,
    targetDuration: minutesInSeconds(25),
    mode: FocusTimerMode.countdown,
    fragments: [makeFocusSessionFragment({ start: fromNow(-600) })],
    phase: PersistedSessionPhase.running,
  }),

  /**
   * Paused after two runs of 5 minutes each: every fragment closed, so elapsed
   * is a frozen 600 no matter how far `now` advances.
   */
  pausedAfterTwoRuns: makePersistedRunningSession({
    endeavor: persistedSessionEndeavorMocks.writeBrief,
    targetDuration: minutesInSeconds(25),
    mode: FocusTimerMode.countdown,
    fragments: [
      makeFocusSessionFragment({ start: fromNow(-1800), end: fromNow(-1500) }),
      makeFocusSessionFragment({ start: fromNow(-900), end: fromNow(-600) }),
    ],
    phase: PersistedSessionPhase.paused,
  }),

  /** A stopwatch session, 40 minutes in, carrying the 3-hour default target. */
  runningStopwatch: makePersistedRunningSession({
    endeavor: persistedSessionEndeavorMocks.anonymous,
    targetDuration: minutesInSeconds(180),
    mode: FocusTimerMode.stopwatch,
    fragments: [makeFocusSessionFragment({ start: fromNow(-2400) })],
    phase: PersistedSessionPhase.running,
  }),

  // ------------------------------------------------------------------- neutral

  /** Just started: one fragment opened exactly at `now`, nothing elapsed. */
  justStarted: makePersistedRunningSession({
    endeavor: persistedSessionEndeavorMocks.inboxSweep,
    targetDuration: minutesInSeconds(15),
    mode: FocusTimerMode.countdown,
    fragments: [makeFocusSessionFragment({ start: fromNow(0) })],
    phase: PersistedSessionPhase.running,
  }),

  // -------------------------------------------------------------- inconvenient

  /**
   * Overrun: a 25-minute countdown whose open fragment has already run 40
   * minutes — the shape after a kill, where nothing was alive to notice zero.
   * Remaining must clamp to 0, not go negative.
   */
  overrunAfterKill: makePersistedRunningSession({
    endeavor: persistedSessionEndeavorMocks.writeBrief,
    targetDuration: minutesInSeconds(25),
    mode: FocusTimerMode.countdown,
    fragments: [makeFocusSessionFragment({ start: fromNow(-2400) })],
    phase: PersistedSessionPhase.running,
  }),

  /**
   * Concluded and awaiting the user's choice: every fragment closed, anchor
   * deliberately still present so the pill can offer "mark complete".
   */
  concludedAwaitingChoice: makePersistedRunningSession({
    endeavor: persistedSessionEndeavorMocks.inboxSweep,
    targetDuration: minutesInSeconds(15),
    mode: FocusTimerMode.countdown,
    fragments: [
      makeFocusSessionFragment({ start: fromNow(-900), end: fromNow(0) }),
    ],
    phase: PersistedSessionPhase.concluded,
  }),

  /**
   * On a break: phase `break` with an open fragment, which the pill labels
   * "Break" rather than with the endeavor title.
   */
  onBreak: makePersistedRunningSession({
    endeavor: persistedSessionEndeavorMocks.writeBrief,
    targetDuration: minutesInSeconds(5),
    mode: FocusTimerMode.countdown,
    fragments: [makeFocusSessionFragment({ start: fromNow(-120) })],
    phase: PersistedSessionPhase.break,
  }),

  /**
   * **Inconsistent on purpose:** paused, yet carrying an open fragment. Canon's
   * runtime cannot produce this; a crash between "close the fragment" and
   * "write the anchor" can. Elapsed would keep growing while the user believes
   * the session is frozen — `isRunningSessionConsistent` is what catches it.
   */
  corruptPausedWithOpenFragment: makePersistedRunningSession({
    endeavor: persistedSessionEndeavorMocks.bare,
    targetDuration: minutesInSeconds(25),
    mode: FocusTimerMode.countdown,
    fragments: [makeFocusSessionFragment({ start: fromNow(-600) })],
    phase: PersistedSessionPhase.paused,
  }),

  /**
   * **Inconsistent on purpose:** two open fragments, the double-resume shape.
   * Both would accrue against `now` and the elapsed figure would run at double
   * speed.
   */
  corruptTwoOpenFragments: makePersistedRunningSession({
    endeavor: persistedSessionEndeavorMocks.bare,
    targetDuration: minutesInSeconds(25),
    mode: FocusTimerMode.countdown,
    fragments: [
      makeFocusSessionFragment({ start: fromNow(-900) }),
      makeFocusSessionFragment({ start: fromNow(-600) }),
    ],
    phase: PersistedSessionPhase.running,
  }),

  /** No fragments at all: an anchor written before the first play landed. */
  noFragments: makePersistedRunningSession({
    endeavor: persistedSessionEndeavorMocks.blank,
    targetDuration: minutesInSeconds(25),
    mode: FocusTimerMode.countdown,
    phase: PersistedSessionPhase.running,
  }),
} satisfies Record<string, PersistedRunningSession>

/** Every session fixture. */
export const allPersistedRunningSessionMocks: readonly PersistedRunningSession[] =
  Object.values(persistedRunningSessionMocks)
