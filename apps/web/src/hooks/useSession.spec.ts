import {
  FragmentFocusStatus,
  SessionConfig,
  SessionStatus,
  millisecondsFromMinutes,
  minutesFromSeconds,
  secondsFromMinutes,
} from '@kro/core'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  hasNotificationsPermissionBeenRequested,
  isNotificationsPermissionGranted,
  postNotification,
  requestNotificationsPermission,
} from '@/domain/notificationsService'
import { getObject, insertObject, memory } from '@/domain/stateStore'
import { useSession as useFocusSession } from './useSession'

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  }),
) as unknown as typeof fetch

// Mock the state store functions
vi.mock('@/domain/stateStore', () => ({
  getObject: vi.fn(),
  insertObject: vi.fn(),
  memory: vi.fn(),
  remember: vi.fn(),
}))

// Mock the notifications service functions
vi.mock('@/domain/notificationsService', () => ({
  hasNotificationsPermissionBeenRequested: vi.fn(),
  isNotificationsPermissionGranted: vi.fn(),
  postNotification: vi.fn(),
  requestNotificationsPermission: vi.fn(),
}))

// Mock sound operations
vi.mock('@/domain/soundsOperations', () => ({
  playStart: () => Promise.resolve(),
  playProgress: () => Promise.resolve(),
  playSuccess: () => Promise.resolve(),
}))

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      provider: 'google',
    },
    status: 'authenticated',
  }),
}))

