/**
 * The Do surface's slice — the daily execution surface's business rules
 * (`RC-1`, `RC-2`, `RC-24`, `RC-36`), ported from `DoFeature`
 * (`Kro/Application/Do/DoFeature.swift`).
 *
 * Do is **one vista** (`EndeavorsVistas.doTab`), fetched once, reconciled once
 * and partitioned in memory: there is no per-lane query. Every lane, the
 * featured hero, the rings and the counts fall out of that single snapshot.
 *
 * ## The clock never comes from here
 *
 * No reducer, Shifter or Selector in this feature reads `Date.now()` or
 * constructs a `Date`. Every event that needs the current instant carries
 * `now` in its payload, and every Producer takes it as an argument (`RC-4`:
 * *"if a Shifter genuinely needs the current time or an id, pass it in"*).
 * That is what makes a midnight-boundary case a plain unit test rather than a
 * mocked global, and it is why `clockAnchor` exists: the reducer parks the
 * instant it last partitioned against so the pure ring Selectors can answer
 * without consulting a clock themselves. Canon does exactly this, for exactly
 * this reason.
 *
 * ## Why `load` is one field and the pool is not inside it
 *
 * `RC-24` requires one discriminated lifecycle field, never `isLoading` +
 * `exception` in parallel — so `load` is that field. The day's endeavors sit
 * **beside** it rather than inside its `loaded` case, because canon keeps the
 * retained day usable through a failed refresh (*"existing data is kept; only
 * the loading flag clears"*). A `loaded`-carries-the-data union could not
 * represent "showing yesterday's good snapshot, and the refresh just failed"
 * without throwing the snapshot away.
 */
import type { Endeavor } from '@kro/core'
import { type PayloadAction, createSlice } from '@reduxjs/toolkit'
import type { DoException } from './DoException'
import { DoExceptions } from './DoException'
import type { FeaturedNowCapacity } from './DoFeaturedNow'
import {
  clearExpiredThunk,
  fetchDoEndeavorsThunk,
  loadDoPreferencesThunk,
  markEndeavorCompleteThunk,
} from './DoProducer'
import {
  type DoLane,
  type DoLanes,
  type DoVisibility,
  emptyDoLanes,
  initialDoVisibility,
} from './DoRules'
import {
  withAutoAdvanced,
  withBackdatingCancelled,
  withBackdatingRequested,
  withCardSelected,
  withEndeavorsInstalled,
  withException,
  withFetchStarted,
  withLoadedAt,
  withMarkCompleteModeToggled,
  withOptimisticallyCompleted,
  withPreferencesApplied,
  withScrollRequestHandled,
  withSuggestionDismissed,
  withSuggestionsRefreshed,
  withVisibilityApplied,
} from './DoShifters'
import type { DoSuggestion, DoSuggestionSource } from './DoSuggestions'

/** The one lifecycle field (`RC-24`, `UZF-9`). */
export type DoLoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'loaded' }
  | { readonly kind: 'failed'; readonly exception: DoException }

/**
 * The Do preferences and kill-switch flags, resolved together.
 *
 * Canon reads the three `do.*` options through `SettingsProvider` and the two
 * flags through `featureFlags`, then AND's them at the point of use
 * (`showSuggestions` with the preference, the Google nudge with the
 * `googleCalendar` flag, the rings with `doActivityRings`). They travel as one
 * value here because they are read in one pass and are meaningless apart.
 */
export interface DoPreferences {
  /** `do.showSuggestions` — gates the Suggestions lane. Default on. */
  readonly showSuggestions: boolean
  /** `do.nowThresholdHours` — the Due Soon window. Default 2. */
  readonly nowThresholdHours: number
  /** `do.autoAdvanceAfterComplete` — default **off**; the preference is the gate. */
  readonly autoAdvanceAfterComplete: boolean
  /** The `doActivityRings` kill switch. */
  readonly activityRingsEnabled: boolean
  /** The `googleCalendar` flag — whether the connect nudge is offerable at all. */
  readonly googleCalendarEnabled: boolean
}

/**
 * The option defaults, so the first paint is already correct before the
 * preference read lands — canon's own reasoning for seeding these.
 *
 * The two flags seed `false` rather than their baseline: canon starts
 * `isActivityRingsEnabled = false` *"so the pre-flag-read first render never
 * flashes them"*, and the same argument applies to a suggestion card.
 */
export const defaultDoPreferences: DoPreferences = {
  showSuggestions: true,
  nowThresholdHours: 2,
  autoAdvanceAfterComplete: false,
  activityRingsEnabled: false,
  googleCalendarEnabled: false,
}

/**
 * The pending completion the compact date/time popover is editing.
 *
 * State only — the popover itself is #17's. Canon carries the chosen instant
 * as an argument on `userDidMarkCardComplete(_:completionDate:)`; holding it
 * here is what lets the surface open the popover, let the user step the date,
 * and confirm, without the view owning feature state (`UZF-4`).
 */
export interface DoBackdatedCompletion {
  readonly endeavorId: string
  readonly completionDate: Date
}

