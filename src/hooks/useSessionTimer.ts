import { useState, useEffect, useCallback, useRef } from 'react';
import { interval, Subscription } from 'rxjs';
import { SessionFragmentState, SessionStatus, FragmentFocusStatus, SessionStatusFocused } from '@/model/Session/SessionTypes';
import { SessionFragment } from '@/model/Session/SessionFragment';
import { durationOfFragment } from '@/model/Session/SessionFragment';

/**
 * The state of the timer.
 */
interface SessionTimerState {
    elapsedDuration: number;
    remainingDuration: number;
    fragments: SessionFragment[];
}

/**
 * Hook for managing the timer of a session.
 * @param state - The state of the session.
 * @param onSessionEnded - The callback to be called when the session ends.
 * @param onSessionProgress - The callback to be called when the session progresses.
 * @returns The timer state and the functions to start, pause, resume, and stop the timer.
 */
export const useSessionTimer = (
    state: SessionFragmentState,
    onSessionEnded: () => void,
    onSessionProgress: () => void,
) => {
    const [timerState, setTimerState] = useState<SessionTimerState>(() => ({
        elapsedDuration: 0,
        remainingDuration: state.targetConfig.duration ?? 0,
        fragments: state.fragments
    }));

    const [currentTime, setCurrentTime] = useState(new Date());

    const subscriptionRef = useRef<Subscription | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const lastElapsedRef = useRef<number>(0);
    const fragmentsRef = useRef<SessionFragment[]>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)

        return () => clearInterval(interval);
    }, []);

    /**
     * Starts the timer.
     */
    const startTimer = useCallback(() => {
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
        }

        startTimeRef.current = Date.now();
        const newFragment: SessionFragment = { 
            start: new Date(startTimeRef.current), 
            end: undefined 
        };
        fragmentsRef.current = [...fragmentsRef.current, newFragment];

        subscriptionRef.current = interval(1000).subscribe(() => {
            if (!startTimeRef.current) return;

            const now = Date.now();
            const currentFragment = fragmentsRef.current[fragmentsRef.current.length - 1];
            if (currentFragment) {
                currentFragment.end = new Date(now);
            }

            const totalElapsed = fragmentsRef.current.reduce((acc, fragment) => {
                return acc + Math.floor(durationOfFragment(fragment) / 1000);
            }, 0);

            const remaining = Math.max(0, (state.targetConfig.duration ?? 0) - totalElapsed);

            setTimerState({
                elapsedDuration: totalElapsed,
                remainingDuration: remaining,
                fragments: fragmentsRef.current
            });

            const progressThreshold = (state.targetConfig.duration ?? 0) / 3

            if (remaining <= 0) {
                onSessionEnded()
            } else if (totalElapsed % progressThreshold == 0) {
                onSessionProgress()
            }
        });
    }, [state.targetConfig.duration, onSessionEnded, onSessionProgress]);

    /**
     * Pauses the timer.
     */
    const pauseTimer = useCallback(() => {
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
        }

        if (startTimeRef.current) {
            const now = Date.now();
            const currentFragment = fragmentsRef.current[fragmentsRef.current.length - 1];
            if (currentFragment) {
                currentFragment.end = new Date(now);
            }

            const totalElapsed = fragmentsRef.current.reduce((acc, fragment) => {
                return acc + Math.floor(durationOfFragment(fragment) / 1000);
            }, 0);

            lastElapsedRef.current = totalElapsed;
            startTimeRef.current = null;

            const remainingDuration = Math.max(0, (state.targetConfig.duration ?? 0) - totalElapsed);

            setTimerState(prev => ({
                ...prev,
                elapsedDuration: totalElapsed,
                remainingDuration: remainingDuration,
                fragments: fragmentsRef.current
            }));
        }
    }, [state.targetConfig.duration]);

    /**
     * Resumes the timer.
     */
    const resumeTimer = useCallback(() => {
        startTimeRef.current = Date.now();
        const newFragment: SessionFragment = { 
            start: new Date(startTimeRef.current), 
            end: undefined 
        };
        fragmentsRef.current = [...fragmentsRef.current, newFragment];

        subscriptionRef.current = interval(1000).subscribe(() => {
            if (!startTimeRef.current) return;

            const now = Date.now();
            const currentFragment = fragmentsRef.current[fragmentsRef.current.length - 1];
            if (currentFragment) {
                currentFragment.end = new Date(now);
            }

            const totalElapsed = fragmentsRef.current.reduce((acc, fragment) => {
                return acc + Math.floor(durationOfFragment(fragment) / 1000);
            }, 0);

            const remaining = Math.max(0, (state.targetConfig.duration ?? 0) - totalElapsed);

            setTimerState({
                elapsedDuration: totalElapsed,
                remainingDuration: remaining,
                fragments: fragmentsRef.current
            });

            const progressThreshold = (state.targetConfig.duration ?? 0) / 3

            if (remaining <= 0) {
                onSessionEnded()
            } else if (totalElapsed % progressThreshold == 0) {
                onSessionProgress()
            }
        });
    }, [state.targetConfig.duration, onSessionEnded, onSessionProgress]);

    /**
     * Stops the timer.
     */
    const stopTimer = useCallback(() => {
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
        }
        startTimeRef.current = null;
        lastElapsedRef.current = 0;
        fragmentsRef.current = [];
        setTimerState({
            elapsedDuration: 0,
            remainingDuration: state.targetConfig.duration ?? 0,
            fragments: []
        });
    }, [state.targetConfig.duration]);

    useEffect(() => {
        return () => {
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
            }
        };
    }, []);

    /**
     * Handles the status change of the session.
     */
    useEffect(() => {
        if (state.status === SessionStatus.ready) {
            stopTimer();
        } else {
            const focusedStatus = state.status as SessionStatusFocused;
            if (focusedStatus.status === FragmentFocusStatus.running) {
                startTimer();
            } else {
                pauseTimer();
            }
        }
    }, [state.status, startTimer, pauseTimer, stopTimer, state.targetConfig.duration]);

    return {
        ...timerState,
        currentTime,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer
    };
};
