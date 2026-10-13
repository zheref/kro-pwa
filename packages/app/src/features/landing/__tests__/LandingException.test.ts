import { describe, expect, it } from 'vitest'
import { LandingExceptions } from '../LandingException'

describe('LandingExceptions', () => {
  it('analyticsUnavailable is recoverable and says analytics is why', () => {
    const e = LandingExceptions.analyticsUnavailable()
    expect(e.kind).toBe('analyticsUnavailable')
    expect(e.recoverable).toBe(true)
    expect(e.message).toMatch(/analytics/i)
  })

  it('themeUnavailable is recoverable and says the preference was not saved', () => {
    const e = LandingExceptions.themeUnavailable()
    expect(e.kind).toBe('themeUnavailable')
    expect(e.recoverable).toBe(true)
    expect(e.message).toMatch(/theme/i)
  })

  it('the two kinds are distinct, so a switch can tell them apart', () => {
    expect(LandingExceptions.analyticsUnavailable().kind).not.toBe(
      LandingExceptions.themeUnavailable().kind,
    )
  })
})
