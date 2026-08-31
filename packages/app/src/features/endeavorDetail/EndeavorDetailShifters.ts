/**
 * Endeavor Detail Shifters (`RC-4`, `RC-19`) — canon's
 * `EndeavorDetailShifters` (`applyFieldEditRequested`,
 * `applyRelationManagementRequested`, `applyRelationUpdated`) and
 * `EndeavorEditShifters` (the save lifecycle) in one file, because they are one
 * slice here.
 *
 * Pure throughout: no clock, no store. Where a transition needs an instant — a
 * fresh defer's `made`, a hand-logged performance's date — it is an argument.
 *
 * ## The matrix guards are defensive backstops, not the rule
 *
 * `withFieldEditRequested` and `withRelationManagementRequested` both refuse a
 * field or relation the matrix marks non-editable. The read surface should not
 * have offered a tappable affordance in the first place — the same
 * `isFieldEditable` / `isRelationEditable` calls drive
 * `visibleFieldsBySection` and `relationCards` — so these guards exist for the
 * case canon names: *"this is the defensive backstop"*.
 */
import {
  type Endeavor,
  type EndeavorField,
  EndeavorField as Field,
  type EndeavorRelation,
  isFieldEditable,
  isRelationEditable,
} from '@kro/core'
import type { EndeavorFieldChange } from './EndeavorDetailEditing'
import { applyFieldChange, endeavorsEqual } from './EndeavorDetailEditing'
import type { EndeavorDetailException } from './EndeavorDetailException'
import type { EndeavorDetailState } from './EndeavorDetailState'
import { initialEndeavorDetailState } from './EndeavorDetailState'
import type {
  DurationBound,
  EndeavorDurationDraft,
} from './EndeavorDuration'
import {
  draftWithBoundAdjusted,
  draftWithBoundToggled,
  durationDraftFor,
  durationProfileOf,
} from './EndeavorDuration'
import type { RelationDraft } from './EndeavorRelations'

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

/**
 * One concern: Detail opened on an endeavor.
 *
 * Every draft is cleared with it — a destination left over from the previous
 * endeavor would edit the wrong row, which is precisely the invariant canon
 * gets for free from `@Presents`.
 */
export function withDetailPresented(
  _state: EndeavorDetailState,
  args: { readonly endeavor: Endeavor },
): EndeavorDetailState {
  return { ...initialEndeavorDetailState, endeavor: args.endeavor }
}

/** One concern: Detail closed. Nothing survives it. */
export function withDetailDismissed(
  _state: EndeavorDetailState,
): EndeavorDetailState {
  return initialEndeavorDetailState
}

/** A fresh edit draft over an endeavor. The baseline starts equal to it. */
const draftFor = (
  endeavor: Endeavor,
  focusedField: EndeavorField | null,
): EndeavorDetailState['edit'] => ({
  working: endeavor,
  original: endeavor,
  focusedField,
})

/**
 * One concern: a Detail row was tapped to edit it.
 *
 * `duration` opens the Duration profile — canon routes that one field to its own
 * screen — and every other field opens Edit focused on it. A field the matrix
 * refuses opens nothing.
 */
export function withFieldEditRequested(
  state: EndeavorDetailState,
  args: { readonly field: EndeavorField },
): EndeavorDetailState {
  const endeavor = state.endeavor
  if (endeavor === null) return state
  if (!isFieldEditable(args.field, endeavor.kind)) return state

  if (args.field === Field.duration) {
    return {
      ...state,
      destination: { kind: 'duration' },
      edit: draftFor(endeavor, Field.duration),
      duration: durationDraftFor(endeavor),
      relationDraft: null,
    }
  }
  return {
    ...state,
    destination: { kind: 'edit', focusedField: args.field },
    edit: draftFor(endeavor, args.field),
    duration: null,
    relationDraft: null,
  }
}

/**
 * One concern: the full editor was opened (no single field in focus) — the
 * entry point another surface's `edit` operation lands on.
 */
export function withEditRequested(
  state: EndeavorDetailState,
  args: { readonly endeavor?: Endeavor },
): EndeavorDetailState {
  const endeavor = args.endeavor ?? state.endeavor
  if (endeavor === null) return state
  return {
    ...state,
    endeavor,
    destination: { kind: 'edit', focusedField: null },
    edit: draftFor(endeavor, null),
    duration: null,
    relationDraft: null,
  }
}

/**
 * One concern: a relation's manage affordance was tapped.
 *
 * Refused where the matrix marks the relation non-editable for this kind — the
 * defensive backstop behind an affordance `relationCards` should already have
 * rendered inert.
 */
export function withRelationManagementRequested(
  state: EndeavorDetailState,
  args: { readonly relation: EndeavorRelation },
): EndeavorDetailState {
  const endeavor = state.endeavor
  if (endeavor === null) return state
  if (!isRelationEditable(args.relation, endeavor.kind)) return state
  return {
    ...state,
    destination: { kind: 'relation', relation: args.relation },
    edit: null,
    duration: null,
    relationDraft: null,
  }
}

/**
 * One concern: the presented editor closed without saving.
 *
 * Discarding is implicit — the working copy simply never reaches `endeavor`,
 * which is canon's own wording: *"the caller never receives the unsaved working
 * copy"*. A failed save is cleared with it, so reopening starts clean.
 */
