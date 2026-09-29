/**
 * Every Producer that deletes an endeavor, read as one fact: which endeavor
 * ids a completed action removed.
 *
 * Why this and not a root Selector (Hanten C4). A Selector could only answer
 * "does the pane's selection still exist?" against an app-wide endeavor pool,
 * and this stack has none — the pool is read per surface (Do, Plan, Find, the
 * Inbox each hold their own copy, loaded only while mounted), so a Selector
 * over any one of them would call a live endeavor "gone" whenever that surface
 * is not mounted. The pane has to *drop* its selection (and triage has to
 * close its session) at the moment of the delete, which is a reducer's job.
 *
 * So the slices that care listen to the delete Producers' **action creators**
 * — the sanctioned cross-slice channel (`RC-20`: never another slice's state)
 * — through this one matcher, which is the single place a new delete path is
 * added. It reads each thunk's own resolved `Result`, nothing else.
 */
import type { UnknownAction } from '@reduxjs/toolkit'
import { EndeavorOperation } from '@kro/core'
import { applyInboxOperationThunk } from '../../features/capture/CaptureProducer'
import { deleteEndeavorThunk } from '../../features/do/DoProducer'
import {
  performBulkOperationThunk,
  performEndeavorOperationThunk,
} from '../../features/find/FindProducer'
import { deletePlanEndeavorThunk } from '../../features/plan/PlanProducer'

/** The endeavor ids a completed delete removed; empty for anything else. */
export function removedEndeavorIds(action: UnknownAction): readonly string[] {
  if (performEndeavorOperationThunk.fulfilled.match(action)) {
    const result = action.payload
    return result.ok && result.value.kind === 'removed'
      ? [result.value.endeavorId]
      : []
  }
  if (performBulkOperationThunk.fulfilled.match(action)) {
    const result = action.payload
    return result.ok && result.value.operation === 'delete'
      ? result.value.endeavorIds
      : []
  }
  if (deleteEndeavorThunk.fulfilled.match(action)) {
    const result = action.payload
    return result.ok ? [result.value] : []
  }
  if (deletePlanEndeavorThunk.fulfilled.match(action)) {
    const result = action.payload
    return result.ok ? [result.value.endeavorId] : []
  }
  if (applyInboxOperationThunk.fulfilled.match(action)) {
    const result = action.payload
    return result.ok && action.meta.arg.operation === EndeavorOperation.delete
      ? [result.value.endeavorId]
      : []
  }
  return []
}

/** `builder.addMatcher` predicate: the action removed at least one endeavor. */
export const isEndeavorRemoval = (action: UnknownAction): boolean =>
  removedEndeavorIds(action).length > 0
