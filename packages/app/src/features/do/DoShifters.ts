/**
 * The Do surface's Shifters (`RC-4`, `RC-19`) — canon's `applyRegroup`,
 * `applyFetchedEndeavors`, `applyGenerateSuggestions`, `applyAutoAdvance` and
 * `synchronizeHabitMirror`, as pure `with…(state, args) => DoState` functions.
 *
 * Every one returns a brand-new plain object; none reads a clock, a service or
 * a random source. Where canon's mutating method reaches for `date()`, the
 * instant arrives here as an argument — which is the whole reason a midnight
 * boundary is testable at all.
 *
 * **`clockAnchor` is the regroup's own record.** Every Shifter that
 * re-partitions stamps it, so a later Selector answers against the instant the
 * lanes were actually built from rather than against whatever the clock says
 * when the component renders.
 */
import {
  type Endeavor,
  EndeavorKind as Kind,
  EndeavorStatus as Status,
  makeReconciliationContext,
  partitionByKindResolvingShadows,
  reconcile,
  resolvedKind,
} from '@kro/core'
import type { DoException } from './DoException'
import type { DoBackdatedCompletion, DoPreferences, DoState } from './DoFeature'
import { selectFeaturedNowEndeavors } from './DoFeaturedNow'
import {
  type DoLane,
  type DoPartitionInput,
  type DoVisibility,
  doCardKey,
  doLensFor,
  nextActionableCardKey,
  partitionDoTaskLanes,
  pendingDoEndeavors,
} from './DoRules'
import { type DoSuggestionSource, generateDoSuggestions } from './DoSuggestions'

/**
 * `applyRegroup` — rebuild every lane from the retained channels.
 *
 * Called whenever the pool, the visibility selection or `nowThresholdHours`
 * changes, and on view load. The pending pool is filtered once and handed to
 * both the lane partition and the featured scorer, exactly as canon's single
 * `pendingEndeavors` local serves both.
 *
 * > **Redundancy: the lanes are cached in state on purpose.** They are derived
 * > data, which `UZF-11` would ordinarily have a Selector compute. Canon
 * > partitions once per snapshot and parks the result, because the Do surface
 * > re-reads the lanes on every card interaction and *"each refreshed Do
 * > snapshot is reconciled, partitioned, and grouped once before it becomes
 * > visible, so the rings and ordinary lanes update together without repeated
 * > whole-screen regrouping"*. The single write point below is what keeps the
 * > cache honest.
 */
const withLanesRegrouped = (state: DoState, now: Date): DoState => {
  const context = makeReconciliationContext({ now })
  const input: DoPartitionInput = {
    tasks: state.tasks,
    reminders: state.reminders,
    lens: doLensFor(state.visibility),
    nowThresholdHours: state.preferences.nowThresholdHours,
    now,
    context,
  }

  const pending = pendingDoEndeavors(input)
  const taskLanes = partitionDoTaskLanes(input, pending)
  const featuredNow = selectFeaturedNowEndeavors(pending, now, context)

  return {
    ...state,
    clockAnchor: now,
    lanes: { featuredNow, ...taskLanes },
  }
}

/** `applyGenerateSuggestions` — rebuild the nudges from integration state. */
export function withSuggestionsRefreshed(state: DoState): DoState {
  return {
    ...state,
    suggestions: generateDoSuggestions({
      integrations: {
        googleCalendarEnabled: state.preferences.googleCalendarEnabled,
        googleCalendarConnected: state.isGoogleCalendarConnected,
      },
      dismissedSources: state.dismissedSuggestionSources,
    }),
  }
}

/**
 * One concern: the surface is on screen at `now`, so classify the retained day
 * against it. Canon's `onViewAppearing` regroups before its fetch returns, so
 * a returning user sees the already-laid-out day immediately.
 */
export function withLoadedAt(state: DoState, now: Date): DoState {
  return withSuggestionsRefreshed(withLanesRegrouped(state, now))
}

