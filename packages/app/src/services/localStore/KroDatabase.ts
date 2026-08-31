/**
 * The IndexedDB database itself — the web counterpart of canon's
 * `Kro/Dependencies/LocalStore/KroDatabase.swift`.
 *
 * Canon declares one SwiftData `Schema` over five `@Model`s and lets the
 * framework migrate it. IndexedDB has no schema inference, so the same thing is
 * spelled out here: **one database**, a monotonic integer version, and an
 * explicit, append-only ladder of migrations that a `versionchange`
 * transaction replays. That ladder is the upgrade path — a store added in
 * version 3 is added by *its own* step, so a user who last opened the app at
 * version 1 gets steps 2 and 3 in order, and a user at version 2 gets only
 * step 3.
 *
 * ## Why the ladder rather than "create anything missing"
 *
 * A `createIfAbsent` sweep looks simpler and is a trap: it can only ever create
 * *empty* stores. The moment a version needs to **transform** existing rows —
 * rename a column, split a store, backfill a watermark — a sweep has nowhere
 * to put that work, and the migration ends up as a one-off `if (oldVersion <
 * 2)` branch inline in the upgrade handler, which is exactly the shape that
 * rots. The ladder gives every future change the same, reviewable slot, and
 * `applyKroSchema` is unit-testable without a database because it takes the two
 * versions as arguments.
 *
 * ## Keys
 *
 * | Store | Key | Why |
 * |---|---|---|
 * | `endeavors` | in-line, `id` | canon's `@Attribute(.unique) var id` |
 * | `projects` | in-line, `id` | same |
 * | `userProfiles` | in-line, `id` | same |
 * | `lensSnapshots` | in-line, `vistaId` | one document per vista, as canon's per-vista file |
 * | `defers` | **out-of-line**, `deferRecordKey(record)` | canon's row has no id; the key is its upsert match tuple |
 * | `performances` | **out-of-line**, `performanceRecordKey(record)` | same |
 *
 * The two child stores carry an `endeavorId` index, which is safe because that
 * column is never null — an IndexedDB index silently **omits** a record whose
 * indexed value is `undefined`, so indexing a nullable column (`ownerUserId`,
 * say) would make anonymous rows invisible to any query that used it. That is
 * why `allForOwner` and `countAnonymous` filter in JavaScript instead.
 */
import { PersistenceExceptions } from '@kro/core'
import type { PersistenceException } from '@kro/core'

/** One database, as canon has one `ModelContainer`. */
export const KRO_DB_NAME = 'kro'

/** The version this build opens. Bump it **and** append a migration step. */
export const KRO_DB_VERSION = 1

export const KroObjectStore = {
  endeavors: 'endeavors',
  projects: 'projects',
  defers: 'defers',
  performances: 'performances',
  userProfiles: 'userProfiles',
  lensSnapshots: 'lensSnapshots',
} as const

export type KroObjectStore =
  (typeof KroObjectStore)[keyof typeof KroObjectStore]

/** Every store, in creation order. The sign-out wipe iterates this. */
export const kroObjectStores: readonly KroObjectStore[] = [
  KroObjectStore.endeavors,
  KroObjectStore.projects,
  KroObjectStore.defers,
  KroObjectStore.performances,
  KroObjectStore.userProfiles,
  KroObjectStore.lensSnapshots,
]

/** One step of the upgrade path. `to` is the version the step **produces**. */
export interface KroSchemaMigration {
  readonly to: number
  /** Why the version was bumped — the reviewable part. */
  readonly reason: string
  readonly apply: (database: IDBDatabase, transaction: IDBTransaction) => void
}

/**
 * The live ladder — ordered by `to`, ascending, **append-only**.
 *
 * Step 1 is the initial schema. A later step never edits this one: a user
 * upgrading from nothing replays the whole ladder, so rewriting an earlier step
 * changes what an existing installation was already given.
 */
