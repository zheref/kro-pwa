/**
 * The one hydration read every feature shares (UZF-6): endeavor rows joined
 * with their living defers and performances, decoded to domain `Endeavor`s.
 *
 * A row that fails to decode is dropped rather than failing the whole read —
 * one corrupt record must not blank a user's surface. Defers and performances
 * are read whole (one round-trip per table), never one query per endeavor.
 *
 * Not a Service: it is a pure composition over the injected `LocalStore` a
 * Producer already holds, so it takes that store as an argument.
 */
import {
  type Defer,
  type Endeavor,
  type EndeavorRecord,
  type LocalStore,
  type Perform,
  type Project,
  deferFromRecord,
  endeavorFromRecord,
  liveRecords,
  livingChildRecords,
  performFromRecord,
  projectFromRecord,
} from '@kro/core'

export interface ReadStoredEndeavorsOptions {
  /**
   * Look each row's list up from the project table (KC-IS-#71 item 11).
   * `EndeavorRecord` has no list column, so without this every endeavor
   * hydrates with `list: null`. A `projectId` naming a project that is gone
   * leaves `list: null` — what an unfiled row is, never a dangling half-list.
   */
  readonly resolveLists?: boolean
}

type ChildRow = {
  readonly endeavorId: string
  readonly pendingDeletion: boolean
}

/** Groups living child rows by the endeavor they belong to. */
const bucketByEndeavor = <Row extends ChildRow, Value>(
  rows: readonly Row[],
  decode: (row: Row) => Value,
): Map<string, Value[]> => {
  const buckets = new Map<string, Value[]>()
  for (const row of rows) {
    const bucket = buckets.get(row.endeavorId) ?? []
    bucket.push(decode(row))
    buckets.set(row.endeavorId, bucket)
  }
  return buckets
}

const hydrate = (
  record: EndeavorRecord,
  defers: readonly Defer[],
  performances: readonly Perform[],
  list: Project | null | undefined,
): Endeavor | null => {
  const hydrated = endeavorFromRecord(record, {
    defers: [...defers],
    performances: [...performances],
    ...(list === undefined ? {} : { list }),
  })
  return hydrated.ok ? hydrated.value : null
}

/** Every stored endeavor, hydrated. */
export const readStoredEndeavors = async (
  localStore: LocalStore,
  options: ReadStoredEndeavorsOptions = {},
): Promise<readonly Endeavor[]> => {
  const [endeavorRecords, deferRecords, performanceRecords, projectRecords] =
    await Promise.all([
      localStore.endeavors.all(),
      localStore.defers.all(),
      localStore.performances.all(),
      options.resolveLists ? localStore.projects.all() : Promise.resolve([]),
    ])

  // `liveRecords`, not `livingChildRecords`: a project is a top-level row with
  // a tombstone, not a child row awaiting a remote DELETE.
  const projectsById = new Map(
    liveRecords(projectRecords).map((record) => [
      record.id,
      projectFromRecord(record),
    ]),
  )
  const defersByEndeavor = bucketByEndeavor(
    livingChildRecords(deferRecords),
    deferFromRecord,
  )
  const performancesByEndeavor = bucketByEndeavor(
    livingChildRecords(performanceRecords),
    performFromRecord,
  )

  const endeavors: Endeavor[] = []
  for (const record of endeavorRecords) {
    const list = options.resolveLists
      ? record.projectId === null
        ? null
        : (projectsById.get(record.projectId) ?? null)
      : undefined
    const hydrated = hydrate(
      record,
      defersByEndeavor.get(record.id) ?? [],
      performancesByEndeavor.get(record.id) ?? [],
      list,
    )
    if (hydrated) endeavors.push(hydrated)
  }
  return endeavors
}

/**
 * One stored endeavor by id, hydrated with only its own relations — the
 * O(1)-ish read for a single-row surface or mutation, where hydrating the whole
 * store would make every tap O(N) IndexedDB work. `null` when the row is
 * absent, removed, or fails to decode. (`forEndeavor` already excludes
 * pending-deletion children.)
 */
export const readStoredEndeavor = async (
  localStore: LocalStore,
  endeavorId: string,
): Promise<Endeavor | null> => {
  const record = await localStore.endeavors.get(endeavorId)
  if (record === null) return null
  const [deferRecords, performanceRecords] = await Promise.all([
    localStore.defers.forEndeavor(endeavorId),
    localStore.performances.forEndeavor(endeavorId),
  ])
  return hydrate(
    record,
    deferRecords.map(deferFromRecord),
    performanceRecords.map(performFromRecord),
    undefined,
  )
}
