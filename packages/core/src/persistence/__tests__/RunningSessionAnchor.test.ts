import { describe, expect, it } from 'vitest'
import { FocusTimerMode } from '../../domain/session/FocusTimerMode'
import {
  PersistedSessionPhase,
  isRunningSessionConsistent,
  runningSessionElapsedDuration,
  runningSessionRemainingDuration,
} from '../../domain/session/PersistedRunningSession'
import {
  allPersistedRunningSessionMocks,
  persistedRunningSessionMocks,
} from '../../domain/session/__mocks__/PersistedRunningSession.mocks'
import {
  RUNNING_SESSION_ANCHOR_KEY,
  decodeRunningSessionAnchor,
  encodeRunningSessionAnchor,
} from '../RunningSessionAnchor'
import { isPreferenceStorageKey } from '../../settings/KeyValueStore'

/** What actually happens on a reload: serialize, throw the object away, parse. */
const throughStorage = (
  session: Parameters<typeof encodeRunningSessionAnchor>[0],
) =>
  decodeRunningSessionAnchor(
    JSON.parse(JSON.stringify(encodeRunningSessionAnchor(session))) as unknown,
  )

const consistentMocks = allPersistedRunningSessionMocks.filter(
  isRunningSessionConsistent,
)

/**
 * Round-trip, insisting the anchor decodes. A non-null assertion would silence
 * a real regression: a decode that starts answering `null` would make every
 * duration assertion below throw on a nullish read rather than say what broke.
 */
const restoredFrom = (
  session: Parameters<typeof encodeRunningSessionAnchor>[0],
) => {
  const restored = throughStorage(session)
  if (restored === null) throw new Error('the anchor failed to decode')
  return restored
}

describe('the anchor survives a reload', () => {
  it.each(consistentMocks.map((mock, index) => [index, mock] as const))(
    'restores fixture %i field for field after a full JSON round-trip',
    (_index, session) => {
      expect(throughStorage(session)).toEqual(session)
    },
  )

  it('restores fragment instants as real Dates, not as ISO strings', () => {
    // The failure this encoding exists to prevent: a plain JSON.stringify of a
    // Date comes back as a string, and every duration derived from it is NaN.
    const restored = throughStorage(
      persistedRunningSessionMocks.pausedAfterTwoRuns,
    )
    expect(restored?.fragments[0]?.start).toBeInstanceOf(Date)
  })

  it('recomputes the SAME elapsed duration after the round-trip', () => {
    const now = new Date(2026, 0, 15, 9, 40, 0)
    const original = persistedRunningSessionMocks.runningPomodoro
    expect(runningSessionElapsedDuration(restoredFrom(original), now)).toBe(
      runningSessionElapsedDuration(original, now),
    )
  })

  it('recomputes the SAME remaining duration after the round-trip', () => {
    const now = new Date(2026, 0, 15, 9, 40, 0)
    const original = persistedRunningSessionMocks.runningPomodoro
    expect(runningSessionRemainingDuration(restoredFrom(original), now)).toBe(
      runningSessionRemainingDuration(original, now),
    )
  })

  it('a paused session stays frozen however long the reload took', () => {
    const restored = restoredFrom(
      persistedRunningSessionMocks.pausedAfterTwoRuns,
    )
    const soon = new Date(2026, 0, 15, 9, 40, 0)
    const muchLater = new Date(2026, 0, 16, 9, 40, 0)
    expect(runningSessionElapsedDuration(restored, soon)).toBe(
      runningSessionElapsedDuration(restored, muchLater),
    )
  })

  it('a running session keeps accruing against wall clock across the reload', () => {
    const restored = restoredFrom(persistedRunningSessionMocks.runningPomodoro)
    const earlier = new Date(2026, 0, 15, 9, 30, 0)
    const later = new Date(2026, 0, 15, 9, 40, 0)
    expect(runningSessionElapsedDuration(restored, later)).toBeGreaterThan(
      runningSessionElapsedDuration(restored, earlier),
    )
  })

  it('preserves the phase, including `concluded`', () => {
    expect(
      throughStorage(persistedRunningSessionMocks.concludedAwaitingChoice)
        ?.phase,
    ).toBe(PersistedSessionPhase.concluded)
  })

  it('preserves the timer mode', () => {
    expect(
      throughStorage(persistedRunningSessionMocks.runningStopwatch)?.mode,
    ).toBe(FocusTimerMode.stopwatch)
  })
})

describe('a document that does not describe a resumable session reads as null', () => {
  it('rejects a non-object', () => {
    expect(decodeRunningSessionAnchor('runningSession.json')).toBeNull()
    expect(decodeRunningSessionAnchor(null)).toBeNull()
    expect(decodeRunningSessionAnchor([])).toBeNull()
  })

  it('rejects a document with no endeavor', () => {
    const stored = encodeRunningSessionAnchor(
      persistedRunningSessionMocks.runningPomodoro,
    )
    expect(
      decodeRunningSessionAnchor({ ...stored, endeavor: undefined }),
    ).toBeNull()
  })

  it('rejects an unrecognised phase rather than defaulting to `running`', () => {
    const stored = encodeRunningSessionAnchor(
      persistedRunningSessionMocks.runningPomodoro,
    )
    expect(decodeRunningSessionAnchor({ ...stored, phase: 'ready' })).toBeNull()
  })

  it('rejects an unrecognised timer mode', () => {
    const stored = encodeRunningSessionAnchor(
      persistedRunningSessionMocks.runningPomodoro,
    )
    expect(
      decodeRunningSessionAnchor({ ...stored, mode: 'hourglass' }),
    ).toBeNull()
  })

  it('rejects the WHOLE anchor on one bad fragment, never a partial sum', () => {
    // Dropping the bad fragment would produce a session short by exactly the
    // period the user cannot see.
    const stored = encodeRunningSessionAnchor(
      persistedRunningSessionMocks.pausedAfterTwoRuns,
    )
    expect(
      decodeRunningSessionAnchor({
        ...stored,
        fragments: [{ start: 'yesterday', end: null }, ...stored.fragments],
      }),
    ).toBeNull()
  })

  it('rejects a paused session carrying an open fragment (#8`s invariant)', () => {
    const stored = encodeRunningSessionAnchor(
      persistedRunningSessionMocks.corruptPausedWithOpenFragment,
    )
    expect(decodeRunningSessionAnchor(stored)).toBeNull()
  })

  it('rejects two open fragments at once (#8`s other invariant)', () => {
    const stored = encodeRunningSessionAnchor(
      persistedRunningSessionMocks.corruptTwoOpenFragments,
    )
    expect(decodeRunningSessionAnchor(stored)).toBeNull()
  })

  it('rejects a non-numeric targetDuration', () => {
    const stored = encodeRunningSessionAnchor(
      persistedRunningSessionMocks.runningPomodoro,
    )
    expect(
      decodeRunningSessionAnchor({ ...stored, targetDuration: '25m' }),
    ).toBeNull()
  })
})

describe('where the anchor is stored', () => {
  it('sits inside the `kro:` namespace, so sign-out takes it', () => {
    expect(isPreferenceStorageKey(RUNNING_SESSION_ANCHOR_KEY)).toBe(true)
  })

  it('is one key — the single-document contract canon`s file mechanism gives', () => {
    expect(RUNNING_SESSION_ANCHOR_KEY).toBe('kro:session.running')
  })
})
