'use client'

/**
 * The auth surface — canon `AuthView` (`RC-15`: passive; every value and every
 * intent is a prop, and it dispatches nothing).
 *
 * Canon's composition, kept: the indigo→grape field, a glass form card holding
 * the fields and the primary action, an "or continue with" divider above the
 * two provider buttons, and the sign-in ⇄ create toggle at the bottom. Canon's
 * `.preferredColorScheme(.dark)` is the reason the surface pins `data-theme` to
 * dark: the whole thing sits on a saturated gradient, and a light scheme would
 * put light-on-light text on it.
 *
 * ## The honest unavailable state
 *
 * Canon has no such state — the iOS build resolves its Supabase connection from
 * a bundled resolver and `fatalError`s without one. On the web, signed-out
 * local-only use is a first-class mode (`authenticationEnforced` is OFF), so a
 * checkout with no `NEXT_PUBLIC_SUPABASE_*` is a *state this surface reports*,
 * not a crash: every control is disabled, and the copy says the app still works
 * on this device. KC-IS-#31's `AuthExceptions.unavailable` is where that comes
 * from; this Fragment only renders it.
 *
 * Both provider buttons carry the providers' own artwork rather than an SF
 * Symbol — see `ProviderMarks`.
 */
import type { ReactNode } from 'react'
import { colorVar } from '../../../design/system/tokens/roles'
import { GlassSurface } from '../../../design/system/glass/GlassSurface'
import { GradientBackdrop } from '../../../design/system/gradient/GradientBackdrop'
import { cn } from '../../../design/system/utils/cn'
import { AuthFlow, AuthMode } from '../AuthState'
import { AppleMark, GoogleMark } from './ProviderMarks'

export interface AuthSurfaceFragmentProps {
  readonly mode: AuthMode
  readonly email: string
  readonly password: string
  readonly name: string
  /** Copy for the error banner, or `null`. Canon's `errorMessage`. */
  readonly errorCopy: string | null
  /** Which provider flow is spinning, or `null`. Canon's `isLoading`, typed. */
  readonly authenticatingFlow: AuthFlow | null
  /** Canon's `isSignInReady`/`isSignUpReady`, resolved for the current mode. */
  readonly isSubmitEnabled: boolean
  /** No Supabase project is configured — every control is inert and says why. */
  readonly isUnavailable: boolean
  readonly onChangeEmail: (value: string) => void
  readonly onChangePassword: (value: string) => void
  readonly onChangeName: (value: string) => void
  readonly onSubmit: () => void
  readonly onToggleMode: () => void
  readonly onTapApple: () => void
  readonly onTapGoogle: () => void
  readonly onTapCancel: () => void
}

