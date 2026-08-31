import { describe, expect, it } from 'vitest'
import { sessionSummaryEnd, sessionSummaryStart } from '../../SessionSummary'
import {
  allSessionSummaryMocks,
  sessionSummaryMocks,
} from '../SessionSummary.mocks'

describe('the SessionSummary mock spread', () => {
  it('offers at least the seven RC-13 variants', () => {
    expect(allSessionSummaryMocks.length).toBeGreaterThanOrEqual(7)
  })

  it('gives every fixture a distinct id, since this tier mints none', () => {
    const ids = allSessionSummaryMocks.map((summary) => summary.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes a summary with no fragments — the quick-complete shape', () => {
    const quick = sessionSummaryMocks.quickComplete
    expect(quick.fragments).toEqual([])
    expect(sessionSummaryStart(quick)).toBeNull()
    expect(sessionSummaryEnd(quick)).toBeNull()
  })

  it('includes a summary whose trailing fragment is still open', () => {
    const open = sessionSummaryMocks.trailingOpenFragment
    expect(sessionSummaryStart(open)).not.toBeNull()
    expect(sessionSummaryEnd(open)).toBeNull()
  })

  it('includes a summary whose focus total is less than its wall-clock span', () => {
    const paused = sessionSummaryMocks.pausedInTheMiddle
    const start = sessionSummaryStart(paused)
    const end = sessionSummaryEnd(paused)
    expect(start).not.toBeNull()
    expect(end).not.toBeNull()
    const span = ((end as Date).getTime() - (start as Date).getTime()) / 1000
    expect(paused.duration).toBeLessThan(span)
  })

  it('includes an empty intention and a long non-ASCII one', () => {
    expect(sessionSummaryMocks.blankIntention.intention).toBe('')
    expect(sessionSummaryMocks.choppyUnicode.intention.length).toBeGreaterThan(
      30,
    )
  })

  it('includes a summary made of many short fragments', () => {
    expect(sessionSummaryMocks.choppyUnicode.fragments.length).toBeGreaterThan(
      3,
    )
  })
})
