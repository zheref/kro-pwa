import { greetingMocks } from '@kro/core/mocks'
import { describe, expect, it } from 'vitest'
import { initialAuthState } from '../../auth/AuthState'
import { initialCaptureState } from '../../capture/CaptureFeature'
import { initialPlatformState } from '../../platform/PlatformFeature'
import { initialSessionState } from '../../session/SessionState'
import { initialDoState } from '../../do/DoFeature'
import { initialEarnState } from '../../earn/EarnFeature'
import { initialEndeavorDetailState } from '../../endeavorDetail/EndeavorDetailState'
import { initialFindState } from '../../find/FindState'
import type { RootState } from '../../../library/store'
import { initialPlanState } from '../../plan/PlanState'
import { initialTriageState } from '../../triage/TriageFeature'
import type { GreetingState } from '../GreetingFeature'
import { greetingStateMocks } from '../GreetingMocks'
import {
  selectGreeting,
  selectGreetingException,
  selectGreetingHeadline,
  selectIsGreetingDetailOpen,
  selectIsGreetingLoading,
} from '../GreetingSelectors'
import { initialMainState } from '../../main/MainFeature'

/**
 * Selectors are exercised against a hand-built root state, never a live store.
 * `do` (#16), `plan` (#18), `capture` (#23), `triage` (#25), `find` and
 * `endeavorDetail` (#29) are filled from their own initial states only because
 * `RootState` names every registered slice; this suite asserts nothing about
 * any of them.
 */
const rootWith = (greeting: GreetingState): RootState => ({
  greeting,
  do: initialDoState,
  plan: initialPlanState,
  capture: initialCaptureState,
  triage: initialTriageState,
  find: initialFindState,
  endeavorDetail: initialEndeavorDetailState,
  earn: initialEarnState,
  platform: initialPlatformState,
  session: initialSessionState,
  auth: initialAuthState,
  main: initialMainState,
})

describe('selectGreeting', () => {
  it('returns the greeting once it has loaded', () => {
    expect(selectGreeting(rootWith(greetingStateMocks.loaded))).toEqual(greetingMocks.typical)
  })

  it('returns null while the request is still in flight', () => {
    expect(selectGreeting(rootWith(greetingStateMocks.loading))).toBeNull()
  })

  it('returns null on failure — a failed load never yields a half-built greeting', () => {
    expect(selectGreeting(rootWith(greetingStateMocks.failedNotFound))).toBeNull()
  })
})

describe('selectIsGreetingLoading', () => {
  it('is true while the request is in flight — the spinner condition', () => {
    expect(selectIsGreetingLoading(rootWith(greetingStateMocks.loading))).toBe(true)
  })

  it('is false before anything was asked for', () => {
    expect(selectIsGreetingLoading(rootWith(greetingStateMocks.idle))).toBe(false)
  })

  it('is false once the load failed, so a spinner never sits on top of an error', () => {
    expect(selectIsGreetingLoading(rootWith(greetingStateMocks.failedOffline))).toBe(false)
  })
})

describe('selectGreetingException', () => {
  it('surfaces the typed exception on failure — the user is offline', () => {
    expect(selectGreetingException(rootWith(greetingStateMocks.failedOffline))?.kind).toBe('offline')
  })

  it('is null on the happy path', () => {
    expect(selectGreetingException(rootWith(greetingStateMocks.loaded))).toBeNull()
  })

  it('is null while loading, so a retry affordance cannot flash mid-request', () => {
    expect(selectGreetingException(rootWith(greetingStateMocks.loading))).toBeNull()
  })
})

describe('selectIsGreetingDetailOpen', () => {
  it('is true after the user opened the detail', () => {
    expect(selectIsGreetingDetailOpen(rootWith(greetingStateMocks.loadedWithDetailOpen))).toBe(true)
  })

  it('is false on a freshly loaded greeting', () => {
    expect(selectIsGreetingDetailOpen(rootWith(greetingStateMocks.loaded))).toBe(false)
  })

  it('is false before anything has loaded at all', () => {
    expect(selectIsGreetingDetailOpen(rootWith(greetingStateMocks.idle))).toBe(false)
  })
})

describe('selectGreetingHeadline', () => {
  it('reads the greeting body once it has loaded', () => {
    expect(selectGreetingHeadline(rootWith(greetingStateMocks.loaded))).toBe('Good morning, Ada.')
  })

  it('falls back to the recipient when the greeting arrived with an empty body', () => {
    expect(selectGreetingHeadline(rootWith(greetingStateMocks.loadedEmptyMessage))).toBe(
      'Hello, nobody.',
    )
  })

  it('shows exception copy instead of the body when the load failed', () => {
    expect(selectGreetingHeadline(rootWith(greetingStateMocks.failedNotFound))).toMatch(
      /could not find/i,
    )
  })

  it('announces the in-flight request rather than an empty line', () => {
    expect(selectGreetingHeadline(rootWith(greetingStateMocks.loading))).toBe(
      'Fetching your greeting…',
    )
  })

  it('is empty before anything has been asked for', () => {
    expect(selectGreetingHeadline(rootWith(greetingStateMocks.idle))).toBe('')
  })
})
