/**
 * The day-progress rings — the port of canon's `tasksRingProgress(now:)` /
 * `habitsRingProgress(now:)` (`Kro/Application/Do/DoSelectors.swift`),
 * specified by `docs/Features/DayProgressRings.md`.
 *
 * Two ratios and one rule that is easy to get wrong and expensive when it is:
 *
 * > **Visibility filters deliberately do not change the rings.** *"Your
 * > progress through the day is a fact about the day, not about what you're
 * > currently looking at — a ring that jumped when you toggled a filter would
 * > be reporting the filter, not the day."*
 *
 * Structurally, that is why every function here takes the **raw** channels
 * (`tasks`, `reminders`, `habits`) and never a lane: the lanes have the lens
 * baked into them, so a ring derived from one could not help but move when the
 * user hid a kind. Nothing in this file accepts a lens.
 *
 * `null` is the third answer and is not the same as `0`: an empty denominator
 * means the ring is **not drawn at all**, because *"an empty gold track would
 * read as 'you've done none of your habits' when in fact there were none to
 * do."*
 */
import {
  type Endeavor,
  EndeavorKind as Kind,
  type ReconciliationContext,
  defaultReconciliationContext,
  isSameCalendarDay,
  resolvedKind,
} from '@kro/core'
import { isCompletedToday } from './DoRules'

/** One ring's standing: what is expected today and how much of it is done. */
export interface DoRing {
  readonly expected: number
  readonly completed: number
  /** `completed / expected`, clamped to `0…1`. */
  readonly progress: number
}

/**
 * `completed ÷ expected`, clamped — or `null` for an empty denominator, which
 * the caller renders as *no ring*, never as an empty track.
 */
const ringOf = (
  expected: readonly Endeavor[],
  now: Date,
  context: ReconciliationContext,
): DoRing | null => {
  if (expected.length === 0) return null
  const completed = expected.filter((endeavor) =>
    isCompletedToday(endeavor, now, context),
  ).length
  return {
    expected: expected.length,
    completed,
    progress: Math.min(1, Math.max(0, completed / expected.length)),
  }
}

/**
 * The inner emerald ring: **every task due today, including the overdue ones**.
 *
 * - *Overdue* — past its due time but still due today — still counts, because
 *   it is still expected of you today.
 * - *Expired* — past due on an earlier day — is excluded outright, *"rather
 *   than dragging the ring down forever"*. It falls out for free: an expired
 *   task's due date is not today.
 * - An **undated** task is not expected today and is counted neither way.
 * - Habits are excluded by the resolved-kind guard, so a habit that came from
 *   an outside list is *"counted once as a habit, never a second time as a
 *   task"*.
 *
 * Canon additionally routes Apple-Reminders-linked rows through
 * `AppleReminderKindResolver.isRelevantToToday`, which admits undated active
 * reminders. Web has no EventKit host (the epic puts Apple Reminders and Apple
 * Calendar out of scope — Google Calendar is the external host), so that
 * branch has no reachable input here and is deliberately not ported; the
 * remaining `due` term is canon's own fallback for every other host.
 */
export const tasksRing = (
  input: {
    readonly tasks: readonly Endeavor[]
    readonly reminders: readonly Endeavor[]
  },
  now: Date,
  context: ReconciliationContext = defaultReconciliationContext(),
): DoRing | null => {
  const expected = [...input.tasks, ...input.reminders].filter((endeavor) => {
    const kind = resolvedKind(endeavor, context)
    if (kind !== Kind.task && kind !== Kind.reminder) return false
    const due = endeavor.due
    return due !== null && isSameCalendarDay(due, now)
  })
  return ringOf(expected, now, context)
}

/**
 * The outer gold ring: **every habit for today**.
 *
 * Strictly `resolvedKind === habit`, and — unlike tasks — **not** filtered by
 * due date: *"an undated habit is still one of today's habits."* The
 * shadow-aware kind partition has already collapsed any external mirror, so
 * nothing counted here is also counted as a task.
 */
export const habitsRing = (
  habits: readonly Endeavor[],
  now: Date,
  context: ReconciliationContext = defaultReconciliationContext(),
): DoRing | null => {
  const expected = habits.filter(
    (endeavor) => resolvedKind(endeavor, context) === Kind.habit,
  )
  return ringOf(expected, now, context)
}

/**
 * Whether the header draws rings at all.
 *
 * The `doActivityRings` flag is a kill switch, not a rollout gate (it ships
 * enabled), and bulk mark-complete mode suppresses them so *"nothing competes
 * with the instruction for attention."* Whether each individual ring is drawn
 * is still its own `null` check — this only answers whether the readout is on
 * the screen.
 */
export const areDoRingsVisible = (input: {
  readonly activityRingsEnabled: boolean
  readonly isInMarkCompleteMode: boolean
}): boolean => input.activityRingsEnabled && !input.isInMarkCompleteMode
