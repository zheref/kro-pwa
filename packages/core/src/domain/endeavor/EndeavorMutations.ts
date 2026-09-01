/**
 * The pure `with…` copy helpers — canon
 * `KroCore/Model/Endeavor/Endeavor.swift`, "Relation editing (Phase G
 * add/remove helpers)" and the field setters above it.
 *
 * Every helper returns a **new** `Endeavor`; none mutates its input. Where
 * canon writes `var copy = self; copy.x = y; return copy`, this writes
 * `{ ...endeavor, x: y }` — the same operation once `Endeavor` is `readonly`
 * throughout.
 *
 * ## The invariant: the matrix is enforced here, not per screen
 *
 * Canon's rule, verbatim from `Endeavor.swift`:
 *
 * > Per `EndeavorFieldRelevance.isEditable`, a relation not editable for
 * > `kind` makes the helper a no-op — the domain boundary honors the matrix so
 * > callers […] never duplicate the per-kind check.
 *
 * A no-op returns **the same object reference**, not an equal copy. That is
 * deliberate and testable: `withAddedDefer(calendarEvent, entry) === calendarEvent`
 * is `true`, so a memoized selector or a React render keyed on identity sees
 * nothing changed, and a test can prove the refusal without deep-comparing.
 *
 * ## Two families, and why they differ
 *
 * **Matrix-guarded (user edits).** Everything a person can change from Detail
 * or Edit goes through `EndeavorFieldRelevance`. Canon guards the four
 * relations explicitly; #7 extends the same guard to the non-relation fields
 * the matrix already enumerates (`due`, `start`, `duration`, `repeatConfig`,
 * `sessionPoints`, `value`, `effort`, `expiry`, `tags`, `associatedColor`,
 * `project`, `title`, `status`), because the issue's acceptance criterion is
 * that "`withX` helpers refuse kind-irrelevant edits" and a matrix enforced
 * for four of seventeen fields is a matrix each screen still has to re-check.
 *
 * **Unguarded (ingestion).** `withAddedHost`, `withAddedShadow`, `withId`,
 * `withKind` and `withCompleted` are **not** guarded, exactly as canon leaves
 * them. These are the source-reconciliation path (#12), not user edits: a
 * provider that re-classifies an item, or reports a completed occurrence, is
 * describing what the host says is true, and the matrix has no standing to
 * refuse it. Canon's own comments say so — `withKind` is "a copy with a
 * **source-resolved** kind", `withCompleted` exists so "recurring Apple
 * reminders […] carry a completed occurrence's evidence". The asymmetry
 * against the guarded `withRemovedHost` / `withRemovedShadow` is canon's and
 * is preserved rather than tidied; see the PR Notes.
 */
import type { AnyEndeavorList } from '../shared/EndeavorList'
import type { TimeIntervalSeconds } from '../shared/TimeInterval'
import type { Defer } from './Defer'
import { makeDefer } from './Defer'
import type { Endeavor } from './Endeavor'
import {
  EndeavorField,
  EndeavorRelation,
  isFieldEditable,
  isRelationEditable,
} from './EndeavorFieldRelevance'
import type { EndeavorHost } from './EndeavorHost'
import type { EndeavorKind } from './EndeavorKind'
import type { EndeavorStatus } from './EndeavorStatus'
import type { EndeavorTag } from './EndeavorTag'
import type { Perform } from './Perform'
import type { RepeatConfig } from './RepeatConfig'
import type { Shadow } from './Shadow'

/**
 * Applies `change` only when `field` is editable for this endeavor's kind;
 * otherwise returns the very same object. Every guarded field helper is one
 * line on top of this, so the matrix cannot be forgotten in one of them.
 */
const editingField = (
  endeavor: Endeavor,
  field: EndeavorField,
  change: Partial<Endeavor>,
): Endeavor =>
  isFieldEditable(field, endeavor.kind) ? { ...endeavor, ...change } : endeavor

/** As `editingField`, for the four relation-valued fields. */
const editingRelation = (
  endeavor: Endeavor,
  relation: EndeavorRelation,
  change: (current: Endeavor) => Endeavor,
): Endeavor =>
  isRelationEditable(relation, endeavor.kind) ? change(endeavor) : endeavor

// MARK: - Unguarded: identity and ingestion
//
// Canon leaves these unguarded. See the module note.

/** `withUpdated(id:)`. Unguarded — identity is not a user-editable field. */
export const withId = (endeavor: Endeavor, id: string): Endeavor => ({
  ...endeavor,
  id,
})

/**
 * `withKind(_:)` — a source-resolved kind, preserving every other native and
 * Kro-enriched field. Unguarded by design: `isKindEditable` is `false` for
 * *users*, while this is the provider re-classifying its own item (#12).
 */
export const withKind = (endeavor: Endeavor, kind: EndeavorKind): Endeavor => ({
  ...endeavor,
  kind,
})

/**
 * `withCompleted(_:)` — replaces the host-native completion timestamp without
 * touching `status`. Recurring Apple reminders use this to carry a completed
 * occurrence's evidence onto the still-active series row. Unguarded.
 */
