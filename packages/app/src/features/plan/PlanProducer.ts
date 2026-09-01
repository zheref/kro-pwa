/**
 * Plan's Producers (`RC-3`, `RC-6`, `RC-7`, `RC-25`).
 *
 * Four effects, one per thing the surface asks the world for. Each takes narrow
 * inputs, reads its services from `extra`, passes `thunkAPI.signal` down, and
 * **never throws** — every failure is caught and resolved as `err(...)`, which
 * is what makes the slice's `.rejected` arms defensive fallbacks rather than
 * the error path.
 *
 * Every thunk's type string is an **event name** (`plan/on…Completed`), never a
 * mechanism (`RC-2`).
 *
 * ## The preload contract lives here
 *
 * `loadPlanDayThunk` reads the **authoritative** day and nothing else;
 * `preloadPlanDaysThunk` reads the −3…+3 window with **one range request per
 * host** and returns it tagged with the day it was centred on. The two are
 * separate thunks precisely because the slice must be able to install one
 * without the other ever touching its arrays — see `PlanShifters`.
 *
 * The centre travels with the *result* as well as with the failure, so a
 * response that lands after the user has navigated away can be recognised as
 * superseded. Canon: *"a best-effort query can swallow cancellation and still
 * answer, so a superseded window can land here — installing it would overwrite
 * the day the user is actually looking at."*
 *
 * ## Clocks are arguments, never reads
 *
 * `updateEventTimeThunk` needs an instant to stamp the record's write
 * watermark. It takes one rather than calling `Date.now()`, so the write a test
 * asserts on is the write it asked for.
 *
 * `deletePlanEndeavorThunk` at the foot of the file folded in from
 * `pages/list/PlanListProducer.ts` (KC-IS-#71 item 23).
 */
import type { Endeavor, Result } from '@kro/core'
import {
  FeatureFlags,
  endeavorRecordFromEndeavor,
  epochMillisFromDate,
  err,
  ok,
  withRescheduled,
} from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ThunkExtra } from '../../library/store'
import type { PlanDayKey } from './PlanCalendar'
import { planDayKey, startOfNextPlanDay, startOfPlanDay } from './PlanCalendar'
import { planPreloadWindow } from './PlanDayCache'
import type { PlanException } from './PlanException'
import { PlanExceptions, planExceptionFrom } from './PlanException'
import {
  type PlanHost,
  endeavorsFromRecords,
  fetchPlanHostRange,
  makeLocalStorePlanHost,
} from './PlanHosts'
import type { PlanLoadReason } from './PlanState'

/**
 * Every host the Plan preload fans out over.
 *
 * Two entries: the on-device store, and Google Calendar (#33) — which is the
 * reason the fan-out is a list rather than a direct call.
 *
 * The Google host arrives **already adapted**, from `ThunkExtra`, rather than
 * being built here from a service: `check-uzf-boundaries.mjs` refuses a feature
 * file that imports anything under `services/` (`RC-6`, `RC-21`), so the
 * adaptation happens at the composition root, which is the one file the check
 * exempts. See `store.ts`'s `googleCalendarPlanHost` field and
 * `services/googleCalendar/GoogleCalendarPlanHost.ts`.
 *
 * The Google host is wrapped in its `UZF-22` flag, at the Producer boundary
 * where the checklist puts it — never inside a reducer. `googleCalendarIntegration`
 * is **enabled** in `statusQuo` (canon ships the integration on), so this is not
 * a rollout switch: it is the kill switch a debug override can reach when the
 * integration misbehaves, and the seam KC-IS-#35's Thirst surface reads.
 *
 * Beyond the flag, no further gate is needed: a disconnected or unconfigured
 * Google answers `[]` rather than failing, and `fetchPlanHostRange` already
 * tolerates a host that throws (canon's per-host `.bestEffort`), so a
 * `needsReconnect` cannot empty the day either.
 */
export const planHostsFor = (extra: ThunkExtra): readonly PlanHost[] => [
  makeLocalStorePlanHost(extra.localStore),
  ...(extra.featureFlags.isEnabled(FeatureFlags.googleCalendarIntegration)
    ? [extra.googleCalendarPlanHost]
    : []),
]