export interface DoState {
  readonly load: DoLoadState

  // --- the reconciled channels, as the last successful install left them ---
  /** Canon's `allTasks`: the resolved task channel **plus** habits. */
  readonly tasks: readonly Endeavor[]
  /** Canon's `allHabits` — the rings' gold denominator. */
  readonly habits: readonly Endeavor[]
  /** Canon's `allReminders`. Only Completed Today and the tasks ring read it. */
  readonly reminders: readonly Endeavor[]
  /**
   * Today's calendar events. Installed so the single fetch is not thrown away,
   * but **not** grouped into a lane here: the all-day / timed carousel and its
   * session-skip state are the events lane's own work and are not among this
   * issue's deliverables.
   */
  readonly events: readonly Endeavor[]

  // --- the regroup's output ---
  readonly lanes: DoLanes

  // --- user and environment state ---
  readonly visibility: DoVisibility
  readonly preferences: DoPreferences
  /** Whether the user has linked their Google account. */
  readonly isGoogleCalendarConnected: boolean
  readonly suggestions: readonly DoSuggestion[]
  readonly dismissedSuggestionSources: readonly DoSuggestionSource[]

  /**
   * The instant the lanes were last partitioned against, so the pure ring
   * Selectors can answer without a clock. `null` until the first regroup, at
   * which point every ring is absent — nothing has been classified yet.
   */
  readonly clockAnchor: Date | null

  /** How many featured cards the current width can show: 3, 5, 7 or 9. */
  readonly featuredCapacity: FeaturedNowCapacity

  /** `"lane:endeavorId"` — the card in preparation mode, at most one. */
  readonly selectedCardKey: string | null
  /**
   * One-shot: the renderer should bring the auto-advanced card into view.
   * Set only alongside a fresh `selectedCardKey`, never by a manual tap.
   */
  readonly shouldScrollToCurrentCard: boolean
  /** One-shot: the bell was tapped and Overdue should be scrolled to. */
  readonly shouldScrollToOverdue: boolean

  readonly isInMarkCompleteMode: boolean
  readonly backdating: DoBackdatedCompletion | null
}

export const initialDoState: DoState = {
  load: { kind: 'idle' },
  tasks: [],
  habits: [],
  reminders: [],
  events: [],
  lanes: emptyDoLanes,
  visibility: initialDoVisibility,
  preferences: defaultDoPreferences,
  isGoogleCalendarConnected: false,
  suggestions: [],
  dismissedSuggestionSources: [],
  clockAnchor: null,
  featuredCapacity: 3,
  selectedCardKey: null,
  shouldScrollToCurrentCard: false,
  shouldScrollToOverdue: false,
  isInMarkCompleteMode: false,
  backdating: null,
}

