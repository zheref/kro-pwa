/**
 * The Do lanes — the pure port of canon's `applyRegroup`
 * (`Kro/Application/Do/DoShifters.swift`) and the `Endeavor` temporal
 * predicates it stands on (`Kro/Models/Endeavors.swift`), specified by
 * `Kro/Application/Now/DoLanes.md`.
 *
 * Everything here is a **pure function of `(endeavors, lens, now)`**. There is
 * no clock read, no store, no service: `now` is always a parameter, so a lane
 * is answerable at any instant and a midnight-boundary test states the instant
 * it is asking about instead of mocking a global (`UZF-10`, `UZF-11`). Canon's
 * own predicates read `Date()` inside the property; the parameterised
 * `isDueNow(withinHours:now:)` / `isDueNext(withinHours:now:)` pair it added
 * for the `do.nowThresholdHours` preference is the shape ported here, applied
 * to `isOverdue` and `featuredNowScore` as well.
 *
 * ## Kind is the RESOLVED kind, everywhere
 *
 * Canon guards every lane on `resolvedKind` — the kind after source
 * reconciliation, not the kind Kro last persisted — because *"kind filters
 * always evaluate the resolved classification rather than the last stored
 * fallback"*. `packages/core/src/vistas` still reads plain `kind` with a doc
 * note at each site saying that adopting `resolvedKind` is a vistas-lane
 * change (see `ResolvedKind.ts` and `EndeavorComputedState.ts`). This lane
 * does **not** edit those files: it re-states the three computed-state guards
 * locally against `resolvedKind`, which is what canon does and what makes a
 * daily reminder participate here as a Habit.
 *
 * ## Boundary semantics the doc does not state (read out of the Swift)
 *
 * - `isDueNow` is `due >= now`, `isOverdue` is `due < now`: an endeavor due at
 *   *exactly* `now` is **Due Soon**, never Overdue.
 * - The Due-Soon window is **inclusive** (`<= hours`) and Next is strictly
 *   `> hours`: exactly-two-hours-away is Due Soon, not Next.
 * - Overdue vs Expired splits on the **calendar day of the due date**, not on
 *   a rolling 24h window — something due 23:59 yesterday is Expired at 00:01
 *   today, two minutes later.
 * - `isDueNext` additionally requires `isDueToday`, so a **pending task due
 *   tomorrow appears in no lane at all**: not Next (not today), not Anytime
 *   (it has a due date). That is canon's behaviour, not an omission here.
 * - The ongoing tail of the Due-Soon lane is **appended after** the due-sorted
 *   head and is itself unsorted, so Due Soon is not globally due-ordered — the
 *   doc's "sorted by due date ascending" describes the head only.
 * - `hasBeenCompleted` also counts `skipped`, `reviewing` and `qa`, while
 *   Completed Today requires `status === closed`; a **skipped** endeavor
 *   therefore leaves every lane and appears in none.
 */
import {
  type Endeavor,
  EndeavorComputedState,
  type EndeavorHost,
  type EndeavorKind,
  EndeavorKind as Kind,
  EndeavorStatus as Status,
  type EndeavorsLens,
  EndeavorsVistas,
  PerformResolution,
  type ReconciliationContext,
  SECONDS_PER_HOUR,
  defaultReconciliationContext,
  hasBeenCompleted,
  isSameCalendarDay,
  resolvedKind,
} from '@kro/core'

// ---------------------------------------------------------------------------
// Lanes
// ---------------------------------------------------------------------------

/**
 * The section tags canon uses in `selectedCardKey` (`"sectionTag:endeavorID"`)
 * and in its auto-advance priority list. Kept as canon's literal strings so a
 * key minted here is the same key the iOS surface mints.
 */
export const DoLane = {
  featured: 'featured',
  now: 'now',
  overdue: 'overdue',
  expired: 'expired',
  next: 'next',
  anytime: 'anytime',
  completed: 'completed',
} as const

export type DoLane = (typeof DoLane)[keyof typeof DoLane]

