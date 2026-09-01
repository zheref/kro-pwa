/**
 * SCAFFOLDING — the demo feature's Selectors (`RC-5`).
 *
 * Every derived read lives here, built with `createSelector` and taking
 * `RootState` as its only input. A `useAppSelector((s) => …)` callback may do a
 * plain O(1) field read and nothing more: the moment it combines two fields,
 * formats a string, or filters a list, that logic is a Selector that escaped its
 * file. Cross-slice reads compose here from other Selectors — never by importing
 * another slice's state shape (`RC-20`).
 */
import { greetingExceptionCopy } from '@kro/core'
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../library/store'

const selectGreetingSlice = (state: RootState) => state.greeting

export const selectGreeting = createSelector([selectGreetingSlice], (slice) =>
  slice.load.kind === 'loaded' ? slice.load.greeting : null,
)

export const selectIsGreetingLoading = createSelector(
  [selectGreetingSlice],
  (slice) => slice.load.kind === 'loading',
)

export const selectGreetingException = createSelector(
  [selectGreetingSlice],
  (slice) => (slice.load.kind === 'failed' ? slice.load.exception : null),
)

export const selectIsGreetingDetailOpen = createSelector(
  [selectGreetingSlice],
  (slice) => slice.detailOpen,
)

/**
 * The one line the surface renders, whatever the lifecycle is doing. Failure copy
 * comes from the platform-free `greetingExceptionCopy` switch, so the sentence a
 * user reads is decided once, in the domain tier, and never assembled in a view.
 */
export const selectGreetingHeadline = createSelector(
  [selectGreeting, selectGreetingException, selectIsGreetingLoading],
  (greeting, exception, isLoading) => {
    if (exception !== null) return greetingExceptionCopy(exception)
    if (isLoading) return 'Fetching your greeting…'
    if (greeting === null) return ''
    return greeting.message.length > 0
      ? greeting.message
      : `Hello, ${greeting.recipient}.`
  },
)
