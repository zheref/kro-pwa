/**
 * The early-access Producer (`RC-3`, `RC-6`, `RC-7`, `RC-25`).
 *
 * One thunk, one completion event. It reads the form from a narrow, named
 * `getState` read, validates before it spends a request, and never throws:
 * every outcome — joined, invalid, offline, already on the list, unavailable —
 * resolves a `Result`. The Service is reached only through `extra`; analytics
 * carries the platform and the failure kind, never the address.
 */
import {
  type EarlyAccessException,
  type EarlyAccessReceipt,
  EarlyAccessExceptions,
  EarlyAccessMapper,
  type Result,
  err,
  ok,
} from '@kro/core'
import { createAsyncThunk } from '@reduxjs/toolkit'
import type {
  AnalyticsEventName,
  AnalyticsProps,
  RootState,
  ThunkExtra,
} from '../../library/store'

/** Where on the site the sign-up came from, sent as the request's `source`. */
export const EARLY_ACCESS_SOURCE = 'landing'

/**
 * Count one event without ever letting the counter decide the sign-up: a
 * tracker that throws (blocked, broken) is swallowed, exactly as the landing
 * Producer does. A lost event is not a failed join (`RC-7`, `UZF-14`).
 */
const track = (
  extra: ThunkExtra,
  name: AnalyticsEventName,
  props: AnalyticsProps,
): void => {
  try {
    extra.analyticsService.track(name, props)
  } catch {
    // Analytics is best-effort by design.
  }
}

export const joinEarlyAccessThunk = createAsyncThunk<
  Result<EarlyAccessReceipt, EarlyAccessException>,
  void,
  { extra: ThunkExtra; state: RootState }
>(
  'earlyAccess/onJoinCompleted',
  async (_argument, { extra, getState, signal }) => {
    const { email, platform, website } = getState().earlyAccess
    const address = email.trim()

    // A filled honeypot is a bot. It is told it worked, nothing is sent, and
    // nothing is counted — the answer must not teach it anything.
    if (website.trim() !== '') {
      return ok({
        id: 'honeypot',
        email: address,
        platform,
        position: null,
        joinedAt: new Date(),
      })
    }

    track(extra, 'early_access_submit', {
      platform,
      source: EARLY_ACCESS_SOURCE,
    })

    if (!EarlyAccessMapper.isLikelyEmail(address)) {
      const exception = EarlyAccessExceptions.invalidEmail()
      track(extra, 'early_access_failed', {
        kind: exception.kind,
      })
      return err(exception)
    }

    try {
      const response = await extra.earlyAccessService.join(
        { email: address, platform, source: EARLY_ACCESS_SOURCE, locale: null },
        { signal },
      )
      const receipt = EarlyAccessMapper.toDomain(response)
      if (receipt === null) {
        const exception = EarlyAccessExceptions.unknown()
        track(extra, 'early_access_failed', {
          kind: exception.kind,
        })
        return err(exception)
      }
      track(extra, 'early_access_joined', {
        platform,
        hasPosition: receipt.position !== null,
      })
      return ok(receipt)
    } catch (error) {
      const exception = EarlyAccessMapper.toException(error)
      // An abort is the one silent exit: no event, and the slice ignores it.
      if (!signal.aborted) {
        track(extra, 'early_access_failed', {
          kind: exception.kind,
        })
      }
      return err(exception)
    }
  },
  {
    // A second press while a request is in flight is not a second request.
    condition: (_argument, { getState }) =>
      getState().earlyAccess.submit.kind !== 'submitting',
  },
)
