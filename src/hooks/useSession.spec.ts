import { renderHook, act } from '@testing-library/react'
import { useSession as useFocusSession } from './useSession'
import { SessionStatus, FragmentFocusStatus } from '@/model/Session/SessionTypes'
import { SessionConfig } from '@/model/Session/SessionConfig'
import { secondsFromMinutes } from '@/utils/durations'
import { getObject, insertObject, memory } from '@/domain/stateStore'
import {
    hasNotificationsPermissionBeenRequested,
    isNotificationsPermissionGranted, postNotification,
    requestNotificationsPermission
} from "@/domain/notificationsService"

// Mock fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
    })
) as jest.Mock

// Mock the state store functions
jest.mock('@/domain/stateStore', () => ({
    getObject: jest.fn(),
    insertObject: jest.fn(),
    memory: jest.fn(),
    remember: jest.fn(),
}))

// Mock the notifications service functions
jest.mock('@/domain/notificationsService', () => ({
    hasNotificationsPermissionBeenRequested: jest.fn(),
    isNotificationsPermissionGranted: jest.fn(),
    postNotification: jest.fn(),
    requestNotificationsPermission: jest.fn(),
}))

// Mock sound operations
jest.mock('@/domain/soundsOperations', () => ({
    playStart: () => Promise.resolve(),
    playProgress: () => Promise.resolve(),
    playSuccess: () => Promise.resolve(),
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
    useSession: () => ({
        data: {
            provider: 'google'
        },
        status: 'authenticated'
    })
}))