/** One concern: a read is in flight, so any prior exception is cleared. */
export function withFetchStarted(state: DoState): DoState {
  return { ...state, load: { kind: 'loading' } }
}

/**
 * One concern: the read failed.
 *
 * The channels and the lanes are untouched — canon *"keeps existing data but
 * clears the refresh spinner so the UI doesn't get stuck loading"*, which is
 * why `load` is a field beside the day rather than the container of it.
 */
export function withException(state: DoState, exception: DoException): DoState {
  return { ...state, load: { kind: 'failed', exception } }
}

/**
 * `applyFetchedEndeavors` — install ONE reconciled snapshot atomically.
 *
 * Reconciliation runs **before** the kind split and before partitioning, which
 * is the `#12` call-order contract: *"source-linked rows are reconciled before
 * filtering, grouping, or presentation"*. Reconciling later could never repair
 * a stale row, because the filter would already have dropped the fresh
 * evidence that proves it stale.
 *
 * Every channel is replaced in the same return value, so task, habit and event
 * channels cannot briefly disagree — that is what makes Clear Expired's
 * refetch atomic from the surface's point of view.
 */
export function withEndeavorsInstalled(
  state: DoState,
  endeavors: readonly Endeavor[],
  now: Date,
): DoState {
  const context = makeReconciliationContext({ now })
  const reconciled = reconcile(endeavors, context)
  const split = partitionByKindResolvingShadows(reconciled, context)

  return withSuggestionsRefreshed(
    withLanesRegrouped(
      {
        ...state,
        load: { kind: 'loaded' },
        // Canon's `allTasks = split.tasks + split.habits`: visible habits
        // render as ordinary cards and take the ordinary card actions.
        tasks: [...split.tasks, ...split.habits],
        habits: split.habits,
        reminders: split.reminders,
        events: split.events,
      },
      now,
    ),
  )
}

/**
 * One concern: the preferences and kill-switch flags landed.
 *
 * The regroup is not optional — `nowThresholdHours` moves the Due Soon / Next
 * boundary, so lanes built under the seeded default are wrong the instant the
 * real value arrives. It is skipped only before the first regroup, when there
 * is no instant to classify against yet.
 */
export function withPreferencesApplied(
  state: DoState,
  preferences: DoPreferences,
): DoState {
  const applied: DoState = { ...state, preferences }
  const anchor = state.clockAnchor
  return withSuggestionsRefreshed(
    anchor === null ? applied : withLanesRegrouped(applied, anchor),
  )
}

/** One concern: the user changed what they want to see, so the lanes rebuild. */
export function withVisibilityApplied(
  state: DoState,
  visibility: DoVisibility,
  now: Date,
): DoState {
  return withLanesRegrouped({ ...state, visibility }, now)
}

/**
 * One concern: this nudge is dismissed for good.
 *
 * Dismissal is recorded against the **source**, not against a card built from
 * copy, so re-wording a nudge can never resurrect one the user turned down.
 */
export function withSuggestionDismissed(
  state: DoState,
  source: DoSuggestionSource,
): DoState {
  if (state.dismissedSuggestionSources.includes(source)) return state
  return withSuggestionsRefreshed({
    ...state,
    dismissedSuggestionSources: [...state.dismissedSuggestionSources, source],
  })
}

/**
 * One concern: a card was tapped. Tapping the prepared card un-prepares it.
 *
 * A manual tap never arms `shouldScrollToCurrentCard` — only auto-advance
 * does, so the surface cannot scroll under a finger that just chose a card.
 */
export function withCardSelected(
  state: DoState,
  section: string,
  endeavorId: string,
): DoState {
  const key = doCardKey(section, endeavorId)
  return {
    ...state,
    selectedCardKey: state.selectedCardKey === key ? null : key,
    shouldScrollToCurrentCard: false,
  }
}

/**
 * One concern: bulk mark-complete mode flipped.
 *
 * Entering clears the preparation cursor and any half-open backdating popover
 * — bulk mode has no single prepared card, and the rings hide while it is on.
 */
