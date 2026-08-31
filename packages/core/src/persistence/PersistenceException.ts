/**
 * `PersistenceException` — the closed failure union every store operation and
 * every record codec reports through (`RC-8`).
 *
 * Canon throws: `toEndeavor()` is `throws`, and the repository lets the error
 * escape. This port returns a `Result` instead (`RC-7`), for the reason canon's
 * own call sites already show — `KroEndeavorRepository.pushPendingToCloud`
 * writes `guard let endeavor = try? record.toEndeavor(…) else { continue }`,
 * i.e. it treats an undecodable row as *skip this one*, not as *fail the
 * sweep*. A `Result` makes that the type's contract instead of a `try?` the
 * next caller might forget.
 *
 * Every kind maps to a real, distinguishable recovery:
 *
 * | kind | what happened | what a caller does |
 * |---|---|---|
 * | `unavailable` | no IndexedDB / no `localStorage` (private mode, disabled) | degrade to in-memory, tell the user nothing persists |
 * | `blocked` | another tab holds the old DB version open | ask the user to close other tabs |
 * | `quotaExceeded` | the origin's storage budget is full | prompt to free space; never retry blindly |
 * | `malformedRecord` | a row exists but does not decode | skip the row, leave it on disk for a later build |
 * | `notFound` | the id addresses nothing | usually not an error — the store's `get` returns `null` instead |
 * | `readFailed` / `writeFailed` | the transaction aborted | retry once, then surface |
 */
import { assertNever } from '../library/assertNever'
import { type Exception, exception } from '../library/exception'

export type PersistenceException =
  | Exception<'unavailable'>
  | Exception<'blocked'>
  | Exception<'quotaExceeded'>
  | Exception<'malformedRecord'>
  | Exception<'notFound'>
  | Exception<'readFailed'>
  | Exception<'writeFailed'>

export const PersistenceExceptions = {
  unavailable: (detail: string): PersistenceException =>
    exception('unavailable', `Local storage is unavailable: ${detail}`, false),

  blocked: (detail: string): PersistenceException =>
    exception('blocked', `The local database is blocked: ${detail}`, true),

  quotaExceeded: (detail: string): PersistenceException =>
    exception('quotaExceeded', `Local storage is full: ${detail}`, false),

  malformedRecord: (detail: string): PersistenceException =>
    exception('malformedRecord', `A stored row is malformed: ${detail}`, false),

  notFound: (id: string): PersistenceException =>
    exception('notFound', `No stored row for '${id}'.`, false),

  readFailed: (detail: string): PersistenceException =>
    exception('readFailed', `A local read failed: ${detail}`, true),

  writeFailed: (detail: string): PersistenceException =>
    exception('writeFailed', `A local write failed: ${detail}`, true),
}

/** User-facing copy per kind, closed with `assertNever` (`RC-9`). */
export const persistenceExceptionCopy = (
  value: PersistenceException,
): string => {
  switch (value.kind) {
    case 'unavailable':
      return 'This browser will not let Kro store anything on this device. Your work stays in this tab only.'
    case 'blocked':
      return 'Kro is open in another tab with an older version. Close it and try again.'
    case 'quotaExceeded':
      return 'There is no room left to save on this device. Free some space and try again.'
    case 'malformedRecord':
      return 'One saved item could not be read and was skipped.'
    case 'notFound':
      return 'That item is no longer on this device.'
    case 'readFailed':
      return 'Kro could not read from this device. Try again.'
    case 'writeFailed':
      return 'Kro could not save to this device. Try again.'
    default:
      return assertNever(value)
  }
}