/** What one authoritative-day read answers with. */
export interface PlanDayLoadPayload {
  readonly dayKey: PlanDayKey
  readonly reason: PlanLoadReason
  readonly events: readonly Endeavor[]
}

/** What one read-ahead window answers with, tagged by the day it centred on. */
export interface PlanPreloadPayload {
  readonly centerDayKey: PlanDayKey
  readonly events: readonly Endeavor[]
}

/**
 * The authoritative selected day. First, and the only read allowed to write
 * `dayLoad`.
 */
export const loadPlanDayThunk = createAsyncThunk<
  Result<PlanDayLoadPayload, PlanException>,
  { readonly day: Date; readonly reason: PlanLoadReason },
  { extra: ThunkExtra }
>('plan/onPlanDayLoadCompleted', async ({ day, reason }, { extra, signal }) => {
  const dayKey = planDayKey(day)
  try {
    const events = await fetchPlanHostRange(
      planHostsFor(extra),
      { start: startOfPlanDay(day), end: startOfNextPlanDay(day) },
      { signal },
    )
    return ok({ dayKey, reason, events })
  } catch (error) {
    return err(PlanExceptions.dayLoadFailed(planExceptionFrom(error).message))
  }
})

/**
 * The lazy −3…+3 buffer. Runs **after** the authoritative day, one range
 * request per host, into the day-indexed cache the authoritative arrays never
 * share.
 */
export const preloadPlanDaysThunk = createAsyncThunk<
  Result<PlanPreloadPayload, PlanException>,
  { readonly center: Date },
  { extra: ThunkExtra }
>('plan/onPlanDayPreloadCompleted', async ({ center }, { extra, signal }) => {
  const centerDayKey = planDayKey(center)
  try {
    const events = await fetchPlanHostRange(
      planHostsFor(extra),
      planPreloadWindow(center),
      { signal },
    )
    return ok({ centerDayKey, events })
  } catch (error) {
    // The window is left as-is (last-good-value); only its own in-flight
    // marker settles, which is what keeps the activity control terminating.
    return err(
      PlanExceptions.preloadFailed(
        centerDayKey,
        planExceptionFrom(error).message,
      ),
    )
  }
})

/**
 * The matrix's own row set.
 *
 * Deliberately independent of the timeline's day-scoped read: the matrix is not
 * a day view, and canon keeps the two queries apart for the same reason —
 * *"the matrix must receive fresh Apple recurrence evidence on every visit."*
 * Rows arrive unreconciled; `selectPlanMatrixEndeavors` reconciles at the
 * presentation boundary, where canon reconciles.
 */
export const loadPlanMatrixThunk = createAsyncThunk<
  Result<readonly Endeavor[], PlanException>,
  void,
  { extra: ThunkExtra }
>('plan/onPlanMatrixLoadCompleted', async (_args, { extra }) => {
  try {
    const records = await extra.localStore.endeavors.all()
    return ok(endeavorsFromRecords(records))
  } catch (error) {
    return err(
      PlanExceptions.matrixLoadFailed(planExceptionFrom(error).message),
    )
  }
})

/**
 * Persist a committed timeline edit.
 *
 * The slice has already applied the new times optimistically — canon does the
 * same, and says why: *"local state was updated optimistically. On failure the
 * next background sync will restore the true state from the server."* So this
 * effect's job is only the write, and its failure is reported without rolling
 * the surface back under the user's finger.
 */
export const updateEventTimeThunk = createAsyncThunk<
  Result<Endeavor, PlanException>,
  {
    readonly endeavor: Endeavor
    readonly start: Date
    readonly end: Date
    readonly now: Date
  },
  { extra: ThunkExtra }
