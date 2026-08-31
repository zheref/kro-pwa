import { describe, expect, it } from 'vitest'
import { MOCK_NOW } from '../../domain/endeavor/__mocks__/Endeavor.mocks'
import { allPerformMocks } from '../../domain/endeavor/__mocks__/EndeavorRelations.mocks'
import {
  PerformResolution,
  makePerform,
  makePerformFragment,
} from '../../domain/endeavor/Perform'
import { epochMillisFromDate } from '../EpochMillis'
import {
  QUICK_COMPLETE_NOTES,
  QUICK_COMPLETE_RESOLUTION,
  isQuickCompleteRecord,
  performFromRecord,
  performanceRecordFromPerform,
  performanceRecordKey,
} from '../PerformanceRecord'

const NOW_MILLIS = epochMillisFromDate(MOCK_NOW)

const recordFor = (
  value: Parameters<typeof performanceRecordFromPerform>[0],
  endeavorId = 'endeavor-1',
) => performanceRecordFromPerform(value, { endeavorId, nowMillis: NOW_MILLIS })

describe('performance round-trip — every #7 fixture, both directions', () => {
  it.each(allPerformMocks.map((mock, index) => [index, mock] as const))(
    'restores fixture %i field for field',
    (_index, value) => {
      expect(performFromRecord(recordFor(value))).toEqual(value)
    },
  )

  it('carries session fragments through the Apple-epoch JSON column', () => {
    const value = makePerform({
      date: MOCK_NOW,
      duration: 1500,
      resolution: PerformResolution.complete,
      sessionFragments: [
        makePerformFragment({
          startedAt: new Date(2026, 0, 15, 9, 0, 0),
          endedAt: new Date(2026, 0, 15, 9, 25, 0),
        }),
        makePerformFragment({
          startedAt: new Date(2026, 0, 15, 9, 30, 0),
          endedAt: null,
        }),
      ],
    })
    expect(performFromRecord(recordFor(value)).sessionFragments).toEqual(
      value.sessionFragments,
    )
  })

  it('restores all three resolutions verbatim — none is rewritten', () => {
    for (const resolution of Object.values(PerformResolution)) {
      const value = makePerform({ date: MOCK_NOW, duration: 60, resolution })
      expect(performFromRecord(recordFor(value)).resolution).toBe(resolution)
    }
  })

  it('reads an unknown resolution as `complete` — canon`s `?? .complete`', () => {
    const base = recordFor(
      makePerform({
        date: MOCK_NOW,
        duration: 60,
        resolution: PerformResolution.finished,
      }),
    )
    expect(
      performFromRecord({ ...base, resolution: 'transcended' }).resolution,
    ).toBe(PerformResolution.complete)
  })

  it('reads a null duration column as 0 — the domain`s duration is required', () => {
    const base = recordFor(
      makePerform({
        date: MOCK_NOW,
        duration: 900,
        resolution: PerformResolution.complete,
      }),
    )
    expect(performFromRecord({ ...base, durationSeconds: null }).duration).toBe(
      0,
    )
  })
})

describe('the quick-complete decision, routed on KC-IS-#10', () => {
  it('a WEB quick complete stores `finished`, per docs/Features/Performances.md', () => {
    expect(QUICK_COMPLETE_RESOLUTION).toBe(PerformResolution.finished)
  })

  it('never rewrites an APPLE quick complete on read — `complete` stays `complete`', () => {
    const appleRow = {
      ...recordFor(
        makePerform({
          date: MOCK_NOW,
          duration: 0,
          resolution: PerformResolution.complete,
          notes: QUICK_COMPLETE_NOTES,
          completedAt: MOCK_NOW,
        }),
      ),
    }
    expect(performFromRecord(appleRow).resolution).toBe(
      PerformResolution.complete,
    )
  })

  it('recognises the WEB encoding of a quick complete', () => {
    const webRow = recordFor(
      makePerform({
        date: MOCK_NOW,
        duration: 0,
        resolution: QUICK_COMPLETE_RESOLUTION,
        rewardPoints: 30,
        completedAt: MOCK_NOW,
      }),
    )
    expect(isQuickCompleteRecord(webRow)).toBe(true)
  })

  it('recognises the APPLE encoding — `complete` plus canon`s note', () => {
    const appleRow = recordFor(
      makePerform({
        date: MOCK_NOW,
        duration: 0,
        resolution: PerformResolution.complete,
        notes: QUICK_COMPLETE_NOTES,
        completedAt: MOCK_NOW,
      }),
    )
    expect(isQuickCompleteRecord(appleRow)).toBe(true)
  })

  it('does NOT mistake an ordinary zero-duration `complete` for a quick complete', () => {
    const ambiguous = recordFor(
      makePerform({
        date: MOCK_NOW,
        duration: 0,
        resolution: PerformResolution.complete,
        notes: 'Interrupted immediately',
      }),
    )
    expect(isQuickCompleteRecord(ambiguous)).toBe(false)
  })

  it('does not treat a real session as a quick complete', () => {
    const real = recordFor(
      makePerform({
        date: MOCK_NOW,
        duration: 1500,
        resolution: PerformResolution.finished,
        sessionFragments: [
          makePerformFragment({ startedAt: MOCK_NOW, endedAt: MOCK_NOW }),
        ],
      }),
    )
    expect(isQuickCompleteRecord(real)).toBe(false)
  })
})

describe('performanceRecordKey — canon`s nine-field match tuple', () => {
  const base = makePerform({
    date: new Date(2026, 0, 9, 18, 30, 0),
    duration: 1500,
    notes: 'Shortlist down to two',
    resolution: PerformResolution.complete,
    rewardPoints: 40,
  })

  it('gives one key to two rows differing only in their FRAGMENTS — so put updates', () => {
    // Canon's match tuple deliberately omits sessionFragments, which is what
    // lets `upsertLocalPerformance` rewrite them in place.
    const without = recordFor(base)
    const withFragments = recordFor({
      ...base,
      sessionFragments: [
        makePerformFragment({ startedAt: MOCK_NOW, endedAt: MOCK_NOW }),
      ],
    })
    expect(performanceRecordKey(without)).toBe(
      performanceRecordKey(withFragments),
    )
  })

  it('separates two sessions on the same task differing only in notes', () => {
    const other = recordFor({ ...base, notes: 'Different note' })
    expect(performanceRecordKey(recordFor(base))).not.toBe(
      performanceRecordKey(other),
    )
  })

  it('separates two performances that started at different moments', () => {
    const later = recordFor({ ...base, date: new Date(2026, 0, 9, 19, 0, 0) })
    expect(performanceRecordKey(recordFor(base))).not.toBe(
      performanceRecordKey(later),
    )
  })

  it('separates the same performance on two different endeavors', () => {
    expect(performanceRecordKey(recordFor(base, 'endeavor-1'))).not.toBe(
      performanceRecordKey(recordFor(base, 'endeavor-2')),
    )
  })

  it('separates two rows differing only in reward points', () => {
    expect(performanceRecordKey(recordFor(base))).not.toBe(
      performanceRecordKey(recordFor({ ...base, rewardPoints: 12 })),
    )
  })

  it('is stable across two calls on the same row', () => {
    const record = recordFor(base)
    expect(performanceRecordKey(record)).toBe(performanceRecordKey(record))
  })
})
