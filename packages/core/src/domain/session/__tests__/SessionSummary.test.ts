import { describe, expect, it } from 'vitest'
import { minutesInSeconds } from '../../shared/TimeInterval'
import {
  makeSessionSummary,
  sessionSummaryEnd,
  sessionSummaryStart,
} from '../SessionSummary'
import { SESSION_MOCK_NOW } from '../__mocks__/FocusSessionFragment.mocks'
import { sessionSummaryMocks } from '../__mocks__/SessionSummary.mocks'

const at = (offsetSeconds: number): Date =>
  new Date(SESSION_MOCK_NOW.getTime() + offsetSeconds * 1000)

describe('building a summary', () => {
  it('takes the id from the caller, since this tier mints no identity', () => {
    expect(
      makeSessionSummary({
        id: 'summary-1',
        intention: 'Ship it',
        duration: 60,
      }).id,
    ).toBe('summary-1')
  })

  it('defaults to no fragments — the quick-complete shape', () => {
    expect(
      makeSessionSummary({ id: 's', intention: 'Reply', duration: 0 })
        .fragments,
    ).toEqual([])
  })

  it('keeps duration as the focus total, independent of the fragments handed in', () => {
    // 20 minutes of focus across 40 minutes of wall time: the two differ on
    // purpose, and the summary reports the focus figure.
    const summary = sessionSummaryMocks.pausedInTheMiddle
    expect(summary.duration).toBe(minutesInSeconds(20))
    expect(summary.fragments).toHaveLength(2)
  })
})

describe('when a summarised session began', () => {
  it('is the first fragment’s start for a single-fragment run', () => {
    expect(sessionSummaryStart(sessionSummaryMocks.unbrokenPomodoro)).toEqual(
      at(-1500),
    )
  })

  it('is the *first* fragment’s start when the session was paused midway', () => {
    expect(sessionSummaryStart(sessionSummaryMocks.pausedInTheMiddle)).toEqual(
      at(-2400),
    )
  })

  it('is null when nothing was ever run', () => {
    expect(sessionSummaryStart(sessionSummaryMocks.quickComplete)).toBeNull()
  })
})

describe('when a summarised session ended', () => {
  it('is the last fragment’s end for a completed run', () => {
    expect(sessionSummaryEnd(sessionSummaryMocks.unbrokenPomodoro)).toEqual(
      at(0),
    )
  })

  it('is the *last* fragment’s end across several fragments', () => {
    expect(sessionSummaryEnd(sessionSummaryMocks.longStopwatch)).toEqual(at(0))
  })

  it('is null when nothing was ever run', () => {
    expect(sessionSummaryEnd(sessionSummaryMocks.quickComplete)).toBeNull()
  })

  it('is null while the trailing fragment is still open, though the start is not', () => {
    const summary = sessionSummaryMocks.trailingOpenFragment
    expect(sessionSummaryStart(summary)).toEqual(at(-1200))
    expect(sessionSummaryEnd(summary)).toBeNull()
  })
})
