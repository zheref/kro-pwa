/**
 * `EndeavorDetailState` — the shape behind the Detail read surface and the
 * three editors it presents (Edit, Duration, and the four relation screens).
 *
 * Split out of `EndeavorDetailFeature.ts` under `RC-1`'s size clause.
 *
 * ## One slice, canon's six children
 *
 * Canon composes `EndeavorDetailFeature` with a `Destination` enum over six
 * child reducers, each with its own store. RTK has no store composition of that
 * kind, so the destination becomes **one discriminated field** and each child's
 * working state becomes one nullable field beside it. The invariant canon gets
 * from `@Presents` — a child's state exists exactly while it is presented — is
 * kept by the Shifters: opening a destination seeds its draft, closing one
 * clears every draft.
 *
 * ## Duration edits *through* the edit draft, as canon does
 *
 * Canon's `EndeavorDurationFeature` embeds an `EndeavorEditFeature.State` and
 * reports its three bounds as one `durationProfile` field change. The same shape
 * holds here: opening Duration seeds **both** the edit draft and the duration
 * draft, and every bound change writes through `applyFieldChange`. That is what
 * makes dirty tracking and the save path identical for the two editors, and it
 * is why a kind whose matrix forbids `duration` cannot save one from either.
 */
import type { Endeavor, EndeavorField, EndeavorRelation } from '@kro/core'
import type { EndeavorDetailException } from './EndeavorDetailException'
import type { EndeavorDurationDraft } from './EndeavorDuration'
import type { RelationDraft } from './EndeavorRelations'

/** Which editor is presented over Detail, if any. */
export type EndeavorDetailDestination =
  /** The field editor. `focusedField` narrows it to one row, as canon does. */
  | { readonly kind: 'edit'; readonly focusedField: EndeavorField | null }
  /** The duration profile. */
  | { readonly kind: 'duration' }
  /** One of the four relation management screens. */
  | { readonly kind: 'relation'; readonly relation: EndeavorRelation }

/**
 * The one lifecycle field (`RC-24`, `UZF-9`) — a save or a relation write is in
 * flight, or the last one failed. Never `isSaving` + `exception` in parallel.
 */
export type EndeavorDetailSaveState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'failed'; readonly exception: EndeavorDetailException }

/**
 * The editor's working copy and its dirty baseline.
 *
 * `original` is the last **durably saved** value — not the value the editor
 * opened with, once a save has landed — so `isDirty` answers "is there anything
 * still to save", which is the question the Save affordance asks.
 */
export interface EndeavorEditDraft {
  readonly working: Endeavor
  readonly original: Endeavor
  /** Non-null when Edit was opened from one Detail row and shows only it. */
  readonly focusedField: EndeavorField | null
}

export interface EndeavorDetailState {
  /**
   * The endeavor Detail presents, or `null` when the surface is closed. The
   * caller already holds the full domain model (a list selection), so it is
   * passed in rather than re-fetched — canon's own note.
   */
  readonly endeavor: Endeavor | null
  readonly destination: EndeavorDetailDestination | null
  /** Present while Edit **or** Duration is open. */
  readonly edit: EndeavorEditDraft | null
  /** Present while Duration is open. */
  readonly duration: EndeavorDurationDraft | null
  /** The open relation add-form, if any. */
  readonly relationDraft: RelationDraft | null
  readonly save: EndeavorDetailSaveState
}

export const initialEndeavorDetailState: EndeavorDetailState = {
  endeavor: null,
  destination: null,
  edit: null,
  duration: null,
  relationDraft: null,
  save: { kind: 'idle' },
}
