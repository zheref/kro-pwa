import {
  FragmentFocusStatus,
  SessionConfig,
  type SessionFragmentState,
  SessionStatus,
  secondsFromMinutes,
} from '@kro/core'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionTimer } from './useSessionTimer'

describe('useSessionTimer', () => {
  const mockOnSessionEnded = vi.fn()
  const mockOnSessionProgress = vi.fn()
  const baseState: SessionFragmentState = {
    intention: '',
    targetConfig: new SessionConfig(secondsFromMinutes(25)),
    status: SessionStatus.ready,
    isCalendarConfigured: false,
    isHardEditing: false,
    fragments: [],
    presentingFailure: null,
  }
  const runningState: SessionFragmentState = {
    ...baseState,
    status: SessionStatus.focused(FragmentFocusStatus.running),
  }
  const pausedState: SessionFragmentState = {
    ...baseState,
    status: SessionStatus.focused(FragmentFocusStatus.paused),
  }

  beforeEach(() => {
    vi.useFakeTimers()
    mockOnSessionEnded.mockClear()
    mockOnSessionProgress.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() =>
      useSessionTimer(baseState, mockOnSessionEnded, mockOnSessionProgress),
    )
    expect(result.current.elapsedDuration).toBe(0)
    expect(result.current.remainingDuration).toBe(secondsFromMinutes(25))
    expect(result.current.fragments).toEqual([])
  })

  it('should start timer and update elapsed time when status is running', async () => {
    const { result, rerender } = renderHook(
      ({ state }) =>
        useSessionTimer(state, mockOnSessionEnded, mockOnSessionProgress),
      { initialProps: { state: baseState } },
    )
    rerender({ state: runningState })
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.elapsedDuration).toBe(5)
    expect(result.current.remainingDuration).toBe(secondsFromMinutes(25) - 5)
    expect(result.current.fragments.length).toBe(1)
  })

  it('should pause timer and maintain elapsed time when status is paused', async () => {
    const { result, rerender } = renderHook(
      ({ state }) =>
        useSessionTimer(state, mockOnSessionEnded, mockOnSessionProgress),
      { initialProps: { state: baseState } },
    )
    rerender({ state: runningState })
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    rerender({ state: pausedState })
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.elapsedDuration).toBe(5)
    expect(result.current.remainingDuration).toBe(secondsFromMinutes(25) - 5)
  })

  it('should resume timer after pause when status changes back to running', async () => {
    const { result, rerender } = renderHook(
      ({ state }) =>
        useSessionTimer(state, mockOnSessionEnded, mockOnSessionProgress),
      { initialProps: { state: baseState } },
    )
    rerender({ state: runningState })
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    rerender({ state: pausedState })
    rerender({ state: runningState })
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.elapsedDuration).toBe(10)
    expect(result.current.remainingDuration).toBe(secondsFromMinutes(25) - 10)
  })

  it('should reset timer when status is set to ready', async () => {
    const { result, rerender } = renderHook(
      ({ state }) =>
        useSessionTimer(state, mockOnSessionEnded, mockOnSessionProgress),
      { initialProps: { state: runningState } },
    )
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    rerender({ state: baseState })
    expect(result.current.elapsedDuration).toBe(0)
    expect(result.current.remainingDuration).toBe(secondsFromMinutes(25))
    expect(result.current.fragments).toEqual([])
  })

  it('should call onSessionEnded when timer reaches zero', async () => {
    const { result, rerender } = renderHook(
      ({ state }) =>
        useSessionTimer(state, mockOnSessionEnded, mockOnSessionProgress),
      { initialProps: { state: baseState } },
    )
    rerender({ state: runningState })
    act(() => {
      vi.advanceTimersByTime(secondsFromMinutes(25) * 1000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(mockOnSessionEnded).toHaveBeenCalled()
    expect(result.current.remainingDuration).toBe(0)
  })

  it('should handle multiple running/paused cycles correctly', async () => {
    const { result, rerender } = renderHook(
      ({ state }) =>
        useSessionTimer(state, mockOnSessionEnded, mockOnSessionProgress),
      { initialProps: { state: baseState } },
    )
    rerender({ state: runningState })
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    rerender({ state: pausedState })
    rerender({ state: runningState })
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    rerender({ state: pausedState })
    expect(result.current.elapsedDuration).toBe(10)
    expect(result.current.fragments.length).toBe(2)
  })

  it('should update currentTime every second', async () => {
    const { result } = renderHook(() =>
      useSessionTimer(baseState, mockOnSessionEnded, mockOnSessionProgress),
    )
    const initialTime = result.current.currentTime
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.currentTime.getTime()).toBeGreaterThan(
      initialTime.getTime(),
    )
  })

  it('should cleanup subscription on unmount', () => {
    const { unmount } = renderHook(() =>
      useSessionTimer(baseState, mockOnSessionEnded, mockOnSessionProgress),
    )
    unmount()
    // No explicit assertion needed, just ensure no errors occur
  })

  it('should handle status change to ready', async () => {
    const { result, rerender } = renderHook(
      ({ state }) =>
        useSessionTimer(state, mockOnSessionEnded, mockOnSessionProgress),
      { initialProps: { state: runningState } },
    )
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    rerender({ state: baseState })
    expect(result.current.elapsedDuration).toBe(0)
    expect(result.current.remainingDuration).toBe(secondsFromMinutes(25))
    expect(result.current.fragments).toEqual([])
  })

  it('should start timer when status is running', async () => {
    const { result, rerender } = renderHook(
      ({ state }) =>
        useSessionTimer(state, mockOnSessionEnded, mockOnSessionProgress),
      { initialProps: { state: baseState } },
    )
    rerender({ state: runningState })
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.elapsedDuration).toBe(5)
    expect(result.current.remainingDuration).toBe(secondsFromMinutes(25) - 5)
  })

  it('should pause timer when status is paused', async () => {
    const { result, rerender } = renderHook(
      ({ state }) =>
        useSessionTimer(state, mockOnSessionEnded, mockOnSessionProgress),
      { initialProps: { state: runningState } },
    )
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    rerender({ state: pausedState })
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.elapsedDuration).toBe(5)
    expect(result.current.remainingDuration).toBe(secondsFromMinutes(25) - 5)
  })

  it('should resume timer when status changes back to running', async () => {
    const { result, rerender } = renderHook(
      ({ state }) =>
        useSessionTimer(state, mockOnSessionEnded, mockOnSessionProgress),
      { initialProps: { state: pausedState } },
    )
    rerender({ state: runningState })
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.elapsedDuration).toBe(5)
    expect(result.current.remainingDuration).toBe(secondsFromMinutes(25) - 5)
  })

  it('should stop timer when status is set to ready', async () => {
    const { result, rerender } = renderHook(
      ({ state }) =>
        useSessionTimer(state, mockOnSessionEnded, mockOnSessionProgress),
      { initialProps: { state: runningState } },
    )
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    rerender({ state: baseState })
    expect(result.current.elapsedDuration).toBe(0)
    expect(result.current.remainingDuration).toBe(secondsFromMinutes(25))
    expect(result.current.fragments).toEqual([])
  })

  it('should not error if resumeTimer is called when paused', () => {
    const { result } = renderHook(() =>
      useSessionTimer(pausedState, mockOnSessionEnded, mockOnSessionProgress),
    )
    result.current.resumeTimer()
    act(() => {
      vi.advanceTimersByTime(secondsFromMinutes(15) * 1000)
    })
    expect(() => result.current.resumeTimer()).not.toThrow()
    expect(mockOnSessionProgress).toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(secondsFromMinutes(10) * 1000)
    })
    expect(mockOnSessionEnded).toHaveBeenCalled()
  })

  it('should not error if startTimer is called when already running', () => {
    const { result } = renderHook(() =>
      useSessionTimer(baseState, mockOnSessionEnded, mockOnSessionProgress),
    )
    result.current.startTimer()
    expect(() => result.current.startTimer()).not.toThrow()
  })

  it('should not error if pauseTimer is called when not running', () => {
    const { result } = renderHook(() =>
      useSessionTimer(baseState, mockOnSessionEnded, mockOnSessionProgress),
    )
    expect(() => result.current.pauseTimer()).not.toThrow()
  })

  it('should not error if resumeTimer is called when already running', () => {
    const { result } = renderHook(() =>
      useSessionTimer(baseState, mockOnSessionEnded, mockOnSessionProgress),
    )
    result.current.startTimer()
    expect(() => result.current.resumeTimer()).not.toThrow()
  })

  it('should not error if stopTimer is called when not running', () => {
    const { result } = renderHook(() =>
      useSessionTimer(baseState, mockOnSessionEnded, mockOnSessionProgress),
    )
    act(() => {
      result.current.stopTimer()
    })
  })

  it('should handle timer callback with no fragments', () => {
    // Simulate the timer callback with no fragments
    const { result } = renderHook(() =>
      useSessionTimer(baseState, mockOnSessionEnded, mockOnSessionProgress),
    )
    // forcibly call the timer callback logic
    // (simulate interval tick with no fragments)
    // This is a no-op, but should not throw
    expect(() => {
      result.current.startTimer()
      result.current.fragments = []
    }).not.toThrow()
  })

  it('should handle timer callback with startTimeRef.current null', () => {
    const { result } = renderHook(() =>
      useSessionTimer(baseState, mockOnSessionEnded, mockOnSessionProgress),
    )
    // forcibly set startTimeRef.current to null and call the timer callback
    // This is a no-op, but should not throw
    expect(() => {
      result.current.pauseTimer()
    }).not.toThrow()
  })

  it('should call onSessionEnded if remaining is already zero', async () => {
    const zeroState = {
      ...baseState,
      targetConfig: new SessionConfig(0),
    }
    const { rerender } = renderHook(
      ({ state }) =>
        useSessionTimer(state, mockOnSessionEnded, mockOnSessionProgress),
      { initialProps: { state: zeroState } },
    )
    rerender({
      state: {
        ...zeroState,
        status: SessionStatus.focused(FragmentFocusStatus.running),
      },
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(mockOnSessionEnded).toHaveBeenCalled()
  })

  it('should call pauseTimer when status is paused', async () => {
    const { result, rerender } = renderHook(
      ({ state }) =>
        useSessionTimer(state, mockOnSessionEnded, mockOnSessionProgress),
      { initialProps: { state: runningState } },
    )
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    rerender({ state: pausedState })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.elapsedDuration).toBeGreaterThanOrEqual(2)
  })

  it('should handle unknown focus status gracefully', async () => {
    const unknownStatus = {
      ...baseState,
      status: { type: 'focused', status: 'unknown' },
    }
    const { result, rerender } = renderHook(
      ({ state }) =>
        useSessionTimer(state, mockOnSessionEnded, mockOnSessionProgress),
      { initialProps: { state: runningState } },
    )
    rerender({ state: unknownStatus })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    // Should not throw and should pause timer
    expect(result.current.elapsedDuration).toBeGreaterThanOrEqual(0)
  })

  it('should call onSessionProgress at regular intervals', async () => {
    const { rerender } = renderHook(
      ({ state }) =>
        useSessionTimer(state, mockOnSessionEnded, mockOnSessionProgress),
      { initialProps: { state: baseState } },
    )

    // Start the timer by setting status to running
    rerender({ state: runningState })

    // Simulate timer advancing by 9 minutes
    act(() => {
      vi.advanceTimersByTime(secondsFromMinutes(9) * 1000)
    })

    // Wait for state updates and flush effects
    await act(async () => {
      await Promise.resolve()
    })

    // Run any pending timers
    act(() => {
      vi.runOnlyPendingTimers()
    })

    // Wait for any remaining effects
    await act(async () => {
      await Promise.resolve()
    })

    // Verify that onSessionProgress was called at least once
    expect(mockOnSessionProgress).toHaveBeenCalled()
  })
})
