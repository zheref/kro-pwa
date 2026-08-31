import { describe, expect, it } from 'vitest'
import { focusSessionFragmentDuration } from '../../FocusSessionFragment'
import {
  SESSION_MOCK_NOW,
  allFocusSessionFragmentMocks,
  focusSessionFragmentMocks,
} from '../FocusSessionFragment.mocks'

describe('the FocusSessionFragment mock spread', () => {
  it('offers at least the seven RC-13 variants', () => {
    expect(allFocusSessionFragmentMocks.length).toBeGreaterThanOrEqual(7)
  })

  it('includes both open and closed fragments', () => {
    const open = allFocusSessionFragmentMocks.filter(
      (fragment) => fragment.end === null,
    )
    expect(open.length).toBeGreaterThan(0)
    expect(open.length).toBeLessThan(allFocusSessionFragmentMocks.length)
  })

  it('anchors every fragment to SESSION_MOCK_NOW rather than the wall clock', () => {
    // A fixture built from `new Date()` would drift with the calendar and make
    // an elapsed assertion pass today and fail tomorrow.
    const anchor = SESSION_MOCK_NOW.getTime()
    for (const fragment of allFocusSessionFragmentMocks) {
      expect(Math.abs(fragment.start.getTime() - anchor)).toBeLessThanOrEqual(
        24 * 60 * 60 * 1000,
      )
    }
  })

  it('includes a zero-length fragment, which must contribute exactly nothing', () => {
    expect(
      focusSessionFragmentDuration(
        focusSessionFragmentMocks.zeroLength,
        SESSION_MOCK_NOW,
      ),
    ).toBe(0)
  })

  it('includes a fractional-second fragment, since seconds are not integers', () => {
    expect(
      focusSessionFragmentDuration(
        focusSessionFragmentMocks.subSecond,
        SESSION_MOCK_NOW,
      ),
    ).toBe(0.5)
  })

  it('includes an inverted fragment whose span is negative', () => {
    expect(
      focusSessionFragmentDuration(
        focusSessionFragmentMocks.inverted,
        SESSION_MOCK_NOW,
      ),
    ).toBeLessThan(0)
  })

  it('includes a multi-hour open fragment, the overnight shape', () => {
    expect(
      focusSessionFragmentDuration(
        focusSessionFragmentMocks.overnight,
        SESSION_MOCK_NOW,
      ),
    ).toBe(8 * 60 * 60)
  })
})
