/**
 * The canned `PlatformState` variants — asserted so a later edit to the slice
 * cannot leave a mock describing a device that cannot exist.
 */
import { describe, expect, it } from 'vitest'
import { platformSlice } from '../PlatformFeature'
import { PlatformMocks } from '../PlatformMocks'

const allMocks = Object.values(PlatformMocks)

describe('PlatformMocks', () => {
  it("derives every variant from the slice's own initial state", () => {
    const keys = Object.keys(platformSlice.getInitialState()).sort()
    for (const mock of allMocks) {
      expect(Object.keys(mock).sort()).toEqual(keys)
    }
  })

  it('covers each lifecycle arm at least once', () => {
    const kinds = new Set(allMocks.map((mock) => mock.load.kind))
    expect([...kinds].sort()).toEqual(['failed', 'idle', 'loaded', 'loading'])
  })

  it('distinguishes never-asked from refused, which no surface may conflate', () => {
    expect(PlatformMocks.notAsked.notificationPermission).toBe('default')
    expect(PlatformMocks.blocked.notificationPermission).toBe('denied')
  })

  it('models the statusQuo shape: permission granted, gate still closed', () => {
    expect(PlatformMocks.gateOff.notificationPermission).toBe('granted')
    expect(PlatformMocks.gateOff.isOverdueAlertGateEnabled).toBe(false)
    expect(PlatformMocks.gateOff.pendingOverdueAlertIds).toEqual([])
  })

  it('never arms an alert without the gate that could have armed it', () => {
    for (const mock of allMocks) {
      if (mock.pendingOverdueAlertIds.length > 0) {
        expect(mock.isOverdueAlertGateEnabled).toBe(true)
      }
    }
  })

  it('includes a device with no vibrator, so that path is exercised', () => {
    expect(allMocks.some((mock) => mock.capabilities.vibration === false)).toBe(
      true,
    )
  })

  it('includes a running session holding the screen awake', () => {
    expect(PlatformMocks.screenAwake.isScreenAwakeRequested).toBe(true)
  })
})