export function AuthSurfaceFragment({
  mode,
  email,
  password,
  name,
  errorCopy,
  authenticatingFlow,
  isSubmitEnabled,
  isUnavailable,
  onChangeEmail,
  onChangePassword,
  onChangeName,
  onSubmit,
  onToggleMode,
  onTapApple,
  onTapGoogle,
  onTapCancel,
}: AuthSurfaceFragmentProps) {
  const isSignIn = mode === AuthMode.signIn
  const isBusy = authenticatingFlow !== null

  return (
    <div
      // Canon's `.preferredColorScheme(.dark)`. The attribute is the design
      // system's own scoping mechanism, so nested tokens resolve to the dark
      // scheme without touching the document.
      data-theme="dark"
      data-testid="auth-surface"
      data-mode={mode}
      className="relative flex w-full flex-col overflow-hidden rounded-kro-surface"
    >
      <GradientBackdrop height="100%" hardEdge className="absolute inset-0" />

      <div className="relative flex w-full flex-col items-stretch gap-kro-medium p-kro-large">
        <div className="flex items-start justify-between">
          <span />
          <button
            type="button"
            onClick={onTapCancel}
            className={cn(
              'inline-flex h-9 items-center rounded-kro-small px-2 text-[15px] font-medium',
              'outline-none focus-visible:shadow-[var(--kro-ring)]',
            )}
            style={{ color: colorVar('fore') }}
          >
            Cancel
          </button>
        </div>

        <header className="flex flex-col items-center gap-2 pb-kro-small text-center">
          <span
            className="text-[34px] font-bold tracking-tight"
            style={{ color: colorVar('fore') }}
          >
            Kro
          </span>
          <span className="text-[15px]" style={{ color: colorVar('foreSecondary') }}>
            {isSignIn ? 'Welcome back' : 'Create your account'}
          </span>
        </header>

        {isUnavailable ? (
          <p
            role="status"
            data-testid="auth-unavailable"
            className="m-0 rounded-kro-field p-3 text-[13px] leading-snug"
            style={{
              backgroundColor: colorVar('bannerWarning'),
              color: colorVar('fore'),
            }}
          >
            Kro Cloud is not set up for this build, so signing in is unavailable
            here. You can keep using Kro on this device — everything you create
            stays local until an account exists.
          </p>
        ) : null}

        <GlassSurface
          material="surface"
          className="flex w-full flex-col overflow-hidden rounded-kro-surface"
        >
          <form
            data-testid="auth-form"
            onSubmit={(event) => {
              event.preventDefault()
              onSubmit()
            }}
            className="flex w-full flex-col"
          >
            {isSignIn ? null : (
              <Field
                id="auth-name"
                label="Full name"
                type="text"
                autoComplete="name"
                value={name}
                isDisabled={isUnavailable || isBusy}
                onChange={onChangeName}
              />
            )}
            <Field
              id="auth-email"
              label="Email address"
              type="email"
              autoComplete="email"
              value={email}
              isDisabled={isUnavailable || isBusy}
              onChange={onChangeEmail}
            />
            <Field
              id="auth-password"
              label="Password"
              type="password"
              autoComplete={isSignIn ? 'current-password' : 'new-password'}
              value={password}
              isDisabled={isUnavailable || isBusy}
              onChange={onChangePassword}
            />

            {/*
              The unavailable banner above already says this, calmly. Repeating
              it here in red would tell the user their *credentials* were
              rejected, when in fact they have not tried anything — so the
              inline error is suppressed while the deployment itself is the
              problem.
            */}
            {errorCopy === null || isUnavailable ? null : (
              <p
                role="alert"
                data-testid="auth-error"
                className="m-0 px-4 py-2.5 text-[13px]"
                style={{ color: colorVar('kroRed') }}
              >
                {errorCopy}
              </p>
            )}

            <button
              type="submit"
              data-testid="auth-submit"
              disabled={isUnavailable || !isSubmitEnabled}
              className={cn(
                'flex h-12 w-full items-center justify-center text-[15px] font-semibold',
                'outline-none focus-visible:shadow-[var(--kro-ring)]',
                'disabled:cursor-not-allowed',
              )}
              style={{
                backgroundColor: colorVar('accent'),
                color: colorVar('onAccent'),
                opacity: isUnavailable || !isSubmitEnabled ? 0.62 : undefined,
              }}
            >
              {authenticatingFlow === AuthFlow.emailPassword
                ? 'Signing in…'
                : isSignIn
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          </form>
        </GlassSurface>

        {/*
          Canon's disabled-control rule: a disabled submit names what blocks it.
          `isSubmitEnabled` is false either because a field is empty or because
          the password is under canon's six-character minimum, so the hint says
          which — an empty form gets the shorter sentence.
        */}
        {isUnavailable || isSubmitEnabled ? null : (
          <p
            data-testid="auth-submit-hint"
            className="m-0 text-center text-[13px]"
            style={{ color: colorVar('foreSecondary') }}
          >
            {isSignIn
              ? 'Enter your email and password to continue.'
              : 'Enter your name, email and a password of at least 6 characters.'}
          </p>
        )}

        <div className="flex items-center gap-3" aria-hidden>
          <span
            className="h-px flex-1"
            style={{ backgroundColor: colorVar('hairline') }}
          />
          <span className="text-[12px]" style={{ color: colorVar('foreSecondary') }}>
            or continue with
          </span>
          <span
            className="h-px flex-1"
            style={{ backgroundColor: colorVar('hairline') }}
          />
        </div>

        {/*
          Provider branding: Apple's control is white-on-black artwork with the
          exact wordmark; Google's is the four-colour G on white. Neither is
          restyled to the app's palette, which is what both guidelines require.
        */}
        <ProviderButton
          testId="auth-apple"
          label="Sign in with Apple"
          isDisabled={isUnavailable || isBusy}
          isBusy={authenticatingFlow === AuthFlow.apple}
          background="#000000"
          foreground="#ffffff"
          onClick={onTapApple}
        >
          <AppleMark />
        </ProviderButton>

        <ProviderButton
          testId="auth-google"
          label="Sign in with Google"
          isDisabled={isUnavailable || isBusy}
          isBusy={authenticatingFlow === AuthFlow.google}
          background="#ffffff"
          foreground="#1f1f1f"
          onClick={onTapGoogle}
        >
          <GoogleMark />
        </ProviderButton>

        <button
          type="button"
          data-testid="auth-toggle-mode"
          onClick={onToggleMode}
          disabled={isBusy}
          className={cn(
            'mx-auto inline-flex h-11 items-center gap-1 rounded-kro-small px-2 text-[15px]',
            'outline-none focus-visible:shadow-[var(--kro-ring)]',
          )}
          style={{ color: colorVar('foreSecondary') }}
        >
          {isSignIn ? "Don't have an account?" : 'Already have an account?'}
          <span className="font-semibold" style={{ color: colorVar('fore') }}>
            {isSignIn ? 'Sign Up' : 'Sign In'}
          </span>
        </button>
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  type,
  autoComplete,
  value,
  isDisabled,
  onChange,
}: {
  readonly id: string
  readonly label: string
  readonly type: 'text' | 'email' | 'password'
  readonly autoComplete: string
  readonly value: string
  readonly isDisabled: boolean
  readonly onChange: (value: string) => void
}) {
  return (
    <div
      className="flex w-full flex-col gap-1 border-b px-4 py-3"
      style={{ borderColor: colorVar('hairline') }}
    >
      <label
        htmlFor={id}
        className="text-[12px] font-medium"
        style={{ color: colorVar('foreSecondary') }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        disabled={isDisabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'w-full bg-transparent text-[15px] outline-none',
          'disabled:cursor-not-allowed',
        )}
        style={{ color: colorVar('fore'), opacity: isDisabled ? 0.62 : undefined }}
      />
    </div>
  )
}

function ProviderButton({
  testId,
  label,
  isDisabled,
  isBusy,
  background,
  foreground,
  onClick,
  children,
}: {
  readonly testId: string
  readonly label: string
  readonly isDisabled: boolean
  readonly isBusy: boolean
  readonly background: string
  readonly foreground: string
  readonly onClick: () => void
  readonly children: ReactNode
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        'flex h-12 w-full items-center justify-center gap-2.5 rounded-kro-field',
        'text-[15px] font-medium outline-none focus-visible:shadow-[var(--kro-ring)]',
        'disabled:cursor-not-allowed',
      )}
      style={{
        backgroundColor: background,
        color: foreground,
        opacity: isDisabled ? 0.62 : undefined,
      }}
    >
      {children}
      {isBusy ? 'Signing in…' : label}
    </button>
  )
}
