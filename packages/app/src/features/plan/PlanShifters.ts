/**
 * Plan's Shifters (`RC-4`, `RC-19`): pure `with…(state, args) => PlanState`
 * functions, each returning a brand-new object and each carrying exactly one
 * concern.
 *
 * No clock, no randomness, no service — where a shift needs the current instant
 * it takes one as an argument, which is also what makes every rule below
 * testable against a pinned date.
 *
 * The ones worth reading twice are the three that hold the preload invariant:
 * `withPlanDayLoaded` writes only the authoritative array,
 * `withPlanPreloadInstalled` writes only the buffer (with the authoritative day
 * partitioned out), and `withPlanPreloadSettled` writes only the in-flight
 * marker. No Shifter here writes both sides, which is the structural reason a
 * preload response can never clobber the day the user is looking at.
 */
import type { Endeavor } from '@kro/core'
import { withRescheduled } from '@kro/core'
import type { PlanDayKey } from './PlanCalendar'
import { planDayKey, startOfPlanDay } from './PlanCalendar'
import {
  emptyPlanDayCache,
  partitionPlanDayBuffer,
  planCachePreservingDayAcrossMidnight,
  planCacheReplacing,
  planCacheWithRescheduled,
} from './PlanDayCache'
import type { TimelineEditCommit, TimelineEditSession } from './PlanEditSession'
import type { PlanException } from './PlanException'
import { planDayPickerCenter } from './PlanNavigation'
import type {
  PlanLoadReason,
  PlanMatrixLoadState,
  PlanState,
  PlanVisibility,
  PlanVisibilityToggle,
} from './PlanState'
import { PlanLoadReason as Reason } from './PlanState'
import type { QuickCreateDraft } from './TimelineSlots'

/** The events the authoritative day currently holds, or `[]`. */
const authoritativeEventsOf = (state: PlanState): readonly Endeavor[] =>
  state.dayLoad.kind === 'loaded' ? state.dayLoad.events : []

/** The day the authoritative array is about, or `null` when it holds none. */
export const authoritativeDayKeyOf = (state: PlanState): PlanDayKey | null =>
  state.dayLoad.kind === 'loaded' ? state.dayLoad.dayKey : null

/**
 * One concern: the surface mounted, so the clock, the day it is showing and
 * the flag it was built against are all stamped at once. The picker's batch
 * centre is seeded here because canon seeds it from **today**, not from the
 * selection.
 */
export function withPlanViewLoaded(
  state: PlanState,
  args: {
    readonly now: Date
    readonly selectedDate: Date
    readonly isQuickEventCreationEnabled: boolean
  },
): PlanState {
  return {
    ...state,
    now: args.now,
    selectedDate: args.selectedDate,
    isQuickEventCreationEnabled: args.isQuickEventCreationEnabled,
    dayPickerCenter: planDayPickerCenter({
      currentCenter: null,
      selectedDate: args.selectedDate,
      now: args.now,
    }),
  }
}

/**
 * One concern: the clock advanced. Crossing midnight while the day that just
 * ended is still selected copies that day's authoritative array into the buffer
 * first, so the user's view does not empty out from under them.
 */
export function withPlanClockAdvanced(
  state: PlanState,
  args: { readonly now: Date },
): PlanState {
  // Only the array that genuinely holds the day that just ended may be
  // preserved into it; anything else would file one day's events under another.
  const holdsPreviousDay =
    authoritativeDayKeyOf(state) === planDayKey(state.now)
  return {
    ...state,
    now: args.now,
    preloadedDays: planCachePreservingDayAcrossMidnight({
      cache: state.preloadedDays,
      selectedDate: state.selectedDate,
      previousNow: state.now,
      now: args.now,
      authoritativeEvents: holdsPreviousDay ? authoritativeEventsOf(state) : [],
    }),
  }
}

/** One concern: the two Plan preferences the timeline consumes arrived. */
export function withPlanPreferencesApplied(
  state: PlanState,
  args: {
    readonly dayViewRange: PlanState['dayViewRange']
    readonly showCompletedInTimeline: boolean
  },
): PlanState {
  return {
    ...state,
    dayViewRange: args.dayViewRange,
    showCompletedInTimeline: args.showCompletedInTimeline,
  }
}

/** One concern: a persisted lens snapshot was restored (or there was none). */
export function withPlanVisibility(
  state: PlanState,
  visibility: PlanVisibility,
): PlanState {
  return { ...state, visibility }
}

const toggledMembership = <T>(current: readonly T[], value: T): readonly T[] =>
  current.includes(value)
    ? current.filter((member) => member !== value)
    : [...current, value]

/**
 * One concern: the user flipped one visibility toggle.
 *
 * State stores what is **hidden**, as canon's lens does, so a toggle is a
 * membership flip on the matching hidden set. Modelling it as "visible"
 * instead would make a kind added to the product default to hidden, which is
 * the opposite of what a new filter should do.
 */
