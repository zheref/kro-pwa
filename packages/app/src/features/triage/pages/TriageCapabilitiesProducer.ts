/**
 * The one Service read the Triage surface needs before it can open a session:
 * whether the dark-launched inline **Edit** affordance is reachable
 * (`RC-3`, `RC-6`, `RC-7`, `RC-25`).
 *
 * ## Why it exists at all
 *
 * `TriageSession.isEditReachable` is *"set by the parent from the
 * `endeavorDetail` flag — Triage stays flag-agnostic"*, which is canon's own
 * arrangement (`TriageView` only reflects `isEditReachable`; the Inbox decides
 * it). That leaves somebody to supply the boolean, and a Page cannot: a Service
 * reaches a Producer through `extra` and nowhere else (`RC-6`). So this is that
 * Producer — the same shape `find/pages/FindCapabilitiesProducer.ts` uses, and
 * for the same reason.
 *
 * ## No reducer arm, on purpose
 *
 * Nothing in `triageSlice` handles this thunk's three lifecycle actions,
 * because there is nothing for them to change: the value's only consumer is
 * `openTriageThunk`'s `isEditReachable` argument, and the session already holds
 * it from there. Adding arms would put the same fact in `State` twice, and the
 * second copy is the one that goes stale.
 *
 * ## A flag read that fails resolves to "not reachable"
 *
 * A dark-launched affordance whose flag cannot be resolved is simply not
 * offered, which is the safe direction: Triage opens without the Edit row
 * rather than refusing to open. `endeavorDetail` is **disabled** in the
 * `statusQuo` assignment set, so this resolves `false` in the shipping
 * configuration — the affordance's whole path is nevertheless wired, story-
 * covered and test-covered, so flipping the flag needs no change here.
 */
import { FeatureFlags, type Result, ok } from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ThunkExtra } from '../../../library/store'
import type { TriageException } from '../TriageException'

/**
 * Whether Triage may show its inline Edit affordance.
 *
 * Exactly the shape `openTriageThunk`'s `isEditReachable` argument takes and
 * `selectIsTriageEditReachable` reads back.
 */
export const resolveTriageEditReachabilityThunk = createAsyncThunk<
  Result<boolean, TriageException>,
  void,
  { extra: ThunkExtra }
>('triage/onEditReachabilityResolved', async (_unused, { extra }) => {
  try {
    return ok(extra.featureFlags.isEnabled(FeatureFlags.endeavorDetail))
  } catch {
    // See the header: an unreadable flag hides its affordance, it never stops
    // the surface that was going to offer it from opening.
    return ok(false)
  }
})
