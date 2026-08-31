/**
 * `FocusSessionFragment` fixtures — `RC-13`: three convenient, one neutral,
 * three inconvenient.
 *
 * Every date is built with the **local-time** `Date` constructor and anchored
 * to `SESSION_MOCK_NOW`, never to the wall clock: a fixture that moved with
 * real time would make an elapsed-seconds assertion pass on Monday and fail on
 * Tuesday. The same rule the `Endeavor` fixtures follow.
 */
import {
  type FocusSessionFragment,
  makeFocusSessionFragment,
} from '../FocusSessionFragment'

/**
 * The instant every session fixture is anchored to: 15 Jan 2026, 09:00 local.
 * Named distinctly from the `Endeavor` set's `MOCK_NOW` because both land in
 * the one `@kro/core/mocks` barrel.
 */
export const SESSION_MOCK_NOW = new Date(2026, 0, 15, 9, 0, 0)

/** `SESSION_MOCK_NOW` shifted by whole seconds. Negative reaches backwards. */
const fromNow = (seconds: number): Date =>
  new Date(SESSION_MOCK_NOW.getTime() + seconds * 1000)

export const focusSessionFragmentMocks = {
  // ---------------------------------------------------------------- convenient

  /** The happy path: a closed 25-minute Pomodoro run, ending at `now`. */
  fullPomodoro: makeFocusSessionFragment({
    start: fromNow(-1500),
    end: fromNow(0),
  }),

  /** Closed and short — the first half of a paused session. */
  firstHalf: makeFocusSessionFragment({
    start: fromNow(-1800),
    end: fromNow(-1200),
  }),

  /** Open: currently running, started 10 minutes ago. */
  running: makeFocusSessionFragment({ start: fromNow(-600) }),

  // ------------------------------------------------------------------- neutral

  /** The minimum: opened exactly at `now`, nothing elapsed yet. */
  justStarted: makeFocusSessionFragment({ start: fromNow(0) }),

  // -------------------------------------------------------------- inconvenient

  /**
   * Zero-length: start and end at the same instant. A double-tap on play/stop
   * produces this, and it must contribute exactly 0 rather than divide badly.
   */
  zeroLength: makeFocusSessionFragment({
    start: fromNow(-300),
    end: fromNow(-300),
  }),

  /**
   * Sub-second: 500 ms. Seconds are the canonical unit but the underlying
   * `Date` is millisecond-resolution, so a span can be fractional — anything
   * that assumes integer seconds breaks here.
   */
  subSecond: makeFocusSessionFragment({
    start: new Date(SESSION_MOCK_NOW.getTime() - 1000),
    end: new Date(SESSION_MOCK_NOW.getTime() - 500),
  }),

  /**
   * Inverted: `end` precedes `start`, which a clock adjustment mid-session can
   * produce. Its span is **negative**, and canon does not guard against it —
   * so the elapsed total can go down. Fixture exists to keep that visible.
   */
  inverted: makeFocusSessionFragment({
    start: fromNow(-100),
    end: fromNow(-400),
  }),

  /**
   * Very long: an eight-hour open fragment, the shape a session left running
   * overnight has on relaunch.
   */
  overnight: makeFocusSessionFragment({ start: fromNow(-8 * 60 * 60) }),
} satisfies Record<string, FocusSessionFragment>

/** Every fixture, for suites asserting a property across the whole spread. */
export const allFocusSessionFragmentMocks: readonly FocusSessionFragment[] =
  Object.values(focusSessionFragmentMocks)
