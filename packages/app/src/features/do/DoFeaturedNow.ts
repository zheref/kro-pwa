/**
 * The featured "Now" lane — the port of `featuredNowScore` and
 * `selectFeaturedNowTasks` (`Kro/Models/Endeavors.swift`, ~line 128), specified
 * by `DoLanes.md` § 3 and `docs/Features/Do.md`'s *Responsive Now lane*.
 *
 * Two pure steps, deliberately kept apart the way canon keeps them apart so
 * the ranking can be retuned without touching the layout:
 *
 * 1. **Score** every pending task/habit, drop the zeroes, rank.
 * 2. **Arrange** the survivors hero-centred at an odd size, and take the
 *    centred window the available width can show (3, 5, 7 or 9).
 *
 * ## The one deliberate change: the clock is a parameter
 *
 * Canon's `featuredNowScore` is a computed property that reads `Date()`
 * internally, so the same endeavor scores differently on two consecutive
 * reads and no test can pin a boundary. Here `now` is passed in, exactly as
 * canon already does for `isDueNow(withinHours:now:)`. Nothing else about the
 * weights, the thresholds or the ordering changes.
 */
import {
  type Endeavor,
  EndeavorStatus as Status,
  type ReconciliationContext,
  SECONDS_PER_HOUR,
  defaultReconciliationContext,
  hasBeenCompleted,
} from '@kro/core'
import { isActionableDoKind } from './DoRules'

/** The odd card counts the responsive lane supports. */
export const FEATURED_NOW_CAPACITIES = [3, 5, 7, 9] as const

export type FeaturedNowCapacity = (typeof FEATURED_NOW_CAPACITIES)[number]

/** Canon's hard ceiling — the lane never ranks more than nine. */
export const FEATURED_NOW_MAX = 9

/**
 * The weights, verbatim from canon's table.
 *
 * | Factor | Weight |
 * |---|---|
 * | Overdue | +100 |
 * | Due within 2h | +50 |
 * | Due within 6h | +25 |
 * | Has a due date at all | +10 |
 * | Ongoing | +30 |
 * | Has an estimated duration | +5 |
 * | Reward points above the default | +3 |
 */
export const FEATURED_NOW_WEIGHTS = {
  overdue: 100,
  dueWithinTwoHours: 50,
  dueWithinSixHours: 25,
  hasDueDate: 10,
  ongoing: 30,
  hasDuration: 5,
  aboveDefaultPoints: 3,
} as const

/** The two proximity thresholds, in hours. Fixed by canon, not the preference. */
const IMMINENT_HOURS = 2
const UPCOMING_HOURS = 6

/** The reward-points bar canon nudges above. */
const DEFAULT_SESSION_POINTS = 10

/**
 * `Endeavor.featuredNowScore`, with `now` injected.
 *
 * Zero means "no relevance to now" and is the exclusion signal the selection
 * below acts on. Note the proximity thresholds are canon's own 2h / 6h
 * constants, **not** `do.nowThresholdHours`: the preference moves the Due Soon
 * *lane* boundary, and canon never wires it into the score.
 */
export const featuredNowScore = (
  endeavor: Endeavor,
  now: Date,
  context: ReconciliationContext = defaultReconciliationContext(),
): number => {
  if (!isActionableDoKind(endeavor, context)) return 0
  if (hasBeenCompleted(endeavor)) return 0

  let score = 0

  const due = endeavor.due
  if (due !== null) {
    if (due.getTime() < now.getTime()) {
      score += FEATURED_NOW_WEIGHTS.overdue
    } else {
      const hoursUntilDue =
        (due.getTime() - now.getTime()) / 1000 / SECONDS_PER_HOUR
      if (hoursUntilDue <= IMMINENT_HOURS) {
        score += FEATURED_NOW_WEIGHTS.dueWithinTwoHours
      } else if (hoursUntilDue <= UPCOMING_HOURS) {
        score += FEATURED_NOW_WEIGHTS.dueWithinSixHours
      }
    }
    score += FEATURED_NOW_WEIGHTS.hasDueDate
  }

  if (endeavor.status === Status.ongoing) score += FEATURED_NOW_WEIGHTS.ongoing
  if (endeavor.duration !== null) score += FEATURED_NOW_WEIGHTS.hasDuration
  if ((endeavor.sessionPoints ?? 0) > DEFAULT_SESSION_POINTS) {
    score += FEATURED_NOW_WEIGHTS.aboveDefaultPoints
  }

  return score
}

