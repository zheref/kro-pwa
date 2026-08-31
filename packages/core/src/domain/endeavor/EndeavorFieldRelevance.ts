/**
 * `EndeavorFieldRelevance` — canon `KroCore/Vistas/EndeavorFieldRelevance.swift`.
 *
 * The single source of truth for which `Endeavor` properties and relations are
 * visible and editable per `Kind`. Detail (read) renders exactly what this
 * marks visible; Edit (write) additionally requires `isEditable`. Crucially
 * for #7, the **domain boundary itself** honours the matrix: the `with…`
 * helpers in `EndeavorMutations` no-op rather than produce a value the matrix
 * says cannot exist, so no screen has to re-implement the per-kind check and
 * no screen can forget to.
 *
 * `Endeavor.kind` is `let` in canon — fixed at creation, never editable, for
 * any kind. `isKindEditable` is a constant `false`, not a function.
 *
 * The rules, restated so a reader need not re-derive them:
 *
 * | field / relation                       | relevant for                                 |
 * |----------------------------------------|----------------------------------------------|
 * | `due`                                  | every kind **except** habit and calendarEvent |
 * | `start`, `duration`                    | task, reminder, habit, calendarEvent          |
 * | `sessionPoints`                        | task, reminder, habit                         |
 * | everything else non-relation           | every kind                                    |
 * | `defers`                               | tracks `due` exactly                          |
 * | `performances`                         | task, reminder, habit                         |
 * | `hosts`, `shadows`                     | task, reminder, calendarEvent                 |
 *
 * Habits have no `due` because they always apply "today"; calendar events are
 * driven by `start`/`duration` instead, and canon's `Endeavor.event(…)` never
 * sets `due`. The three meta kinds (background / behavior / blueprint) are not
 * pinned to a time block, so they carry neither `start` nor `duration`.
 */
import { assertNever } from '../../library/assertNever'
import { EndeavorKind } from './EndeavorKind'

/**
 * The PO-locked v1 editable non-relation property set: Core (title, status,
 * due, start, duration, sessionPoints), Enrichment (value, effort, expiry,
 * tags, associatedColor, project/list), Recurrence (repeatConfig).
 */
export const EndeavorField = {
  // Core
  title: 'title',
  status: 'status',
  due: 'due',
  start: 'start',
  duration: 'duration',
  sessionPoints: 'sessionPoints',
  // Enrichment
  value: 'value',
  effort: 'effort',
  expiry: 'expiry',
  tags: 'tags',
  associatedColor: 'associatedColor',
  /**
   * Maps to both `Endeavor.projectId` and `Endeavor.list` — the PO's
   * "project/list" is one user-facing assignment, not two fields.
   */
  project: 'project',
  // Recurrence
  repeatConfig: 'repeatConfig',
} as const

export type EndeavorField = (typeof EndeavorField)[keyof typeof EndeavorField]

/** `EndeavorField.allCases`, in canon declaration order. */
export const endeavorFields: readonly EndeavorField[] = [
  EndeavorField.title,
  EndeavorField.status,
  EndeavorField.due,
  EndeavorField.start,
  EndeavorField.duration,
  EndeavorField.sessionPoints,
  EndeavorField.value,
  EndeavorField.effort,
  EndeavorField.expiry,
  EndeavorField.tags,
  EndeavorField.associatedColor,
  EndeavorField.project,
  EndeavorField.repeatConfig,
]

/**
 * The four relation-based fields: `performances`, `defers`, `hostedBy`,
 * `shadows`. Always **visible** (PO decision, canon comment 2026-07-10); each
 * answers its own per-kind editability.
 */
export const EndeavorRelation = {
  performances: 'performances',
  defers: 'defers',
  hosts: 'hosts',
  shadows: 'shadows',
} as const

export type EndeavorRelation =
  (typeof EndeavorRelation)[keyof typeof EndeavorRelation]

/** `EndeavorRelation.allCases`, in canon declaration order. */
export const endeavorRelations: readonly EndeavorRelation[] = [
  EndeavorRelation.performances,
  EndeavorRelation.defers,
  EndeavorRelation.hosts,
  EndeavorRelation.shadows,
]

/**
 * `EndeavorFieldRelevance.isKindEditable` — a hard `false`. `Endeavor.kind` is
 * fixed at creation for every kind; editing Kind is canon epic #119.
 */
export const isKindEditable = false

/** Whether `field` is relevant enough to `kind` to render on Detail. */
export const isFieldVisible = (
  field: EndeavorField,
  kind: EndeavorKind,
): boolean => {
  switch (field) {
    case EndeavorField.due:
      // Habits never have a due date — they always apply "today". Calendar
      // events are driven by `start`/`duration` instead.
      return kind !== EndeavorKind.habit && kind !== EndeavorKind.calendarEvent
    case EndeavorField.start:
    case EndeavorField.duration:
      // Concretely time-boxed kinds only; the three meta kinds are not pinned
      // to a specific time block.
      return (
        kind === EndeavorKind.task ||
        kind === EndeavorKind.reminder ||
        kind === EndeavorKind.habit ||
        kind === EndeavorKind.calendarEvent
      )
    case EndeavorField.sessionPoints:
      // Reward points accrue via a focus session; only these three are
      // session-trackable "Do" categories.
      return (
        kind === EndeavorKind.task ||
        kind === EndeavorKind.reminder ||
        kind === EndeavorKind.habit
      )
    case EndeavorField.title:
    case EndeavorField.status:
    case EndeavorField.value:
    case EndeavorField.effort:
    case EndeavorField.expiry:
    case EndeavorField.tags:
    case EndeavorField.associatedColor:
    case EndeavorField.project:
    case EndeavorField.repeatConfig:
      // No kind-specific evidence found; these apply uniformly.
      return true
    default:
      return assertNever(field)
  }
}

/**
 * Whether the user can edit `field` for `kind`. v1 has no visible-but-locked
 * non-relation field, so editability **mirrors visibility**; revisit if a
 * future field needs a narrower editable set.
 */
export const isFieldEditable = (
  field: EndeavorField,
  kind: EndeavorKind,
): boolean => isFieldVisible(field, kind)

/**
 * Relations are always visible, regardless of kind (PO decision, canon comment
 * 2026-07-10) — only editability varies per kind.
 */
export const isRelationVisible = (
  _relation: EndeavorRelation,
  _kind: EndeavorKind,
): boolean => true

/** Whether `relation`'s add/remove entry point should be offered for `kind`. */
export const isRelationEditable = (
  relation: EndeavorRelation,
  kind: EndeavorKind,
): boolean => {
  switch (relation) {
    case EndeavorRelation.defers:
      // Deferring pushes back `due` — only meaningful where `due` is editable.
      return isFieldEditable(EndeavorField.due, kind)
    case EndeavorRelation.performances:
      // Session-trackable kinds only (matches `sessionPoints`).
      return (
        kind === EndeavorKind.task ||
        kind === EndeavorKind.reminder ||
        kind === EndeavorKind.habit
      )
    case EndeavorRelation.hosts:
    case EndeavorRelation.shadows:
      // External write-back targets calendar hosts (task ↔ Reminders;
      // calendarEvent ↔ Apple/Google/Outlook Calendar). A shadow only exists
      // to record the origin of a mirrored external item, so it tracks
      // `hosts` exactly.
      return (
        kind === EndeavorKind.task ||
        kind === EndeavorKind.reminder ||
        kind === EndeavorKind.calendarEvent
      )
    default:
      return assertNever(relation)
  }
}
