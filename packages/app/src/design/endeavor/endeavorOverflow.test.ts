/**
 * The overflow menu's routing rule.
 *
 * This is where the "an overflow entry is a shortcut to the flow, never past
 * it" invariant is asserted. It lives in a pure unit rather than in a click on
 * the menu because the menu is a Radix dropdown, and mounting a Radix popper
 * under jsdom costs 5–12 seconds — the measurement is in
 * `system/primitives/__tests__/radixEnvironment.tsx`. The dispatcher under test
 * is the same one the menu's items call, so the rule is asserted where it is
 * decided.
 */

import { describe, expect, it, vi } from 'vitest'
import {
  OVERFLOW_ACTIONS,
  type OverflowFlow,
  overflowFlowFor,
  selectOverflowAction,
} from './endeavorOverflow'

function handlers() {
  return {
    openFlow: vi.fn<(flow: OverflowFlow) => void>(),
    skip: vi.fn(),
    delegate: vi.fn(),
    showDetails: vi.fn(),
  }
}

describe('overflowFlowFor', () => {
  it('sends Defer to the picker — the menu never decides the time for the user', () => {
    expect(overflowFlowFor('defer')).toBe('defer')
  })

  it('sends Delete to the confirmation — canon warns it cannot be undone', () => {
    expect(overflowFlowFor('delete')).toBe('delete')
  })

  it('leaves the one-step intents alone — Skip fires directly on every surface', () => {
    expect(overflowFlowFor('skip')).toBeNull()
    expect(overflowFlowFor('delegate')).toBeNull()
    expect(overflowFlowFor('details')).toBeNull()
  })

  it('answers for every entry the menu draws, so none can be added unrouted', () => {
    for (const action of OVERFLOW_ACTIONS) {
      expect(() => overflowFlowFor(action), action).not.toThrow()
    }
  })
})

describe('selectOverflowAction', () => {
  it('OPENS the defer flow rather than deferring — the regression this file exists for', () => {
    const spies = handlers()

    selectOverflowAction('defer', spies)

    expect(spies.openFlow).toHaveBeenCalledWith('defer')
    // There is no `defer` handler to call: the dispatcher cannot see one.
    expect(spies.skip).not.toHaveBeenCalled()
  })

  it('OPENS the delete confirmation rather than deleting', () => {
    const spies = handlers()

    selectOverflowAction('delete', spies)

    expect(spies.openFlow).toHaveBeenCalledWith('delete')
  })

  it('raises Skip, Delegate and Details immediately, opening nothing', () => {
    const spies = handlers()

    selectOverflowAction('skip', spies)
    selectOverflowAction('delegate', spies)
    selectOverflowAction('details', spies)

    expect(spies.skip).toHaveBeenCalledOnce()
    expect(spies.delegate).toHaveBeenCalledOnce()
    expect(spies.showDetails).toHaveBeenCalledOnce()
    expect(spies.openFlow).not.toHaveBeenCalled()
  })

  it('is a no-op when a surface does not offer that intent — never a crash', () => {
    const openFlow = vi.fn<(flow: OverflowFlow) => void>()

    expect(() => selectOverflowAction('delegate', { openFlow })).not.toThrow()
    expect(openFlow).not.toHaveBeenCalled()
  })

  it('routes exactly one thing per entry, for every entry the menu draws', () => {
    for (const action of OVERFLOW_ACTIONS) {
      const spies = handlers()
      selectOverflowAction(action, spies)

      const calls =
        spies.openFlow.mock.calls.length +
        spies.skip.mock.calls.length +
        spies.delegate.mock.calls.length +
        spies.showDetails.mock.calls.length
      expect(calls, action).toBe(1)
    }
  })
})
