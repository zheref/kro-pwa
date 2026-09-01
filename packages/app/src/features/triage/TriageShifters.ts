/**
 * The Triage Shifters (`RC-4`, `RC-19`) — every state transition this feature
 * makes, as pure `with…(state, args) => TriageState` functions.
 *
 * Each returns a brand-new plain object; none reads a clock, a service or a
 * random source. Where canon's mutating code reaches for `date()`, the instant
 * arrives here as an argument — which is the whole reason "Schedule seeds one
 * week out" and "the Urgent column seeds the soonest fitting gap" are plain
 * unit tests.
 *
 * **A closed session is a no-op, never a crash.** Every form Shifter returns
 * `state` unchanged when `session` is `null`, because a tap can always land one
 * tick after the screen pops and the slice must not invent a session to hold
 * it.
 */
import {
  type EisenhowerQuadrant,
  type ShareOutcome,
  citizenshipOf,
} from '@kro/core'
import type { TriageException } from './TriageException'
import type { TriageSaveState, TriageState } from './TriageFeature'
import {
  type TriageExpiryPreset,
  defaultTriageExpiry,
  triageExpiryAfterSelection,
  triageExpiryPresetDate,
} from './TriageExpiry'
import {
  clampTriageRewardPoints,
  quadrantPromotedByValue,
  rewardScaledForEffortChange,
  triageDecisionFrom,
  triageDurationSeconds,
  triageDurationSelection,
  triageRatingSelection,
  triageRewardDecremented,
  triageRewardIncremented,
  triageSecondaryAction,
  triageShareText,
  valueBumpedByQuadrant,
} from './TriageRules'
import type { TriagePushOutcome } from './TriageSave'
import { defaultTriageDueDate } from './TriageScheduling'
import {
  type TriageForm,
  type TriageOutcome,
  type TriageOutcomeKind,
  type TriageRewardStepDirection,
  type TriageSession,
  type TriageSessionSeed,
  triageFormFromEndeavor,
  triageOutcomeEndsSession,
} from './TriageState'
import { triageWillPromote } from './TriageApplication'

/**
 * The one place a form edit is written. Public Shifters stay one-concern and
 * delegate here so "a closed session is a no-op" is stated once.
 */
const withForm = (
  state: TriageState,
  edit: (form: TriageForm, session: TriageSession) => TriageForm,
): TriageState => {
  const session = state.session
  if (session === null) return state
  return {
    ...state,
    session: { ...session, form: edit(session.form, session) },
  }
}

const sameInstant = (left: Date | null, right: Date | null): boolean =>
  left === null || right === null
    ? left === right
    : left.getTime() === right.getTime()

/**
 * A form edit that may move the expiry, bumping the scroll nonce **only when
 * the expiry actually changed**.
 *
 * Canon's `.onChange(of: selectedExpiry)` fires on a change, not on every
 * assignment, so re-picking the pill that is already selected must not scroll
 * the row — which is also the doc's *"tapping a preset that matches the current
 * picker value is a no-op"*, stated once here instead of per call site.
 */
