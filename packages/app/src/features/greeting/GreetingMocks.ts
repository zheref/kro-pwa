/**
 * SCAFFOLDING — canned `GreetingState` variants (`UZF-18`).
 *
 * Stories, render tests and selector tests all read from here; a feature's
 * `State` is never constructed inline in a test or a story, so the set of states
 * the product claims to support is enumerable in one file.
 */
import { GreetingExceptions } from '@kro/core'
import { greetingMocks } from '@kro/core/mocks'
import { type GreetingState, initialGreetingState } from './GreetingFeature'

export const greetingStateMocks = {
  /** Nothing has been asked for yet — first paint before the surface mounts. */
  idle: initialGreetingState,

  /** A request is in flight for a named recipient. */
  loading: {
    recipient: 'ada',
    load: { kind: 'loading' },
    detailOpen: false,
  } satisfies GreetingState,

  /** The ordinary success state. */
  loaded: {
    recipient: 'ada',
    load: { kind: 'loaded', greeting: greetingMocks.typical },
    detailOpen: false,
  } satisfies GreetingState,

  /** Loaded, with the detail surface open on top of it. */
  loadedWithDetailOpen: {
    recipient: 'ada',
    load: { kind: 'loaded', greeting: greetingMocks.typical },
    detailOpen: true,
  } satisfies GreetingState,

  /** Loaded, but the greeting has no body — the empty-copy fallback path. */
  loadedEmptyMessage: {
    recipient: 'nobody',
    load: { kind: 'loaded', greeting: greetingMocks.emptyMessage },
    detailOpen: false,
  } satisfies GreetingState,

  /** Recoverable failure — the surface offers a retry. */
  failedOffline: {
    recipient: 'ada',
    load: { kind: 'failed', exception: GreetingExceptions.offline() },
    detailOpen: false,
  } satisfies GreetingState,

  /** Unrecoverable failure — retrying the same request cannot help. */
  failedNotFound: {
    recipient: 'nobody-at-all',
    load: { kind: 'failed', exception: GreetingExceptions.notFound() },
    detailOpen: false,
  } satisfies GreetingState,
}