/** One regroup's output — canon's six card arrays plus Completed Today. */
export interface DoLanes {
  readonly featuredNow: readonly Endeavor[]
  readonly now: readonly Endeavor[]
  readonly overdue: readonly Endeavor[]
  readonly expired: readonly Endeavor[]
  readonly next: readonly Endeavor[]
  readonly anytime: readonly Endeavor[]
  readonly completedToday: readonly Endeavor[]
}

export const emptyDoLanes: DoLanes = {
  featuredNow: [],
  now: [],
  overdue: [],
  expired: [],
  next: [],
  anytime: [],
  completedToday: [],
}

/** The fully-qualified card key canon's `selectedCardKey` carries. */
export const doCardKey = (lane: DoLane, endeavorId: string): string =>
  `${lane}:${endeavorId}`

// ---------------------------------------------------------------------------
// Visibility, as the slice stores it
// ---------------------------------------------------------------------------

/**
 * The user's visibility choices, held as **arrays** rather than as an
 * `EndeavorsLens`.
 *
 * `EndeavorsLens` carries five `Set`s, and the store's `serializableCheck`
 * admits `Date` and plain objects only — a `Set` in state would log on every
 * dispatch and break time-travel, which is why Redux state holds plain
 * collections and materialises the richer type at the point of use. Do's lens
 * exposes exactly these four toggles (`EndeavorsVistas.doTab`), so nothing is
 * lost: `showArchived`, `grouping`, `sort` and `exposes` are static vista
 * config, not user state.
 */
export interface DoVisibility {
  readonly hiddenKinds: readonly EndeavorKind[]
  readonly hiddenHosts: readonly EndeavorHost[]
  readonly hiddenComputedStates: readonly EndeavorComputedState[]
  readonly hiddenCalendarIds: readonly string[]
}

/** Nothing hidden — the Do vista's own starting point. */
export const initialDoVisibility: DoVisibility = {
  hiddenKinds: [],
  hiddenHosts: [],
  hiddenComputedStates: [],
  hiddenCalendarIds: [],
}

/**
 * The Do vista's lens with the user's choices applied — the shape every rule
 * below reads. Built from `EndeavorsVistas.doTab.lens` so the vista keeps
 * owning `showArchived: true` (without it the post-filter strips every closed
 * row and Completed Today could never survive a refetch) and the exposed
 * toggle set.
 */
export const doLensFor = (visibility: DoVisibility): EndeavorsLens => ({
  ...EndeavorsVistas.doTab.lens,
  hiddenKinds: new Set(visibility.hiddenKinds),
  hiddenHosts: new Set(visibility.hiddenHosts),
  hiddenComputedStates: new Set(visibility.hiddenComputedStates),
  hiddenCalendarIds: new Set(visibility.hiddenCalendarIds),
})

// ---------------------------------------------------------------------------
// Kind & completion predicates
// ---------------------------------------------------------------------------

/** Canon's `[.task, .habit].contains(resolvedKind)` guard, shared by every lane. */
export const isActionableDoKind = (
  endeavor: Endeavor,
  context: ReconciliationContext,
): boolean => {
  const kind = resolvedKind(endeavor, context)
  return kind === Kind.task || kind === Kind.habit
}

/**
 * `EndeavorComputedState.completedToday`, re-stated against `resolvedKind`.
 *
 * Normally closed with a host completion timestamp dated today; canon falls
 * back to the latest `complete` performance when the host never returned one,
 * which is how a recurring occurrence that the provider already advanced still
 * reads as done. Deliberately **not** `hasBeenCompleted`, which also counts
 * skipped / reviewing / qa and would overstate a ring.
 */
export const isCompletedToday = (
  endeavor: Endeavor,
  now: Date,
  context: ReconciliationContext,
): boolean => {
  const kind = resolvedKind(endeavor, context)
  if (kind !== Kind.task && kind !== Kind.habit && kind !== Kind.reminder) {
    return false
  }
  if (endeavor.status !== Status.closed) return false
  const completed = endeavor.completed ?? latestCompletionPerformance(endeavor)
  if (completed === null) return false
  return isSameCalendarDay(completed, now)
}

