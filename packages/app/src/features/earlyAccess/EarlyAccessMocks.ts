/**
 * Canned `EarlyAccessState` variants (`RC-31`, `UZF-18`). Stories, render
 * tests and selector tests read from here; the form's `State` is never built
 * inline.
 */
import { EarlyAccessExceptions, EarlyAccessMapper } from '@kro/core'
import { earlyAccessMocks } from '@kro/core/mocks'
import {
  type ThunkExtra,
  makeStore,
  stubbedThunkExtra,
} from '../../library/store'
import { type EarlyAccessState, earlyAccessSlice } from './EarlyAccessFeature'

const base: EarlyAccessState = earlyAccessSlice.getInitialState()

export const EarlyAccessMocks = {
  idle: base,
  typing: {
    ...base,
    email: 'ada@example.com',
    platform: 'macos',
  } satisfies EarlyAccessState,
  typingInvalid: {
    ...base,
    email: 'ada@',
    emailTouched: true,
  } satisfies EarlyAccessState,
  submitting: {
    ...base,
    email: 'ada@example.com',
    submit: { kind: 'submitting' },
  } satisfies EarlyAccessState,
  joined: {
    ...base,
    email: earlyAccessMocks.typical.email,
    platform: earlyAccessMocks.typical.platform,
    submit: { kind: 'joined', receipt: earlyAccessMocks.typical },
  } satisfies EarlyAccessState,
  failedInvalid: {
    ...base,
    email: 'ada@',
    submit: { kind: 'failed', exception: EarlyAccessExceptions.invalidEmail() },
  } satisfies EarlyAccessState,
  failedAlreadyJoined: {
    ...base,
    email: 'already@kro.invalid',
    submit: {
      kind: 'failed',
      exception: EarlyAccessExceptions.alreadyJoined(),
    },
  } satisfies EarlyAccessState,
  failedOffline: {
    ...base,
    email: 'ada@example.com',
    submit: { kind: 'failed', exception: EarlyAccessExceptions.offline() },
  } satisfies EarlyAccessState,
  failedUnavailable: {
    ...base,
    email: 'ada@example.com',
    submit: {
      kind: 'failed',
      exception: EarlyAccessExceptions.unavailable(),
    },
  } satisfies EarlyAccessState,
}

const noop = (): void => undefined

/** Every callback as a no-op — a story's starting point. */
export const noopEarlyAccessCallbacks = {
  onEmailChange: noop,
  onEmailBlur: noop,
  onPlatformChange: noop,
  onHoneypotChange: noop,
  onSubmit: noop,
  onDismissFailure: noop,
  onStartOver: noop,
  onOpenHub: noop,
}

/**
 * The Fragment's props for a state mock. The email error and failure copy are
 * what the Selectors derive from that state, restated here from the same
 * exception messages so a story and a render test agree on the words.
 */
export const earlyAccessFragmentProps = (
  state: EarlyAccessState,
  hubUrl = '/my-day',
  contactEmail: string | null = null,
) => {
  const failed = state.submit.kind === 'failed' ? state.submit.exception : null
  const emailError =
    failed?.kind === 'invalidEmail'
      ? failed.message
      : state.emailTouched &&
          state.email !== '' &&
          !EarlyAccessMapper.isLikelyEmail(state.email)
        ? EarlyAccessExceptions.invalidEmail().message
        : null
  return {
    email: state.email,
    platform: state.platform,
    website: state.website,
    submit: state.submit,
    emailError,
    failureCopy: failed?.message ?? null,
    failureIsRetryable: failed?.recoverable ?? false,
    hubUrl,
    contactEmail,
    ...noopEarlyAccessCallbacks,
  }
}

/**
 * A store on the stubbed extra, so a story never reaches a network: the
 * stubbed sign-up and analytics Services send nothing. The one way a story or
 * test gets a store is `makeStore` (`RC-22`); `overrides` swaps a Service for
 * a double the caller builds (a recording one, imported from its Service
 * module — a test may, a mocks file may not).
 */
export const makeEarlyAccessStore = (overrides: Partial<ThunkExtra> = {}) => ({
  store: makeStore({ ...stubbedThunkExtra, ...overrides }),
})
