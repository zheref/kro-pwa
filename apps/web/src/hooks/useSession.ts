// #region Imports
import {
  type SessionFragmentState,
  SessionStatus,
  FragmentFocusStatus,
  SessionStatusFocused,
  type ISessionConfig,
  SessionConfig,
  type SessionFragment,
  dateAddingDuration,
  digitalTime,
  secondsFromMinutes,
} from '@kro/core'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSessionTimer } from './useSessionTimer'

import { getObject, insertObject, memory, remember } from '@/domain/stateStore'
import {
  hasNotificationsPermissionBeenRequested,
  isNotificationsPermissionGranted,
  postNotification,
  requestNotificationsPermission,
} from '@/domain/notificationsService'
import { playProgress, playStart, playSuccess } from '@/domain/soundsOperations'
// #endregion Imports

// #region Type Declarations
/**
 * This hook used to read NextAuth's session to learn whether the user had
 * connected a Google account, and augmented NextAuth's `Session`/`JWT` types to
 * carry `provider` and `accessToken`. KC-IS-#31 retires NextAuth entirely, so
 * both the read and the augmentations are gone.
 *
 * Nothing takes their place *here*, deliberately. Kro Cloud auth is now Supabase
 * and lives in `@kro/app`'s `auth` slice, but this page has no store provider
 * above it — the composition root is KC-IS-#13's — and the Google **Calendar**
 * connection is a second OAuth grant that KC-IS-#33 owns, not the Supabase
 * sign-in this issue ships. So `isCalendarConfigured` now comes from the
 * caller's `initialState` and defaults to `false`, which is the honest answer:
 * no calendar is connected until #33 wires one.
 *
 * This whole page is replaced by the Session UI child (KC-IS-#22); the change
 * here is the smallest one that keeps it building, and is deliberately not a
 * redesign.
 */
// #endregion Type Declarations

export function createSessionFragmentState(): SessionFragmentState {
  return {
    intention: '',
    targetConfig: new SessionConfig(undefined, secondsFromMinutes(25)),
    status: SessionStatus.ready,
    isCalendarConfigured: false,
    isHardEditing: false,
    fragments: [],
    presentingFailure: null,
  }
}

