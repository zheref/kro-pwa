import { describe, expect, it } from 'vitest'
import { assertNever } from '../assertNever'

type Signal = { kind: 'start' } | { kind: 'stop' }

/** Stand-in for a real `switch` over a sealed union, closed by `assertNever`. */
function describeSignal(signal: Signal): string {
  switch (signal.kind) {
    case 'start':
      return 'started'
    case 'stop':
      return 'stopped'
    default:
      return assertNever(signal)
  }
}

describe('assertNever', () => {
  it('never runs while every union member is handled — the normal path', () => {
    expect(describeSignal({ kind: 'start' })).toBe('started')
    expect(describeSignal({ kind: 'stop' })).toBe('stopped')
  })

  it('throws when a value outside the union reaches the default arm — a stale payload from an older build', () => {
    const rogue = { kind: 'pause' } as unknown as Signal

    expect(() => describeSignal(rogue)).toThrow(/Unhandled discriminated-union case/)
  })

  it('names the offending value so the log says which member was missed', () => {
    const rogue = { kind: 'pause' } as unknown as Signal

    expect(() => describeSignal(rogue)).toThrow(/"kind":"pause"/)
  })
})