/** The latest `completedAt` across this endeavor's completed performances. */
const latestCompletionPerformance = (endeavor: Endeavor): Date | null => {
  let latest: Date | null = null
  for (const performance of endeavor.performances) {
    if (performance.resolution !== PerformResolution.complete) continue
    const at = performance.completedAt
    if (at === null) continue
    if (latest === null || at.getTime() > latest.getTime()) latest = at
  }
  return latest
}

// ---------------------------------------------------------------------------
// Temporal predicates — canon `Endeavor`, with the clock injected
// ---------------------------------------------------------------------------

/** `Endeavor.isOverdue` — pending, of an actionable kind, and past its due moment. */
export const isPastDue = (
  endeavor: Endeavor,
  now: Date,
  context: ReconciliationContext,
): boolean => {
  if (!isActionableDoKind(endeavor, context)) return false
  if (hasBeenCompleted(endeavor)) return false
  const due = endeavor.due
  return due !== null && due.getTime() < now.getTime()
}

/** Past-due **and** due today — the Overdue lane. */
export const isOverdueToday = (
  endeavor: Endeavor,
  now: Date,
  context: ReconciliationContext,
): boolean =>
  isPastDue(endeavor, now, context) &&
  endeavor.due !== null &&
  isSameCalendarDay(endeavor.due, now)

/** Past-due and due on an **earlier** day — the Expired lane. */
export const isExpired = (
  endeavor: Endeavor,
  now: Date,
  context: ReconciliationContext,
): boolean =>
  isPastDue(endeavor, now, context) &&
  endeavor.due !== null &&
  !isSameCalendarDay(endeavor.due, now)

/** `isDueNow(withinHours:now:)` — due at or after `now`, within the window. */
export const isDueNow = (
  endeavor: Endeavor,
  withinHours: number,
  now: Date,
  context: ReconciliationContext,
): boolean => {
  if (!isActionableDoKind(endeavor, context)) return false
  if (hasBeenCompleted(endeavor)) return false
  const due = endeavor.due
  if (due === null) return false
  if (due.getTime() < now.getTime()) return false
  const secondsUntilDue = (due.getTime() - now.getTime()) / 1000
  return secondsUntilDue <= withinHours * SECONDS_PER_HOUR
}

/** `isDueNext(withinHours:now:)` — due later **today**, beyond the window. */
export const isDueNext = (
  endeavor: Endeavor,
  withinHours: number,
  now: Date,
  context: ReconciliationContext,
): boolean => {
  if (!isActionableDoKind(endeavor, context)) return false
  if (hasBeenCompleted(endeavor)) return false
  const due = endeavor.due
  if (due === null) return false
  if (!isSameCalendarDay(due, now)) return false
  const secondsUntilDue = (due.getTime() - now.getTime()) / 1000
  return secondsUntilDue > withinHours * SECONDS_PER_HOUR
}

// ---------------------------------------------------------------------------
// Visibility — the lens, read through the resolved kind
// ---------------------------------------------------------------------------

/**
 * Canon's kind + host lens terms, in canon's order.
 *
 * The host term is the one that surprises: an endeavor is hidden only when
 * **every** host it lives on is hidden, so hiding one source never hides an
 * item that also lives in a visible one, and a host-less (in-memory) row
 * always survives. That is `lensPredicate`'s rule, restated here only so the
 * kind term can read the **resolved** kind.
 */
export const passesDoKindAndHostLens = (
  endeavor: Endeavor,
  lens: EndeavorsLens,
  context: ReconciliationContext,
): boolean => {
  if (lens.hiddenKinds.size > 0) {
    if (lens.hiddenKinds.has(resolvedKind(endeavor, context))) return false
  }
  if (lens.hiddenHosts.size > 0 && endeavor.hostedBy.length > 0) {
    const everyHostHidden = endeavor.hostedBy.every((host) =>
      lens.hiddenHosts.has(host),
    )
    if (everyHostHidden) return false
  }
  return true
}

/** Whether the lens still shows a computed-state-gated lane. */
export const isComputedStateVisible = (
  lens: EndeavorsLens,
  state: EndeavorComputedState,
): boolean => !lens.hiddenComputedStates.has(state)

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

