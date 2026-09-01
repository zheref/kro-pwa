/**
 * The `public.endeavors` wire row and its Mapper (`RC-29`, `RC-30`,
 * `UZF-17`).
 *
 * kro-pwa is a **client** of the Kro Cloud schema, which is owned by
 * `zheref/KroApple` (`stack-matrix.md` cross-cutting: one owning repo, no
 * second copy). No migration is authored here; the columns below are read off
 * that repo's `supabase/migrations/`, and the names are reproduced exactly —
 * including the two that are quoted camelCase in the DDL (`"isDraft"`,
 * `"repeatConfig"`) and are therefore camelCase over the wire too, while
 * everything else added later is snake_case:
 *
 * ```
 * 20260503000000_baseline_manual_schema.sql   id title kind "start" duration
 *                                             "isDraft" created_at owner_id
 *                                             project_id status tags shadows
 *                                             updated_at
 * 20260712000000_endeavors_kro_enhanced_…     value effort expiry
 *                                             associated_color session_points
 * 20260719000000_endeavors_scheduling_…       start due duration "repeatConfig"
 * 20260826000000_endeavor_duration_bounds     minimum_duration maximum_duration
 * ```
 *
 * ## Three columns that do not exist, and one that does but canon never writes
 *
 * - **No `completed` column.** Canon's `Endeavor.encode(to:)` says so in a
 *   comment and deliberately omits it; completion lives on
 *   `performances.completed_at`. Writing it would be an unknown-column
 *   rejection on every push.
 * - **No `owner` column** — only `owner_id bigint`, an FK into `public.owners`.
 *   Canon omits `owner` for the same reason.
 * - **No `deleted_at` column.** The schema's own note says offline delete sync
 *   *"needs a `deleted_at` column or a sibling `*_tombstones` table — Phase 3b
 *   will add it"*, and Phase 3b never did. This is the fact that decides how a
 *   tombstone is pushed: see `EndeavorSyncService.ts`, which sends a **DELETE**
 *   rather than an upsert carrying a tombstone flag, because there is no column
 *   to carry one.
 * - **`owner_id` is required by RLS and canon never sets it.** Every
 *   `endeavors_*_self` policy reads `owner_id is not null and
 *   kro_endeavor_owner_user_id(owner_id) = auth.uid()::text`, so a row without
 *   it is invisible on SELECT and rejected on INSERT. Canon's `insertEndeavor`
 *   encodes no owner at all (`// endeavorToCreate.owner = owner` is commented
 *   out), which means canon's own endeavor push cannot satisfy its own RLS.
 *   This port resolves and sends `owner_id`; the upstream mismatch is recorded
 *   in the PR rather than silently mirrored, because mirroring it would ship a
 *   sync engine that is guaranteed to fail the moment the flag is turned on.
 *
 * ## Nulls are written, not omitted
 *
 * Canon's INSERT path uses `encodeIfPresent`, so a cleared optional is *absent*
 * from the payload and leaves the column untouched. Its UPDATE path
 * (`EndeavorUpdatePayload`) encodes every field explicitly and says why: *"so a
 * user-cleared optional (e.g. a removed due date) serializes as JSON `null` and
 * clears the column, instead of being silently skipped."* This engine's push is
 * an **upsert** — one payload serving both insert and update — so it follows the
 * UPDATE rule. Following the INSERT rule instead would make "the user removed
 * the due date" un-syncable.
 */
import {
  type EncodedShadow,
  type Endeavor,
  type EndeavorTag,
  type Shadow,
  decodeRepeatConfig,
  decodeShadow,
  encodeRepeatConfig,
  encodeShadow,
  endeavorKindFromRawValue,
  endeavorStatusFromRawValue,
  endeavorTagsFromRawValues,
  makeEndeavor,
} from '@kro/core'

/** A row as PostgREST returns it. Every column may be absent from a `select`. */
export interface EndeavorRow {
  readonly id: string
  readonly title?: string | null
  readonly kind?: string | null
  readonly status?: string | null
  readonly isDraft?: boolean | null
  readonly start?: string | null
  readonly due?: string | null
  readonly duration?: number | null
  readonly minimum_duration?: number | null
  readonly maximum_duration?: number | null
  readonly repeatConfig?: unknown
  readonly tags?: readonly string[] | null
  readonly shadows?: readonly unknown[] | null
  readonly project_id?: string | null
  readonly created_at?: string | null
  readonly updated_at?: string | null
  readonly value?: number | null
  readonly effort?: number | null
  readonly expiry?: string | null
  readonly associated_color?: string | null
  readonly session_points?: number | null
}

/** The payload a push sends. Every column explicit — see the header. */
export interface EndeavorWriteRow {
  readonly id: string
  readonly title: string
  readonly kind: string
  readonly status: string
  readonly isDraft: boolean
  readonly owner_id: number
  readonly start: string | null
  readonly due: string | null
  readonly duration: number | null
  readonly minimum_duration: number | null
  readonly maximum_duration: number | null
  readonly repeatConfig: unknown
  readonly tags: readonly string[] | null
  readonly shadows: readonly EncodedShadow[] | null
  readonly project_id: string | null
  readonly created_at: string
  readonly updated_at: string | null
  readonly value: number | null
  readonly effort: number | null
  readonly expiry: string | null
  readonly associated_color: string | null
  readonly session_points: number | null
}

