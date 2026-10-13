/**
 * The early-access form's slice (`RC-1`, `RC-24`, `RC-36`).
 *
 * The sign-up lifecycle is ONE discriminated field, `submit` — idle,
 * submitting, joined (carrying the receipt) or failed (carrying the typed
 * exception) — so "joined and failed at once" cannot be represented (`UZF-9`).
 * `website` is the honeypot: a field no human sees, so anything in it is a bot.
 */
import {
  type EarlyAccessException,
  type EarlyAccessReceipt,
  type KroPlatform,
  unknownException,
} from '@kro/core'
import { type PayloadAction, createSlice } from '@reduxjs/toolkit'
import { joinEarlyAccessThunk } from './EarlyAccessProducer'
import {
  withEmail,
  withEmailTouched,
  withFailed,
  withFailureDismissed,
  withHoneypot,
  withJoined,
  withPlatform,
  withStartedOver,
  withSubmitting,
} from './EarlyAccessShifters'

export type EarlyAccessSubmitState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting' }
  | { readonly kind: 'joined'; readonly receipt: EarlyAccessReceipt }
  | { readonly kind: 'failed'; readonly exception: EarlyAccessException }

export interface EarlyAccessState {
  readonly email: string
  /** Whether the email field has been left once — validation shows after. */
  readonly emailTouched: boolean
  readonly platform: KroPlatform
  /** The honeypot. Never rendered visibly; never sent. */
  readonly website: string
  readonly submit: EarlyAccessSubmitState
}

export const initialEarlyAccessState: EarlyAccessState = {
  email: '',
  emailTouched: false,
  platform: 'ios',
  website: '',
  submit: { kind: 'idle' },
}

export const earlyAccessSlice = createSlice({
  name: 'earlyAccess',
  initialState: initialEarlyAccessState,
  reducers: {
    userDidEditEmail(state, action: PayloadAction<{ value: string }>) {
      Object.assign(state, withEmail(state, action.payload.value))
    },
    /** User intent: the visitor left the email field — validate it now. */
    userDidBlurEmail(state) {
      Object.assign(state, withEmailTouched(state))
    },
    userDidPickPlatform(
      state,
      action: PayloadAction<{ platform: KroPlatform }>,
    ) {
      Object.assign(state, withPlatform(state, action.payload.platform))
    },
    userDidEditHoneypot(state, action: PayloadAction<{ value: string }>) {
      Object.assign(state, withHoneypot(state, action.payload.value))
    },
    userDidDismissFailure(state) {
      Object.assign(state, withFailureDismissed(state))
    },
    userDidStartOver(state) {
      Object.assign(state, withStartedOver(state))
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(joinEarlyAccessThunk.pending, (state) => {
        Object.assign(state, withSubmitting(state))
      })
      .addCase(joinEarlyAccessThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(state, withJoined(state, result.value))
        } else {
          Object.assign(state, withFailed(state, result.error))
        }
      })
      // Defensive only: the payload creator catches everything.
      .addCase(joinEarlyAccessThunk.rejected, (state, action) => {
        // Cancellation is the one silent exit (`UZF-14`); so is a dispatch the
        // thunk's own `condition` declined (a second press while submitting).
        if (action.meta.aborted || action.meta.condition) return
        Object.assign(
          state,
          withFailed(
            state,
            unknownException(action.error.message ?? 'Unknown error'),
          ),
        )
      })
  },
})

export const {
  userDidBlurEmail,
  userDidDismissFailure,
  userDidEditEmail,
  userDidEditHoneypot,
  userDidPickPlatform,
  userDidStartOver,
} = earlyAccessSlice.actions
