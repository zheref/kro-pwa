/**
 * The **live** bundle: the eight ports wired to IndexedDB and `localStorage`,
 * assembled once and handed to `ThunkExtra`.
 *
 * ## One database handle, opened lazily
 *
 * `makeLiveLocalStore` opens nothing. The database is opened on the first
 * operation that needs it and the promise is memoised, so the eight stores
 * share one handle and a burst of concurrent reads at launch opens the database
 * once rather than eight times. Opening eagerly in the factory would make
 * building `ThunkExtra` a side effect — the app would touch storage during
 * module evaluation, which is exactly what `makeStore(extra)` exists to avoid.
 *
 * A failed open is **not** cached: the memo is cleared on rejection, so a
 * transient failure (another tab holding an old version, a quota blip) is
 * retried on the next call instead of poisoning the store for the session.
 *
 * ## Where the two media meet
 *
 * Six stores are IndexedDB (`endeavors`, `projects`, `defers`, `performances`,
 * `userProfiles`, `lensSnapshots`) and two are `localStorage` (`preferences`,
 * `runningSessionAnchor`). `WebStorageStores.ts` gives the reason for the
 * split — synchronous reads and whole-document replacement, respectively.
 */
import { PersistenceExceptions } from '@kro/core'
import type { LocalStore } from '@kro/core'
import {
  type DatabaseProvider,
  makeIndexedDbDeferStore,
  makeIndexedDbEndeavorStore,
  makeIndexedDbLensSnapshotStore,
  makeIndexedDbPerformanceStore,
  makeIndexedDbProjectStore,
  makeIndexedDbUserProfileStore,
} from './IndexedDbLocalStore'
import { type KroSchemaMigration, openKroDatabase } from './KroDatabase'
import {
  type WebStorageLike,
  makeWebPreferenceStorage,
  makeWebRunningSessionAnchorStore,
  resolveWebStorage,
} from './WebStorageStores'

export interface LiveLocalStoreOptions {
  /** The `IDBFactory` to open against. Tests pass `fake-indexeddb`'s. */
  readonly indexedDB?: IDBFactory
  /** The key-value store to use. Tests pass an in-memory `Storage`. */
  readonly webStorage?: WebStorageLike
  readonly databaseName?: string
  readonly databaseVersion?: number
  readonly migrations?: readonly KroSchemaMigration[]
}

/**
 * Memoise `openKroDatabase`, dropping the memo if it rejects.
 *
 * Exported because the retry-on-failure behaviour is worth testing on its own:
 * a cached rejection would leave the app permanently unable to store anything
 * after one transient failure, and that is not observable through the stores.
 */
export const memoizeDatabase = (
  open: () => Promise<IDBDatabase>,
): DatabaseProvider => {
  let pending: Promise<IDBDatabase> | null = null
  return () => {
    if (pending === null) {
      pending = open().catch((error: unknown) => {
        pending = null
        throw error
      })
    }
    return pending
  }
}

/**
 * The browser's `IDBFactory`, or `undefined` where there is none.
 *
 * `undefined` is a real state, not a defensive flourish: a Next.js server
 * render, a Node test, and a browser mode with storage disabled all reach this
 * code with no `indexedDB`. The DOM lib types the global as non-optional, which
 * is exactly why a plain `globalThis.indexedDB` read type-checks and then fails
 * at runtime — so the read is guarded and the result is honestly typed.
 *
 * The `try` mirrors `resolveWebStorage`'s: some privacy modes throw on the
 * property access itself, before any method is called.
 */
const resolveIndexedDb = (): IDBFactory | undefined => {
  try {
    return typeof indexedDB === 'undefined' ? undefined : indexedDB
  } catch {
    return undefined
  }
}

/**
 * The live bundle.
 *
 * **`indexedDB` is required, and its absence is a named failure.** A runtime
 * without it cannot back these six stores, and the failure surfaces on the
 * first operation as a rejected `PersistenceExceptions.unavailable(...)` — not
 * as a factory that throws at import time, and not as the bare
 * `TypeError: Cannot read properties of undefined (reading 'open')` that
 * dereferencing an absent global would produce. That distinction is the whole
 * point: `unavailable` is `recoverable: false` and carries copy that tells the
 * user their work stays in this tab, whereas a `TypeError` maps to
 * `writeFailed` and offers them a retry that cannot possibly succeed.
 *
 * `localStorage`, by contrast, degrades silently to an in-memory stand-in:
 * losing preferences for one tab is survivable, and losing the app is not.
 */
export const makeLiveLocalStore = (
  options: LiveLocalStoreOptions = {},
): LocalStore => {
  const factory = options.indexedDB ?? resolveIndexedDb()
  const storage = options.webStorage ?? resolveWebStorage()

  const provider = memoizeDatabase(() => {
    if (factory === undefined) {
      return Promise.reject(
        PersistenceExceptions.unavailable(
          'this runtime has no IndexedDB (a server render, or a browser mode with storage disabled)',
        ),
      )
    }
    return openKroDatabase(factory, {
      name: options.databaseName,
      version: options.databaseVersion,
      migrations: options.migrations,
    })
  })

  return {
    endeavors: makeIndexedDbEndeavorStore(provider),
    projects: makeIndexedDbProjectStore(provider),
    defers: makeIndexedDbDeferStore(provider),
    performances: makeIndexedDbPerformanceStore(provider),
    userProfiles: makeIndexedDbUserProfileStore(provider),
    lensSnapshots: makeIndexedDbLensSnapshotStore(provider),
    preferences: makeWebPreferenceStorage(storage),
    runningSessionAnchor: makeWebRunningSessionAnchorStore(storage),
  }
}

/**
 * The binding `ThunkExtra` defaults to.
 *
 * Built at module scope, which is safe precisely because the factory opens
 * nothing: this is eight closures over a memo, not a database connection.
 */
export const liveLocalStore: LocalStore = makeLiveLocalStore()
