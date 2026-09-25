/**
 * Endeavor Activity — the web port of canon's `EndeavorActivityView`: every
 * recorded performance of one endeavor, filterable by resolution.
 *
 * One slice (`RC-1`), one lifecycle field (`RC-24`, `UZF-9`): the loaded case
 * carries the endeavor and its rows, the failed case carries the exception,
 * so the two can never coexist.
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { EndeavorActivityException } from './EndeavorActivityException'
import { EndeavorActivityExceptions } from './EndeavorActivityException'
import { loadEndeavorActivityThunk } from './EndeavorActivityProducer'
import type {
  ActivityEndeavor,
  ActivityRow,
  ActivityTab,
} from './EndeavorActivityRows'
import {
  withActivityException,
  withActivityLoaded,
  withActivityLoadStarted,
  withActivityRequested,
} from './EndeavorActivityShifters'

export type EndeavorActivityLoad =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'loaded'
      readonly endeavor: ActivityEndeavor
      readonly rows: readonly ActivityRow[]
    }
  | { readonly kind: 'failed'; readonly exception: EndeavorActivityException }

export interface EndeavorActivityState {
  readonly endeavorId: string | null
  readonly tab: ActivityTab
  readonly load: EndeavorActivityLoad
}

export const initialEndeavorActivityState: EndeavorActivityState = {
  endeavorId: null,
  tab: 'all',
  load: { kind: 'idle' },
}

export const endeavorActivitySlice = createSlice({
  name: 'endeavorActivity',
  initialState: initialEndeavorActivityState,
  reducers: {
    onActivityRequested(state, action: PayloadAction<{ endeavorId: string }>) {
      Object.assign(
        state,
        withActivityRequested(state, action.payload.endeavorId),
      )
    },
    userDidSelectActivityTab(
      state,
      action: PayloadAction<{ tab: ActivityTab }>,
    ) {
      state.tab = action.payload.tab
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadEndeavorActivityThunk.pending, (state) => {
        Object.assign(state, withActivityLoadStarted(state))
      })
      .addCase(loadEndeavorActivityThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(state, withActivityLoaded(state, result.value))
        } else {
          Object.assign(state, withActivityException(state, result.error))
        }
      })
      // Defensive only — the Producer never throws (`RC-26`). Cancellation is
      // the one silent exit (`UZF-14`).
      .addCase(loadEndeavorActivityThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withActivityException(
            state,
            EndeavorActivityExceptions.unknown(
              action.error.message ?? 'Unknown error',
            ),
          ),
        )
      })
  },
})

export const { onActivityRequested, userDidSelectActivityTab } =
  endeavorActivitySlice.actions
