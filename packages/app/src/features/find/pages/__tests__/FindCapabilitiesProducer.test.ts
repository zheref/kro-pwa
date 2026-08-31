/**
 * The flag read, driven through the real thunk against a stubbed
 * `FeatureFlagService` injected via `extra` — never a mocked module (`RC-54`,
 * `RC-35`).
 */
import {
  FeatureFlags,
  enabledAssignment,
  makeHardcodedFeatureFlagService,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { makeStore, stubbedThunkExtra } from '../../../../library/store'
import { resolveCapabilityFlagsThunk } from '../FindCapabilitiesProducer'

const storeWithFlags = (
  featureFlags = stubbedThunkExtra.featureFlags,
) => makeStore({ ...stubbedThunkExtra, featureFlags })

describe('resolveCapabilityFlagsThunk', () => {
  it('reports nothing enabled on the shipping baseline — endeavorDetail is dark-launched', async () => {
    const store = storeWithFlags()

    const action = await store.dispatch(resolveCapabilityFlagsThunk())

    expect(resolveCapabilityFlagsThunk.fulfilled.match(action)).toBe(true)
    const result = action.payload
    expect(result).toEqual({ ok: true, value: [] })
  })

  it('reports the flag name once a tester has enabled endeavorDetail', async () => {
    const store = storeWithFlags(
      makeHardcodedFeatureFlagService({
        overrides: [enabledAssignment(FeatureFlags.endeavorDetail)],
      }),
    )

    const action = await store.dispatch(resolveCapabilityFlagsThunk())

    expect(action.payload).toEqual({ ok: true, value: ['endeavorDetail'] })
  })

  it('degrades to "nothing enabled" when the flag service throws, rather than failing the surface', async () => {
    const store = storeWithFlags({
      ...stubbedThunkExtra.featureFlags,
      isEnabled: () => {
        throw new Error('flag store unavailable')
      },
    })

    const action = await store.dispatch(resolveCapabilityFlagsThunk())

    expect(action.payload).toEqual({ ok: true, value: [] })
  })

  it('feeds the surface exactly the shape `enabledFlags` holds — plain names', async () => {
    const store = storeWithFlags(
      makeHardcodedFeatureFlagService({
        overrides: [enabledAssignment(FeatureFlags.endeavorDetail)],
      }),
    )

    const action = await store.dispatch(resolveCapabilityFlagsThunk())

    expect(resolveCapabilityFlagsThunk.fulfilled.match(action)).toBe(true)
    if (!resolveCapabilityFlagsThunk.fulfilled.match(action)) return
    const result = action.payload
    expect(result.ok).toBe(true)
    if (result.ok) {
      for (const name of result.value) expect(typeof name).toBe('string')
    }
  })
})
