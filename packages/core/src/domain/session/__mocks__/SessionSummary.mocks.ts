/**
 * `SessionSummary` fixtures — `RC-13`.
 *
 * Ids are literals rather than generated: this tier has no UUID source, and a
 * generated id would make a snapshot differ run to run.
 */
import { minutesInSeconds } from '../../shared/TimeInterval'
import { makeFocusSessionFragment } from '../FocusSessionFragment'
import { type SessionSummary, makeSessionSummary } from '../SessionSummary'
import { SESSION_MOCK_NOW } from './FocusSessionFragment.mocks'

const fromNow = (seconds: number): Date =>
  new Date(SESSION_MOCK_NOW.getTime() + seconds * 1000)

export const sessionSummaryMocks = {
  // ---------------------------------------------------------------- convenient

  /** The happy path: one unbroken 25-minute run. */
  unbrokenPomodoro: makeSessionSummary({
    id: 'summary-unbroken',
    intention: 'Write the quarterly brief',
    duration: minutesInSeconds(25),
    fragments: [
      makeFocusSessionFragment({ start: fromNow(-1500), end: fromNow(0) }),
    ],
  }),

  /**
   * Two fragments with a gap: 10 + 10 minutes of focus spread across 40
   * minutes of wall time. `duration` is the **focus** total, not the span —
   * which is the whole point of tracking fragments.
   */
  pausedInTheMiddle: makeSessionSummary({
    id: 'summary-paused',
    intention: 'Sweep the inbox',
    duration: minutesInSeconds(20),
    fragments: [
      makeFocusSessionFragment({ start: fromNow(-2400), end: fromNow(-1800) }),
      makeFocusSessionFragment({ start: fromNow(-600), end: fromNow(0) }),
    ],
  }),

  /** A long stopwatch run, three fragments. */
  longStopwatch: makeSessionSummary({
    id: 'summary-long-stopwatch',
    intention: 'Pair on the reconciliation engine',
    duration: minutesInSeconds(150),
    fragments: [
      makeFocusSessionFragment({
        start: fromNow(-14400),
        end: fromNow(-10800),
      }),
      makeFocusSessionFragment({ start: fromNow(-9000), end: fromNow(-5400) }),
      makeFocusSessionFragment({ start: fromNow(-3600), end: fromNow(0) }),
    ],
  }),

  // ------------------------------------------------------------------- neutral

  /** The minimum: an intention, a duration, one closed fragment. */
  minimal: makeSessionSummary({
    id: 'summary-minimal',
    intention: 'Read',
    duration: minutesInSeconds(5),
    fragments: [
      makeFocusSessionFragment({ start: fromNow(-300), end: fromNow(0) }),
    ],
  }),

  // -------------------------------------------------------------- inconvenient

  /**
   * No fragments. Both `sessionSummaryStart` and `sessionSummaryEnd` are
   * `null` — the quick-complete shape, which never ran a session at all.
   */
  quickComplete: makeSessionSummary({
    id: 'summary-quick-complete',
    intention: 'Reply to Ana',
    duration: 0,
  }),

  /**
   * A trailing fragment still open, so `sessionSummaryEnd` is `null` while
   * `sessionSummaryStart` is not — the asymmetry a calendar writer has to
   * handle rather than assume away.
   */
  trailingOpenFragment: makeSessionSummary({
    id: 'summary-open-tail',
    intention: 'Still going',
    duration: minutesInSeconds(10),
    fragments: [
      makeFocusSessionFragment({ start: fromNow(-1200), end: fromNow(-600) }),
      makeFocusSessionFragment({ start: fromNow(-600) }),
    ],
  }),

  /** An empty intention — nothing to title the calendar entry with. */
  blankIntention: makeSessionSummary({
    id: 'summary-blank',
    intention: '',
    duration: minutesInSeconds(3),
    fragments: [
      makeFocusSessionFragment({ start: fromNow(-180), end: fromNow(0) }),
    ],
  }),

  /** A long, non-ASCII intention and many short fragments. */
  choppyUnicode: makeSessionSummary({
    id: 'summary-choppy',
    intention:
      '🧩 断続的なセッション — interrupted every couple of minutes, at length',
    duration: minutesInSeconds(8),
    fragments: [
      makeFocusSessionFragment({ start: fromNow(-1800), end: fromNow(-1680) }),
      makeFocusSessionFragment({ start: fromNow(-1500), end: fromNow(-1380) }),
      makeFocusSessionFragment({ start: fromNow(-1200), end: fromNow(-1080) }),
      makeFocusSessionFragment({ start: fromNow(-900), end: fromNow(-780) }),
    ],
  }),
} satisfies Record<string, SessionSummary>

/** Every fixture, for suites asserting a property across the whole spread. */
export const allSessionSummaryMocks: readonly SessionSummary[] =
  Object.values(sessionSummaryMocks)
