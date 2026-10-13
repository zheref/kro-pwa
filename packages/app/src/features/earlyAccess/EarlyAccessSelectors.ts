/**
 * Derived reads of the early-access form (`RC-5`, `UZF-11`). User copy comes
 * from the exception's `kind` in the domain tier, never assembled in a view
 * (`RC-8`).
 */
import { EarlyAccessMapper } from '@kro/core'
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../library/store'

const slice = (state: RootState) => state.earlyAccess

export const selectEmail = createSelector([slice], (s) => s.email)

export const selectPlatform = createSelector([slice], (s) => s.platform)

export const selectHoneypot = createSelector([slice], (s) => s.website)

export const selectSubmitState = createSelector([slice], (s) => s.submit)

/** A likely address, and not already mid-flight or done. */
export const selectCanSubmit = createSelector(
  [slice],
  (s) =>
    EarlyAccessMapper.isLikelyEmail(s.email.trim()) &&
    s.submit.kind !== 'submitting' &&
    s.submit.kind !== 'joined',
)

export const selectIsSubmitting = createSelector(
  [slice],
  (s) => s.submit.kind === 'submitting',
)

/** The failure's message, or `null` when the form is not in a failed state. */
export const selectFailureCopy = createSelector([slice], (s) =>
  s.submit.kind === 'failed' ? s.submit.exception.message : null,
)

/** Whether the failure invites another try; `alreadyJoined` does not. */
export const selectFailureIsRetryable = createSelector([slice], (s) =>
  s.submit.kind === 'failed' ? s.submit.exception.recoverable : false,
)

export const selectFailureKind = createSelector([slice], (s) =>
  s.submit.kind === 'failed' ? s.submit.exception.kind : null,
)

export const selectReceipt = createSelector([slice], (s) =>
  s.submit.kind === 'joined' ? s.submit.receipt : null,
)

/**
 * The error shown under the email field: after the field was left with
 * something that is not an address, or when the sign-up came back
 * `invalidEmail`. Empty is not an error until a submit says so.
 */
export const selectEmailError = createSelector([slice], (s) => {
  if (s.submit.kind === 'failed' && s.submit.exception.kind === 'invalidEmail')
    return s.submit.exception.message
  const email = s.email.trim()
  if (s.emailTouched && email !== '' && !EarlyAccessMapper.isLikelyEmail(email))
    return 'That email address does not look right — check it and try again.'
  return null
})