export function withPlanVisibilityToggled(
  state: PlanState,
  toggle: PlanVisibilityToggle,
): PlanState {
  const visibility = state.visibility
  switch (toggle.axis) {
    case 'kind':
      return withPlanVisibility(state, {
        ...visibility,
        hiddenKinds: toggledMembership(visibility.hiddenKinds, toggle.value),
      })
    case 'host':
      return withPlanVisibility(state, {
        ...visibility,
        hiddenHosts: toggledMembership(visibility.hiddenHosts, toggle.value),
      })
    case 'status':
      return withPlanVisibility(state, {
        ...visibility,
        hiddenStatuses: toggledMembership(
          visibility.hiddenStatuses,
          toggle.value,
        ),
      })
    case 'computedState':
      return withPlanVisibility(state, {
        ...visibility,
        hiddenComputedStates: toggledMembership(
          visibility.hiddenComputedStates,
          toggle.value,
        ),
      })
    case 'calendar':
      return withPlanVisibility(state, {
        ...visibility,
        hiddenCalendarIds: toggledMembership(
          visibility.hiddenCalendarIds,
          toggle.value,
        ),
      })
    default:
      return state
  }
}

/**
 * One concern: a different day is now selected. The picker's batch follows only
 * if the new day left it, and any edit session or uncommitted ghost belonging to
 * the day being left is dropped — neither survives a navigation, and leaving one
 * behind would arm a card that is no longer on screen.
 */
export function withSelectedDay(
  state: PlanState,
  args: { readonly date: Date },
): PlanState {
  const selectedDate = startOfPlanDay(args.date)
  return {
    ...state,
    selectedDate,
    dayPickerCenter: planDayPickerCenter({
      currentCenter: state.dayPickerCenter,
      selectedDate,
      now: state.now,
    }),
    editSession: null,
    quickCreate: null,
  }
}

/**
 * One concern: a read of the authoritative day started. Marks the lifecycle
 * loading **and** raises the activity marker matching the reason it started
 * for, which is what lets one control cover all three load kinds.
 */
export function withPlanDayLoadStarted(
  state: PlanState,
  args: { readonly dayKey: PlanDayKey; readonly reason: PlanLoadReason },
): PlanState {
  return {
    ...state,
    dayLoad: { kind: 'loading', dayKey: args.dayKey },
    activity: {
      ...state.activity,
      isRefreshing:
        args.reason === Reason.manual ? true : state.activity.isRefreshing,
      isAppLoading:
        args.reason === Reason.appWide ? true : state.activity.isAppLoading,
    },
  }
}

/** One concern: the authoritative day arrived, and its marker settles. */
export function withPlanDayLoaded(
  state: PlanState,
  args: {
    readonly dayKey: PlanDayKey
    readonly events: readonly Endeavor[]
    readonly reason: PlanLoadReason
  },
): PlanState {
  return {
    ...state,
    dayLoad: { kind: 'loaded', dayKey: args.dayKey, events: args.events },
    activity: {
      ...state.activity,
      isRefreshing:
        args.reason === Reason.manual ? false : state.activity.isRefreshing,
      isAppLoading:
        args.reason === Reason.appWide ? false : state.activity.isAppLoading,
    },
  }
}

/**
 * One concern: the authoritative day failed — and its marker settles all the
 * same. A failure that left the marker raised would spin the control forever,
 * which is exactly the bug canon's explicit in-flight tracking exists to stop.
 */
export function withPlanDayLoadFailed(
  state: PlanState,
  args: {
    readonly dayKey: PlanDayKey
    readonly exception: PlanException
    readonly reason: PlanLoadReason
  },
): PlanState {
  return {
    ...state,
    dayLoad: { kind: 'failed', dayKey: args.dayKey, exception: args.exception },
    activity: {
      ...state.activity,
      isRefreshing:
        args.reason === Reason.manual ? false : state.activity.isRefreshing,
      isAppLoading:
        args.reason === Reason.appWide ? false : state.activity.isAppLoading,
    },
  }
}

/** One concern: a read-ahead window for `centerDayKey` is now in flight. */
export function withPlanPreloadStarted(
  state: PlanState,
  args: { readonly centerDayKey: PlanDayKey },
): PlanState {
  return {
    ...state,
    activity: { ...state.activity, preloadCenterDayKey: args.centerDayKey },
  }
}

/**
 * One concern: a read-ahead window's marker settles — **only** if it is still
 * the window in flight.
 *
 * Canon's rule, verbatim: *"a response for a window that has already been
 * superseded leaves the marker alone — the newer request owns it."* Without the
 * guard, a slow response for a day the user has already navigated away from
 * would stop the control while its replacement is still running.
 */
export function withPlanPreloadSettled(
  state: PlanState,
  args: { readonly centerDayKey: PlanDayKey },
): PlanState {
  if (state.activity.preloadCenterDayKey !== args.centerDayKey) return state
  return {
    ...state,
    activity: { ...state.activity, preloadCenterDayKey: null },
  }
}

