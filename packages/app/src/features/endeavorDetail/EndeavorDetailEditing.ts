/**
 * The Edit surface's field vocabulary and its matrix enforcement — the port of
 * canon's `EndeavorEditFieldChange` (`Endeavor+EditDisplay.swift`) and
 * `EndeavorEditShifters.applyFieldChanged`.
 *
 * ## Acceptance criterion 3, structurally
 *
 * *"Edit refuses kind-irrelevant fields identically to the domain matrix (no
 * UI-side divergence possible)."* Two halves, both here:
 *
 * 1. **A forbidden edit cannot be expressed.** `applyFieldChange` routes every
 *    change through the domain's own guarded `with…` helper, and those no-op by
 *    **returning the same object reference** when
 *    `EndeavorFieldRelevance.isFieldEditable` says no. This file therefore
 *    contains no per-kind `if` of its own — there is nothing here that could
 *    drift from the matrix, because the matrix is the only thing consulted.
 * 2. **The surface can tell in advance.** `editableFieldsBySection` /
 *    `editableSections` derive the per-kind field set from the same matrix, so
 *    `#30` renders a field disabled or absent rather than offering a control
 *    whose edit would be silently dropped.
 *
 * The truth table the suite asserts is generated from `endeavorFields ×
 * endeavorKinds` against `isFieldEditable` — so a change to the **domain**
 * matrix breaks exactly one test, and a change here that disagreed with the
 * matrix would break it too.
 */
import {
  type AnyEndeavorList,
  type Endeavor,
  EndeavorField,
  type EndeavorKind,
  type EndeavorStatus,
  type EndeavorTag,
  type RepeatConfig,
  type TimeIntervalSeconds,
  assertNever,
  endeavorFields,
  isFieldEditable,
  withAssociatedColor,
  withDue,
  withDuration,
  withDurationProfile,
  withEffort,
  withExpiry,
  withProject,
  withRepeatConfig,
  withSessionPoints,
  withStart,
  withStatus,
  withTags,
  withTitle,
  withValue,
} from '@kro/core'

/**
 * One reported field edit. Canon's `EndeavorEditFieldChange`, case for case —
 * including `durationProfile`, which the Duration surface reports as one change
 * because its three bounds are one invariant.
 */
export type EndeavorFieldChange =
  | { readonly field: 'title'; readonly value: string }
  | { readonly field: 'status'; readonly value: EndeavorStatus }
  | { readonly field: 'due'; readonly value: Date | null }
  | { readonly field: 'start'; readonly value: Date | null }
  | {
      readonly field: 'duration'
      readonly value: TimeIntervalSeconds | null
    }
  | {
      readonly field: 'durationProfile'
      readonly preferred: TimeIntervalSeconds | null
      readonly minimum: TimeIntervalSeconds | null
      readonly maximum: TimeIntervalSeconds | null
    }
  | { readonly field: 'sessionPoints'; readonly value: number | null }
  | { readonly field: 'value'; readonly value: number | null }
  | { readonly field: 'effort'; readonly value: number | null }
  | { readonly field: 'expiry'; readonly value: Date | null }
  /** Add the tag if absent, remove it if present — canon's `applyTagToggled`. */
  | { readonly field: 'tagToggled'; readonly value: EndeavorTag }
  | { readonly field: 'associatedColor'; readonly value: string | null }
  | {
      readonly field: 'project'
      readonly value: AnyEndeavorList | null
    }
  | { readonly field: 'repeatConfig'; readonly value: RepeatConfig | null }

/**
 * The matrix field a change is governed by.
 *
 * `durationProfile` maps to `duration` (it writes the same three columns), and
 * `tagToggled` to `tags` — so the editability question and the change use one
 * vocabulary and cannot answer differently.
 */