export function withDestinationDismissed(
  state: EndeavorDetailState,
): EndeavorDetailState {
  return {
    ...state,
    destination: null,
    edit: null,
    duration: null,
    relationDraft: null,
    save: { kind: 'idle' },
  }
}

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

/**
 * One concern: one field edit landed on the working copy.
 *
 * The change goes through the domain's guarded helper, so a kind-irrelevant
 * edit returns the identical object and the draft stays clean — the refusal is
 * the matrix's, not a check restated here.
 *
 * Any further edit also supersedes a stale save failure, so the error banner
 * does not linger once the user has acted on it (canon's invariant).
 */
export function withFieldChanged(
  state: EndeavorDetailState,
  args: { readonly change: EndeavorFieldChange },
): EndeavorDetailState {
  const edit = state.edit
  if (edit === null) return state
  return {
    ...state,
    edit: { ...edit, working: applyFieldChange(edit.working, args.change) },
    save: { kind: 'idle' },
  }
}

/**
 * One concern: the three duration bounds and the working copy move together.
 *
 * Canon's `applyDurationProfileChanged` — the draft is the user-facing shape and
 * the working copy is what saves, so writing one without the other would let the
 * dials and the row disagree.
 */
const withDurationProfileApplied = (
  state: EndeavorDetailState,
  draft: EndeavorDurationDraft,
): EndeavorDetailState => {
  const edit = state.edit
  if (edit === null) return { ...state, duration: draft }
  const profile = durationProfileOf(draft)
  return {
    ...state,
    duration: draft,
    edit: {
      ...edit,
      working: applyFieldChange(edit.working, {
        field: 'durationProfile',
        preferred: profile.preferred,
        minimum: profile.minimum,
        maximum: profile.maximum,
      }),
    },
    save: { kind: 'idle' },
  }
}

/** One concern: a bound's switch flipped, and the working copy followed. */
export function withDurationBoundToggled(
  state: EndeavorDetailState,
  args: { readonly bound: DurationBound; readonly isEnabled: boolean },
): EndeavorDetailState {
  const draft = state.duration
  if (draft === null) return state
  return withDurationProfileApplied(
    state,
    draftWithBoundToggled(draft, args.bound, args.isEnabled),
  )
}

/** One concern: a bound's number dialled, and the working copy followed. */
export function withDurationBoundAdjusted(
  state: EndeavorDetailState,
  args: { readonly bound: DurationBound; readonly seconds: number },
): EndeavorDetailState {
  const draft = state.duration
  if (draft === null) return state
  return withDurationProfileApplied(
    state,
    draftWithBoundAdjusted(draft, args.bound, args.seconds),
  )
}

// ---------------------------------------------------------------------------
// Save lifecycle
// ---------------------------------------------------------------------------

/** One concern: a save started, so a stale failure banner goes with it. */
export function withSaveStarted(
  state: EndeavorDetailState,
): EndeavorDetailState {
  return { ...state, save: { kind: 'saving' } }
}

/**
 * One concern: the save landed.
 *
 * `saved` is the exact snapshot that was persisted — **not** necessarily the
 * working copy at completion time, because a field edit has no in-flight guard
 * and the user can keep typing. So the working copy is only adopted when
 * nothing raced ahead of it; otherwise the newer edit stays live and correctly
 * re-reads as dirty against the new baseline, instead of being silently
 * discarded. Canon's `applySaveSucceeded`, reasoning included.
 */
export function withSaveSucceeded(
  state: EndeavorDetailState,
  args: { readonly saved: Endeavor },
): EndeavorDetailState {
  const edit = state.edit
  const raced = edit !== null && !endeavorsEqual(edit.working, args.saved)
  return {
    ...state,
    endeavor: args.saved,
    edit:
      edit === null
        ? null
        : {
            ...edit,
            working: raced ? edit.working : args.saved,
            original: args.saved,
          },
    save: { kind: 'idle' },
  }
}

/**
 * One concern: the save failed.
 *
 * The working copy is left exactly as the user left it — a `localPersistenceFailed`
 * means nothing was written, so the edit must stay dirty for a retry.
 */
export function withSaveFailed(
  state: EndeavorDetailState,
  args: { readonly exception: EndeavorDetailException },
): EndeavorDetailState {
  return { ...state, save: { kind: 'failed', exception: args.exception } }
}

/**
 * One concern: a relation write landed.
 *
 * Detail's own copy refreshes so the read surface reflects it immediately on
 * return. The editor drafts are untouched: a relation screen has no dirty/save
 * lifecycle of its own — every add and remove commits on its own, which is
 * canon's shape for all four of them.
 */
export function withRelationUpdated(
  state: EndeavorDetailState,
  args: { readonly updated: Endeavor },
): EndeavorDetailState {
  return {
    ...state,
    endeavor: args.updated,
    relationDraft: null,
    save: { kind: 'idle' },
  }
}

// ---------------------------------------------------------------------------
// Relation add forms
// ---------------------------------------------------------------------------

/** One concern: an add form opened (or its fields changed). */
export function withRelationDraft(
  state: EndeavorDetailState,
  args: { readonly draft: RelationDraft | null },
): EndeavorDetailState {
  return { ...state, relationDraft: args.draft, save: { kind: 'idle' } }
}
