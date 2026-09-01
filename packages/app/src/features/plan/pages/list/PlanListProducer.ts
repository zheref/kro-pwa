/**
 * The one effect the Plan LIST rows need that the merged tier has no Producer
 * for yet (`RC-3`, `RC-6`, `RC-7`, `RC-25`).
 *
 * `.planDay`'s capability set declares two row operations — Start Session on
 * the leading edge and **Delete** on the trailing one — and a declared binding
 * that reaches nothing is a control the user can press to no effect. Detail
 * (`viewDetail`) already has a home in `endeavorDetail`, and Start Session is
 * the session surface's hand-off (KC-IS-#22, in flight), but nothing in the
 * Plan feature deletes a row. This supplies it.
 *
 * ## Why it lives under `pages/list/` rather than in `PlanProducer.ts`
 *
 * `PlanProducer.ts` is KC-IS-#18's file lane and this child's is
 * `pages/{list,matrix,picker,visibility}/**`. The file name still ends in
 * `Producer.ts`, which is what `RC-3` and `check-uzf-boundaries.mjs` require,
 * and the thunk keeps every Producer rule: narrow inputs, services from
 * `extra`, one `Result`, never throws. Folding it into the feature's Producer
 * is a one-move follow-up — named in the PR body.
 *
 * ## The deletion is SOFT, and the refresh is the caller's
 *
 * `softDelete` is the same door Find's operation Producer uses, so a row
 * deleted from Plan and a row deleted from Find leave the store in the same
 * state (a tombstone the next sync can carry). This thunk has no reducer arm of
 * its own — the Plan slice's arrays are owned by `loadPlanDayThunk` and
 * `loadPlanMatrixThunk`, and re-reading them is both the smaller change and the
 * one that cannot leave the two arrays disagreeing about what still exists.
 * `PlanPage` does that re-read on success.
 */
import type { Result } from '@kro/core'
import { epochMillisFromDate, err, ok } from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ThunkExtra } from '../../../../library/store'
import type { PlanException } from '../../PlanException'
import { planExceptionFrom } from '../../PlanException'

/** Which row was removed, so a caller can assert on the write it asked for. */
export interface PlanEndeavorDeletion {
  readonly endeavorId: string
}

export const deletePlanEndeavorThunk = createAsyncThunk<
  Result<PlanEndeavorDeletion, PlanException>,
  { readonly endeavorId: string; readonly now: Date },
  { extra: ThunkExtra }
>(
  'plan/onPlanEndeavorDeletionCompleted',
  async ({ endeavorId, now }, { extra }) => {
    try {
      await extra.localStore.endeavors.softDelete(
        endeavorId,
        epochMillisFromDate(now),
      )
      return ok({ endeavorId })
    } catch (error) {
      return err(planExceptionFrom(error))
    }
  },
)
