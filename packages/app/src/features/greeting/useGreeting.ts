/**
 * SCAFFOLDING — the headless half of the demo feature's stateful wrapper
 * (`UZF-4`, `RC-10`, `RC-15`).
 *
 * This is where the loop closes: the hook dispatches intent through the typed
 * hooks, reads everything it renders through named Selectors, and hands the
 * surface a plain view model plus callbacks. It holds **no** `useState` — the
 * feature's state lives in the slice — and it never touches a Service: the mount
 * effect dispatches a Producer thunk, which is the only sanctioned way an effect
 * starts (`RC-3`).
 *
 * The Page / Fragment that renders this arrives with the design-system and shell
 * children (#6, #13); until then the hook *is* the render contract, and its test
 * is what proves the loop runs end to end.
 */
import type { Greeting, GreetingException } from '@kro/core'
import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../library/hooks'
import { childDetailDelegatedClose, onViewLoaded, userDidTapGreeting, userDidTapRetry } from './GreetingFeature'
import { fetchGreetingThunk } from './GreetingProducer'
import {
  selectGreeting,
  selectGreetingException,
  selectGreetingHeadline,
  selectIsGreetingDetailOpen,
  selectIsGreetingLoading,
} from './GreetingSelectors'

export interface GreetingViewModel {
  readonly headline: string
  readonly greeting: Greeting | null
  readonly isLoading: boolean
  readonly exception: GreetingException | null
  readonly canRetry: boolean
  readonly detailOpen: boolean
  readonly onTapGreeting: () => void
  readonly onCloseDetail: () => void
  readonly onRetry: () => void
}

export function useGreeting(recipient: string): GreetingViewModel {
  const dispatch = useAppDispatch()

  const headline = useAppSelector(selectGreetingHeadline)
  const greeting = useAppSelector(selectGreeting)
  const isLoading = useAppSelector(selectIsGreetingLoading)
  const exception = useAppSelector(selectGreetingException)
  const detailOpen = useAppSelector(selectIsGreetingDetailOpen)

  useEffect(() => {
    dispatch(onViewLoaded({ recipient }))
    const effect = dispatch(fetchGreetingThunk({ recipient }))

    // Abort supersedes: a new recipient, or an unmount, cancels the in-flight
    // request instead of letting a stale completion land in state.
    return () => effect.abort()
  }, [dispatch, recipient])

  const onRetry = useCallback(() => {
    dispatch(userDidTapRetry())
    void dispatch(fetchGreetingThunk({ recipient }))
  }, [dispatch, recipient])

  const onTapGreeting = useCallback(() => {
    dispatch(userDidTapGreeting())
  }, [dispatch])

  const onCloseDetail = useCallback(() => {
    dispatch(childDetailDelegatedClose())
  }, [dispatch])

  return {
    headline,
    greeting,
    isLoading,
    exception,
    canRetry: exception?.recoverable ?? false,
    detailOpen,
    onTapGreeting,
    onCloseDetail,
    onRetry,
  }
}