export const withCompleted = (
  endeavor: Endeavor,
  completed: Date | null,
): Endeavor => ({ ...endeavor, completed })

/** `withAddedHost(_:)`. Unguarded in canon — ingestion, not a user edit. */
export const withAddedHost = (
  endeavor: Endeavor,
  host: EndeavorHost,
): Endeavor => ({ ...endeavor, hostedBy: [...endeavor.hostedBy, host] })

/**
 * `withAddedShadow(_:)`. Unguarded in canon — ingestion. Note the asymmetry
 * with `withRemovedShadow`, which *is* guarded.
 */
export const withAddedShadow = (
  endeavor: Endeavor,
  shadow: Shadow,
): Endeavor => ({
  ...endeavor,
  shadows: [...(endeavor.shadows ?? []), shadow],
})

// MARK: - Guarded: scheduling

/**
 * `withShifted(start:)` — moves the start, preserving duration and everything
 * else. Used by Plan's "Rearrange from Now". Guarded on `.start`.
 */
export const withStart = (endeavor: Endeavor, start: Date | null): Endeavor =>
  editingField(endeavor, EndeavorField.start, { start })

/**
 * `withDue(_:)` — a plain `due` setter with **no audit trail**, which is what
 * an ordinary field edit needs. Distinct from `withDeferred`, which also
 * records a `Defer`. Guarded on `.due`.
 */
export const withDue = (endeavor: Endeavor, due: Date | null): Endeavor =>
  editingField(endeavor, EndeavorField.due, { due })

/** `withDuration(_:)`. Guarded on `.duration`. */
export const withDuration = (
  endeavor: Endeavor,
  duration: TimeIntervalSeconds | null,
): Endeavor => editingField(endeavor, EndeavorField.duration, { duration })

/**
 * `withRescheduled(start:duration:)` — both at once, because a drag on the
 * Plan timeline changes both and must not be observable as two states.
 * Guarded on `.start` (which the matrix ties to `.duration`).
 */
export const withRescheduled = (
  endeavor: Endeavor,
  start: Date,
  duration: TimeIntervalSeconds,
): Endeavor => editingField(endeavor, EndeavorField.start, { start, duration })

/**
 * `withDurationProfile(preferred:minimum:maximum:)` — the three duration
 * values form one editing invariant and travel together rather than through
 * three independent rebuilds. Guarded on `.duration`.
 */
export const withDurationProfile = (
  endeavor: Endeavor,
  profile: {
    readonly preferred: TimeIntervalSeconds | null
    readonly minimum: TimeIntervalSeconds | null
    readonly maximum: TimeIntervalSeconds | null
  },
): Endeavor =>
  editingField(endeavor, EndeavorField.duration, {
    duration: profile.preferred,
    minimumDuration: profile.minimum,
    maximumDuration: profile.maximum,
  })

/** `withRepeatConfig(_:)`. Guarded on `.repeatConfig`. */
export const withRepeatConfig = (
  endeavor: Endeavor,
  repeatConfig: RepeatConfig | null,
): Endeavor =>
  editingField(endeavor, EndeavorField.repeatConfig, { repeatConfig })

// MARK: - Guarded: core and Kro-enhanced fields

/** Guarded on `.title`. */
export const withTitle = (endeavor: Endeavor, title: string): Endeavor =>
  editingField(endeavor, EndeavorField.title, { title })

/** Guarded on `.status`. */
export const withStatus = (
  endeavor: Endeavor,
  status: EndeavorStatus,
): Endeavor => editingField(endeavor, EndeavorField.status, { status })

/** Guarded on `.sessionPoints` — task / reminder / habit only. */
export const withSessionPoints = (
  endeavor: Endeavor,
  sessionPoints: number | null,
): Endeavor =>
  editingField(endeavor, EndeavorField.sessionPoints, { sessionPoints })

/** The Kro-enhanced 1–5 value rating. Guarded on `.value`. */
export const withValue = (endeavor: Endeavor, value: number | null): Endeavor =>
  editingField(endeavor, EndeavorField.value, { value })

/** The Kro-enhanced 1–5 effort rating. Guarded on `.effort`. */
export const withEffort = (
  endeavor: Endeavor,
  effort: number | null,
): Endeavor => editingField(endeavor, EndeavorField.effort, { effort })

/** The Kro-enhanced expiry — **not** `due`. Guarded on `.expiry`. */
export const withExpiry = (endeavor: Endeavor, expiry: Date | null): Endeavor =>
  editingField(endeavor, EndeavorField.expiry, { expiry })

/** Guarded on `.tags`. `null` restores "never tagged". */
export const withTags = (
  endeavor: Endeavor,
  tags: readonly EndeavorTag[] | null,
): Endeavor => editingField(endeavor, EndeavorField.tags, { tags })

/** Guarded on `.associatedColor`. RGB hex, no alpha. */
export const withAssociatedColor = (
  endeavor: Endeavor,
  associatedColor: string | null,
): Endeavor =>
  editingField(endeavor, EndeavorField.associatedColor, { associatedColor })

/**
 * The project/list assignment. The matrix's `.project` case covers **both**
 * `projectId` and `list` — canon's note: "the PO's 'project/list' is one
 * user-facing assignment, not two fields" — so they are set together.
 */
