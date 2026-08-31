import {
  PersistenceExceptions,
  isPersistenceException,
  persistenceExceptionCopy,
  persistenceExceptionKinds,
} from '@kro/core'
import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import {
  KRO_DB_NAME,
  KRO_DB_VERSION,
  type KroSchemaMigration,
  applyKroSchema,
  idbRequest,
  idbTransactionDone,
  kroObjectStores,
  kroSchemaMigrations,
  latestKroSchemaVersion,
  localStoreException,
  openKroDatabase,
} from '../KroDatabase'

describe('the schema ladder', () => {
  it('declares a version this build`s ladder actually reaches', () => {
    expect(latestKroSchemaVersion()).toBe(KRO_DB_VERSION)
  })

  it('is ordered by `to`, ascending, with no duplicate version', () => {
    const versions = kroSchemaMigrations.map((step) => step.to)
    expect(versions).toEqual([...versions].sort((a, b) => a - b))
    expect(new Set(versions).size).toBe(versions.length)
  })

  it('gives every step a reason — the reviewable part of a bump', () => {
    for (const step of kroSchemaMigrations) {
      expect(step.reason.length).toBeGreaterThan(0)
    }
  })
})

describe('applyKroSchema — which steps run, and how often', () => {
  const ran: number[] = []
  const ladder: readonly KroSchemaMigration[] = [1, 2, 3].map((to) => ({
    to,
    reason: `step ${to}`,
    apply: () => {
      ran.push(to)
    },
  }))
  const noDatabase = {} as IDBDatabase
  const noTransaction = {} as IDBTransaction

  it('runs every step a fresh installation owes, in order', () => {
    ran.length = 0
    expect(applyKroSchema(noDatabase, noTransaction, 0, 3, ladder)).toEqual([
      1, 2, 3,
    ])
    expect(ran).toEqual([1, 2, 3])
  })

  it('runs only the steps a partially-upgraded installation still owes', () => {
    ran.length = 0
    expect(applyKroSchema(noDatabase, noTransaction, 1, 3, ladder)).toEqual([
      2, 3,
    ])
  })

  it('runs nothing for an installation already at the target version', () => {
    ran.length = 0
    expect(applyKroSchema(noDatabase, noTransaction, 3, 3, ladder)).toEqual([])
    expect(ran).toEqual([])
  })

  it('never runs a step BEYOND the version being opened', () => {
    ran.length = 0
    expect(applyKroSchema(noDatabase, noTransaction, 0, 2, ladder)).toEqual([
      1, 2,
    ])
  })

  it('runs each step exactly once, even out of declaration order', () => {
    ran.length = 0
    const shuffled = [ladder[2], ladder[0], ladder[1]] as KroSchemaMigration[]
    expect(applyKroSchema(noDatabase, noTransaction, 0, 3, shuffled)).toEqual([
      1, 2, 3,
    ])
    expect(ran).toEqual([1, 2, 3])
  })
})

describe('openKroDatabase — against fake-indexeddb', () => {
  it('creates every object store the schema declares', async () => {
    const database = await openKroDatabase(new IDBFactory(), {
      name: 'kro-open-1',
    })
    for (const store of kroObjectStores) {
      expect(database.objectStoreNames.contains(store)).toBe(true)
    }
    database.close()
  })

  it('opens at the declared version', async () => {
    const database = await openKroDatabase(new IDBFactory(), {
      name: 'kro-open-2',
    })
    expect(database.version).toBe(KRO_DB_VERSION)
    database.close()
  })

  it('indexes the child stores by endeavorId — the FK every read uses', async () => {
    const database = await openKroDatabase(new IDBFactory(), {
      name: 'kro-open-3',
    })
    const transaction = database.transaction(['defers', 'performances'])
    expect(
      transaction.objectStore('defers').indexNames.contains('endeavorId'),
    ).toBe(true)
    expect(
      transaction.objectStore('performances').indexNames.contains('endeavorId'),
    ).toBe(true)
    database.close()
  })

  it('re-opening an existing database preserves the rows already in it', async () => {
    const factory = new IDBFactory()
    const first = await openKroDatabase(factory, { name: 'kro-open-4' })
    const write = first.transaction('endeavors', 'readwrite')
    write.objectStore('endeavors').put({ id: 'survivor', title: 'Still here' })
    await idbTransactionDone(write)
    first.close()

    const second = await openKroDatabase(factory, { name: 'kro-open-4' })
    const read = second.transaction('endeavors')
    const row = await idbRequest(read.objectStore('endeavors').get('survivor'))
    expect(row).toMatchObject({ id: 'survivor' })
    second.close()
  })

  it('UPGRADES an older installation by running only the new step', async () => {
    const factory = new IDBFactory()
    const initialStep = kroSchemaMigrations[0]
    if (initialStep === undefined) throw new Error('the ladder is empty')
    const v1: readonly KroSchemaMigration[] = [initialStep]
    const first = await openKroDatabase(factory, {
      name: 'kro-upgrade',
      version: 1,
      migrations: v1,
    })
    const write = first.transaction('endeavors', 'readwrite')
    write.objectStore('endeavors').put({ id: 'kept', title: 'Kept across v2' })
    await idbTransactionDone(write)
    first.close()

    const v2: readonly KroSchemaMigration[] = [
      ...v1,
      {
        to: 2,
        reason: 'adds a store',
        apply: (database) => {
          database.createObjectStore('futureStore', { keyPath: 'id' })
        },
      },
    ]
    const upgraded = await openKroDatabase(factory, {
      name: 'kro-upgrade',
      version: 2,
      migrations: v2,
    })
    expect(upgraded.version).toBe(2)
    expect(upgraded.objectStoreNames.contains('futureStore')).toBe(true)

    // The upgrade must not be a wipe: the v1 row is still there.
    const read = upgraded.transaction('endeavors')
    expect(
      await idbRequest(read.objectStore('endeavors').get('kept')),
    ).toMatchObject({ id: 'kept' })
    upgraded.close()
  })

  it('defaults to the canonical database name', () => {
    expect(KRO_DB_NAME).toBe('kro')
  })
})

