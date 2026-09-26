/** Pure state transitions for Endeavor Activity (`RC-4`, `UZF-10`). */
import type { EndeavorActivityException } from './EndeavorActivityException'
import type { EndeavorActivityState } from './EndeavorActivityFeature'
import type { ActivityEndeavor, ActivityRow } from './EndeavorActivityRows'

/** A new endeavor is asked about: remember it and start on the All tab. */
export function withActivityRequested(
  state: EndeavorActivityState,
  endeavorId: string,
): EndeavorActivityState {
  if (state.endeavorId === endeavorId) return state
  return { ...state, endeavorId, tab: 'all' }
}

export function withActivityLoadStarted(
  state: EndeavorActivityState,
): EndeavorActivityState {
  return { ...state, load: { kind: 'loading' } }
}

export function withActivityLoaded(
  state: EndeavorActivityState,
  loaded: {
    readonly endeavor: ActivityEndeavor
    readonly rows: readonly ActivityRow[]
  },
): EndeavorActivityState {
  return {
    ...state,
    endeavorId: loaded.endeavor.id,
    load: { kind: 'loaded', endeavor: loaded.endeavor, rows: loaded.rows },
  }
}

export function withActivityException(
  state: EndeavorActivityState,
  exception: EndeavorActivityException,
): EndeavorActivityState {
  return { ...state, load: { kind: 'failed', exception } }
}