export const withProject = (
  endeavor: Endeavor,
  assignment: {
    readonly projectId: string | null
    readonly list: AnyEndeavorList | null
  },
): Endeavor =>
  editingField(endeavor, EndeavorField.project, {
    projectId: assignment.projectId,
    list: assignment.list,
  })

// MARK: - Guarded: relations

/**
 * `withDeferred(to:made:reason:)` — moves `due` to `target` **and** appends
 * the `Defer` audit entry. Guarded on `.defers` (which the matrix ties to
 * `.due`), so deferring a calendar event or a habit is a no-op.
 *
 * `made` is required: canon defaults it to `.now`, and this tier has no clock.
 */
export const withDeferred = (
  endeavor: Endeavor,
  params: {
    readonly target: Date
    readonly made: Date
    readonly reason?: string | null
  },
): Endeavor =>
  editingRelation(endeavor, EndeavorRelation.defers, (current) => ({
    ...current,
    due: params.target,
    defers: [
      ...current.defers,
      makeDefer({
        made: params.made,
        reason: params.reason ?? null,
        target: params.target,
      }),
    ],
  }))

/**
 * `withAddedDefer(_:)` — appends history **without** touching `due`. Guarded
 * on `.defers`; this is the acceptance criterion's worked example, since
 * `.defers` tracks `.due` and `due` is irrelevant to a calendar event.
 */
export const withAddedDefer = (endeavor: Endeavor, entry: Defer): Endeavor =>
  editingRelation(endeavor, EndeavorRelation.defers, (current) => ({
    ...current,
    defers: [...current.defers, entry],
  }))

/** `withRemovedDefer(at:)`. No-op on an out-of-bounds index, as canon is. */
export const withRemovedDefer = (endeavor: Endeavor, index: number): Endeavor =>
  editingRelation(endeavor, EndeavorRelation.defers, (current) =>
    index < 0 || index >= current.defers.length
      ? current
      : {
          ...current,
          defers: current.defers.filter((_, at) => at !== index),
        },
  )

/** `withAddedPerformance(_:)`. Guarded on `.performances`. */
export const withAddedPerformance = (
  endeavor: Endeavor,
  performance: Perform,
): Endeavor =>
  editingRelation(endeavor, EndeavorRelation.performances, (current) => ({
    ...current,
    performances: [...current.performances, performance],
  }))

/** `withUpdatedPerformance(at:_:)`. No-op on an out-of-bounds index. */
export const withUpdatedPerformance = (
  endeavor: Endeavor,
  index: number,
  performance: Perform,
): Endeavor =>
  editingRelation(endeavor, EndeavorRelation.performances, (current) =>
    index < 0 || index >= current.performances.length
      ? current
      : {
          ...current,
          performances: current.performances.map((existing, at) =>
            at === index ? performance : existing,
          ),
        },
  )

/** `withRemovedPerformance(at:)`. No-op on an out-of-bounds index. */
export const withRemovedPerformance = (
  endeavor: Endeavor,
  index: number,
): Endeavor =>
  editingRelation(endeavor, EndeavorRelation.performances, (current) =>
    index < 0 || index >= current.performances.length
      ? current
      : {
          ...current,
          performances: current.performances.filter((_, at) => at !== index),
        },
  )

/**
 * `withRemovedHost(_:)` — removes **every** occurrence of `host`. Guarded on
 * `.hosts`; a no-op too when the host is not present.
 */
export const withRemovedHost = (
  endeavor: Endeavor,
  host: EndeavorHost,
): Endeavor =>
  editingRelation(endeavor, EndeavorRelation.hosts, (current) =>
    current.hostedBy.includes(host)
      ? {
          ...current,
          hostedBy: current.hostedBy.filter((existing) => existing !== host),
        }
      : current,
  )

/**
 * `withRemovedShadow(at:)` — guarded on `.shadows`, a no-op on an
 * out-of-bounds index, and it **normalizes `shadows` back to `null`** when the
 * removed element was the last one. Canon keeps "no shadows" canonically
 * represented as `nil` rather than `[]` everywhere; leaving an empty array
 * would make a never-mirrored endeavor and a de-mirrored one look different.
 */
export const withRemovedShadow = (
  endeavor: Endeavor,
  index: number,
): Endeavor =>
  editingRelation(endeavor, EndeavorRelation.shadows, (current) => {
    const shadows = current.shadows
    if (shadows === null || index < 0 || index >= shadows.length) return current
    const remaining = shadows.filter((_, at) => at !== index)
    return { ...current, shadows: remaining.length === 0 ? null : remaining }
  })

/**
 * `undrafted` — clears the draft flag. Canon's computed property has a bug
 * (`var copy = self; copy.isDraft = false; return self` — it returns `self`,
 * so the flag is never actually cleared); this port does what the name and
 * every call site mean. Unguarded: `isDraft` is not on the matrix, since a
 * draft is a lifecycle state rather than an editable field.
 */
export const undrafted = (endeavor: Endeavor): Endeavor =>
  endeavor.isDraft ? { ...endeavor, isDraft: false } : endeavor
