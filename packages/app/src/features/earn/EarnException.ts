/**
 * The Earn surface's typed failure union (`RC-8`, `UZF-8`).
 *
 * One `kind` per failure the catalog load or a mutation can report. `blankTitle`
 * is a validation failure rather than an I/O one — it never reaches storage —
 * and is still modelled here rather than as a silent no-op so a caller can
 * surface *why* nothing happened, matching canon's own guard
 * (`guard !trimmed.isEmpty else return .none`) with a typed reason instead of a
 * quiet return.
 */
import { type Exception, exception } from '@kro/core'

export type EarnException =
  /** Reading `earn.pointsFormula` / `earn.defaultRewardThreshold` failed. */
  | Exception<'preferencesLoadFailed'>
  /** Reading the reward catalog, the claimed set or the performances failed. */
  | Exception<'catalogLoadFailed'>
  /** The add-reward draft's title was blank after trimming. */
  | Exception<'blankTitle'>
  /** Persisting a new reward (typed or from a suggestion) failed. */
  | Exception<'addRewardFailed'>
  /** Persisting a reward removal failed. */
  | Exception<'deleteRewardFailed'>
  /** Persisting a claim failed. */
  | Exception<'claimRewardFailed'>
  /** The defensive `.rejected` fallback's landing shape (`RC-26`). */
  | Exception<'unknown'>

export const EarnExceptions = {
  preferencesLoadFailed: (reason: string): EarnException =>
    exception(
      'preferencesLoadFailed',
      `Couldn't load your Earn preferences: ${reason}`,
      true,
    ),

  catalogLoadFailed: (reason: string): EarnException =>
    exception('catalogLoadFailed', `Couldn't load your rewards: ${reason}`, true),

  blankTitle: (): EarnException =>
    exception('blankTitle', 'Give the reward a title before adding it.', true),

  addRewardFailed: (reason: string): EarnException =>
    exception('addRewardFailed', `Couldn't save that reward: ${reason}`, true),

  deleteRewardFailed: (reason: string): EarnException =>
    exception('deleteRewardFailed', `Couldn't remove that reward: ${reason}`, true),

  claimRewardFailed: (reason: string): EarnException =>
    exception('claimRewardFailed', `Couldn't claim that reward: ${reason}`, true),

  unknown: (message: string): EarnException => exception('unknown', message, true),
} as const