/**
 * Canon's `sorted { ($0.due ?? sentinel) < ($1.due ?? sentinel) }`.
 *
 * `Array.prototype.sort` is stable (ES2019), where Swift's `sorted` is not —
 * so two endeavors with the same due moment keep the reconciled pool's own
 * first-appearance order here, and are arbitrary there. That is a strict
 * *gain* in determinism over canon, never a change to the ordering canon
 * actually specifies.
 */
const byDueAscending = (
  endeavors: readonly Endeavor[],
  missing: 'first' | 'last',
): readonly Endeavor[] => {
  const sentinel =
    missing === 'first' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
  const keyOf = (endeavor: Endeavor) => endeavor.due?.getTime() ?? sentinel
  return [...endeavors].sort((left, right) => keyOf(left) - keyOf(right))
}

// ---------------------------------------------------------------------------
// The regroup
// ---------------------------------------------------------------------------

export interface DoPartitionInput {
  /** Canon's `allTasks`: the resolved task channel **plus** habits. */
  readonly tasks: readonly Endeavor[]
  /** Canon's `allReminders`, which only Completed Today draws from. */
  readonly reminders: readonly Endeavor[]
  readonly lens: EndeavorsLens
  /** `do.nowThresholdHours` (canon default 2). */
  readonly nowThresholdHours: number
  readonly now: Date
  readonly context?: ReconciliationContext
}

/**
 * The pending, visible, actionable pool every lane except Completed Today is
 * drawn from — canon's `pendingEndeavors` local, term for term.
 */
export const pendingDoEndeavors = (
  input: DoPartitionInput,
): readonly Endeavor[] => {
  const context = input.context ?? defaultReconciliationContext()
  return input.tasks.filter(
    (endeavor) =>
      isActionableDoKind(endeavor, context) &&
      !hasBeenCompleted(endeavor) &&
      !isCompletedToday(endeavor, input.now, context) &&
      passesDoKindAndHostLens(endeavor, input.lens, context),
  )
}

/**
 * `applyRegroup`'s six task lanes, minus the featured one (which needs the
 * score — see `DoFeaturedNow.ts` and `partitionDoLanes`).
 */
export const partitionDoTaskLanes = (
  input: DoPartitionInput,
  /**
   * The pending pool, when the caller already has it. The featured lane is
   * scored from the same pool, so the Shifter computes it once and hands it
   * to both rather than filtering the day twice.
   */
  pending: readonly Endeavor[] = pendingDoEndeavors(input),
): Omit<DoLanes, 'featuredNow'> => {
  const context = input.context ?? defaultReconciliationContext()
  const { lens, now, nowThresholdHours } = input

  const overdue = isComputedStateVisible(lens, EndeavorComputedState.overdue)
    ? byDueAscending(
        pending.filter((endeavor) => isOverdueToday(endeavor, now, context)),
        'first',
      )
    : []

  const expired = isComputedStateVisible(lens, EndeavorComputedState.expired)
    ? byDueAscending(
        pending.filter((endeavor) => isExpired(endeavor, now, context)),
        'first',
      )
    : []

  // Due Soon = the due-sorted window, then the ongoing tail appended as-is.
  // Canon appends after sorting, so the tail is deliberately not due-ordered.
  const dueSoon = byDueAscending(
    pending.filter((endeavor) =>
      isDueNow(endeavor, nowThresholdHours, now, context),
    ),
    'last',
  )
  const ongoing = pending.filter(
    (endeavor) =>
      endeavor.status === Status.ongoing &&
      !isPastDue(endeavor, now, context) &&
      !isDueNow(endeavor, nowThresholdHours, now, context),
  )

  const next = byDueAscending(
    pending.filter((endeavor) =>
      isDueNext(endeavor, nowThresholdHours, now, context),
    ),
    'last',
  )

  // No temporal sort — canon applies none, so the pool's order is the lane's.
  const anytime = pending.filter(
    (endeavor) => endeavor.due === null && endeavor.status !== Status.ongoing,
  )

  const completedToday = isComputedStateVisible(
    lens,
    EndeavorComputedState.completedToday,
  )
    ? [...input.tasks, ...input.reminders].filter(
        (endeavor) =>
          isCompletedToday(endeavor, now, context) &&
          passesDoKindAndHostLens(endeavor, lens, context),
      )
    : []

  return {
    now: [...dueSoon, ...ongoing],
    overdue,
    expired,
    next,
    anytime,
    completedToday,
  }
}

