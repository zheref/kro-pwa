import { describe, expect, it } from 'vitest'
import {
  type PersistenceException,
  PersistenceExceptions,
  persistenceExceptionCopy,
} from '../PersistenceException'

const everyKind: readonly PersistenceException[] = [
  PersistenceExceptions.unavailable('IndexedDB is disabled'),
  PersistenceExceptions.blocked('another tab holds version 1'),
  PersistenceExceptions.quotaExceeded('origin budget exhausted'),
  PersistenceExceptions.malformedRecord('unknown kind'),
  PersistenceExceptions.notFound('endeavor-1'),
  PersistenceExceptions.readFailed('transaction aborted'),
  PersistenceExceptions.writeFailed('transaction aborted'),
]

describe('PersistenceExceptions — the recovery each kind implies', () => {
  it('marks a disabled store unrecoverable — retrying will not enable it', () => {
    expect(PersistenceExceptions.unavailable('private mode').recoverable).toBe(
      false,
    )
  })

  it('marks a blocked database recoverable — closing the other tab fixes it', () => {
    expect(PersistenceExceptions.blocked('v1 held').recoverable).toBe(true)
  })

  it('marks a full quota unrecoverable — a blind retry only fails again', () => {
    expect(PersistenceExceptions.quotaExceeded('full').recoverable).toBe(false)
  })

  it('carries the detail in `message` for logs, never for the user', () => {
    expect(
      PersistenceExceptions.malformedRecord("endeavor 'x' has unknown kind"),
    ).toMatchObject({ kind: 'malformedRecord' })
  })
})

describe('persistenceExceptionCopy — user-facing, derived from kind alone', () => {
  it('tells the user their work is tab-only when storage is unavailable', () => {
    expect(
      persistenceExceptionCopy(PersistenceExceptions.unavailable('x')),
    ).toContain('this tab only')
  })

  it('names the actual remedy for a blocked database', () => {
    expect(
      persistenceExceptionCopy(PersistenceExceptions.blocked('x')),
    ).toContain('another tab')
  })

  it('never leaks the developer detail from `message` into the copy', () => {
    const detail = 'IDBTransaction aborted: NotFoundError'
    expect(
      persistenceExceptionCopy(PersistenceExceptions.readFailed(detail)),
    ).not.toContain(detail)
  })

  it('answers a distinct sentence for every kind — no two share copy', () => {
    const sentences = new Set(everyKind.map(persistenceExceptionCopy))
    expect(sentences.size).toBe(everyKind.length)
  })

  it('is total over the union — every kind has copy', () => {
    for (const value of everyKind) {
      expect(persistenceExceptionCopy(value).length).toBeGreaterThan(0)
    }
  })
})
