/**
 * A fragment's session configuration, written and read in canon's Swift
 * `Codable` shape — `SessionConfig` with its `SessionTimerMode` as a keyed
 * container (`{"countdown":{}}`), `rest` omitted when absent.
 */
import { describe, expect, it } from 'vitest'
import {
  type Perform,
  PerformResolution,
  makePerform,
  makePerformFragment,
  performSessionMode,
} from '../../domain/endeavor/Perform'
import {
  decodePerformFragment,
  decodeSessionConfig,
  decodeSessionFragmentsJson,
  encodePerformFragment,
  encodeSessionConfig,
  encodeSessionFragmentsJson,
} from '../RecordEncodings'

const START = new Date('2026-09-24T14:00:00Z')
const END = new Date('2026-09-24T14:25:00Z')
const pomodoro = {
  title: 'Prepare slides',
  duration: 1500,
  rest: null,
  mode: 'countdown' as const,
}
const stopwatch = {
  title: 'Walk',
  duration: 0,
  rest: 300,
  mode: 'stopwatch' as const,
}

describe('encodeSessionConfig', () => {
  it("writes a countdown as Swift's keyed enum and omits an absent rest", () => {
    expect(encodeSessionConfig(pomodoro)).toEqual({
      title: 'Prepare slides',
      duration: 1500,
      mode: { countdown: {} },
    })
  })

  it('writes a stopwatch with its rest', () => {
    expect(encodeSessionConfig(stopwatch)).toEqual({
      title: 'Walk',
      duration: 0,
      rest: 300,
      mode: { stopwatch: {} },
    })
  })

  it('round-trips through decode unchanged', () => {
    expect(decodeSessionConfig(encodeSessionConfig(stopwatch))).toEqual(
      stopwatch,
    )
    expect(decodeSessionConfig(encodeSessionConfig(pomodoro))).toEqual(pomodoro)
  })
})

describe('decodeSessionConfig', () => {
  it('reads a config canon wrote, defaulting a missing mode to countdown', () => {
    expect(decodeSessionConfig({ title: 'Read', duration: 600 })).toEqual({
      title: 'Read',
      duration: 600,
      rest: null,
      mode: 'countdown',
    })
  })

  it('rejects what is not a config — no title, a bad duration, an unknown mode', () => {
    expect(decodeSessionConfig({ duration: 600 })).toBeNull()
    expect(decodeSessionConfig({ title: 'x', duration: '600' })).toBeNull()
    expect(
      decodeSessionConfig({ title: 'x', duration: 1, mode: { lap: {} } }),
    ).toBeNull()
    expect(
      decodeSessionConfig({ title: 'x', duration: 1, mode: 'countdown' }),
    ).toBeNull()
  })

  it('reads nothing from nothing', () => {
    expect(decodeSessionConfig(undefined)).toBeNull()
    expect(decodeSessionConfig(null)).toBeNull()
    expect(decodeSessionConfig([])).toBeNull()
  })
})

describe('a fragment carries its configuration through the JSON column', () => {
  it('keeps the configuration of a recorded pomodoro', () => {
    const fragment = makePerformFragment({
      startedAt: START,
      endedAt: END,
      configuration: pomodoro,
    })
    const [decoded] = decodeSessionFragmentsJson(
      encodeSessionFragmentsJson([fragment]),
    )
    expect(decoded?.configuration).toEqual(pomodoro)
  })

  it('writes no configuration key for a fragment without one — the old shape', () => {
    const fragment = makePerformFragment({ startedAt: START, endedAt: END })
    expect(encodePerformFragment(fragment)).not.toHaveProperty('configuration')
    expect(fragment).not.toHaveProperty('configuration')
  })

  it('reads an old fragment (no configuration) as it always did', () => {
    const decoded = decodePerformFragment({ startedAt: 780_000_000 })
    expect(decoded?.endedAt).toBeNull()
    expect(decoded).not.toHaveProperty('configuration')
  })
})

describe('performSessionMode', () => {
  const performed = (mode: 'countdown' | 'stopwatch' | null): Perform =>
    makePerform({
      date: START,
      duration: 1500,
      resolution: PerformResolution.complete,
      sessionFragments: [
        makePerformFragment({
          startedAt: START,
          endedAt: END,
          configuration: mode === null ? null : { ...pomodoro, mode },
        }),
      ],
    })

  it("reads a pomodoro from the first fragment's configuration", () => {
    expect(performSessionMode(performed('countdown'))).toBe('countdown')
  })

  it('reads a stopwatch', () => {
    expect(performSessionMode(performed('stopwatch'))).toBe('stopwatch')
  })

  it('is unknown without a configuration, or without fragments at all', () => {
    expect(performSessionMode(performed(null))).toBeNull()
    expect(
      performSessionMode(
        makePerform({
          date: START,
          duration: 0,
          resolution: PerformResolution.finished,
        }),
      ),
    ).toBeNull()
  })
})
