/**
 * The one derived read the global Detail overlay needs that neither feature
 * already exports (`RC-5`, `RC-20`).
 *
 * `#29` parks every cross-feature request as an **intent** on the Find slice —
 * `{ id, operation, endeavorId, surface }` — deliberately without the endeavor
 * itself, because a slice may not import a sibling's shape and an intent is a
 * request, not a payload. The overlay needs the endeavor to present it, so the
 * two are joined here: composed from `find`'s **own exported Selectors**, never
 * by reaching into `state.find`'s shape, which is exactly the cross-slice route
 * `UZF-6`/`RC-20` sanction.
 *
 * Only the two operations this overlay owns resolve. `startSession`, `triage`,
 * `share` and `dismissSuggestion` belong to other features and stay in the
 * queue untouched — draining an intent the overlay cannot serve would
 * acknowledge it on that feature's behalf and lose the request.
 */
import type { Endeavor, EndeavorOperation } from '@kro/core'
import { createSelector } from '@reduxjs/toolkit'
import {
  selectFindNextIntent,
  selectFindRows,
  selectTasksRows,
} from '../../find/FindSelectors'

/** The operations the Detail overlay answers. Everything else is somebody else's. */
export const DETAIL_INTENT_OPERATIONS: readonly EndeavorOperation[] = [
  'viewDetail',
  'edit',
]

/** One resolved request: which intent, which endeavor, and how to present it. */
export interface DetailIntentRequest {
  readonly intentId: number
  readonly operation: EndeavorOperation
  readonly endeavor: Endeavor
}

/**
 * The next request the overlay should serve, or `null`.
 *
 * `null` also covers "the intent names a row this surface no longer holds" — an
 * optimistic delete can remove the row between the tap and the drain — because
 * presenting Detail on an endeavor that is gone would be worse than dropping
 * the request. The intent stays queued in that case, and the reducer's own
 * `childIntentDelegatedConsumed` is the only thing that removes it.
 */
export const selectDetailIntentRequest = createSelector(
  [selectFindNextIntent, selectFindRows, selectTasksRows],
  (intent, findRows, tasksRows): DetailIntentRequest | null => {
    if (intent === null) return null
    if (!DETAIL_INTENT_OPERATIONS.includes(intent.operation)) return null
    const pool = intent.surface === 'find' ? findRows : tasksRows
    const endeavor = pool.find((row) => row.id === intent.endeavorId)
    if (endeavor === undefined) return null
    return {
      intentId: intent.id,
      operation: intent.operation,
      endeavor,
    }
  },
)
