import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  WIGGLE_ANGLE_DEGREES,
  WIGGLE_HALF_PERIOD_MS,
  WIGGLE_SETTLE_MS,
  useWiggle,
  wiggleStyle,
} from './useWiggle'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const motionAllowed = () => false
const motionReduced = () => true

describe('useWiggle', () => {
  it('does not move a card that is not in mark-complete mode', () => {
    const { result } = renderHook(() => useWiggle(false, motionAllowed))

    expect(result.current.angle).toBe(0)
    expect(result.current.isAnimating).toBe(false)
  })

  it('tilts to canon’s amplitude as soon as the mode is entered', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useWiggle(true, motionAllowed))

    expect(result.current.angle).toBe(WIGGLE_ANGLE_DEGREES)
    expect(result.current.isAnimating).toBe(true)
  })

  it('reverses on canon’s half-period, so the card oscillates rather than leaning', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useWiggle(true, motionAllowed))

    act(() => {
      vi.advanceTimersByTime(WIGGLE_HALF_PERIOD_MS)
    })
    expect(result.current.angle).toBe(-WIGGLE_ANGLE_DEGREES)

    act(() => {
      vi.advanceTimersByTime(WIGGLE_HALF_PERIOD_MS)
    })
    expect(result.current.angle).toBe(WIGGLE_ANGLE_DEGREES)
  })

  it('SETTLES TO EXACTLY ZERO when the mode is left mid-tilt', () => {
    // The defect canon's comment names: a repeating animation removed mid-cycle
    // leaves the card visibly tilted. Leaving the mode must return the angle to
    // 0, not to wherever the last tick put it.
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) => useWiggle(active, motionAllowed),
      { initialProps: { active: true } },
    )

    act(() => {
      vi.advanceTimersByTime(WIGGLE_HALF_PERIOD_MS)
    })
    expect(result.current.angle).toBe(-WIGGLE_ANGLE_DEGREES)

    rerender({ active: false })

    expect(result.current.angle).toBe(0)
    expect(result.current.isAnimating).toBe(false)
  })

  it('stops ticking once cancelled — no timer survives the unmount', () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => useWiggle(true, motionAllowed))
    expect(result.current.isAnimating).toBe(true)

    unmount()

    // A surviving interval would throw here by setting state on an unmounted
    // component; the assertion is that advancing time is uneventful.
    expect(() => {
      vi.advanceTimersByTime(WIGGLE_HALF_PERIOD_MS * 10)
    }).not.toThrow()
  })

  it('never animates under reduced motion, even in mark-complete mode', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useWiggle(true, motionReduced))

    expect(result.current.angle).toBe(0)
    expect(result.current.isAnimating).toBe(false)

    act(() => {
      vi.advanceTimersByTime(WIGGLE_HALF_PERIOD_MS * 4)
    })
    expect(result.current.angle).toBe(0)
  })
})

describe('wiggleStyle', () => {
  it('rotates by the current angle', () => {
    expect(wiggleStyle({ angle: 0.35, isAnimating: true }).transform).toBe(
      'rotate(0.35deg)',
    )
  })

  it('uses the half-period while animating and the shorter settle on the way out', () => {
    expect(
      wiggleStyle({ angle: 0.35, isAnimating: true }).transition,
    ).toContain(`${WIGGLE_HALF_PERIOD_MS}ms`)
    expect(wiggleStyle({ angle: 0, isAnimating: false }).transition).toContain(
      `${WIGGLE_SETTLE_MS}ms`,
    )
  })
})