const withExpiryAwareForm = (
  state: TriageState,
  edit: (form: TriageForm, session: TriageSession) => TriageForm,
): TriageState => {
  const session = state.session
  if (session === null) return state
  const nextForm = edit(session.form, session)
  const moved = !sameInstant(session.form.expiry, nextForm.expiry)
  return {
    ...state,
    session: {
      ...session,
      form: nextForm,
      expiryScrollNonce: session.expiryScrollNonce + (moved ? 1 : 0),
    },
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/** One concern: a read is in flight, so any prior exception is cleared. */
export function withFetchStarted(state: TriageState): TriageState {
  return { ...state, load: { kind: 'loading' } }
}

/**
 * One concern: opening the session failed.
 *
 * The session — if one was already open — is untouched: a failed re-open must
 * leave the form the user is filling in exactly where it was.
 */
export function withException(
  state: TriageState,
  exception: TriageException,
): TriageState {
  return { ...state, load: { kind: 'failed', exception } }
}

/**
 * One concern: the session opened on an endeavor.
 *
 * Everything the screen needs lands together because the prefill is one
 * decision made from one read: the form's seven fields, the day's busy blocks,
 * and the citizenship snapshot that makes "entering does not promote" legible.
 *
 * `willPromoteOnConfirm` is computed here, from the endeavor, with the
 * **confirm** trigger — this is a *forecast*, not the promotion. The endeavor
 * is not mutated and nothing is written; the promotion itself happens in
 * `endeavorWithTriageConfirmed`, inside the save.
 *
 * A previous save's notice is cleared: opening Triage on the next row must not
 * show the last row's sync banner.
 */
export function withSessionOpened(
  state: TriageState,
  seed: TriageSessionSeed,
): TriageState {
  const session: TriageSession = {
    endeavorId: seed.endeavor.id,
    endeavorTitle: seed.endeavor.title,
    endeavorSymbol: seed.endeavorSymbol,
    form: triageFormFromEndeavor(seed.endeavor),
    durationOptionsMinutes: seed.durationOptionsMinutes,
    nextFreeSlotToday: seed.nextFreeSlotToday,
    busyIntervals: seed.busyIntervals,
    isEditReachable: seed.isEditReachable,
    citizenshipAtEntry: citizenshipOf(seed.endeavor),
    willPromoteOnConfirm: triageWillPromote(seed.endeavor),
    expiryScrollNonce: 0,
  }
  return {
    ...state,
    load: { kind: 'loaded' },
    save: { kind: 'idle' },
    session,
    outcome: null,
    clockAnchor: seed.now,
  }
}

// ---------------------------------------------------------------------------
// The form
// ---------------------------------------------------------------------------

/**
 * One concern: a quadrant tile was tapped.
 *
 * `applyQuadrantSelected`'s three connected invariants, and the nesting is
 * canon's own:
 *
 * 1. **Due-date seed** — only when the user has no explicit date yet. An
 *    existing pick is preserved.
 * 2. **Expiry seed** — nested *inside* the due-date branch, so it fires only
 *    when this tap actually seeded a date. The doc says the Urgent column
 *    *"always forces both a scheduled date AND an expiry"*, which reads like an
 *    unconditional seed; canon's nesting is narrower. They agree in practice
 *    because **every** path that sets a scheduled date also seeds an expiry —
 *    the prefill, `withDueDatePicked`, and this branch — so "a date with no
 *    expiry" is unreachable and the two readings cannot be told apart. Ported
 *    as canon writes it; the reading difference is named in the PR, and
 *    `selectTriageExpiryInvariantHolds` is what keeps it unreachable.
 * 3. **Value bump** — an Important quadrant raises a rating below 3 to 3, and a
 *    Not-Important one leaves the rating exactly as it is.
 *
 * The seed is recomputed from **this session's** duration, so picking a 90-minute
 * chip and then Prioritize finds a gap that fits 90 minutes.
 */
export function withQuadrantPicked(
  state: TriageState,
  quadrant: EisenhowerQuadrant,
  now: Date,
): TriageState {
  return withExpiryAwareForm(state, (form, session) => {
    const value = valueBumpedByQuadrant(quadrant, form.value)

    if (form.dueDate !== null) {
      return { ...form, quadrant, value }
    }

    const seededDue = defaultTriageDueDate(quadrant, {
      now,
      durationSeconds: triageDurationSeconds(form.durationMinutes),
      busyIntervals: session.busyIntervals,
      nextFreeSlotToday: session.nextFreeSlotToday,
    })
    return {
      ...form,
      quadrant,
      value,
      dueDate: seededDue,
      expiry: form.expiry ?? defaultTriageExpiry(seededDue),
    }
  })
}

/**
 * One concern: a duration chip.
 *
 * The irreversibility rule lives in `triageDurationSelection`, so this Shifter
 * cannot express a revert even by accident.
 */
export function withDurationPicked(
  state: TriageState,
  minutes: number | null,
): TriageState {
  return withForm(state, (form) => ({
    ...form,
    durationMinutes: triageDurationSelection(form.durationMinutes, minutes),
  }))
}

/**
 * One concern: the scheduled-date picker moved (or cleared).
 *
 * Canon's arm seeds expiry *"whenever the user hasn't explicitly set one"* —
 * and note it does **not** enforce the invariant in this direction: clearing
 * the date leaves an existing expiry in place, because *"setting only expiry
 * (no scheduled date) is permitted"*.
 */
export function withDueDatePicked(
  state: TriageState,
  date: Date | null,
): TriageState {
  return withExpiryAwareForm(state, (form) => ({
    ...form,
    dueDate: date,
    expiry: form.expiry ?? defaultTriageExpiry(date),
  }))
}

/** One concern: the stepper moved by its own grain (±5 below 50, ±10 at 50+). */
export function withRewardPointsStepped(
  state: TriageState,
  direction: TriageRewardStepDirection,
): TriageState {
  return withForm(state, (form) => ({
    ...form,
    rewardPoints:
      direction === 'increment'
        ? triageRewardIncremented(form.rewardPoints)
        : triageRewardDecremented(form.rewardPoints),
  }))
}

/** One concern: a reward value set outright, clamped to 1…999. */
export function withRewardPointsPicked(
  state: TriageState,
  points: number,
): TriageState {
  return withForm(state, (form) => ({
    ...form,
    rewardPoints: clampTriageRewardPoints(points),
  }))
}

/**
 * One concern: a rocket was tapped.
 *
 * Two fields move together and that is the invariant worth a Shifter: the
 * rating, and the quadrant it may promote. Promotion here **does not seed a due
 * date** — canon's `applyValueChange` sets `selectedQuadrant` directly rather
 * than routing through `applyQuadrantSelected`, so a form promoted to Schedule
 * by a 3-rocket rating still has the confirm gate closed until a date exists.
 * Ported as written; named in the PR.
 */
export function withValueRatingTapped(
  state: TriageState,
  rating: number,
): TriageState {
  return withForm(state, (form) => {
    const value = triageRatingSelection(form.value, rating)
    return {
      ...form,
      value,
      quadrant: quadrantPromotedByValue(form.quadrant, value),
    }
  })
}

/**
 * One concern: a fire was tapped.
 *
 * The rating and the reward move together: *"increasing the effort rating
 * multiplies the current reward by the same ratio"*, and only increasing does.
 * Clearing a rating by tapping it again therefore leaves the reward alone,
 * because there is no new rating to take a ratio against.
 */
export function withEffortRatingTapped(
  state: TriageState,
  rating: number,
): TriageState {
  return withForm(state, (form) => {
    const effort = triageRatingSelection(form.effort, rating)
    return {
      ...form,
      effort,
      rewardPoints: rewardScaledForEffortChange({
        rewardPoints: form.rewardPoints,
        previousEffort: form.effort,
        nextEffort: effort,
      }),
    }
  })
}

/**
 * One concern: the expiry picker moved, or Clear was pressed.
 *
 * The invariant is enforced by `triageExpiryAfterSelection`: a clear with a
 * scheduled date in place snaps back to scheduled + 1h. A clear with no
 * scheduled date passes through as `null`.
 */
export function withExpiryPicked(
  state: TriageState,
  date: Date | null,
): TriageState {
  return withExpiryAwareForm(state, (form) => ({
    ...form,
    expiry: triageExpiryAfterSelection({
      picked: date,
      scheduled: form.dueDate,
    }),
  }))
}

/**
 * One concern: an expiry preset pill was tapped.
 *
 * With no scheduled date there is nothing to compute the offset against, so it
 * is a no-op — canon does not render the pill row at all in that state.
 * Re-tapping the pill that is already selected produces the same instant, which
 * `withExpiryAwareForm` recognises as "nothing moved" and therefore does not
 * scroll the row.
 */
export function withExpiryPresetTapped(
  state: TriageState,
  preset: TriageExpiryPreset,
): TriageState {
  return withExpiryAwareForm(state, (form) => {
    if (form.dueDate === null) return form
    return { ...form, expiry: triageExpiryPresetDate(preset, form.dueDate) }
  })
}

// ---------------------------------------------------------------------------
// The bottom action row
// ---------------------------------------------------------------------------

/**
 * One concern: a terminal button was pressed.
 *
 * Every guard canon applies is applied here, and each refusal is a **no-op**
 * rather than a half-raised outcome:
 *
 * - Cancel always dismisses, gate or no gate.
 * - Edit always raises, and applies no decision — *"No triage decision is
 *   applied"*.
 * - The three confirming buttons need a decision, i.e. an open gate; Start Now
 *   / Share / Archive additionally need **their own quadrant**, so a Share
 *   dispatched on a Prioritize triage does nothing rather than sharing under
 *   the wrong quadrant.
 *
 * Whether the session ends here is `triageOutcomeEndsSession`'s call: a Delegate
 * triage keeps the screen mounted under the share sheet, and Edit keeps it
 * mounted under the Edit surface.
 */
export function withOutcomeRaised(
  state: TriageState,
  kind: TriageOutcomeKind,
): TriageState {
  const session = state.session
  if (session === null) return state

  const raise = (outcome: TriageOutcome): TriageState => ({
    ...state,
    outcome,
    session: triageOutcomeEndsSession(kind) ? null : session,
  })

  if (kind === 'dismissed') return raise({ kind: 'dismissed' })
  if (kind === 'editRequested') {
    return raise({ kind: 'editRequested', endeavorId: session.endeavorId })
  }

  const decision = triageDecisionFrom({
    endeavorId: session.endeavorId,
    quadrant: session.form.quadrant,
    durationMinutes: session.form.durationMinutes,
    dueDate: session.form.dueDate,
    rewardPoints: session.form.rewardPoints,
    value: session.form.value,
    effort: session.form.effort,
    expiry: session.form.expiry,
  })
  if (decision === null) return state

  if (kind === 'completed') return raise({ kind: 'completed', decision })

  const secondary = triageSecondaryAction(session.form.quadrant)
  if (kind === 'startNow') {
    if (secondary !== 'startNow') return state
    return raise({ kind: 'startNow', decision })
  }
  if (kind === 'shared') {
    if (secondary !== 'share') return state
    return raise({
      kind: 'shared',
      decision,
      text: triageShareText(session.endeavorTitle),
    })
  }
  if (secondary !== 'archive') return state
  return raise({ kind: 'archived', decision })
}

/** One concern: the one-shot is spent. */
export function withOutcomeCleared(state: TriageState): TriageState {
  if (state.outcome === null) return state
  return { ...state, outcome: null }
}

/**
 * One concern: the share sheet closed, so the Delegate triage's screen pops.
 *
 * A no-op unless a session is still mounted, so a stray dismissal after a
 * cancel cannot resurrect one.
 */
export function withShareSheetDismissed(state: TriageState): TriageState {
  if (state.session === null) return state
  return { ...state, session: null }
}

// ---------------------------------------------------------------------------
// The durable save
// ---------------------------------------------------------------------------

/** One concern: the save is in flight. Any prior notice is cleared. */
export function withSaveStarted(state: TriageState): TriageState {
  return { ...state, save: { kind: 'saving' } }
}

/**
 * One concern: the decision is on disk.
 *
 * The push outcome rides on the **success**, because a push that did not land
 * has not undone anything: *"the local save already succeeded — the decision is
 * not lost"*. A `deferred` outcome is what the status indicator shows, not what
 * the lifecycle field says.
 */
export function withSaved(
  state: TriageState,
  saved: { readonly push: TriagePushOutcome; readonly now: Date },
): TriageState {
  const save: TriageSaveState = {
    kind: 'saved',
    push: saved.push,
    savedAt: saved.now,
  }
  return { ...state, save, clockAnchor: saved.now }
}

/**
 * One concern: the **local** save failed, so the decision was not captured.
 *
 * The session (if the screen is somehow still mounted) and the outcome are left
 * alone: canon *"does not roll back or re-prompt the just-completed triage
 * decision"*, and a user who has to retry should not also have to re-enter it.
 */
export function withSaveFailed(
  state: TriageState,
  exception: TriageException,
): TriageState {
  return { ...state, save: { kind: 'failed', exception } }
}

/**
 * One concern: the share hand-off resolved.
 *
 * The outcome is kept rather than turned into copy here, because the copy is
 * derived (`shareOutcomeNotice`) and a Shifter that formatted it would put the
 * same sentence in two places (`UZF-11`).
 */
export function withShareOutcome(
  state: TriageState,
  outcome: ShareOutcome,
): TriageState {
  return { ...state, shareOutcome: outcome }
}
