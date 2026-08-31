/**
 * `Reward` fixtures — `RC-13`: three convenient, one neutral, three
 * inconvenient. Point costs deliberately span three orders of magnitude, so a
 * progress bar or a "you can afford this" filter is exercised at both ends.
 */
import { type Reward, makeReward } from '../Reward'

const at = (day: number, month = 0, year = 2026): Date =>
  new Date(year, month, day, 9, 0, 0)

export const rewardMocks = {
  /** Convenient: cheap and frequent. */
  bobaTea: makeReward({
    id: 'reward-boba',
    title: 'Boba Tea',
    glyph: '🧋',
    pointsRequired: 80,
    dateAdded: at(4),
  }),

  /** Convenient: mid-range, with a note. */
  movieNight: makeReward({
    id: 'reward-movie-night',
    title: 'Movie Night',
    glyph: '🍿',
    pointsRequired: 300,
    notes: 'Only counts if the phone stays in the other room',
    dateAdded: at(5),
  }),

  /** Convenient: the long-haul goal. */
  weekendTrip: makeReward({
    id: 'reward-weekend-trip',
    title: 'Weekend Trip',
    glyph: '🧳',
    pointsRequired: 3500,
    notes: 'Somewhere with a train station',
    dateAdded: at(6),
  }),

  /** Neutral: the minimum — no notes, an ordinary cost. */
  plain: makeReward({
    id: 'reward-plain',
    title: 'Long Nap',
    glyph: '💤',
    pointsRequired: 200,
    dateAdded: at(7),
  }),

  /**
   * Inconvenient: **zero** points required, so it is claimable the moment the
   * catalog loads and any "progress toward it" is a division by zero.
   */
  free: makeReward({
    id: 'reward-free',
    title: 'Stretch for a minute',
    glyph: '🤸',
    pointsRequired: 0,
    dateAdded: at(8),
  }),

  /** Inconvenient: a title far longer than a card, and a multi-codepoint glyph. */
  overlongTitle: makeReward({
    id: 'reward-overlong',
    title:
      'A reward whose title nobody would ever type but which the layout has to survive anyway, at length, without truncating the points badge',
    glyph: '👨‍👩‍👧‍👦',
    pointsRequired: 12_500,
    notes: `${'Notes that go on. '.repeat(10)}`,
    dateAdded: at(9),
  }),

  /**
   * Inconvenient: an empty title and an empty glyph — nothing to render, which
   * is exactly what an empty-state guard has to catch.
   */
  blank: makeReward({
    id: 'reward-blank',
    title: '',
    glyph: '',
    pointsRequired: 1,
    notes: '',
    dateAdded: at(10),
  }),
} satisfies Record<string, Reward>

export const allRewardMocks: readonly Reward[] = Object.values(rewardMocks)