/**
 * `selectFeaturedNowTasks` — up to nine, odd-sized once three exist, arranged
 * from the centre outward so the top scorer is the hero.
 *
 * Canon's five rules, in order:
 * 1. score every candidate;
 * 2. drop every zero — no relevance to now;
 * 3. keep the top nine, ties broken by the **earlier due date**;
 * 4. once three or more survive, drop the lowest-ranked to keep the count odd;
 * 5. arrange centre-out — rank 1 lands left of the hero, rank 2 right, rank 3
 *    two left, and so on, so any centred 3/5/7/9 window keeps the hero.
 *
 * One- and two-card days keep every card, so a two-card lane is legitimately
 * even — `DoLanes.md`'s "3, 5, 7, or 9" describes the full lane, not the
 * degenerate ones.
 *
 * **Determinism.** Ranking is score-desc then due-asc, and `Array.sort` is
 * stable, so a full tie (same score, same due) resolves to the input pool's
 * own first-appearance order — which reconciliation already fixes. Canon's
 * `sorted` is unstable and leaves that case arbitrary; keeping the stable
 * result is a gain, not a divergence.
 */
export const selectFeaturedNowEndeavors = (
  candidates: readonly Endeavor[],
  now: Date,
  context: ReconciliationContext = defaultReconciliationContext(),
): readonly Endeavor[] => {
  const scored = candidates
    .map((endeavor) => ({
      endeavor,
      score: featuredNowScore(endeavor, now, context),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score
      const leftDue = left.endeavor.due?.getTime() ?? Number.POSITIVE_INFINITY
      const rightDue = right.endeavor.due?.getTime() ?? Number.POSITIVE_INFINITY
      return leftDue - rightDue
    })
    .map((entry) => entry.endeavor)

  const top = scored.slice(0, FEATURED_NOW_MAX)
  // Rule 4: an even count of three or more loses its weakest card, because an
  // even lane has no single centre for the hero to occupy.
  if (top.length >= 3 && top.length % 2 === 0) top.pop()
  if (top.length <= 1) return top

  return arrangeHeroCentred(top)
}

/**
 * Canon's centre-out placement: `arranged[centre] = ranked[0]`, then odd ranks
 * step leading and even ranks step trailing by `(rank + 1) / 2`.
 *
 * For three cards that is `[second, first, third]` — the layout canon's own
 * test pins.
 */
const arrangeHeroCentred = (ranked: readonly Endeavor[]): readonly Endeavor[] => {
  const arranged: (Endeavor | undefined)[] = new Array(ranked.length)
  const centre = Math.floor(ranked.length / 2)
  arranged[centre] = ranked[0]

  for (let rank = 1; rank < ranked.length; rank += 1) {
    const distance = Math.floor((rank + 1) / 2)
    const index = rank % 2 === 0 ? centre + distance : centre - distance
    arranged[index] = ranked[rank]
  }

  return arranged.filter((endeavor): endeavor is Endeavor => endeavor !== undefined)
}

/**
 * The largest supported odd count that fits — `docs/Features/Do.md`'s
 * *"largest fitting odd count"* decision, expressed over **how many cards fit**
 * rather than a pixel width, because the pixel thresholds are the render
 * layer's (#17) and would be a fiction here.
 *
 * Three is the floor: canon's lane *"remains focused at compact widths"* and
 * never drops below its hero-plus-two shape.
 */
export const featuredNowCapacityFor = (
  cardsThatFit: number,
): FeaturedNowCapacity => {
  if (cardsThatFit >= 9) return 9
  if (cardsThatFit >= 7) return 7
  if (cardsThatFit >= 5) return 5
  return 3
}

/**
 * The centred window of a hero-centred arrangement at a given capacity — the
 * *"additional ranked cards fill outward symmetrically"* rule, read backwards.
 *
 * Narrowing drops flankers from both ends at once, so the hero never moves and
 * a resize never reshuffles the lane.
 */
export const centredFeaturedWindow = (
  arranged: readonly Endeavor[],
  capacity: FeaturedNowCapacity,
): readonly Endeavor[] => {
  if (arranged.length <= capacity) return arranged
  const drop = arranged.length - capacity
  const leading = Math.floor(drop / 2)
  return arranged.slice(leading, leading + capacity)
}