describe('useSession', () => {
  const mockedOnSessionFinished = vi.fn()
  const defaultConfig = new SessionConfig(
    secondsFromMinutes(25),
    secondsFromMinutes(5),
  )

  beforeEach(() => {
    vi.useFakeTimers()
    mockedOnSessionFinished.mockClear()
    vi.mocked(getObject).mockClear()
    vi.mocked(insertObject).mockClear()
    vi.mocked(memory).mockClear()
    vi.mocked(global.fetch).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useFocusSession({}, mockedOnSessionFinished),
    )

    expect(result.current.state.intention).toBe('')
    expect(result.current.state.status).toBe(SessionStatus.ready)
    expect(result.current.state.targetConfig).toEqual(defaultConfig)
    expect(result.current.state.elapsedDuration).toBe(0)
    expect(result.current.state.remainingDuration).toBe(secondsFromMinutes(25))
  })

  it('should load saved intention from memory', () => {
    const savedIntention = 'Test intention'
    vi.mocked(memory).mockReturnValue(savedIntention)

    const { result } = renderHook(() =>
      useFocusSession({}, mockedOnSessionFinished),
    )

    expect(result.current.state.intention).toBe(savedIntention)
    expect(memory).toHaveBeenCalledWith('intention')
  })

  it('should load saved target config from storage', () => {
    const savedConfig = new SessionConfig(
      secondsFromMinutes(30),
      secondsFromMinutes(10),
    )
    vi.mocked(getObject).mockReturnValue(savedConfig)

    const { result } = renderHook(() =>
      useFocusSession({}, mockedOnSessionFinished),
    )

    expect(result.current.state.targetConfig).toEqual(savedConfig)
    expect(getObject).toHaveBeenCalledWith('targetConfig')
  })

  it('should update intention and save to memory', () => {
    const { result } = renderHook(() =>
      useFocusSession({}, mockedOnSessionFinished),
    )
    const newIntention = 'New intention'

    act(() => {
      result.current.actions.updateIntention(newIntention)
    })

    expect(result.current.state.intention).toBe(newIntention)
  })

  it('should update target config and save to storage', () => {
    const { result } = renderHook(() =>
      useFocusSession({}, mockedOnSessionFinished),
    )
    const newConfig = new SessionConfig(
      secondsFromMinutes(45),
      secondsFromMinutes(15),
    )

    act(() => {
      result.current.actions.userDidUpdateTargetConfig(newConfig)
    })

    expect(result.current.state.targetConfig).toEqual(newConfig)
    expect(insertObject).toHaveBeenCalledWith('targetConfig', newConfig)
  })

  it('should start session, update status and request notifications permission if not asked before', () => {
    vi.mocked(hasNotificationsPermissionBeenRequested).mockReturnValue(false)
    const { result } = renderHook(() =>
      useFocusSession({}, mockedOnSessionFinished),
    )

    act(() => {
      result.current.actions.startSession()
    })

    expect(result.current.state.status).toEqual(
      SessionStatus.focused(FragmentFocusStatus.running),
    )
    expect(requestNotificationsPermission).toHaveBeenCalled()
  })

  it('should start session, update status and not request notifications permission if already asked', () => {
    vi.mocked(hasNotificationsPermissionBeenRequested).mockReturnValue(true)
    const { result } = renderHook(() =>
      useFocusSession({}, mockedOnSessionFinished),
    )

    act(() => {
      result.current.actions.startSession()
    })

    expect(result.current.state.status).toEqual(
      SessionStatus.focused(FragmentFocusStatus.running),
    )
    expect(requestNotificationsPermission).not.toHaveBeenCalled()
  })

  it('should pause session and update status', () => {
    const { result } = renderHook(() =>
      useFocusSession({}, mockedOnSessionFinished),
    )

    act(() => {
      result.current.actions.startSession()
    })

    act(() => {
      result.current.actions.pauseSession()
    })

    expect(result.current.state.status).toEqual(
      SessionStatus.focused(FragmentFocusStatus.paused),
    )
  })

  it('should resume session and update status', () => {
    const { result } = renderHook(() =>
      useFocusSession({}, mockedOnSessionFinished),
    )

    act(() => {
      result.current.actions.startSession()
    })

    act(() => {
      result.current.actions.pauseSession()
    })

    act(() => {
      result.current.actions.resumeSession()
    })

    expect(result.current.state.status).toEqual(
      SessionStatus.focused(FragmentFocusStatus.running),
    )
  })

  it('should keep session remaining duration when paused', async () => {
    // Hoisted out of the render callback on purpose: `useSession` keys its
    // bootstrap effect on `initialState.targetConfig`, so building a fresh
    // SessionConfig on every render re-arms the effect every render and the
    // hook never settles.
    const initialState = {
      targetConfig: new SessionConfig(
        secondsFromMinutes(25), // duration
        secondsFromMinutes(5), // rest
      ),
    }

    const { result } = renderHook(() =>
      useFocusSession(initialState, mockedOnSessionFinished),
    )

    // Start the session
    act(() => {
      result.current.actions.startSession()
    })

    // Advance timers and make sure the timer is running
    act(() => {
      vi.advanceTimersByTime(millisecondsFromMinutes(5))
    })

    // Wait for all pending promises and timers
    await act(async () => {
      await Promise.resolve()
    })

    const remainingMinutesBeforePause = minutesFromSeconds(
      result.current.state.remainingDuration,
    )
    expect(remainingMinutesBeforePause).toBe(20)

    // Pause the session
    act(() => {
      result.current.actions.pauseSession()
    })

    // Wait for all pending state updates
    await act(async () => {
      await Promise.resolve()
    })

    // Advance time by 1 minute during pause
    act(() => {
      vi.advanceTimersByTime(millisecondsFromMinutes(1))
    })

    // Wait for all pending state updates
    await act(async () => {
      await Promise.resolve()
    })

    // Verify remaining time hasn't changed
    const remainingMinutesAfterPause = minutesFromSeconds(
      result.current.state.remainingDuration,
    )
    expect(remainingMinutesAfterPause).toBe(remainingMinutesBeforePause)

    // Resume the session
    act(() => {
      result.current.actions.resumeSession()
    })

    // Wait for all pending state updates
    await act(async () => {
      await Promise.resolve()
    })

    // Verify remaining time hasn't changed after resume
    const remainingMinutesAfterResume = minutesFromSeconds(
      result.current.state.remainingDuration,
    )
    expect(remainingMinutesAfterResume).toBe(remainingMinutesBeforePause)
    expect(result.current.state.status).toEqual(
      SessionStatus.focused(FragmentFocusStatus.running),
    )

    act(() => {
      // Simulate timer reaching zero
      vi.advanceTimersByTime(millisecondsFromMinutes(20))
    })

    // Wait for all pending state updates
    await act(async () => {
      await Promise.resolve()
    })

    const remainingMinutesAfterEnd = minutesFromSeconds(
      result.current.state.remainingDuration,
    )

    expect(remainingMinutesAfterEnd).toBe(25)
    expect(result.current.state.status).toEqual(SessionStatus.ready)
    expect(mockedOnSessionFinished).toHaveBeenCalled()
  })

  it('should abort session and reset status', () => {
    const { result } = renderHook(() =>
      useFocusSession({}, mockedOnSessionFinished),
    )

    act(() => {
      result.current.actions.startSession()
      result.current.actions.abortSession()
    })

    expect(result.current.state.status).toBe(SessionStatus.ready)
    expect(mockedOnSessionFinished).not.toHaveBeenCalled()
  })

  it('should finish session early and reset status, post notification if permission granted', () => {
    vi.mocked(isNotificationsPermissionGranted).mockReturnValue(true)
    const { result } = renderHook(() =>
      useFocusSession({}, mockedOnSessionFinished),
    )

    act(() => {
      result.current.actions.startSession()
    })

    act(() => {
      result.current.actions.finishSession()
    })

    expect(result.current.state.status).toBe(SessionStatus.ready)
    expect(mockedOnSessionFinished).toHaveBeenCalled()
    expect(postNotification).toHaveBeenCalled()
  })

  it('should handle session end and call callback, post notification if permission granted', async () => {
    vi.mocked(memory).mockReturnValue(null)
    vi.mocked(getObject).mockReturnValue(null)
    vi.mocked(isNotificationsPermissionGranted).mockReturnValue(true)
    const { result } = renderHook(() =>
      useFocusSession({}, mockedOnSessionFinished),
    )

    act(() => {
      result.current.actions.startSession()
    })

    // Simulate timer reaching zero
    act(() => {
      vi.advanceTimersByTime(secondsFromMinutes(25) * 1000)
    })

    // Wait for state updates and flush effects
    await act(async () => {
      await Promise.resolve()
    })

    // Force a re-render to ensure state updates are applied
    act(() => {
      result.current.actions.abortSession()
    })

    expect(mockedOnSessionFinished).toHaveBeenCalled()
    expect(result.current.state.status).toBe(SessionStatus.ready)
    expect(postNotification).toHaveBeenCalled()
  })

  it('should calculate correct time range for display', async () => {
    const { result } = renderHook(() =>
      useFocusSession({}, mockedOnSessionFinished),
    )

    act(() => {
      result.current.actions.startSession()
    })

    // Advance time by 5 minutes
    act(() => {
      vi.advanceTimersByTime(secondsFromMinutes(5) * 1000)
    })

    // Wait for state updates
    await act(async () => {
      await Promise.resolve()
    })

    // The time format should be in 12-hour format with AM/PM
    expect(result.current.state.timeRangeForDisplay).toMatch(
      /^\d{1,2}:\d{2} [AP]M - \d{1,2}:\d{2} [AP]M$/,
    )
  })

  it('should handle initial state override', () => {
    // Clear all state store mocks for this test
    vi.mocked(memory).mockReturnValue(null)
    vi.mocked(getObject).mockReturnValue(null)
    const initialState = {
      intention: 'Custom intention',
      targetConfig: new SessionConfig(
        secondsFromMinutes(60), // duration
        secondsFromMinutes(20), // rest
      ),
    }

    const { result } = renderHook(() =>
      useFocusSession(initialState, mockedOnSessionFinished),
    )

    // Check the config values directly
    expect(result.current.state.intention).toBe(initialState.intention)
    expect(result.current.state.targetConfig.duration).toBe(
      secondsFromMinutes(60),
    )
    expect(result.current.state.targetConfig.rest).toBe(secondsFromMinutes(20))
    expect(result.current.state.targetConfig.mode).toBe(
      initialState.targetConfig.mode,
    )
  })
})
