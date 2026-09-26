/**
 * Integrity of the session-config fixture spread. `RC-13` owes seven variants;
 * the awkward ones are asserted individually, because a tidy-up is exactly
 * what would remove them.
 */
import { describe, expect, it } from 'vitest'
import {
  allPerformSessionConfigMocks,
  performSessionConfigMocks,
} from '../PerformSessionConfig.mocks'

describe('performSessionConfigMocks', () => {
  it('carries at least the seven variants RC-13 requires', () => {
    expect(allPerformSessionConfigMocks.length).toBeGreaterThanOrEqual(7)
  })

  it('covers both modes, so a marker row can be drawn from either', () => {
    const modes = new Set(
      allPerformSessionConfigMocks.map((config) => config.mode),
    )
    expect(modes.has('countdown')).toBe(true)
    expect(modes.has('stopwatch')).toBe(true)
  })

  it('keeps the inconvenient titles and durations', () => {
    expect(performSessionConfigMocks.emptyTitle.title).toBe('')
    expect(performSessionConfigMocks.zeroDuration.duration).toBe(0)
    expect(performSessionConfigMocks.nonAsciiTitle.title).not.toMatch(
      /^[\x20-\x7e]*$/,
    )
  })
})
