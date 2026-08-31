import { describe, expect, it } from 'vitest'
import { performFragmentDuration } from '../../endeavor/Perform'
import {
  closeFocusSessionFragment,
  focusSessionFragmentDuration,
  isFocusSessionFragmentCompleted,
  makeFocusSessionFragment,
  toPerformFragment,
} from '../FocusSessionFragment'
import {
  SESSION_MOCK_NOW,
  focusSessionFragmentMocks,
} from '../__mocks__/FocusSessionFragment.mocks'

const at = (offsetSeconds: number): Date =>
  new Date(SESSION_MOCK_NOW.getTime() + offsetSeconds * 1000)

describe('building a fragment', () => {
  it('opens with no end when a session starts', () => {
    const fragment = makeFocusSessionFragment({ start: at(0) })
    expect(fragment.end).toBeNull()
  })

  it('normalizes an omitted end to null rather than undefined', () => {
    expect(
      makeFocusSessionFragment({ start: at(0), end: undefined }).end,
    ).toBeNull()
  })

  it('keeps an explicit end when rebuilding a closed fragment from storage', () => {
    expect(
      makeFocusSessionFragment({ start: at(-60), end: at(0) }).end,
    ).toEqual(at(0))
  })
})

describe('whether a fragment has been closed', () => {
  it('says no while the user is still focusing', () => {
    expect(
      isFocusSessionFragmentCompleted(focusSessionFragmentMocks.running),
    ).toBe(false)
  })

  it('says yes once the user pauses', () => {
    expect(
      isFocusSessionFragmentCompleted(focusSessionFragmentMocks.fullPomodoro),
    ).toBe(true)
  })

  it('says yes for a zero-length fragment — closed is closed', () => {
    expect(
      isFocusSessionFragmentCompleted(focusSessionFragmentMocks.zeroLength),
    ).toBe(true)
  })
})

describe('measuring a fragment', () => {
  it('returns the real span of a closed fragment, ignoring now entirely', () => {
    const fragment = focusSessionFragmentMocks.fullPomodoro
    expect(focusSessionFragmentDuration(fragment, at(0))).toBe(1500)
    expect(focusSessionFragmentDuration(fragment, at(100_000))).toBe(1500)
  })

  it('measures an open fragment against now, which is what makes it anchored', () => {
    const fragment = focusSessionFragmentMocks.running
    expect(focusSessionFragmentDuration(fragment, at(0))).toBe(600)
    expect(focusSessionFragmentDuration(fragment, at(60))).toBe(660)
  })

  it('returns zero for a fragment opened and closed at the same instant', () => {
    expect(
      focusSessionFragmentDuration(focusSessionFragmentMocks.zeroLength, at(0)),
    ).toBe(0)
  })

  it('returns a fractional span for a sub-second fragment — seconds are not integers', () => {
    expect(
      focusSessionFragmentDuration(focusSessionFragmentMocks.subSecond, at(0)),
    ).toBe(0.5)
  })

  it('returns a negative span when a clock adjustment inverted the fragment', () => {
    expect(
      focusSessionFragmentDuration(focusSessionFragmentMocks.inverted, at(0)),
    ).toBe(-300)
  })

  it('returns a negative span for an open fragment whose now precedes its start', () => {
    expect(
      focusSessionFragmentDuration(focusSessionFragmentMocks.running, at(-900)),
    ).toBe(-300)
  })
})

describe('closing a fragment', () => {
  it('stamps the end on an open fragment', () => {
    const closed = closeFocusSessionFragment(
      focusSessionFragmentMocks.running,
      at(0),
    )
    expect(closed.end).toEqual(at(0))
  })

  it('leaves an already-closed fragment untouched, so a double pause is a no-op', () => {
    const alreadyClosed = focusSessionFragmentMocks.fullPomodoro
    expect(closeFocusSessionFragment(alreadyClosed, at(9999))).toBe(
      alreadyClosed,
    )
  })

  it('never mutates the fragment it was handed', () => {
    const open = focusSessionFragmentMocks.running
    closeFocusSessionFragment(open, at(0))
    expect(open.end).toBeNull()
  })
})

describe('handing a fragment to a performance record', () => {
  it('renames start/end to startedAt/endedAt for a closed fragment', () => {
    const performFragment = toPerformFragment(
      focusSessionFragmentMocks.fullPomodoro,
    )
    expect(performFragment.startedAt).toEqual(at(-1500))
    expect(performFragment.endedAt).toEqual(at(0))
  })

  it('carries an open fragment across as endedAt null', () => {
    expect(
      toPerformFragment(focusSessionFragmentMocks.running).endedAt,
    ).toBeNull()
  })

  it('preserves the deliberate difference in how the two types answer “how long?”', () => {
    // The running-session fragment measures an open span against `now`; the
    // recorded one refuses to, because a record has no live clock. Both are
    // correct for their owner, and this is the assertion that keeps a future
    // refactor from "unifying" them.
    const open = focusSessionFragmentMocks.running
    expect(focusSessionFragmentDuration(open, at(0))).toBe(600)
    expect(performFragmentDuration(toPerformFragment(open))).toBeNull()
  })
})
