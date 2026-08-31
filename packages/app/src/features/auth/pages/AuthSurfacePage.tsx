'use client'

/**
 * The auth surface's stateful container (`RC-37`; implements `UZF-4`).
 *
 * The only artifact in this lane that calls both `useAppSelector` and
 * `useAppDispatch`. It selects through KC-IS-#31's named Selectors, dispatches
 * that feature's Producers, and renders exactly one Fragment.
 *
 * ## Both providers go through the OAuth redirect
 *
 * Canon splits Apple in two — `beginAppleSignInThunk` mints a nonce pair and
 * `signInWithAppleThunk` exchanges the id token Apple's native control hands
 * back. That split exists because iOS *has* a native control. The web does not:
 * `ASAuthorizationAppleIDCredential` has no browser counterpart, and Apple's
 * JS SDK is a separate script this repo does not load. So both buttons take
 * `startOAuthRedirectThunk`, which KC-IS-#31 built for exactly this — its own
 * header calls it "Google, **and Apple with no id token**". The nonce pair
 * stays unused here rather than being minted and thrown away, so no stale nonce
 * can ever sit in state waiting to be replayed.
 *
 * ## Where the redirect comes back to
 *
 * `redirectTo` defaults to this document's origin. Reading `location` here is
 * the one platform read this Page makes, for the same reason the shell reads
 * `matchMedia`: it is a property of the browser the surface is rendering in,
 * not data. It is a prop first, so a story and a test never touch `location` at
 * all.
 */
import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import {
  userDidChangeEmail,
  userDidChangeName,
  userDidChangePassword,
  userDidTapToggleMode,
} from '../AuthFeature'
import {
  signInWithEmailThunk,
  signUpWithEmailThunk,
  startOAuthRedirectThunk,
} from '../AuthProducer'
import {
  selectAuthErrorCopy,
  selectAuthException,
  selectAuthForm,
  selectAuthMode,
  selectAuthenticatingFlow,
  selectIsSubmitEnabled,
} from '../AuthSelectors'
import { AuthMode } from '../AuthState'
import { AuthSurfaceFragment } from './AuthSurfaceFragment'

export interface AuthSurfacePageProps {
  /** Where a provider sends the browser back to. Defaults to this origin. */
  readonly redirectTo?: string
  /** Canon's Cancel — the presenter decides what dismissal means. */
  readonly onDismiss: () => void
}

/** This document's origin, or `''` where there is no document (SSR, a test). */
export const currentOrigin = (): string =>
  typeof globalThis.location === 'undefined' ? '' : globalThis.location.origin

export function AuthSurfacePage({
  redirectTo,
  onDismiss,
}: AuthSurfacePageProps) {
  const dispatch = useAppDispatch()

  const mode = useAppSelector(selectAuthMode)
  const form = useAppSelector(selectAuthForm)
  const errorCopy = useAppSelector(selectAuthErrorCopy)
  const exception = useAppSelector(selectAuthException)
  const authenticatingFlow = useAppSelector(selectAuthenticatingFlow)
  const isSubmitEnabled = useAppSelector(selectIsSubmitEnabled)

  const target = redirectTo ?? currentOrigin()

  const onSubmit = useCallback(() => {
    const now = new Date()
    if (mode === AuthMode.signIn) {
      void dispatch(
        signInWithEmailThunk({ email: form.email, password: form.password, now }),
      )
      return
    }
    void dispatch(
      signUpWithEmailThunk({
        email: form.email,
        password: form.password,
        name: form.name,
        now,
      }),
    )
  }, [dispatch, form.email, form.name, form.password, mode])

  return (
    <AuthSurfaceFragment
      mode={mode}
      email={form.email}
      password={form.password}
      name={form.name}
      errorCopy={errorCopy}
      authenticatingFlow={authenticatingFlow}
      isSubmitEnabled={isSubmitEnabled}
      // `unavailable` is the one exception that describes the *deployment*
      // rather than the attempt, so it disables the surface instead of showing
      // a banner the user could retry past.
      isUnavailable={exception?.kind === 'unavailable'}
      onChangeEmail={(value) => dispatch(userDidChangeEmail(value))}
      onChangePassword={(value) => dispatch(userDidChangePassword(value))}
      onChangeName={(value) => dispatch(userDidChangeName(value))}
      onSubmit={onSubmit}
      onToggleMode={() => dispatch(userDidTapToggleMode())}
      onTapApple={() => {
        void dispatch(
          startOAuthRedirectThunk({ provider: 'apple', redirectTo: target }),
        )
      }}
      onTapGoogle={() => {
        void dispatch(
          startOAuthRedirectThunk({ provider: 'google', redirectTo: target }),
        )
      }}
      onTapCancel={onDismiss}
    />
  )
}