export const fieldOfChange = (change: EndeavorFieldChange): EndeavorField => {
  switch (change.field) {
    case 'title':
      return EndeavorField.title
    case 'status':
      return EndeavorField.status
    case 'due':
      return EndeavorField.due
    case 'start':
      return EndeavorField.start
    case 'duration':
    case 'durationProfile':
      return EndeavorField.duration
    case 'sessionPoints':
      return EndeavorField.sessionPoints
    case 'value':
      return EndeavorField.value
    case 'effort':
      return EndeavorField.effort
    case 'expiry':
      return EndeavorField.expiry
    case 'tagToggled':
      return EndeavorField.tags
    case 'associatedColor':
      return EndeavorField.associatedColor
    case 'project':
      return EndeavorField.project
    case 'repeatConfig':
      return EndeavorField.repeatConfig
    default:
      return assertNever(change)
  }
}

/**
 * Whether the surface may offer this change at all — the *same* question the
 * domain helper will ask, asked early so a control can be disabled rather than
 * silently ignored.
 */
export const isChangeExpressible = (
  change: EndeavorFieldChange,
  kind: EndeavorKind,
): boolean => isFieldEditable(fieldOfChange(change), kind)

/**
 * Canon's `applyTagToggled`: flip membership, then normalise an empty result
 * back to `null`.
 *
 * The normalisation is load-bearing and canon spells out why — a cleared
 * optional serialises as explicit `null`, so *"leaving `[]` instead would
 * rewrite the server's `tags` column from `NULL` to `'{}'` on save"*.
 */
const tagsAfterToggle = (
  endeavor: Endeavor,
  tag: EndeavorTag,
): readonly EndeavorTag[] | null => {
  const current = endeavor.tags ?? []
  const next = current.includes(tag)
    ? current.filter((existing) => existing !== tag)
    : [...current, tag]
  return next.length === 0 ? null : next
}

/**
 * Apply one change to a working copy.
 *
 * Every branch delegates to the domain's guarded helper, so a change the matrix
 * forbids comes back as **the identical object** — which is exactly what
 * `isDirty` then reads as "nothing happened". There is no per-kind test in this
 * function, deliberately: adding one would create the second source of truth
 * the acceptance criterion forbids.
 */
export const applyFieldChange = (
  endeavor: Endeavor,
  change: EndeavorFieldChange,
): Endeavor => {
  switch (change.field) {
    case 'title':
      return withTitle(endeavor, change.value)
    case 'status':
      return withStatus(endeavor, change.value)
    case 'due':
      return withDue(endeavor, change.value)
    case 'start':
      return withStart(endeavor, change.value)
    case 'duration':
      return withDuration(endeavor, change.value)
    case 'durationProfile':
      return withDurationProfile(endeavor, {
        preferred: change.preferred,
        minimum: change.minimum,
        maximum: change.maximum,
      })
    case 'sessionPoints':
      return withSessionPoints(endeavor, change.value)
    case 'value':
      return withValue(endeavor, change.value)
    case 'effort':
      return withEffort(endeavor, change.value)
    case 'expiry':
      return withExpiry(endeavor, change.value)
    case 'tagToggled':
      return withTags(endeavor, tagsAfterToggle(endeavor, change.value))
    case 'associatedColor':
      return withAssociatedColor(endeavor, change.value)
    case 'project':
      // Canon's two-field invariant: `list` and `projectId` move together, so
      // `EndeavorUpdatePayload`'s `list?.id ?? projectId` derivation stays
      // consistent with what the user picked.
      return withProject(endeavor, {
        projectId: change.value?.id ?? null,
        list: change.value,
      })
    case 'repeatConfig':
      return withRepeatConfig(endeavor, change.value)
    default:
      return assertNever(change)
  }
}

// ---------------------------------------------------------------------------
// Dirty tracking
// ---------------------------------------------------------------------------

/**
 * A stable, order-independent normalisation of any domain value, for comparison
 * only. `Date` collapses to its epoch (no ISO string, no locale), object keys
 * are sorted (so insertion order cannot fake a difference), and arrays keep
 * their order (because `defers` and `performances` are ordered by meaning).
 */
const comparable = (value: unknown): unknown => {
  if (value instanceof Date) return value.getTime()
  if (Array.isArray(value)) return value.map(comparable)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, entry]) => [key, comparable(entry)]),
    )
  }
  return value
}

/**
 * Value equality for two endeavors — canon's `endeavor == saved`, which is
 * Swift struct equality.
 *
 * A **reference** comparison would be wrong in both directions: two structurally
 * identical copies would read as different (leaving a saved form permanently
 * dirty), and it would make dirty tracking depend on whether a Producer happened
 * to echo the same object back rather than on whether anything actually changed.
 * The reference check stays as the fast path.
 */
