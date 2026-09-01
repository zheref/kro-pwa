/**
 * SCAFFOLDING — the demo feature slice (`RC-1`, `RC-2`, `RC-20`, `RC-24`, `RC-36`).
 *
 * One `createSlice` per feature, its `State` co-located, its name registered
 * exactly once in `library/store.ts`'s reducer map. This file is the reference a
 * feature child (#16+) copies; delete it once real slices exist.
 *
 * Two shapes carry the whole convention:
 *
 * **State (`RC-24`).** The lifecycle is ONE discriminated field, `load`, not a
 * pair of `isLoading` + `exception` fields — the pair can represent "loaded and
 * failed at once", which `UZF-9` forbids by construction.
 *
 * **Events (`RC-2`).** Reducer keys name intent or source, never mechanism:
 * `onViewLoaded`, `userDidTapRetry`, `childDetailDelegatedClose`. There is no
 * `fetchGreeting` action — the effect is a Producer thunk whose type string is
 * itself an event name, and whose three lifecycle phases are the one completion
 * event (`UZF-3`), never a hand-minted succeeded/failed pair.
 */
import {
  type Greeting,
  type GreetingException,
  unknownException,
} from '@kro/core'
import { type PayloadAction, createSlice } from '@reduxjs/toolkit'
import { fetchGreetingThunk } from './GreetingProducer'
import {
  withException,
  withGreetingLoaded,
  withLoadingStarted,
  withRecipientStamped,
} from './GreetingShifters'

export type GreetingLoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'loaded'; readonly greeting: Greeting }
  | { readonly kind: 'failed'; readonly exception: GreetingException }

export interface GreetingState {
  readonly recipient: string | null
  readonly load: GreetingLoadState
  readonly detailOpen: boolean
}

export const initialGreetingState: GreetingState = {
  recipient: null,
  load: { kind: 'idle' },
  detailOpen: false,
}

export const greetingSlice = createSlice({
  name: 'greeting',
  initialState: initialGreetingState,
  reducers: {
    /** Lifecycle signal: the surface mounted and knows who it is greeting. */
    onViewLoaded(state, action: PayloadAction<{ recipient: string }>) {
      Object.assign(
        state,
        withRecipientStamped(state, action.payload.recipient),
      )
    },

    /** User intent: the retry affordance a recoverable exception offered. */
    userDidTapRetry(state) {
      Object.assign(state, withLoadingStarted(state))
    },

    /** User intent, single primitive field — the one mutation allowed to skip a Shifter. */
    userDidTapGreeting(state) {
      state.detailOpen = true
    },

    /** A child fragment talking back rather than reaching into this slice itself. */
    childDetailDelegatedClose(state) {
      state.detailOpen = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGreetingThunk.pending, (state) => {
        Object.assign(state, withLoadingStarted(state))
      })
      .addCase(fetchGreetingThunk.fulfilled, (state, action) => {
        // The payload is a `Result`, never a bare success value (`RC-26`).
        const result = action.payload
        if (result.ok) {
          Object.assign(state, withGreetingLoaded(state, result.value))
        } else {
          Object.assign(state, withException(state, result.error))
        }
      })
      // Defensive only: the payload creator catches everything, so a domain
      // failure never reaches here. It routes into the same exception Shifter as
      // the `.fulfilled` false branch — never a second state shape (`RC-26`).
      .addCase(fetchGreetingThunk.rejected, (state, action) => {
        // Cancellation is the only silent exit (`UZF-14`): an aborted dispatch —
        // the surface unmounted, or a newer recipient superseded this one — is
        // not a failure and must never paint an exception.
        if (action.meta.aborted) return

        Object.assign(
          state,
          withException(
            state,
            unknownException(action.error.message ?? 'Unknown error'),
          ),
        )
      })
  },
})

export const {
  childDetailDelegatedClose,
  onViewLoaded,
  userDidTapGreeting,
  userDidTapRetry,
} = greetingSlice.actions
