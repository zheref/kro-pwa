/**
 * The Detail/Edit/Duration/relations failure union (`RC-8`, `UZF-8`).
 *
 * Canon splits these across `EndeavorEditException` (local / remote / host
 * write-back), `EndeavorRelationSyncException` and `EndeavorDefersException`.
 * They fold into **one** union here for `RC-24`'s reason: the slice carries a
 * single `save` lifecycle field, and a field typed as a union of unions would
 * let a reader believe an edit failure and a relation failure can coexist.
 *
 * ## Two canon cases have no counterpart yet, deliberately
 *
 * `remoteSyncFailed` and `hostWriteBackFailed` describe a save that landed
 * locally but not on Kro Cloud / not on a provider. This build has **no** cloud
 * client (`#31`) and **no** provider adapter (`#33`), so a case for either would
 * be unreachable — and an unreachable case is worse than an absent one, because
 * a `switch` over it implies coverage nothing can produce. `hostAdapterUnavailable`
 * below is the honest stand-in: it says the mirror could not be changed *because
 * this build cannot change mirrors*, which is a different statement from "the
 * write-back failed".
 */
import { type Exception, exception } from '@kro/core'

export type EndeavorDetailException =
  /** The local upsert failed — nothing was persisted, so the edit stays dirty. */
  | Exception<'localPersistenceFailed'>
  /** A child-table relation write (a performance, a defer) failed. */
  | Exception<'relationSyncFailed'>
  /** Attaching or detaching a provider is not possible in this build. */
  | Exception<'hostAdapterUnavailable'>
  /** The endeavor being edited is no longer in the store. */
  | Exception<'endeavorNotFound'>
  /** The defensive `.rejected` fallback's landing shape (`RC-26`). */
  | Exception<'unknown'>

export const EndeavorDetailExceptions = {
  localPersistenceFailed: (reason: string): EndeavorDetailException =>
    exception(
      'localPersistenceFailed',
      `Couldn't save your changes: ${reason}`,
      true,
    ),

  relationSyncFailed: (reason: string): EndeavorDetailException =>
    exception(
      'relationSyncFailed',
      `Couldn't save that entry: ${reason}`,
      true,
    ),

  hostAdapterUnavailable: (reason: string): EndeavorDetailException =>
    exception('hostAdapterUnavailable', reason, false),

  endeavorNotFound: (id: string): EndeavorDetailException =>
    exception(
      'endeavorNotFound',
      `No endeavor with id '${id}' is stored on this device.`,
      false,
    ),

  unknown: (message: string): EndeavorDetailException =>
    exception('unknown', message, true),
} as const

/** Narrows an unknown thrown value into this feature's `message` shape. */
export const detailExceptionMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)