export const endeavorsEqual = (left: Endeavor, right: Endeavor): boolean =>
  left === right ||
  JSON.stringify(comparable(left)) === JSON.stringify(comparable(right))

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

/**
 * Canon's `EndeavorDetailSection` / `EndeavorEditSection` — the three display
 * groups, and the fields each holds in display order.
 *
 * The grouping lives here rather than in `@kro/core` for canon's own stated
 * reason: `EndeavorFieldRelevance` stays per-field and has no notion of a
 * "section"; grouping fields into display sections is a Detail/Edit concern.
 */
export const EndeavorDetailSection = {
  core: 'core',
  enrichment: 'enrichment',
  recurrence: 'recurrence',
} as const

export type EndeavorDetailSection =
  (typeof EndeavorDetailSection)[keyof typeof EndeavorDetailSection]

/** Every section, in display order. */
export const endeavorDetailSections: readonly EndeavorDetailSection[] = [
  EndeavorDetailSection.core,
  EndeavorDetailSection.enrichment,
  EndeavorDetailSection.recurrence,
]

/** The fields a section holds, in display order. Canon's `section.fields`. */
export const fieldsOfSection = (
  section: EndeavorDetailSection,
): readonly EndeavorField[] => {
  switch (section) {
    case EndeavorDetailSection.core:
      return [
        EndeavorField.title,
        EndeavorField.status,
        EndeavorField.due,
        EndeavorField.start,
        EndeavorField.duration,
        EndeavorField.sessionPoints,
      ]
    case EndeavorDetailSection.enrichment:
      return [
        EndeavorField.value,
        EndeavorField.effort,
        EndeavorField.expiry,
        EndeavorField.tags,
        EndeavorField.associatedColor,
        EndeavorField.project,
      ]
    case EndeavorDetailSection.recurrence:
      return [EndeavorField.repeatConfig]
    default:
      return assertNever(section)
  }
}

/** `EndeavorDetailSection.displayTitle`. */
export const sectionTitle = (section: EndeavorDetailSection): string => {
  switch (section) {
    case EndeavorDetailSection.core:
      return 'Core'
    case EndeavorDetailSection.enrichment:
      return 'Enrichment'
    case EndeavorDetailSection.recurrence:
      return 'Recurrence'
    default:
      return assertNever(section)
  }
}

/** One section as the surface renders it. */
export interface EndeavorDetailSectionModel {
  readonly section: EndeavorDetailSection
  readonly title: string
  readonly fields: readonly EndeavorField[]
}

/**
 * Every section with the fields **editable** for this kind, in display order,
 * derived from the domain matrix.
 *
 * Sections with no editable field are still present with an empty array, so a
 * caller can look any section up without an optional — canon's own reason. Use
 * `editableSections` for the ones worth a header.
 */
export const editableFieldsBySection = (
  kind: EndeavorKind,
  focusedField: EndeavorField | null = null,
): readonly EndeavorDetailSectionModel[] =>
  endeavorDetailSections.map((section) => {
    const relevant = fieldsOfSection(section).filter((field) =>
      isFieldEditable(field, kind),
    )
    return {
      section,
      title: sectionTitle(section),
      // Canon's focused-field editor exposes exactly one row: opened from a
      // Detail row, Edit shows that field and nothing else.
      fields:
        focusedField === null
          ? relevant
          : relevant.filter((field) => field === focusedField),
    }
  })

/** The sections with at least one editable field — the ones worth a header. */
export const editableSections = (
  kind: EndeavorKind,
  focusedField: EndeavorField | null = null,
): readonly EndeavorDetailSectionModel[] =>
  editableFieldsBySection(kind, focusedField).filter(
    (model) => model.fields.length > 0,
  )

/**
 * Every field this kind can edit, flat and in display order — the row the
 * truth-table test walks, and the set `#30` renders controls for.
 */
export const editableFieldsFor = (
  kind: EndeavorKind,
): readonly EndeavorField[] =>
  endeavorFields.filter((field) => isFieldEditable(field, kind))