/** The columns a pull selects, in the DDL's own order. */
export const ENDEAVOR_SELECT_COLUMNS = [
  'id',
  'title',
  'kind',
  'status',
  'isDraft',
  'start',
  'due',
  'duration',
  'minimum_duration',
  'maximum_duration',
  'repeatConfig',
  'tags',
  'shadows',
  'project_id',
  'created_at',
  'updated_at',
  'value',
  'effort',
  'expiry',
  'associated_color',
  'session_points',
].join(',')

const dateFromColumn = (value: string | null | undefined): Date | null => {
  if (value === null || value === undefined) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const isoOrNull = (value: Date | null): string | null =>
  value === null ? null : value.toISOString()

const numberOrNull = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

export const EndeavorRowMapper = {
  /**
   * A cloud row to a domain `Endeavor`.
   *
   * Fails — returns `null` — on exactly the two columns whose value cannot be
   * defaulted without inventing meaning: `kind` and `status`. That is the same
   * pair `endeavorFromRecord` fails on in `@kro/core`, and the same pair
   * canon's JSON decoder throws for; the caller skips the row rather than
   * storing a shape the rest of the app would mis-classify.
   *
   * Everything else degrades exactly as the local decoder does: a malformed
   * `repeatConfig` reads as no recurrence, an unrecognised tag is dropped, an
   * undecodable shadow entry is skipped.
   */
  toDomain(row: EndeavorRow): Endeavor | null {
    const kind = endeavorKindFromRawValue(row.kind ?? '')
    if (kind === null) return null
    const status = endeavorStatusFromRawValue(row.status ?? '')
    if (status === null) return null

    // `endeavorTagsFromRawValues` is canon's own lossy `compactMap`: an
    // unrecognised letter is dropped rather than failing the row.
    const tags: readonly EndeavorTag[] | null =
      row.tags === null || row.tags === undefined
        ? null
        : endeavorTagsFromRawValues([...row.tags])

    const shadows: readonly Shadow[] | null =
      row.shadows === null || row.shadows === undefined
        ? null
        : row.shadows.flatMap((entry) => {
            const shadow = decodeShadow(entry)
            return shadow === null ? [] : [shadow]
          })

    const repeat =
      row.repeatConfig === null || row.repeatConfig === undefined
        ? null
        : decodeRepeatConfig(row.repeatConfig)

    return makeEndeavor({
      id: row.id,
      title: row.title ?? '',
      kind,
      status,
      isDraft: row.isDraft ?? false,
      start: dateFromColumn(row.start),
      due: dateFromColumn(row.due),
      duration: numberOrNull(row.duration),
      minimumDuration: numberOrNull(row.minimum_duration),
      maximumDuration: numberOrNull(row.maximum_duration),
      repeatConfig: repeat !== null && repeat.ok ? repeat.value : null,
      tags,
      shadows,
      projectId: row.project_id ?? null,
      createdAt: dateFromColumn(row.created_at),
      updatedAt: dateFromColumn(row.updated_at),
      value: numberOrNull(row.value),
      effort: numberOrNull(row.effort),
      expiry: dateFromColumn(row.expiry),
      associatedColor: row.associated_color ?? null,
      sessionPoints: numberOrNull(row.session_points),
      // The cloud says nothing about hosting; `supabase` is appended by the
      // caller exactly as canon's `fetchEndeavors` appends `.supabase`.
      hostedBy: [],
      // No column exists for either — see the file header.
      completed: null,
      owner: null,
      list: null,
    })
  },

  /**
   * A domain `Endeavor` to the push payload.
   *
   * `createdAt` falls back to `now` because the column is `not null` and a row
   * that never reached disk with a creation stamp still has to be pushable —
   * the same fallback `endeavorRecordFromEndeavor` applies locally.
   */
  fromDomain(
    endeavor: Endeavor,
    params: { readonly ownerId: number; readonly now: Date },
  ): EndeavorWriteRow {
    return {
      id: endeavor.id,
      title: endeavor.title,
      kind: endeavor.kind,
      status: endeavor.status,
      isDraft: endeavor.isDraft,
      owner_id: params.ownerId,
      start: isoOrNull(endeavor.start),
      due: isoOrNull(endeavor.due),
      duration: endeavor.duration,
      minimum_duration: endeavor.minimumDuration,
      maximum_duration: endeavor.maximumDuration,
      repeatConfig:
        endeavor.repeatConfig === null
          ? null
          : encodeRepeatConfig(endeavor.repeatConfig),
      tags: endeavor.tags === null ? null : [...endeavor.tags],
      shadows:
        endeavor.shadows === null ? null : endeavor.shadows.map(encodeShadow),
      // Canon: `list`, when set, is the authoritative project assignment and
      // overrides `projectId`.
      project_id: endeavor.list?.id ?? endeavor.projectId,
      created_at: (endeavor.createdAt ?? params.now).toISOString(),
      updated_at: isoOrNull(endeavor.updatedAt),
      value: endeavor.value,
      effort: endeavor.effort,
      expiry: isoOrNull(endeavor.expiry),
      associated_color: endeavor.associatedColor,
      session_points: endeavor.sessionPoints,
    }
  },
} as const