>(
  'plan/onEventTimeUpdateCompleted',
  async ({ endeavor, start, end, now }, { extra }) => {
    try {
      const durationSeconds = (end.getTime() - start.getTime()) / 1000
      const rescheduled = withRescheduled(endeavor, start, durationSeconds)
      await extra.localStore.endeavors.put(
        endeavorRecordFromEndeavor(rescheduled, { now }),
      )
      return ok(rescheduled)
    } catch (error) {
      return err(planExceptionFrom(error))
    }
  },
)

/**
 * The row deletion `.planDay`'s capability set declares.
 *
 * `.planDay` declares two row operations — Start Session on the leading edge
 * and **Delete** on the trailing one — and a declared binding that reaches
 * nothing is a control the user can press to no effect.
 *
 * The deletion is SOFT: `softDelete` is the same door Find's operation Producer
 * uses, so a row deleted from Plan and a row deleted from Find leave the store
 * in the same state (a tombstone the next sync can carry). It has no reducer
 * arm of its own — the Plan slice's arrays are owned by `loadPlanDayThunk` and
 * `loadPlanMatrixThunk`, and re-reading them is both the smaller change and the
 * one that cannot leave the two arrays disagreeing about what still exists.
 * `PlanPage` does that re-read on success.
 *
 * It lived under `pages/list/PlanListProducer.ts` until KC-IS-#71 item 23,
 * because this file was a closed lane while KC-IS-#20 was in flight.
 */

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

/**
 * The flags the Plan surface caches at `onViewLoaded` (KC-IS-#71 item 22).
 *
 * `onViewLoaded` takes them as arguments — deliberately, so capability gating
 * stays a pure Selector read and no Selector ever reaches for a flag Service.
 * That leaves somebody to *supply* them, and a Page cannot: a Service reaches a
 * Producer through `extra` and nowhere else (`RC-6`). So this is that Producer,
 * and it is the same shape Find's `resolveCapabilityFlagsThunk` already has.
 *
 * Until now the Page passed literals — `isQuickEventCreationEnabled: true` and,
 * through `selectPlanRowCapabilities`, a `() => false` baseline — so the two
 * gates answered the same way whatever the registry said. `resolveEndeavorCapabilities`'
 * own doc sanctions the `() => false` call shape *"until it lands"*; this is it
 * landing.
 *
 * ## No reducer arm, on purpose
 *
 * Nothing handles this thunk's three lifecycle actions: the values' only
 * consumer is the `onViewLoaded` payload the Page assembles from them. Adding
 * arms would put the flag list in `State` twice, and the second copy is the one
 * that goes stale.
 *
 * ## A flag read that fails resolves to "nothing enabled"
 *
 * A capability whose flag cannot be resolved is simply not offered, which is
 * the safe direction: the surface renders without the dark-launched gesture
 * rather than refusing to render.
 */

/**
 * The flags a `.planDay` binding can wait on.
 *
 * One entry today — `endeavorDetail`, the flag the registry's `viewDetail` tap
 * binding declares. A list rather than a boolean because
 * `EndeavorCapabilities.requires` is a flag *name*.
 */
export const PLAN_CAPABILITY_FLAGS = [FeatureFlags.endeavorDetail] as const

/** What `onViewLoaded` needs resolved before the surface installs its vista. */
export interface PlanResolvedFlags {
  readonly isQuickEventCreationEnabled: boolean
  readonly enabledCapabilityFlags: readonly string[]
}

export const resolvePlanFlagsThunk = createAsyncThunk<
  Result<PlanResolvedFlags, PlanException>,
  void,
  { extra: ThunkExtra }
>('plan/onPlanFlagsResolved', async (_unused, { extra }) => {
  try {
    return ok({
      isQuickEventCreationEnabled: extra.featureFlags.isEnabled(
        FeatureFlags.timelineQuickEventCreation,
      ),
      enabledCapabilityFlags: PLAN_CAPABILITY_FLAGS.filter((flag) =>
        extra.featureFlags.isEnabled(flag),
      ).map((flag) => flag.name),
    })
  } catch {
    // See the header: an unreadable flag hides its capability, it never breaks
    // the surface that was going to offer it.
    return ok({
      isQuickEventCreationEnabled: false,
      enabledCapabilityFlags: [],
    })
  }
})
