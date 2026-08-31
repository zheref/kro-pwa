/**
 * `Endeavor.Perform` — canon `KroCore/Model/Endeavor/Endeavor.swift`,
 * Supabase table `performances`.
 *
 * One recorded attempt at an endeavor: when it happened, how long it ran, how
 * it ended, the focus-session fragments it was made of, and the reward points
 * it earned.
 *
 * **Rename.** Canon's nested `Perform.SessionFragment` is ported as
 * `PerformFragment`: flattening the nesting would collide with the
 * `SessionFragment` this package already exports from
 * `model/Session/SessionFragment` — a different type, from the legacy
 * `/session` timer, with `start`/`end` rather than `startedAt`/`endedAt`.
 * Silently shadowing it in the `@kro/core` barrel would be the worse of the
 * two evils. Session domain proper is #8.
 */
import { type TimeIntervalSeconds, secondsBetween } from '../shared/TimeInterval'

/** How a performance ended. */
export const PerformResolution = {
  /**
   * The session concluded but the task itself stayed open (30% in the
   * sliding-scale formula). Canon's Swift doc comment has this and
   * `finished` swapped; the semantics here follow `Performances.md` and
   * `RewardCalculator.swift`'s actual behavior.
   */
  complete: 'complete',
  /** Session/task aborted before completion. */
  aborted: 'aborted',
  /** The task was completed (100% in the sliding-scale formula). */
  finished: 'finished',
} as const

export type PerformResolution =
  (typeof PerformResolution)[keyof typeof PerformResolution]

/** `Resolution` cases, in canon declaration order. */
export const performResolutions: readonly PerformResolution[] = [
  PerformResolution.complete,
  PerformResolution.aborted,
  PerformResolution.finished,
]

/** `Resolution(rawValue:)` — narrows a raw string, or `null` when unknown. */
export const performResolutionFromRawValue = (
  raw: string,
): PerformResolution | null =>
  performResolutions.find((resolution) => resolution === raw) ?? null

/**
 * Canon's `Perform.SessionFragment` — one continuous work period. `endedAt`
 * is `null` while the fragment is still running.
 */
export interface PerformFragment {
  readonly startedAt: Date
  readonly endedAt: Date | null
}

export const makePerformFragment = (params: {
  readonly startedAt: Date
  readonly endedAt?: Date | null
}): PerformFragment => ({
  startedAt: params.startedAt,
  endedAt: params.endedAt ?? null,
})

/**
 * `SessionFragment.duration` — seconds, or `null` while still running.
 * Deliberately **not** "seconds so far": canon returns `nil` for an open
 * fragment rather than measuring against an ambient clock.
 */
export const performFragmentDuration = (
  fragment: PerformFragment,
): TimeIntervalSeconds | null =>
  fragment.endedAt === null
    ? null
    : secondsBetween(fragment.startedAt, fragment.endedAt)

export interface Perform {
  readonly date: Date
  readonly duration: TimeIntervalSeconds
  readonly notes: string | null
  readonly resolution: PerformResolution
  readonly sessionFragments: readonly PerformFragment[]
  readonly rewardPoints: number
  readonly followUpNotes: string | null
  readonly completedAt: Date | null
  readonly wasCompletedInSession: boolean
}

/** `Perform(date:duration:…)`, carrying every canon default. */
export const makePerform = (params: {
  readonly date: Date
  readonly duration: TimeIntervalSeconds
  readonly notes?: string | null
  readonly resolution: PerformResolution
  readonly sessionFragments?: readonly PerformFragment[]
  readonly rewardPoints?: number
  readonly followUpNotes?: string | null
  readonly completedAt?: Date | null
  readonly wasCompletedInSession?: boolean
}): Perform => ({
  date: params.date,
  duration: params.duration,
  notes: params.notes ?? null,
  resolution: params.resolution,
  sessionFragments: params.sessionFragments ?? [],
  rewardPoints: params.rewardPoints ?? 0,
  followUpNotes: params.followUpNotes ?? null,
  completedAt: params.completedAt ?? null,
  wasCompletedInSession: params.wasCompletedInSession ?? false,
})
