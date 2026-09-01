/**
 * The `endeavorDetail` flag read, through the `stubbedFeatureFlagService` the
 * store already injects (`RC-54`: a Producer is exercised against a stubbed
 * Service in `extra`, never a mocked global).
 */
import { FeatureFlags } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { makeStore, stubbedThunkExtra } from '../../../../library/store'
import { resolveTriageEditReachabilityThunk } from '../TriageCapabilitiesProducer'

const storeWithFlags = (isEnabled: (flag: { name: string }) => boolean) =>
  makeStore({
    ...stubbedThunkExtra,
    featureFlags: {
      ...stubbedThunkExtra.featureFlags,
      isEnabled: isEnabled as typeof stubbedThunkExtra.featureFlags.isEnabled,
    },
  })

describe('whether Triage may offer its inline Edit affordance', () => {
  it('is not reachable under the shipped statusQuo set', async () => {
    // `endeavorDetail` is a disabled assignment in `FeatureFlagAssignments`, so
    // the shipped configuration answers false without anything stubbing it.
    const store = makeStore(stubbedThunkExtra)
    const action = await store.dispatch(resolveTriageEditReachabilityThunk())
    const result = resolveTriageEditReachabilityThunk.fulfilled.match(action)
      ? action.payload
      : null

    expect(result?.ok).toBe(true)
    expect(result?.ok === true && result.value).toBe(false)
  })

  it('is reachable once the dark launch flips the flag on', async () => {
    const store = storeWithFlags(
      (flag) => flag.name === FeatureFlags.endeavorDetail.name,
    )
    const action = await store.dispatch(resolveTriageEditReachabilityThunk())
    const result = resolveTriageEditReachabilityThunk.fulfilled.match(action)
      ? action.payload
      : null

    expect(result?.ok === true && result.value).toBe(true)
  })

  it('hides the affordance rather than failing when the flag cannot be read', async () => {
    const store = storeWithFlags(() => {
      throw new Error('flag store unavailable')
    })
    const action = await store.dispatch(resolveTriageEditReachabilityThunk())
    const result = resolveTriageEditReachabilityThunk.fulfilled.match(action)
      ? action.payload
      : null

    // Never `.rejected`: a Producer resolves a Result (`RC-7`).
    expect(resolveTriageEditReachabilityThunk.rejected.match(action)).toBe(
      false,
    )
    expect(result?.ok === true && result.value).toBe(false)
  })
})