describe('localStoreException — the DOMException names that matter', () => {
  it('maps a full origin to `quotaExceeded`, which is not retryable', () => {
    const error = Object.assign(new Error('no room'), {
      name: 'QuotaExceededError',
    })
    expect(localStoreException(error)).toMatchObject({
      kind: 'quotaExceeded',
      recoverable: false,
    })
  })

  it('maps a version conflict to `blocked` — close the other tab', () => {
    const error = Object.assign(new Error('v1 held'), { name: 'VersionError' })
    expect(localStoreException(error).kind).toBe('blocked')
  })

  it('maps a disabled store to `unavailable`', () => {
    const error = Object.assign(new Error('denied'), { name: 'SecurityError' })
    expect(localStoreException(error).kind).toBe('unavailable')
  })

  it('falls back to `writeFailed` for anything unrecognised', () => {
    expect(localStoreException(new Error('who knows')).kind).toBe('writeFailed')
  })

  it('never throws on a non-Error value', () => {
    expect(localStoreException('a string').kind).toBe('writeFailed')
    expect(localStoreException(null).kind).toBe('writeFailed')
  })

  it('PASSES THROUGH a value that is already a PersistenceException', () => {
    // `openKroDatabase` rejects with this from its `onblocked` handler; no
    // platform error expresses "another tab holds the old version".
    const original = PersistenceExceptions.blocked('another tab holds v1')
    expect(localStoreException(original)).toBe(original)
  })

  it('keeps `blocked`s recoverable remedy instead of flattening it', () => {
    const mapped = localStoreException(PersistenceExceptions.blocked('v1 held'))
    expect(mapped.kind).toBe('blocked')
    expect(mapped.recoverable).toBe(true)
  })

  it('never yields the `[object Object]` message a re-wrap would produce', () => {
    expect(
      localStoreException(PersistenceExceptions.quotaExceeded('full')).message,
    ).not.toContain('[object Object]')
  })

  it('does not mistake an ordinary Error for one of ours', () => {
    // An Error has `message`, but no `kind` and no `recoverable`.
    expect(localStoreException(new Error('plain')).kind).toBe('writeFailed')
  })
})

describe('localStoreException — read and write are different sentences', () => {
  it('maps an unrecognised failure on a READ to `readFailed`', () => {
    // IndexedDB reports a failed getAll and a failed put with the same
    // DOMException, so only the call site can tell them apart.
    expect(localStoreException(new Error('aborted'), 'read').kind).toBe(
      'readFailed',
    )
  })

  it('maps an unrecognised failure on a WRITE to `writeFailed`', () => {
    expect(localStoreException(new Error('aborted'), 'write').kind).toBe(
      'writeFailed',
    )
  })

  it('defaults to `writeFailed` — the more consequential of the two', () => {
    // Telling the user their work was saved when the write is what failed is
    // the worse mistake, so an unattributed failure takes that side.
    expect(localStoreException(new Error('aborted')).kind).toBe('writeFailed')
  })

  it('still recognises a named DOMException regardless of the side', () => {
    const quota = Object.assign(new Error('full'), {
      name: 'QuotaExceededError',
    })
    expect(localStoreException(quota, 'read').kind).toBe('quotaExceeded')
    expect(localStoreException(quota, 'write').kind).toBe('quotaExceeded')
  })

  it('gives the two sides distinct user copy', () => {
    expect(
      persistenceExceptionCopy(localStoreException(new Error('x'), 'read')),
    ).not.toBe(
      persistenceExceptionCopy(localStoreException(new Error('x'), 'write')),
    )
  })
})

describe('isPersistenceException — the guard the pass-through rests on', () => {
  it('accepts every kind the union declares', () => {
    for (const kind of persistenceExceptionKinds) {
      expect(
        isPersistenceException({ kind, message: 'x', recoverable: true }),
      ).toBe(true)
    }
  })

  it('rejects a look-alike whose kind names nothing in the union', () => {
    expect(
      isPersistenceException({
        kind: 'networkFailed',
        message: 'x',
        recoverable: true,
      }),
    ).toBe(false)
  })

  it('rejects a partial shape missing `recoverable`', () => {
    expect(isPersistenceException({ kind: 'blocked', message: 'x' })).toBe(
      false,
    )
  })

  it('rejects an Error, a string and null', () => {
    expect(isPersistenceException(new Error('x'))).toBe(false)
    expect(isPersistenceException('blocked')).toBe(false)
    expect(isPersistenceException(null)).toBe(false)
  })
})