// ---------------------------------------------------------------------------
// Auto-advance
// ---------------------------------------------------------------------------

/**
 * The lanes auto-advance walks, in canon's priority order: the featured hero
 * first, then the rest of Due Soon, Overdue, Expired, Next and Anytime.
 *
 * Events and Completed Today are absent by construction — the lanes below only
 * ever hold pending tasks and habits — which is exactly canon's *"events /
 * completed / hidden never enter"*. Expired sits beside Overdue on purpose:
 * both are past-due and Do lets the user complete either, so advance must be
 * able to land on one.
 */
export const doAutoAdvanceLaneOrder: readonly DoLane[] = [
  DoLane.featured,
  DoLane.now,
  DoLane.overdue,
  DoLane.expired,
  DoLane.next,
  DoLane.anytime,
]

/**
 * Canon's `heroFirstSearchOrder` — centre, then outward alternating leading /
 * trailing. The featured lane is arranged hero-centred, so walking it in index
 * order would advance to the *second*-ranked card first.
 */
export const heroFirstSearchOrder = (cardCount: number): readonly number[] => {
  if (cardCount <= 0) return []
  const centre = Math.floor(cardCount / 2)
  const indices = [centre]
  if (centre === 0) return indices
  for (let distance = 1; distance <= centre; distance += 1) {
    indices.push(centre - distance)
    const trailing = centre + distance
    if (trailing < cardCount) indices.push(trailing)
  }
  return indices
}

/**
 * `nextActionableCardKeySelector` — the key of the highest-priority card still
 * actionable, or `null` when nothing is left.
 *
 * The same endeavor can appear in more than one lane (the hero is usually also
 * in Due Soon); the first lane it appears in, in priority order, wins.
 */
export const nextActionableCardKey = (lanes: DoLanes): string | null => {
  for (const lane of doAutoAdvanceLaneOrder) {
    const cards = laneCards(lanes, lane)
    const order =
      lane === DoLane.featured
        ? heroFirstSearchOrder(cards.length)
        : cards.map((_, index) => index)
    for (const index of order) {
      const endeavor = cards[index]
      if (endeavor !== undefined) return doCardKey(lane, endeavor.id)
    }
  }
  return null
}

/** The endeavors one lane holds. */
export const laneCards = (
  lanes: DoLanes,
  lane: DoLane,
): readonly Endeavor[] => {
  switch (lane) {
    case DoLane.featured:
      return lanes.featuredNow
    case DoLane.now:
      return lanes.now
    case DoLane.overdue:
      return lanes.overdue
    case DoLane.expired:
      return lanes.expired
    case DoLane.next:
      return lanes.next
    case DoLane.anytime:
      return lanes.anytime
    case DoLane.completed:
      return lanes.completedToday
  }
}

// ---------------------------------------------------------------------------
// Clear Expired
// ---------------------------------------------------------------------------

/**
 * The endeavors **Clear Expired** closes.
 *
 * Canon's reducer arm is `allTasks.filter { (resolvedKind == .task ||
 * resolvedKind == .habit) && isOverdue && !isDueToday }` — past-due **and not
 * due today**, i.e. the Expired lane alone. `DoLanes.md` says the action
 * "clears all `isOverdue` tasks (both today's Overdue and Expired)"; the code
 * says otherwise and the code is the tie-breaker, so today's Overdue is left
 * alone. The divergence is named in this PR; if canon rules for the doc, this
 * predicate is the one line that changes.
 *
 * Note it reads the **raw** pool, never the Expired lane: a user who hid the
 * Expired state still clears everything the action names.
 */
export const doClearExpiredTargets = (
  tasks: readonly Endeavor[],
  now: Date,
  context: ReconciliationContext = defaultReconciliationContext(),
): readonly Endeavor[] =>
  tasks.filter((endeavor) => isExpired(endeavor, now, context))