export const useSession = (
  initialState: Partial<SessionFragmentState>,
  onSessionFinished: () => void,
) => {
  const [state, setState] = useState<SessionFragmentState>(() => ({
    ...createSessionFragmentState(),
    ...initialState,
  }))

  const updateIntention = useCallback((intention: string) => {
    setState((prev) => ({ ...prev, intention }))
    remember('intention', intention)
  }, [])

  const userDidUpdateTargetConfig = useCallback((config: ISessionConfig) => {
    setState((prev) => ({ ...prev, targetConfig: config }))
    insertObject('targetConfig', config)
  }, [])

  useEffect(() => {
    const intentionMemory = memory('intention')
    if (intentionMemory && !initialState.intention) {
      setState((prev) => ({ ...prev, intention: intentionMemory }))
    }

    const configCache: ISessionConfig | null = getObject('targetConfig')
    if (configCache && !initialState.targetConfig) {
      setState((prev) => ({ ...prev, targetConfig: configCache }))
    } else if (!initialState.targetConfig) {
      const defaultConfig = new SessionConfig(
        secondsFromMinutes(25),
        secondsFromMinutes(5),
      )
      setState((prev) => ({ ...prev, targetConfig: defaultConfig }))
    }

    return () => {}
  }, [initialState.intention, initialState.targetConfig])

  /**
   * KC-IS-#33 fixup, flagged: the request contract of
   * `/api/google/createEvent` changed, so this call had to change with it.
   *
   * The route now takes the **intention** rather than a pre-formatted title —
   * canon's `"Session: <intention>"` rule is composed and tested in
   * `sessionCalendarEventRequest`, not in a hook — and it names the field
   * `timeZone` rather than `timezone`. Everything else is untouched: this
   * legacy hook is KC-IS-#21's to replace, and this PR only keeps it working.
   */
  const handleSessionSuccess = useCallback(() => {
    const firstFragment = state.fragments[0]
    const lastFragment = state.fragments[state.fragments.length - 1]
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

    fetch('/api/google/createEvent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        intention: state.intention,
        start: firstFragment?.start,
        end: lastFragment?.end,
        timeZone,
      }),
    })
  }, [state.intention, state.fragments])

  /**
   * Initializes a new session fragment and updates the application state accordingly.
   *
   * This function creates a new session fragment with the current date and stores
   * it within the state's fragments array. It also updates the session state to be
   * in a 'focused' and 'running' status.
   *
   * Additionally, it checks whether the user has been asked for notification
   * permissions. If not, it requests the necessary permissions and handles the result
   * via a callback function.
   *
   * Dependencies:
   * - Relies on the `state.fragments` value and updates the state using the `setState`
   *   function.
   *
   * Side Effects:
   * - Potentially triggers a notification permission request if it has not been
   *   previously requested.
   *
   * Dependencies:
   * - `hasNotificationsPermissionBeenRequested`: Function determining whether notification
   *   permission has been asked.
   * - `requestNotificationsPermission`: Requests notification permissions and handles the response.
   *
   * React Hook:
   * - Uses the `useCallback` React hook to memoize the function definition and avoid unnecessary
   *   re-renders or re-creation of the function.
   */
  const startSession = useCallback(() => {
    const newFragment: SessionFragment = {
      start: new Date(),
      end: undefined,
    }
    const fragments = [...state.fragments, newFragment]

    setState((prev) => ({
      ...prev,
      status: SessionStatus.focused(FragmentFocusStatus.running),
      fragments,
    }))

    // Effects
    playStart().finally(() => {})

    if (!hasNotificationsPermissionBeenRequested()) {
      requestNotificationsPermission(() => {})
    }
  }, [state.fragments])

  /**
   * Pauses the current session by marking the end of the last open fragment
   * and updating the session status to 'paused'.
   *
   * This function finds the most recently opened fragment (a fragment
   * without an end timestamp) within the session state. It updates that
   * fragment's end time to the current date and modifies the session state
   * to reflect the paused status.
   *
   * Dependencies:
   * - Uses the `state.fragments` array to determine the last open fragment.
   * - Updates session state through a state updater function.
   *
   * The function is memoized using `useCallback` to ensure it does not
   * recreate on every render unless dependencies change.
   */
  const pauseSession = useCallback(() => {
    const lastOpenFragmentIndex = state.fragments.findLastIndex(
      (f) => f.end === undefined,
    )
    const fragments = [...state.fragments]
    const lastOpenFragment = fragments[lastOpenFragmentIndex]
    if (lastOpenFragment) {
      lastOpenFragment.end = new Date()
    }
    setState((prev) => ({
      ...prev,
      status: SessionStatus.focused(FragmentFocusStatus.paused),
      fragments,
    }))
  }, [state.fragments])

  /**
   * Callback function to resume a session.
   *
   * This function creates a new session fragment with the current start time and an undefined end time.
   * It appends the new fragment to the existing list of session fragments, updates the session status
   * to indicate that it is focused and running, and updates the state with the modified fragments and status.
   *
   * Dependencies:
   * - `state.fragments`: An array of existing session fragments.
   *
   * Updates the following state properties:
   * - `status`: Indicates the current session status as focused and running.
   * - `fragments`: Adds the new session fragment to the existing list of fragments.
   */
  const resumeSession = useCallback(() => {
    const newFragment: SessionFragment = {
      start: new Date(),
      end: undefined,
    }
    const fragments = [...state.fragments, newFragment]
    setState((prev) => ({
      ...prev,
      status: SessionStatus.focused(FragmentFocusStatus.running),
      fragments,
    }))
  }, [state.fragments])

  /**
   * A callback function that resets the session state to a "ready" status.
   *
   * This function leverages `useCallback` to memoize and ensure consistency
   * across renders, preventing unnecessary re-creations. When invoked, it
   * updates the state by maintaining the existing properties and setting
   * the `status` property to `SessionStatus.ready`.
   *
   * Intended usage:
   * - To abort the current session and return it to a "ready" state.
   *
   * Dependencies:
   * - Relies on a state setter function `setState` to update the
   *   application's state.
   *
   * The function has no arguments and returns no value.
   */
  const abortSession = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: SessionStatus.ready,
    }))
  }, [])

  const finishSession = useCallback(() => {
    const lastOpenFragmentIndex = state.fragments.findLastIndex(
      (f) => f.end === undefined,
    )
    const fragments = [...state.fragments]
    const lastOpenFragment = fragments[lastOpenFragmentIndex]
    if (lastOpenFragment) {
      lastOpenFragment.end = new Date()
    }

    setState((prev) => ({
      ...prev,
      fragments,
    }))

    // Effects
    onSessionFinished()
    playSuccess().finally(() => {})
    handleSessionSuccess()
    if (isNotificationsPermissionGranted()) {
      postNotification({
        title: 'Congratulations!',
        body: 'You have successfully completed the session',
        img: undefined,
      })
    }

    setState((prev) => ({
      ...prev,
      status: SessionStatus.ready,
      fragments: [],
    }))
  }, [onSessionFinished, handleSessionSuccess, state.fragments])

  const handleSessionEnded = useCallback(() => {
    const lastOpenFragmentIndex = state.fragments.findLastIndex(
      (f) => f.end === undefined,
    )
    const fragments = [...state.fragments]
    const lastOpenFragment = fragments[lastOpenFragmentIndex]
    if (lastOpenFragment) {
      lastOpenFragment.end = new Date()
    }

    setState((prev) => ({
      ...prev,
      fragments,
    }))

    // Effects
    playSuccess().finally(() => {})
    onSessionFinished()
    handleSessionSuccess()
    if (isNotificationsPermissionGranted()) {
      postNotification({
        title: 'Congratulations!',
        body: 'You have successfully completed the session',
        img: undefined,
      })
    }

    setState((prev) => ({
      ...prev,
      status: SessionStatus.ready,
      fragments: [],
    }))
  }, [onSessionFinished, handleSessionSuccess, state.fragments])

  const handleSessionProgress = useCallback(() => {
    playProgress().finally(() => {})
  }, [])

  const { elapsedDuration, remainingDuration, fragments, currentTime } =
    useSessionTimer(state, handleSessionEnded, handleSessionProgress)

  const baseTime = useMemo(() => {
    return state.fragments[state.fragments.length - 1]?.end ?? currentTime
  }, [state.fragments, currentTime])

  const startTime = useMemo(() => {
    return state.fragments[0]?.start ?? currentTime
  }, [state.fragments, currentTime])

  const endTime = useMemo(() => {
    if (
      state.status instanceof SessionStatusFocused &&
      state.status.status === FragmentFocusStatus.paused
    ) {
      return dateAddingDuration(currentTime, remainingDuration)
    } else {
      return dateAddingDuration(baseTime, remainingDuration)
    }
  }, [state.status, currentTime, remainingDuration, baseTime])

  const endTimeForDisplay = useMemo(() => {
    if (
      state.status instanceof SessionStatusFocused &&
      state.status.status === FragmentFocusStatus.paused
    ) {
      return digitalTime(endTime, true)
    } else {
      return digitalTime(endTime, false)
    }
  }, [endTime, state.status])

  const timeRangeForDisplay = useMemo(() => {
    const startTimeForDisplay = digitalTime(startTime, false)

    return `${startTimeForDisplay} - ${endTimeForDisplay}`
  }, [startTime, endTimeForDisplay])

  const fragmentsCountForDisplay = useMemo(() => {
    if (state.status instanceof SessionStatusFocused) {
      return `${state.fragments.length} ${state.fragments.length === 1 ? 'fragment' : 'fragments'} in place`
    } else {
      return 'Ready to Start?'
    }
  }, [state.fragments, state.status])

  return {
    state: {
      ...state,
      elapsedDuration,
      remainingDuration,
      fragments,
      fragmentsCountForDisplay,
      timeRangeForDisplay,
    },
    actions: {
      updateIntention,
      userDidUpdateTargetConfig,
      startSession,
      pauseSession,
      resumeSession,
      abortSession,
      finishSession,
    },
  }
}
