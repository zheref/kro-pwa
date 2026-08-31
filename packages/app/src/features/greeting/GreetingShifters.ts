/**
 * SCAFFOLDING — the demo feature's Shifters (`RC-4`, `RC-19`).
 *
 * A Shifter is a pure `with…(state, args)` function returning a brand-new plain
 * object. No I/O, no `Date.now()`, no `Math.random()`, no Service — if a shift
 * needs the clock or an id, the reducer arm passes it in as an argument. Reducer
 * arms apply them as `Object.assign(state, withThing(state, args))`, the only
 * sanctioned multi-field mutation; a single primitive assignment may be written
 * inline, and nothing else may.
 */
import type { Greeting, GreetingException } from '@kro/core'
import type { GreetingState } from './GreetingFeature'

/** One concern: a recipient was named, so the previous outcome is now stale. */
export function withRecipientStamped(state: GreetingState, recipient: string): GreetingState {
  return { ...state, recipient, load: { kind: 'loading' }, detailOpen: false }
}

/** One concern: a request is in flight, so any prior exception is cleared. */
export function withLoadingStarted(state: GreetingState): GreetingState {
  return { ...state, load: { kind: 'loading' } }
}

export function withGreetingLoaded(state: GreetingState, greeting: Greeting): GreetingState {
  return { ...state, load: { kind: 'loaded', greeting } }
}

/** One concern: the load failed, so nothing can be showing its detail. */
export function withException(state: GreetingState, exception: GreetingException): GreetingState {
  return { ...state, load: { kind: 'failed', exception }, detailOpen: false }
}
