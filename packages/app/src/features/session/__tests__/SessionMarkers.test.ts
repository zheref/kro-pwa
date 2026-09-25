/**
 * The tomato row's markers — canon's one-per-recorded-session row
 * (`SessionSetupView`: 🍅 countdown, ⚡️ stopwatch, ⏱️ unknown).
 */
import {
  EndeavorHost,
  PerformResolution,
  makePerform,
  makePerformFragment,
  taskEndeavor,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import { makeStore, stubbedThunkExtra } from '../../../library/store'
import type { RootState } from '../../../library/store'
import { sessionStateMocks } from '../SessionMocks'
import { recordedSessionModesFor } from '../SessionProducer'
import { selectSessionMarkers, sessionModeMarker } from '../SessionSelectors'
import { withLaunchPrepared } from '../SessionShifters'
import type { SessionState } from '../SessionState'

const at = (hour: number) => new Date(2026, 8, 24, hour)
const performed = (
  hour: number,
  duration: number,
  mode: 'countdown' | 'stopwatch' | null,
) =>
  makePerform({
    date: at(hour),
    duration,
    resolution: PerformResolution.complete,
    sessionFragments: [
      makePerformFragment({
        startedAt: at(hour),
        endedAt: at(hour + 1),
        configuration:
          mode === null
            ? null
            : { title: 'Slides', duration, rest: null, mode },
      }),
    ],
  })

const withPerformances = (performances: ReturnType<typeof performed>[]) => ({
  ...taskEndeavor({ id: 'e-1', title: 'Slides', host: EndeavorHost.local }),
  performances,
})

const rootWith = (session: SessionState): RootState =>
  ({ ...makeStore(stubbedThunkExtra).getState(), session }) as RootState

describe('recordedSessionModesFor', () => {
  it('reads each recorded session’s mode, oldest first', () => {
    const endeavor = withPerformances([
      performed(15, 600, 'stopwatch'),
      performed(9, 1500, 'countdown'),
    ])
    expect(recordedSessionModesFor(endeavor)).toEqual([
      'countdown',
      'stopwatch',
    ])
  })

  it('skips sessions with no time on them, as canon does', () => {
    const endeavor = withPerformances([
      performed(9, 0, 'countdown'),
      performed(10, 1500, null),
    ])
    expect(recordedSessionModesFor(endeavor)).toEqual([null])
  })

  it('has nothing for no endeavor', () => {
    expect(recordedSessionModesFor(null)).toEqual([])
  })
})

describe('withLaunchPrepared carries the recorded modes', () => {
  it('installs them with the preparation', () => {
    expect(sessionStateMocks.readyWithHistory.recordedSessionModes).toEqual([
      'countdown',
      'stopwatch',
      null,
    ])
  })

  it('defaults to none when a preparation brings none', () => {
    expect(sessionStateMocks.ready.recordedSessionModes).toEqual([])
  })

  it('leaves a running session’s modes alone', () => {
    const running = sessionStateMocks.running
    const next = withLaunchPrepared(running, {
      identity: running.identity ?? sessionStateMocks.ready.identity!,
      recommendation: {
        mode: 'countdown',
        targetDuration: 1500,
        source: { kind: 'preferred' },
      },
      completedSessionsCount: 9,
      recordedSessionModes: ['stopwatch'],
    })
    expect(next).toBe(running)
  })
})

describe('selectSessionMarkers', () => {
  it('draws one marker per recorded session, by mode', () => {
    expect(
      selectSessionMarkers(rootWith(sessionStateMocks.readyWithHistory)),
    ).toEqual(['🍅', '⚡️', '⏱️'])
  })

  it('falls back to the completed count as 🍅 when modes are unknown', () => {
    // `ready` has three completed sessions and no recorded modes.
    expect(selectSessionMarkers(rootWith(sessionStateMocks.ready))).toEqual([
      '🍅',
      '🍅',
      '🍅',
    ])
  })

  it('keeps the count fallback as 🍅 when the toggle is flipped to stopwatch', () => {
    const flipped = sessionStateMocks.readyStopwatchSelected
    expect(flipped.mode).toBe('stopwatch')
    expect(selectSessionMarkers(rootWith(flipped))).toEqual(['🍅', '🍅', '🍅'])
  })

  it('draws the recorded modes regardless of the toggle', () => {
    expect(
      selectSessionMarkers(rootWith(sessionStateMocks.readyWithHistory)),
    ).toEqual(['🍅', '⚡️', '⏱️'])
    expect(sessionModeMarker(null)).toBe('⏱️')
  })

  it('draws nothing for an endeavor that has never been worked', () => {
    expect(
      selectSessionMarkers(rootWith(sessionStateMocks.readyFresh)),
    ).toEqual([])
  })
})