export const doSlice = createSlice({
  name: 'do',
  initialState: initialDoState,
  reducers: {
    /** Lifecycle: the surface mounted, so classify the retained day against now. */
    onViewLoaded(state, action: PayloadAction<{ now: Date }>) {
      Object.assign(state, withLoadedAt(state, action.payload.now))
    },

    /**
     * Lifecycle: the available width changed, so the featured lane may show a
     * different odd count. One primitive field — the arrangement itself is
     * untouched, which is what keeps the hero still across a resize.
     */
    onFeaturedCapacityChanged(
      state,
      action: PayloadAction<{ capacity: FeaturedNowCapacity }>,
    ) {
      if (state.featuredCapacity === action.payload.capacity) return
      state.featuredCapacity = action.payload.capacity
    },

    /** Lifecycle: the Google account was linked or unlinked elsewhere. */
    onGoogleCalendarConnectionChanged(
      state,
      action: PayloadAction<{ isConnected: boolean }>,
    ) {
      Object.assign(
        state,
        withSuggestionsRefreshed({
          ...state,
          isGoogleCalendarConnected: action.payload.isConnected,
        }),
      )
    },

    /**
     * The Visibility surface talking back with the user's new selection. Do
     * owns no toggle semantics — it installs the selection and regroups, which
     * is what keeps the filter sheet and this slice from drifting.
     */
    childVisibilityDelegatedSelectionChanged(
      state,
      action: PayloadAction<{ visibility: DoVisibility; now: Date }>,
    ) {
      Object.assign(
        state,
        withVisibilityApplied(
          state,
          action.payload.visibility,
          action.payload.now,
        ),
      )
    },

    /** User intent: a short tap prepares a card, and a second tap un-prepares it. */
    userDidTapCard(
      state,
      action: PayloadAction<{ lane: DoLane; endeavorId: string }>,
    ) {
      Object.assign(
        state,
        withCardSelected(state, action.payload.lane, action.payload.endeavorId),
      )
    },

    /** User intent, single primitive field. */
    userDidDeselectCard(state) {
      state.selectedCardKey = null
    },

    /**
     * User intent: enter or leave bulk mark-complete mode. Entering clears the
     * preparation cursor — bulk mode has no single prepared card — and the
     * rings hide while it is on.
     */
    userDidToggleMarkCompleteMode(state) {
      Object.assign(state, withMarkCompleteModeToggled(state))
    },

    /**
     * User intent: the attention bell. Canon refuses to arm the jump when
     * Overdue is empty, so the control never scrolls to nothing.
     */
    userDidTapNotifications(state) {
      if (state.lanes.overdue.length === 0) return
      state.shouldScrollToOverdue = true
    },

    /** Lifecycle: the renderer performed the scroll, so the one-shots clear. */
    onScrollRequestHandled(state) {
      Object.assign(state, withScrollRequestHandled(state))
    },

    /** User intent: this nudge is not wanted. Dismissal is per source. */
    userDidDismissSuggestion(
      state,
      action: PayloadAction<{ source: DoSuggestionSource }>,
    ) {
      Object.assign(
        state,
        withSuggestionDismissed(state, action.payload.source),
      )
    },

    /**
     * User intent: open (or re-aim) the compact completion date/time popover.
     * Re-dispatching with a new instant is how the popover steps the date.
     */
    userDidRequestBackdatedCompletion(
      state,
      action: PayloadAction<{ endeavorId: string; completionDate: Date }>,
    ) {
      Object.assign(
        state,
        withBackdatingRequested(
          state,
          action.payload.endeavorId,
          action.payload.completionDate,
        ),
      )
    },

    /** User intent: dismiss the popover without completing anything. */
    userDidCancelBackdatedCompletion(state) {
      Object.assign(state, withBackdatingCancelled(state))
    },

    /**
     * User intent: confirm a completion, at the instant the popover carries.
     *
     * The shift is optimistic — canon closes the row in state, regroups and
     * advances focus *before* the persist effect resolves, so the card leaves
     * its lane the moment it is tapped. `markEndeavorCompleteThunk` then
     * persists, and only its failure arm has anything left to say.
     */
    userDidMarkCardComplete(
      state,
      action: PayloadAction<{
        endeavorId: string
        completionDate: Date
        now: Date
      }>,
    ) {
      const { endeavorId, completionDate, now } = action.payload
      const completed = withOptimisticallyCompleted(
        state,
        endeavorId,
        completionDate,
        now,
      )
      Object.assign(state, withAutoAdvanced(completed))
    },
  },
  extraReducers: (builder) => {
    builder
      // --- preferences + flags ------------------------------------------
      .addCase(loadDoPreferencesThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(state, withPreferencesApplied(state, result.value))
        } else {
          Object.assign(state, withException(state, result.error))
        }
      })
      .addCase(loadDoPreferencesThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withException(
            state,
            DoExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // --- the day's endeavors -------------------------------------------
      .addCase(fetchDoEndeavorsThunk.pending, (state) => {
        Object.assign(state, withFetchStarted(state))
      })
      .addCase(fetchDoEndeavorsThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(
            state,
            withEndeavorsInstalled(
              state,
              result.value.endeavors,
              result.value.now,
            ),
          )
        } else {
          // Canon keeps the retained day usable and clears only the spinner.
          Object.assign(state, withException(state, result.error))
        }
      })
      .addCase(fetchDoEndeavorsThunk.rejected, (state, action) => {
        // Cancellation is the one silent exit (`UZF-14`): a superseded refresh
        // must never paint an exception over a day that is still good.
        if (action.meta.aborted) return
        Object.assign(
          state,
          withException(
            state,
            DoExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // --- Clear Expired --------------------------------------------------
      .addCase(clearExpiredThunk.pending, (state) => {
        Object.assign(state, withFetchStarted(state))
      })
      // The whole point of the arm: every provider mutation has already been
      // awaited, and the refetched snapshot lands here in ONE install. No
      // intermediate state is ever observable, so a half-cleared day cannot
      // be painted (`DayProgressRings.md`: *"then refetches the Do query and
      // atomically replaces the visible snapshot"*).
      .addCase(clearExpiredThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(
            state,
            withEndeavorsInstalled(
              state,
              result.value.endeavors,
              result.value.now,
            ),
          )
        } else {
          Object.assign(state, withException(state, result.error))
        }
      })
      .addCase(clearExpiredThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withException(
            state,
            DoExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      // --- one completion --------------------------------------------------
      // No `.pending` arm on purpose: `userDidMarkCardComplete` has already
      // moved the card out of its lane, and a spinner here would contradict
      // that optimism. Only the failure has anything left to report.
      .addCase(markEndeavorCompleteThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (!result.ok) {
          Object.assign(state, withException(state, result.error))
        }
      })
      .addCase(markEndeavorCompleteThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withException(
            state,
            DoExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })
  },
})

export const {
  childVisibilityDelegatedSelectionChanged,
  onFeaturedCapacityChanged,
  onGoogleCalendarConnectionChanged,
  onScrollRequestHandled,
  onViewLoaded,
  userDidCancelBackdatedCompletion,
  userDidDeselectCard,
  userDidDismissSuggestion,
  userDidMarkCardComplete,
  userDidRequestBackdatedCompletion,
  userDidTapCard,
  userDidTapNotifications,
  userDidToggleMarkCompleteMode,
} = doSlice.actions
