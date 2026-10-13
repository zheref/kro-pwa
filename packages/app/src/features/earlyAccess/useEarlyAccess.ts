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
import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../../library/hooks'
import {
  type EarlyAccessSubmitState,
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

export function useEarlyAccess(): EarlyAccessViewModel {
  const dispatch = useAppDispatch()

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