/**
 * One concern: a read-ahead window landed. The buffer is replaced wholesale and
 * the authoritative day is partitioned **out** of it before it is stored, so
 * this Shifter has no way to touch `dayLoad` even by accident.
 */
export function withPlanPreloadInstalled(
  state: PlanState,
  args: {
    readonly centerDayKey: PlanDayKey
    readonly events: readonly Endeavor[]
  },
): PlanState {
  return {
    ...state,
    preloadedDays: partitionPlanDayBuffer(args.events, {
      excludingDayKey: authoritativeDayKeyOf(state),
    }),
    preloadedCenterDayKey: args.centerDayKey,
  }
}

/** One concern: the matrix's own row set moved through its lifecycle. */
export function withPlanMatrixLoad(
  state: PlanState,
  load: PlanMatrixLoadState,
): PlanState {
  return { ...state, matrixLoad: load }
}

/**
 * One concern: the uncommitted quick-create ghost was seeded or cleared.
 * Clearing happens whether the prompt was confirmed or dismissed — canon's
 * `onEventDraftEnded`.
 */
export function withQuickCreateDraft(
  state: PlanState,
  draft: QuickCreateDraft | null,
): PlanState {
  return { ...state, quickCreate: draft }
}

/**
 * One concern: the edit session was armed, advanced or torn down. Arming clears
 * any quick-create ghost — canon disables the slot layer entirely while a card
 * is editing (`allowsHitTesting(editingEventID == nil)`), so the two are never
 * live at once.
 */
export function withEditSession(
  state: PlanState,
  session: TimelineEditSession | null,
): PlanState {
  return {
    ...state,
    editSession: session,
    quickCreate: session === null ? state.quickCreate : null,
  }
}

/**
 * One concern: an edit was committed, so every fetched representation of the
 * event moves together.
 *
 * The event is rewritten in the authoritative array **and** in the buffer, and
 * a card dragged onto another day leaves the authoritative array for the
 * buffer's entry for its new day — canon's single-owner rule: *"events leaving
 * today are removed from the authoritative one-day snapshot so each occurrence
 * has one owner."*
 */
export function withEditCommitApplied(
  state: PlanState,
  args: { readonly commit: TimelineEditCommit },
): PlanState {
  const { commit } = args
  const durationSeconds = (commit.end.getTime() - commit.start.getTime()) / 1000
  const authoritativeDayKey = authoritativeDayKeyOf(state)

  const existing =
    authoritativeEventsOf(state).find(
      (event) => event.id === commit.endeavorId,
    ) ??
    Object.values(state.preloadedDays)
      .flat()
      .find((event) => event.id === commit.endeavorId) ??
    null
  if (existing === null) return withEditSession(state, null)

  const rescheduled = withRescheduled(existing, commit.start, durationSeconds)
  const staysOnAuthoritativeDay =
    planDayKey(commit.start) === authoritativeDayKey

  const withoutEvent = authoritativeEventsOf(state).filter(
    (event) => event.id !== commit.endeavorId,
  )
  const nextEvents = staysOnAuthoritativeDay
    ? [...withoutEvent, rescheduled]
    : withoutEvent

  return {
    ...state,
    dayLoad:
      state.dayLoad.kind === 'loaded'
        ? { kind: 'loaded', dayKey: state.dayLoad.dayKey, events: nextEvents }
        : state.dayLoad,
    preloadedDays: planCacheWithRescheduled({
      cache: state.preloadedDays,
      endeavor: rescheduled,
      authoritativeDayKey,
    }),
    editSession: null,
  }
}

/**
 * One concern: a matrix assignment resolved, so *"every fetched representation
 * of an endeavor"* is replaced together — canon's
 * `applyMatrixResolvedEndeavor`, whose whole reason for existing is that *"the
 * matrix, picker, timeline, and caches cannot disagree."*
 */
export function withMatrixResolvedEndeavor(
  state: PlanState,
  endeavor: Endeavor,
): PlanState {
  const replaceIn = (events: readonly Endeavor[]): readonly Endeavor[] =>
    events.map((event) => (event.id === endeavor.id ? endeavor : event))

  return {
    ...state,
    dayLoad:
      state.dayLoad.kind === 'loaded'
        ? {
            kind: 'loaded',
            dayKey: state.dayLoad.dayKey,
            events: replaceIn(state.dayLoad.events),
          }
        : state.dayLoad,
    matrixLoad:
      state.matrixLoad.kind === 'loaded'
        ? { kind: 'loaded', endeavors: replaceIn(state.matrixLoad.endeavors) }
        : state.matrixLoad,
    preloadedDays: planCacheReplacing(state.preloadedDays, endeavor),
  }
}

/**
 * One concern: the buffer is stale for a day that is no longer centred, so it
 * is emptied rather than half-trusted. Used when the selected day moves outside
 * the installed window.
 */
export function withPlanPreloadCleared(state: PlanState): PlanState {
  return {
    ...state,
    preloadedDays: emptyPlanDayCache,
    preloadedCenterDayKey: null,
  }
}