export function withMarkCompleteModeToggled(state: DoState): DoState {
  const isEntering = !state.isInMarkCompleteMode
  return {
    ...state,
    isInMarkCompleteMode: isEntering,
    selectedCardKey: isEntering ? null : state.selectedCardKey,
    backdating: isEntering ? null : state.backdating,
    shouldScrollToCurrentCard: false,
  }
}

/** One concern: both scroll one-shots are spent. */
export function withScrollRequestHandled(state: DoState): DoState {
  return {
    ...state,
    shouldScrollToCurrentCard: false,
    shouldScrollToOverdue: false,
  }
}

/** One concern: the completion popover is open on a card, aimed at an instant. */
export function withBackdatingRequested(
  state: DoState,
  endeavorId: string,
  completionDate: Date,
): DoState {
  const backdating: DoBackdatedCompletion = { endeavorId, completionDate }
  return { ...state, backdating }
}

/** One concern: the popover closed without completing anything. */
export function withBackdatingCancelled(state: DoState): DoState {
  if (state.backdating === null) return state
  return { ...state, backdating: null }
}

/**
 * `synchronizeHabitMirror` — keep the rings' gold denominator aligned after a
 * card mutation, since habits live in `tasks` as well as in `habits`.
 */
const withHabitMirrorSynchronized = (state: DoState): DoState => {
  const context = makeReconciliationContext({
    now: state.clockAnchor ?? undefined,
  })
  return {
    ...state,
    habits: state.tasks.filter(
      (endeavor) => resolvedKind(endeavor, context) === Kind.habit,
    ),
  }
}

/**
 * One concern: a completion was confirmed, so close the row here and now.
 *
 * Optimistic by design: canon closes the endeavor in state, regroups and
 * advances focus *before* the persist resolves, so the card leaves its lane
 * the moment it is tapped.
 *
 * **The completion timestamp is stamped here, where canon leaves it `nil`.**
 * On iOS the host owns the timestamp and hands it back on the next fetch; on
 * web this store *is* the host and the persist writes exactly this instant, so
 * stamping it keeps the optimistic state and the refetched state identical —
 * and it is what makes the two things the specs promise actually happen at the
 * tap: the card appears in Completed Today (`DoLanes.md` § 9) and the matching
 * arc *"sweeps forward to its new value"* (`DayProgressRings.md`). A
 * completion backdated to an earlier day correctly does neither.
 *
 * An unknown id is a no-op — a stale card key must not empty the day.
 */
export function withOptimisticallyCompleted(
  state: DoState,
  endeavorId: string,
  completionDate: Date,
  now: Date,
): DoState {
  const index = state.tasks.findIndex((endeavor) => endeavor.id === endeavorId)
  if (index === -1) return state
  const target = state.tasks[index] as Endeavor

  const tasks = [...state.tasks]
  tasks[index] = {
    ...target,
    status: Status.closed,
    completed: completionDate,
  }

  return withLanesRegrouped(
    withHabitMirrorSynchronized({ ...state, tasks, backdating: null }),
    now,
  )
}

/**
 * `applyAutoAdvance` — move focus to the new front of the queue.
 *
 * Off by default: the `do.autoAdvanceAfterComplete` preference *is* the
 * rollout gate, so nothing changes for a user who never turned it on. Bulk
 * mark-complete mode has no preparation cursor to advance and always falls
 * into the clearing branch. When nothing actionable is left, focus clears
 * without jumping anywhere.
 *
 * The invariant this exists to hold: `selectedCardKey` and
 * `shouldScrollToCurrentCard` change **together**, so the renderer can never
 * scroll without a fresh target.
 */
export function withAutoAdvanced(state: DoState): DoState {
  const nextKey =
    state.preferences.autoAdvanceAfterComplete && !state.isInMarkCompleteMode
      ? nextActionableCardKey(state.lanes)
      : null

  if (nextKey === null) {
    return { ...state, selectedCardKey: null, shouldScrollToCurrentCard: false }
  }
  return {
    ...state,
    selectedCardKey: nextKey,
    shouldScrollToCurrentCard: true,
  }
}