export const kroSchemaMigrations: readonly KroSchemaMigration[] = [
  {
    to: 1,
    reason:
      'Initial schema: the five rows canon declares in its SwiftData Schema, ' +
      'plus lensSnapshots for #9`s per-vista saved lens.',
    apply: (database) => {
      database.createObjectStore(KroObjectStore.endeavors, { keyPath: 'id' })
      database.createObjectStore(KroObjectStore.projects, { keyPath: 'id' })
      database.createObjectStore(KroObjectStore.userProfiles, { keyPath: 'id' })
      database.createObjectStore(KroObjectStore.lensSnapshots, {
        keyPath: 'vistaId',
      })
      // Out-of-line keys: canon's child rows have no id column, and their
      // identity is the upsert match tuple. See `deferRecordKey`.
      const defers = database.createObjectStore(KroObjectStore.defers)
      defers.createIndex('endeavorId', 'endeavorId', { unique: false })
      const performances = database.createObjectStore(
        KroObjectStore.performances,
      )
      performances.createIndex('endeavorId', 'endeavorId', { unique: false })
    },
  },
]

/** The version a ladder upgrades to — the highest `to`, or `0` when empty. */
export const latestKroSchemaVersion = (
  migrations: readonly KroSchemaMigration[] = kroSchemaMigrations,
): number => migrations.reduce((highest, step) => Math.max(highest, step.to), 0)

/**
 * Run every step in `(fromVersion, toVersion]`, in ascending order, exactly
 * once each — the body of the `upgradeneeded` handler, extracted so it can be
 * tested without a database.
 *
 * Returns the `to` of each step that ran, so a test can prove "exactly once"
 * and a caller can log the path a user's database actually took.
 */
export const applyKroSchema = (
  database: IDBDatabase,
  transaction: IDBTransaction,
  fromVersion: number,
  toVersion: number,
  migrations: readonly KroSchemaMigration[] = kroSchemaMigrations,
): readonly number[] => {
  const pending = [...migrations]
    .filter((step) => step.to > fromVersion && step.to <= toVersion)
    .sort((left, right) => left.to - right.to)
  const applied: number[] = []
  for (const step of pending) {
    step.apply(database, transaction)
    applied.push(step.to)
  }
  return applied
}

/**
 * Translate whatever IndexedDB threw into the domain's closed union.
 *
 * A Service is allowed to reject (`RC-33`); the `Result` boundary belongs to
 * the Producer. This is the one place that inspects a `DOMException`, so a
 * Producer's `catch` calls it rather than re-implementing the mapping — the
 * same rule a Mapper's `toException` follows.
 */
export const localStoreException = (error: unknown): PersistenceException => {
  const name =
    typeof error === 'object' && error !== null && 'name' in error
      ? String((error as { name: unknown }).name)
      : ''
  const message = error instanceof Error ? error.message : String(error)

  if (name === 'QuotaExceededError') {
    return PersistenceExceptions.quotaExceeded(message)
  }
  if (name === 'VersionError' || name === 'InvalidStateError') {
    return PersistenceExceptions.blocked(message)
  }
  if (name === 'SecurityError' || name === 'NotSupportedError') {
    return PersistenceExceptions.unavailable(message)
  }
  return PersistenceExceptions.writeFailed(message)
}

/** Awaits one IndexedDB request. */
export const idbRequest = <Value>(request: IDBRequest<Value>): Promise<Value> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('request failed'))
  })

/** Awaits a transaction's completion — the point at which a write is durable. */
export const idbTransactionDone = (
  transaction: IDBTransaction,
): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('transaction failed'))
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('transaction aborted'))
  })

/**
 * Open the database, replaying whatever part of the ladder this installation
 * still owes.
 *
 * `onBlocked` fires when another tab holds an older version open —
 * `openKroDatabase` rejects with the `blocked` exception rather than hanging,
 * because a promise that never settles is indistinguishable from a hung app.
 */
export const openKroDatabase = (
  factory: IDBFactory,
  options: {
    readonly name?: string
    readonly version?: number
    readonly migrations?: readonly KroSchemaMigration[]
  } = {},
): Promise<IDBDatabase> => {
  const name = options.name ?? KRO_DB_NAME
  const version = options.version ?? KRO_DB_VERSION
  const migrations = options.migrations ?? kroSchemaMigrations

  return new Promise((resolve, reject) => {
    const request = factory.open(name, version)

    request.onupgradeneeded = (event) => {
      const transaction = request.transaction
      if (transaction === null) {
        reject(new Error('upgradeneeded fired with no transaction'))
        return
      }
      applyKroSchema(
        request.result,
        transaction,
        event.oldVersion,
        version,
        migrations,
      )
    }

    request.onblocked = () => {
      reject(
        PersistenceExceptions.blocked(
          `another tab holds '${name}' open at an older version`,
        ),
      )
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error(`could not open '${name}'`))
  })
}
