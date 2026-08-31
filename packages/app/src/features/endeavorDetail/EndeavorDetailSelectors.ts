/**
 * Endeavor Detail Selectors (`RC-5`, `RC-20`) — canon's
 * `EndeavorDetailSelectors`, `EndeavorEditSelectors`,
 * `EndeavorDurationSelectors` and the four relation features' Selectors.
 *
 * Built with `createSelector` over `RootState` alone, and pure throughout: no
 * clock, no service. Every per-kind answer comes from the domain matrix through
 * `EndeavorDetailCards` / `EndeavorDetailEditing`, so a Selector here and the
 * reducer's own guard cannot disagree about what is editable.
 */
import {
  type Endeavor,
  type EndeavorField,
  type EndeavorRelation,
  type Perform,
  type Defer,
  type Shadow,
} from '@kro/core'
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../library/store'
import type {
  EndeavorDetailBadge,
  EndeavorRelationCard,
} from './EndeavorDetailCards'
import {
  detailDisplayTitle,
  detailHeaderBadges,
  relationCards,
  visibleFieldsBySection,
  visibleSections,
} from './EndeavorDetailCards'
import type { EndeavorDetailSectionModel } from './EndeavorDetailEditing'
import {
  editableFieldsBySection,
  editableSections,
  endeavorsEqual,
} from './EndeavorDetailEditing'
import type { EndeavorDetailException } from './EndeavorDetailException'
import type {
  EndeavorDetailDestination,
  EndeavorDetailState,
  EndeavorEditDraft,
} from './EndeavorDetailState'
import type {
  EndeavorDurationDraft,
  ObservedFocusTime,
} from './EndeavorDuration'
import { durationValidationMessage, observedFocusTime } from './EndeavorDuration'
import type {
  HostAttachCandidate,
  RelationDraft,
  RelationEmptyState,
} from './EndeavorRelations'
import {
  attachedHostsOf,
  defersOf,
  hostAttachCandidatesOf,
  isRelationDraftCommittable,
  performancesOf,
  relationEmptyState,
  relationReadOnlyReason,
  shadowsOf,
} from './EndeavorRelations'

const selectDetailSlice = (state: RootState): EndeavorDetailState =>
  state.endeavorDetail

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

/** The endeavor Detail is presenting, or `null` when the surface is closed. */
export const selectDetailEndeavor = createSelector(
  [selectDetailSlice],
  (slice): Endeavor | null => slice.endeavor,
)

export const selectIsDetailPresented = createSelector(
  [selectDetailSlice],
  (slice) => slice.endeavor !== null,
)

export const selectDetailDestination = createSelector(
  [selectDetailSlice],
  (slice): EndeavorDetailDestination | null => slice.destination,
)

/** Canon's `displayTitle` — the trimmed title, or "Untitled" when blank. */
export const selectDetailTitle = createSelector(
  [selectDetailEndeavor],
  (endeavor): string => (endeavor === null ? '' : detailDisplayTitle(endeavor)),
)

/** The header's kind + state badges, in canon's order. */
export const selectDetailBadges = createSelector(
  [selectDetailEndeavor],
  (endeavor): readonly EndeavorDetailBadge[] =>
    endeavor === null ? [] : detailHeaderBadges(endeavor),
)

// ---------------------------------------------------------------------------
// The read surface's grouped cards
// ---------------------------------------------------------------------------

/** Every section with its per-kind visible fields — empty arrays included. */
export const selectDetailFieldsBySection = createSelector(
  [selectDetailEndeavor],
  (endeavor): readonly EndeavorDetailSectionModel[] =>
    endeavor === null ? [] : visibleFieldsBySection(endeavor.kind),
)

/** Only the sections worth a header — those with at least one visible field. */
export const selectDetailVisibleSections = createSelector(
  [selectDetailEndeavor],
  (endeavor): readonly EndeavorDetailSectionModel[] =>
    endeavor === null ? [] : visibleSections(endeavor.kind),
)

/** The four relation cards, with per-kind manageability and their counts. */
export const selectDetailRelationCards = createSelector(
  [selectDetailEndeavor],
  (endeavor): readonly EndeavorRelationCard[] =>
    endeavor === null ? [] : relationCards(endeavor),
)

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------

export const selectEditDraft = createSelector(
  [selectDetailSlice],
  (slice): EndeavorEditDraft | null => slice.edit,
)

/** The working copy the editor is presenting, or `null` when none is open. */
export const selectEditWorkingCopy = createSelector(
  [selectEditDraft],
  (draft): Endeavor | null => draft?.working ?? null,
)

/** The sections and fields Edit may render for this kind — the matrix's answer. */
export const selectEditableSections = createSelector(
  [selectEditDraft],
  (draft): readonly EndeavorDetailSectionModel[] =>
    draft === null
      ? []
      : editableSections(draft.working.kind, draft.focusedField),
)

/** Every section, including the empty ones — for a caller that indexes them. */
export const selectEditableFieldsBySection = createSelector(
  [selectEditDraft],
  (draft): readonly EndeavorDetailSectionModel[] =>
    draft === null
      ? []
      : editableFieldsBySection(draft.working.kind, draft.focusedField),
)

/**
 * Canon's `isDirtySelector`: the working copy differs from the saved baseline.
 *
 * By **value**, not by reference — canon compares two Swift structs, and a
 * reference comparison would leave a just-saved form permanently dirty the
 * moment a Producer echoed back a structurally identical copy.
 */
