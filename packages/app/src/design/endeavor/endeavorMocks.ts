/**
 * The kit's canned data — the single source every story and every test in this
 * directory draws from.
 *
 * `RC-31`'s rule, applied to a component kit rather than a feature: props are
 * never constructed inline in a story or a test, "even for a one-off scenario".
 * A snapshot built from a hand-typed literal is a snapshot of a lookalike, and
 * it stays green while the thing people look at drifts.
 *
 * `NOW` IS FIXED, AND THAT IS THE POINT. Every caption this kit prints is
 * clock-relative — "Yesterday, 5:00 PM", "3 days ago", the urgency a card
 * derives — so a mock seeded from `new Date()` would produce a snapshot that
 * changes at midnight and a badge matrix that changes at 2pm. Every mock below
 * is an offset from one frozen instant, and every story and test passes that
 * instant as `now`.
 *
 * The spread follows `RC-13`'s categories — three convenient, one neutral,
 * three inconvenient — named to this domain rather than to the rule.
 */

import type { EndeavorCardModel } from './endeavorCardModel'
import { EndeavorUrgency } from './endeavorCardModel'
import { EndeavorStatus } from '@kro/core'

/** Wednesday 2026-04-15, 14:00 local. The instant every mock is relative to. */
export const NOW = new Date(2026, 3, 15, 14, 0, 0)

const hours = (count: number) => new Date(NOW.getTime() + count * 3_600_000)
const minutes = (count: number) => count * 60

function card(overrides: Partial<EndeavorCardModel> & Pick<EndeavorCardModel, 'id'>): EndeavorCardModel {
  return {
    urgency: EndeavorUrgency.low,
    reward: 10,
    symbol: '📋',
    title: 'Untitled',
    dueTime: null,
    duration: null,
    status: EndeavorStatus.pending,
    showWarning: false,
    isEvent: false,
    ...overrides,
  }
}

export const endeavorCardMocks = {
  /**
   * Convenient: canon's `mock1`, with one correction.
   *
   * Canon declares `mock1` as `.high` while giving it a due date two hours
   * AHEAD — a combination `computedUrgency` cannot produce, because two hours
   * out is Medium. The card takes a view model, so the mismatch is legal and
   * canon gets away with it; a fixture that encodes an unreachable state is
   * still a bad fixture. The due time moves 45 minutes into the PAST instead,
   * which is what actually makes an endeavor High, and
   * `endeavorMocks.test.ts` holds every fixture to that agreement.
   */
  highUrgency: card({
    id: 'mock-high',
    urgency: EndeavorUrgency.high,
    reward: 50,
    symbol: '📊',
    title: 'Prepare presentation slides',
    dueTime: hours(-0.75),
    duration: minutes(45),
  }),

  /** Convenient: canon's `mock2` — medium urgency, so the warning circle shows. */
  mediumUrgency: card({
    id: 'mock-medium',
    urgency: EndeavorUrgency.medium,
    reward: 30,
    symbol: '💻',
    title: 'Review pull request changes',
    dueTime: hours(1),
    duration: minutes(20),
    showWarning: true,
  }),

  /** Convenient: canon's `mock3` — low urgency, no due date, no pill. */
  lowUrgency: card({
    id: 'mock-low',
    urgency: EndeavorUrgency.low,
    reward: 10,
    symbol: '🛒',
    title: 'Buy groceries',
    duration: minutes(30),
  }),

  /** Neutral: a calendar event — skip, never complete. */
  event: card({
    id: 'mock-event',
    urgency: EndeavorUrgency.low,
    reward: 10,
    symbol: '🤝',
    title: 'Team sync meeting',
    dueTime: hours(3),
    duration: minutes(60),
    status: EndeavorStatus.planned,
    isEvent: true,
  }),

  /** Inconvenient: overdue by three days, so the relative caption fires. */
  overdue: card({
    id: 'mock-overdue',
    urgency: EndeavorUrgency.high,
    reward: 25,
    symbol: '🧾',
    title: 'File the quarterly tax receipts',
    dueTime: hours(-72),
    duration: minutes(90),
  }),

  /** Inconvenient: a title long enough to hit the two-line clamp. */
  longTitle: card({
    id: 'mock-long',
    urgency: EndeavorUrgency.medium,
    reward: 15,
    symbol: '✍️',
    title:
      'Write the quarterly budget reconciliation report and circulate it to every department head before the freeze',
    dueTime: hours(1.5),
    duration: minutes(150),
    showWarning: true,
  }),

  /** Inconvenient: non-ASCII, and a reward wide enough to test the pill. */
  unicode: card({
    id: 'mock-unicode',
    urgency: EndeavorUrgency.high,
    reward: 120,
    symbol: '🍳',
    title: '朝ごはんを作る — breakfast for 山田 太郎 🌸',
    dueTime: hours(-1),
    duration: minutes(25),
  }),

  /** Inconvenient: everything optional is absent. */
  bare: card({
    id: 'mock-bare',
    symbol: '📋',
    title: 'Think about it',
  }),

  /** Already closed — the status chip's neutral tint. */
  closed: card({
    id: 'mock-closed',
    urgency: EndeavorUrgency.high,
    reward: 10,
    symbol: '📚',
    title: 'Read the design-system PR',
    dueTime: hours(-26),
    duration: minutes(15),
    status: EndeavorStatus.closed,
  }),
} as const

/** Every mock, for a story or a test that wants to sweep the whole spread. */
export const allEndeavorCardMocks: readonly EndeavorCardModel[] =
  Object.values(endeavorCardMocks)
