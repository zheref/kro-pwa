/**
 * Pure state transitions for the early-access form (`RC-4`, `UZF-10`). Each
 * returns a brand-new object; none validates, reads a clock or calls a Service
 * — the Producer decides, the Shifter records.
 */
import type {
  EarlyAccessException,
  EarlyAccessReceipt,
  KroPlatform,
} from '@kro/core'
import {
  type EarlyAccessState,
  initialEarlyAccessState,
} from './EarlyAccessFeature'

/**
 * Typing resets a retryable failure to the form: the visitor is fixing it. An
 * `alreadyJoined` failure is terminal and is left alone — editing the address
 * is a new attempt only through `withStartedOver`.
 */
export function withEmail(
  state: EarlyAccessState,
  value: string,
): EarlyAccessState {
  const settled =
    state.submit.kind === 'failed' && state.submit.exception.recoverable
  return {
    ...state,
    email: value,
    submit: settled ? { kind: 'idle' } : state.submit,
  }
}

export function withEmailTouched(state: EarlyAccessState): EarlyAccessState {
  return { ...state, emailTouched: true }
}

export function withPlatform(
  state: EarlyAccessState,
  platform: KroPlatform,
): EarlyAccessState {
  return { ...state, platform }
}

export function withHoneypot(
  state: EarlyAccessState,
  value: string,
): EarlyAccessState {
  return { ...state, website: value }
}

export function withSubmitting(state: EarlyAccessState): EarlyAccessState {
  return { ...state, submit: { kind: 'submitting' } }
}

export function withJoined(
  state: EarlyAccessState,
  receipt: EarlyAccessReceipt,
): EarlyAccessState {
  return { ...state, submit: { kind: 'joined', receipt } }
}

export function withFailed(
  state: EarlyAccessState,
  exception: EarlyAccessException,
): EarlyAccessState {
  return { ...state, submit: { kind: 'failed', exception } }
}

/** "Try again" / dismiss: back to the form with what the visitor typed. */
export function withFailureDismissed(
  state: EarlyAccessState,
): EarlyAccessState {
  return state.submit.kind === 'failed'
    ? { ...state, submit: { kind: 'idle' } }
    : state
}

/** The success card's reset: an empty form, the chosen platform kept. */
export function withStartedOver(state: EarlyAccessState): EarlyAccessState {
  return { ...initialEarlyAccessState, platform: state.platform }
}