export const selectIsEditDirty = createSelector(
  [selectEditDraft],
  (draft): boolean =>
    draft !== null && !endeavorsEqual(draft.working, draft.original),
)

/**
 * Canon's `isTitleValidSelector` — v1's one validation rule. `title` is the
 * only field rendered unconditionally, so it is the only one required.
 */
export const selectIsEditValid = createSelector(
  [selectEditDraft],
  (draft): boolean => draft !== null && draft.working.title.trim().length > 0,
)

export const selectIsDetailSaving = createSelector(
  [selectDetailSlice],
  (slice) => slice.save.kind === 'saving',
)

export const selectDetailException = createSelector(
  [selectDetailSlice],
  (slice): EndeavorDetailException | null =>
    slice.save.kind === 'failed' ? slice.save.exception : null,
)

/**
 * Canon's `isSaveEnabledSelector`, plus the Duration screen's extra term:
 * there is something to save, it is valid, the duration profile is coherent,
 * and no save is already in flight.
 */
export const selectIsSaveEnabled = createSelector(
  [
    selectIsEditDirty,
    selectIsEditValid,
    selectIsDetailSaving,
    selectDetailSlice,
  ],
  (isDirty, isValid, isSaving, slice): boolean => {
    if (!isDirty || !isValid || isSaving) return false
    if (slice.duration === null) return true
    return durationValidationMessage(slice.duration) === null
  },
)

/** Canon's `editNavigationTitleSelector` — "Edit" or "Edit <field>". */
export const selectEditNavigationTitle = createSelector(
  [selectEditDraft],
  (draft): string => {
    const focused: EndeavorField | null = draft?.focusedField ?? null
    return focused === null ? 'Edit' : `Edit ${focused}`
  },
)

/** Canon's `showsIdentityHeaderSelector` — the full form shows the header. */
export const selectEditShowsIdentityHeader = createSelector(
  [selectEditDraft],
  (draft): boolean => draft !== null && draft.focusedField === null,
)

// ---------------------------------------------------------------------------
// Duration
// ---------------------------------------------------------------------------

export const selectDurationDraft = createSelector(
  [selectDetailSlice],
  (slice): EndeavorDurationDraft | null => slice.duration,
)

/** The read-only "Observed focus time" card, computed from performances. */
export const selectObservedFocusTime = createSelector(
  [selectDetailEndeavor],
  (endeavor): ObservedFocusTime | null =>
    endeavor === null ? null : observedFocusTime(endeavor),
)

/** Canon's `validationMessageSelector`. `null` when the profile is coherent. */
export const selectDurationValidationMessage = createSelector(
  [selectDurationDraft],
  (draft): string | null =>
    draft === null ? null : durationValidationMessage(draft),
)

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const selectDetailPerformances = createSelector(
  [selectDetailEndeavor],
  (endeavor): readonly Perform[] =>
    endeavor === null ? [] : performancesOf(endeavor),
)

export const selectDetailDefers = createSelector(
  [selectDetailEndeavor],
  (endeavor): readonly Defer[] => (endeavor === null ? [] : defersOf(endeavor)),
)

export const selectDetailShadows = createSelector(
  [selectDetailEndeavor],
  (endeavor): readonly Shadow[] =>
    endeavor === null ? [] : shadowsOf(endeavor),
)

/** Canon's `attachedHostsSelector` — the external providers in `hostedBy`. */
export const selectDetailAttachedHosts = createSelector(
  [selectDetailEndeavor],
  (endeavor) => (endeavor === null ? [] : attachedHostsOf(endeavor)),
)

/**
 * Canon's `availableHostsToAttachSelector`, each candidate carrying whether
 * this build can actually attach it — today none can, and each says why.
 */
export const selectDetailHostCandidates = createSelector(
  [selectDetailEndeavor],
  (endeavor): readonly HostAttachCandidate[] =>
    endeavor === null ? [] : hostAttachCandidatesOf(endeavor),
)

/**
 * Why the presented relation is read-only for this kind, or `null` when it is
 * editable. This is the string the surface shows **instead of** the add form.
 */
export const selectRelationReadOnlyReason = createSelector(
  [selectDetailEndeavor, selectDetailDestination],
  (endeavor, destination): string | null => {
    if (endeavor === null) return null
    if (destination === null || destination.kind !== 'relation') return null
    return relationReadOnlyReason(destination.relation, endeavor.kind)
  },
)

/** The presented relation's empty-state copy, keyed on its editability. */
export const selectRelationEmptyState = createSelector(
  [selectDetailEndeavor, selectDetailDestination],
  (endeavor, destination): RelationEmptyState | null => {
    if (endeavor === null) return null
    if (destination === null || destination.kind !== 'relation') return null
    return relationEmptyState(destination.relation, endeavor.kind)
  },
)

/** The relation the surface is managing, or `null`. */
export const selectManagedRelation = createSelector(
  [selectDetailDestination],
  (destination): EndeavorRelation | null =>
    destination !== null && destination.kind === 'relation'
      ? destination.relation
      : null,
)

export const selectRelationDraft = createSelector(
  [selectDetailSlice],
  (slice): RelationDraft | null => slice.relationDraft,
)

/** Whether the open add form has enough in it to commit. */
export const selectIsRelationDraftCommittable = createSelector(
  [selectRelationDraft],
  (draft): boolean => draft !== null && isRelationDraftCommittable(draft),
)
