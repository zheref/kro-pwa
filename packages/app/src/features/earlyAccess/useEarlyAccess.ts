/**
 * The headless half of the early-access Page (`UZF-4`, `RC-10`).
 *
 * Dispatches intent through the typed hooks, reads every value through a named
 * Selector, and returns a view model plus callbacks. It holds NO `useState`:
 * the form's state lives in the slice.
 */
import type {
  EarlyAccessReceipt,
  EarlyAccessExceptionKind,
  KroPlatform,
} from '@kro/core'
import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../library/hooks'
import {
  type EarlyAccessSubmitState,
  onPlatformRequested,
  userDidBlurEmail,
  userDidDismissFailure,
  userDidEditEmail,
  userDidEditHoneypot,
  userDidPickPlatform,
  userDidStartOver,
} from './EarlyAccessFeature'
import { joinEarlyAccessThunk } from './EarlyAccessProducer'
import {
  selectCanSubmit,
  selectEmail,
  selectEmailError,
  selectFailureCopy,
  selectFailureIsRetryable,
  selectFailureKind,
  selectHoneypot,
  selectPlatform,
  selectReceipt,
  selectSubmitState,
} from './EarlyAccessSelectors'

export interface EarlyAccessViewModel {
  readonly email: string
  readonly platform: KroPlatform
  readonly website: string
  readonly submit: EarlyAccessSubmitState
  readonly canSubmit: boolean
  readonly emailError: string | null
  readonly failureCopy: string | null
  readonly failureKind: EarlyAccessExceptionKind | null
  readonly failureIsRetryable: boolean
  readonly receipt: EarlyAccessReceipt | null
  readonly onEmailChange: (value: string) => void
  readonly onEmailBlur: () => void
  readonly onPlatformChange: (platform: KroPlatform) => void
  readonly onHoneypotChange: (value: string) => void
  readonly onSubmit: () => void
  readonly onDismissFailure: () => void
  readonly onStartOver: () => void
}

/**
 * A platform the page above asked for. `seq` counts the asks, so the same
 * platform requested twice still reaches the form twice.
 */
export interface RequestedPlatform {
  readonly platform: KroPlatform
  readonly seq: number
}

export function useEarlyAccess(
  requestedPlatform: RequestedPlatform | null = null,
): EarlyAccessViewModel {
  const dispatch = useAppDispatch()

  // The page above never writes this slice: it hands a request down, and the
  // form turns it into its OWN event (`RC-1`). Keyed on `seq`, not the value.
  const requestedSeq = requestedPlatform?.seq ?? null
  const requested = requestedPlatform?.platform ?? null
  useEffect(() => {
    if (requestedSeq === null || requested === null) return
    dispatch(onPlatformRequested({ platform: requested }))
  }, [dispatch, requestedSeq, requested])

  const email = useAppSelector(selectEmail)
  const platform = useAppSelector(selectPlatform)
  const website = useAppSelector(selectHoneypot)
  const submit = useAppSelector(selectSubmitState)
  const canSubmit = useAppSelector(selectCanSubmit)
  const emailError = useAppSelector(selectEmailError)
  const failureCopy = useAppSelector(selectFailureCopy)
  const failureKind = useAppSelector(selectFailureKind)
  const failureIsRetryable = useAppSelector(selectFailureIsRetryable)
  const receipt = useAppSelector(selectReceipt)

  const onEmailChange = useCallback(
    (value: string) => {
      dispatch(userDidEditEmail({ value }))
    },
    [dispatch],
  )
  const onEmailBlur = useCallback(() => {
    dispatch(userDidBlurEmail())
  }, [dispatch])
  const onPlatformChange = useCallback(
    (next: KroPlatform) => {
      dispatch(userDidPickPlatform({ platform: next }))
    },
    [dispatch],
  )
  const onHoneypotChange = useCallback(
    (value: string) => {
      dispatch(userDidEditHoneypot({ value }))
    },
    [dispatch],
  )
  const onSubmit = useCallback(() => {
    // Touch the field first so a submit of garbage shows its error at once.
    dispatch(userDidBlurEmail())
    void dispatch(joinEarlyAccessThunk())
  }, [dispatch])
  const onDismissFailure = useCallback(() => {
    dispatch(userDidDismissFailure())
  }, [dispatch])
  const onStartOver = useCallback(() => {
    dispatch(userDidStartOver())
  }, [dispatch])

  return {
    email,
    platform,
    website,
    submit,
    canSubmit,
    emailError,
    failureCopy,
    failureKind,
    failureIsRetryable,
    receipt,
    onEmailChange,
    onEmailBlur,
    onPlatformChange,
    onHoneypotChange,
    onSubmit,
    onDismissFailure,
    onStartOver,
  }
}