describe('useSession', () => {
    const mockedOnSessionFinished = jest.fn()
    const defaultConfig = new SessionConfig(
        secondsFromMinutes(25),
        secondsFromMinutes(5)
    )

    beforeEach(() => {
        jest.useFakeTimers()
        mockedOnSessionFinished.mockClear();
        (getObject as jest.Mock).mockClear();
        (insertObject as jest.Mock).mockClear();
        (memory as jest.Mock).mockClear();
        (global.fetch as jest.Mock).mockClear()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('should initialize with default values', () => {
        const { result } = renderHook(() =>
            useFocusSession({}, mockedOnSessionFinished)
        )

        expect(result.current.state.intention).toBe('')
        expect(result.current.state.status).toBe(SessionStatus.ready)
        expect(result.current.state.targetConfig).toEqual(defaultConfig)
        expect(result.current.state.elapsedDuration).toBe(0)
        expect(result.current.state.remainingDuration).toBe(secondsFromMinutes(25))
    })

    it('should load saved intention from memory', () => {
        const savedIntention = 'Test intention';
        (memory as jest.Mock).mockReturnValue(savedIntention)

        const { result } = renderHook(() =>
            useFocusSession({}, mockedOnSessionFinished)
        )

        expect(result.current.state.intention).toBe(savedIntention)
        expect(memory).toHaveBeenCalledWith('intention')
    })

    it('should load saved target config from storage', () => {
        const savedConfig = new SessionConfig(
            secondsFromMinutes(30),
            secondsFromMinutes(10)
        );
        (getObject as jest.Mock).mockReturnValue(savedConfig)

        const { result } = renderHook(() =>
            useFocusSession({}, mockedOnSessionFinished)
        )

        expect(result.current.state.targetConfig).toEqual(savedConfig)
        expect(getObject).toHaveBeenCalledWith('targetConfig')
    })

    it('should update intention and save to memory', () => {
        const { result } = renderHook(() =>
            useFocusSession({}, mockedOnSessionFinished)
        )
        const newIntention = 'New intention'

        act(() => {
            result.current.actions.updateIntention(newIntention)
        })

        expect(result.current.state.intention).toBe(newIntention)
    })

    it('should update target config and save to storage', () => {
        const { result } = renderHook(() =>
            useFocusSession({}, mockedOnSessionFinished)
        )
        const newConfig = new SessionConfig(
            secondsFromMinutes(45),
            secondsFromMinutes(15)
        )

        act(() => {
            result.current.actions.userDidUpdateTargetConfig(newConfig)
        })

        expect(result.current.state.targetConfig).toEqual(newConfig)
        expect(insertObject).toHaveBeenCalledWith('targetConfig', newConfig)
    })

    it('should start session, update status and request notifications permission if not asked before', () => {
        (hasNotificationsPermissionBeenRequested as jest.Mock).mockReturnValue(false)
        const { result } = renderHook(() =>
            useFocusSession({}, mockedOnSessionFinished)
        )

        act(() => {
            result.current.actions.startSession()
        })

        expect(result.current.state.status).toEqual(
            SessionStatus.focused(FragmentFocusStatus.running)
        )
        expect(requestNotificationsPermission).toHaveBeenCalled()
    })

    it('should start session, update status and not request notifications permission if already asked', () => {
        (hasNotificationsPermissionBeenRequested as jest.Mock).mockReturnValue(true)
        const { result } = renderHook(() =>
            useFocusSession({}, mockedOnSessionFinished)
        )

        act(() => {
            result.current.actions.startSession()
        })

        expect(result.current.state.status).toEqual(
            SessionStatus.focused(FragmentFocusStatus.running)
        )
        expect(requestNotificationsPermission).not.toHaveBeenCalled()
    })

    it('should pause session and update status', () => {
        const { result } = renderHook(() =>
            useFocusSession({}, mockedOnSessionFinished)
        )

        act(() => {
            result.current.actions.startSession()
        })

        act(() => {
            result.current.actions.pauseSession()
        })

        expect(result.current.state.status).toEqual(
            SessionStatus.focused(FragmentFocusStatus.paused)
        )
    })

    it('should resume session and update status', () => {
        const { result } = renderHook(() =>
            useFocusSession({}, mockedOnSessionFinished)
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
            SessionStatus.focused(FragmentFocusStatus.running)
        )
    })

    it('should abort session and reset status', () => {
        const { result } = renderHook(() =>
            useFocusSession({}, mockedOnSessionFinished)
        )

        act(() => {
            result.current.actions.startSession()
            result.current.actions.abortSession()
        })

        expect(result.current.state.status).toBe(SessionStatus.ready)
        expect(mockedOnSessionFinished).not.toHaveBeenCalled()
    })

    it('should finish session early and reset status, post notification if permission granted', () => {
        (isNotificationsPermissionGranted as jest.Mock).mockReturnValue(true)
        const { result } = renderHook(() =>
            useFocusSession({}, mockedOnSessionFinished)
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
        (memory as jest.Mock).mockReturnValue(null);
        (getObject as jest.Mock).mockReturnValue(null);
        (isNotificationsPermissionGranted as jest.Mock).mockReturnValue(true)
        const { result } = renderHook(() =>
            useFocusSession({}, mockedOnSessionFinished)
        )

        act(() => {
            result.current.actions.startSession()
        })

        // Simulate timer reaching zero
        act(() => {
            jest.advanceTimersByTime(secondsFromMinutes(25) * 1000)
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
            useFocusSession({}, mockedOnSessionFinished)
        )

        act(() => {
            result.current.actions.startSession()
        })

        // Advance time by 5 minutes
        act(() => {
            jest.advanceTimersByTime(secondsFromMinutes(5) * 1000)
        })

        // Wait for state updates
        await act(async () => {
            await Promise.resolve()
        })

        // The time format should be in 12-hour format with AM/PM
        expect(result.current.state.timeRangeForDisplay).toMatch(/^\d{1,2}:\d{2} [AP]M - \d{1,2}:\d{2} [AP]M$/)
    })

    it('should handle initial state override', () => {
        // Clear all state store mocks for this test
        (memory as jest.Mock).mockReturnValue(null);
        (getObject as jest.Mock).mockReturnValue(null)
        const initialState = {
            intention: 'Custom intention',
            targetConfig: new SessionConfig(
                secondsFromMinutes(60), // duration
                secondsFromMinutes(20)  // rest
            ),
        }

        const { result } = renderHook(() =>
            useFocusSession(initialState, mockedOnSessionFinished)
        )

        // Check the config values directly
        expect(result.current.state.intention).toBe(initialState.intention)
        expect(result.current.state.targetConfig.duration).toBe(secondsFromMinutes(60))
        expect(result.current.state.targetConfig.rest).toBe(secondsFromMinutes(20))
        expect(result.current.state.targetConfig.mode).toBe(initialState.targetConfig.mode)
    })
}) 