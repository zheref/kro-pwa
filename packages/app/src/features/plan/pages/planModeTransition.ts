/**
 * Which way a mode swap travels — the port of `PlanView.entryEdge(from:to:)`
 * and the transition it drives.
 *
 * Canon's rule in one sentence: *"the selector is circular, so 'forward' is the
 * shorter way round"*. With three modes that means one step forward enters from
 * the trailing edge and one step back enters from the leading edge — and
 * because `timeline → priorityMatrix` is two steps forward, which is also one
 * step **back**, it enters from the leading edge. Getting that wrap right is
 * what makes the strip read as one carousel moving under the selector rather
 * than as two unrelated slides.
 *
 * Kept in its own module rather than inside the mode container because it is
 * the one piece of the transition that is pure arithmetic, and because
 * #20 — which fills the list and matrix destinations — needs the same answer
 * without importing a Fragment.
 */
import { type PlanViewMode, planViewModes } from '../PlanNavigation'

/** Which side a destination enters from. Canon's `Edge`, narrowed to the two. */
export type PlanModeEdge = 'leading' | 'trailing'

/** `Edge.opposite` — the side the outgoing destination leaves toward. */
export const oppositePlanModeEdge = (edge: PlanModeEdge): PlanModeEdge =>
  edge === 'leading' ? 'trailing' : 'leading'

/**
 * `PlanView.entryEdge(from:to:)`.
 *
 * `forwardSteps * 2 <= count` is canon's own comparison, kept verbatim rather
 * than simplified to `forwardSteps === 1`: the two agree for three modes and
 * diverge the moment a fourth is added, and canon's form is the one that stays
 * right.
 */
export const planModeEntryEdge = (
  from: PlanViewMode,
  to: PlanViewMode,
): PlanModeEdge => {
  const count = planViewModes.length
  const fromIndex = planViewModes.indexOf(from)
  const toIndex = planViewModes.indexOf(to)
  if (fromIndex < 0 || toIndex < 0) return 'trailing'
  const forwardSteps = ((toIndex - fromIndex) % count + count) % count
  return forwardSteps * 2 <= count ? 'trailing' : 'leading'
}

/**
 * How far off-axis a destination sits when it is not the one on screen.
 *
 * A percentage of the container's own width, so the slide is the same gesture
 * on a 390px phone and a 1440px desktop. Canon's `.move(edge:)` translates by
 * the view's full extent; matching that exactly would make the outgoing
 * destination fly a whole screen, which reads as a page turn rather than a
 * carousel — so this is the fraction of a screen that reads the way canon's
 * spring does at phone width.
 */
export const PLAN_MODE_SLIDE_FRACTION = 0.28

/** The `transform` a destination carries at rest, entering, or leaving. */
export const planModeOffsetPercent = (
  edge: PlanModeEdge,
  presence: 'present' | 'absent',
): number => {
  if (presence === 'present') return 0
  const magnitude = PLAN_MODE_SLIDE_FRACTION * 100
  return edge === 'trailing' ? magnitude : -magnitude
}
