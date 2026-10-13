/**
 * The early-access form card — a pure Fragment (`RC-15`, `UZF-4`).
 *
 * Every value and every intent arrives as a prop or a callback; nothing here
 * reads the store. Five visible states, one per `submit` kind plus the field
 * error: the form (idle/typing), submitting (button disabled, a spinner),
 * joined (a success card) and failed (the exception's own copy; a retryable
 * one offers "Try again", `alreadyJoined` does not).
 *
 * Keyboard-only completion is native: a `form` with a labelled email field, a
 * radio group of platforms and one submit button. The honeypot is positioned
 * off-screen, `aria-hidden`, out of the tab order and told not to autofill.
 */
import { KroPlatforms } from '@kro/core'
import type { KroPlatform } from '@kro/core'
import { useEffect, useId, useRef } from 'react'
import { Button, GlassSurface, Input, Field } from '../../../design'
import { Spinner } from '../../../design/fluent/status/Spinner'
import type { EarlyAccessSubmitState } from '../EarlyAccessFeature'
import {
  EARLY_ACCESS_PLATFORM_ORDER,
  EARLY_ACCESS_PRIVACY_NOTICE,
  EARLY_ACCESS_REMOVAL_LEAD,
  EARLY_ACCESS_PROMISE,
} from '../EarlyAccessCopy'

export interface EarlyAccessFragmentProps {
  readonly email: string
  readonly platform: KroPlatform
  readonly website: string
  readonly submit: EarlyAccessSubmitState
  /** The message under the email field, or `null`. */
  readonly emailError: string | null
  /** The failed state's message, from the exception's `kind`. */
  readonly failureCopy: string | null
  readonly failureIsRetryable: boolean
  /** The hub link on the success card. */
  readonly hubUrl: string
  /** Where to write to be removed, or `null` when the deployment has none. */
  readonly contactEmail?: string | null
  readonly onEmailChange: (value: string) => void
  readonly onEmailBlur: () => void
  readonly onPlatformChange: (platform: KroPlatform) => void
  readonly onHoneypotChange: (value: string) => void
  readonly onSubmit: () => void
  readonly onDismissFailure: () => void
  readonly onStartOver: () => void
  readonly onOpenHub: () => void
}

/** Pushes a field out of sight without `display: none`, which bots skip. */
const HONEYPOT_STYLE = {
  position: 'absolute',
  left: '-10000px',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
} as const

export function EarlyAccessFragment({
  email,
  platform,
  website,
  submit,
  emailError,
  failureCopy,
  failureIsRetryable,
  hubUrl,
  contactEmail = null,
  onEmailChange,
  onEmailBlur,
  onPlatformChange,
  onHoneypotChange,
  onSubmit,
  onDismissFailure,
  onStartOver,
  onOpenHub,
}: EarlyAccessFragmentProps) {
  const ids = useId()
  const emailId = `${ids}-email`
  const errorId = `${ids}-error`
  const noticeId = `${ids}-notice`
  const honeypotId = `${ids}-website`
  const submitting = submit.kind === 'submitting'
  const emailRef = useRef<HTMLInputElement>(null)
  // A submit refused for the address hands focus to the field that needs fixing.
  const refusedForAddress =
    submit.kind === 'failed' &&
    failureCopy !== null &&
    failureCopy === emailError
  useEffect(() => {
    if (refusedForAddress) emailRef.current?.focus()
  }, [refusedForAddress])

  if (submit.kind === 'joined') {
    const label = KroPlatforms.label(submit.receipt.platform)
    return (
      <GlassSurface
        className="grid gap-kro-medium p-6 text-kro-fore md:p-10"
        data-state="joined"
      >
        <h3 className="m-0 font-semibold text-2xl" tabIndex={-1}>
          You're on the list for {label}
        </h3>
        <p
          className="m-0 text-base"
          style={{ color: 'var(--kro-color-fore-secondary-on-glass)' }}
          role="status"
        >
          We'll email {submit.receipt.email} when your platform is ready.
          {submit.receipt.position === null
            ? ''
            : ` You are number ${submit.receipt.position} in line.`}
        </p>
        <div className="flex flex-wrap gap-kro-small">
          <Button asChild variant="primary" size="lg" shape="circular">
            <a href={hubUrl} onClick={onOpenHub}>
              Open Kro for Web
            </a>
          </Button>
          <Button
            variant="secondary"
            size="lg"
            shape="circular"
            onClick={onStartOver}
          >
            Add another address
          </Button>
        </div>
      </GlassSurface>
    )
  }

  return (
    <GlassSurface
      className="p-6 text-kro-fore md:p-10"
      data-state={submit.kind}
    >
      <form
        noValidate
        aria-busy={submitting}
        className="grid gap-kro-large"
        onSubmit={(event) => {
          event.preventDefault()
          if (!submitting) onSubmit()
        }}
      >
        <Field label="Email address" required htmlFor={emailId}>
          <Input
            id={emailId}
            ref={emailRef}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            required
            aria-required="true"
            aria-invalid={emailError === null ? undefined : true}
            aria-describedby={
              emailError === null ? noticeId : `${errorId} ${noticeId}`
            }
            density="comfortable"
            className="min-h-11"
            onChange={(event) => onEmailChange(event.target.value)}
            onBlur={onEmailBlur}
          />
          {/* `Field` keeps its message and hint ids to itself, so the error
              and the notice are rendered here under ids the input can name. */}
          {emailError === null ? null : (
            <p
              id={errorId}
              role="alert"
              className="m-0 text-kro-fore-danger text-sm"
            >
              {emailError}
            </p>
          )}
          <p id={noticeId} className="m-0 text-kro-fore-secondary text-xs">
            {EARLY_ACCESS_PRIVACY_NOTICE}
            {contactEmail === null ? null : (
              <>
                {' '}
                {EARLY_ACCESS_REMOVAL_LEAD}
                <a href={`mailto:${contactEmail}`} className="underline">
                  {contactEmail}
                </a>
                .
              </>
            )}
          </p>
        </Field>

        <fieldset className="m-0 grid min-w-0 gap-kro-small border-0 p-0">
          <legend className="px-0 pb-kro-small font-medium text-kro-fore text-sm">
            Which platform should we write about?
          </legend>
          <div className="grid grid-cols-2 gap-kro-small sm:grid-cols-4">
            {EARLY_ACCESS_PLATFORM_ORDER.map((candidate) => (
              <label
                key={candidate}
                className="relative flex min-h-11 cursor-pointer"
              >
                <input
                  type="radio"
                  name="early-access-platform"
                  value={candidate}
                  checked={platform === candidate}
                  onChange={() => onPlatformChange(candidate)}
                  className="peer absolute inset-0 m-0 size-full cursor-pointer opacity-0"
                />
                <span className="flex w-full items-center justify-center rounded-kro-pill border border-kro-hairline px-kro-small text-kro-fore text-sm peer-checked:border-transparent peer-checked:bg-kro-accent peer-checked:font-semibold peer-checked:text-kro-on-accent peer-focus-visible:shadow-[var(--kro-ring)]">
                  {KroPlatforms.label(candidate)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* The honeypot: a real label, no visible field, nothing to tab to. */}
        <div aria-hidden="true" style={HONEYPOT_STYLE}>
          <label htmlFor={honeypotId}>Website</label>
          <input
            id={honeypotId}
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => onHoneypotChange(event.target.value)}
          />
        </div>

        {submit.kind === 'failed' &&
        failureCopy !== null &&
        failureCopy !== emailError ? (
          <div
            role="alert"
            className="grid gap-kro-small rounded-kro-field border border-kro-hairline p-kro-medium"
          >
            <p className="m-0 text-sm text-kro-fore">{failureCopy}</p>
            <div className="flex flex-wrap gap-kro-small">
              {failureIsRetryable ? (
                <Button
                  variant="secondary"
                  size="lg"
                  shape="circular"
                  onClick={onDismissFailure}
                >
                  Try again
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="lg"
                  shape="circular"
                  onClick={onStartOver}
                >
                  Use a different email
                </Button>
              )}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-kro-medium">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            shape="circular"
            aria-disabled={submitting}
            className="aria-disabled:opacity-[var(--kro-opacity-disabled)]"
          >
            {submitting ? (
              <Spinner size="tiny" label="Joining the list" />
            ) : (
              'Get early access'
            )}
          </Button>
          <p
            className="m-0 max-w-[40ch] text-sm"
            style={{ color: 'var(--kro-color-fore-secondary-on-glass)' }}
          >
            {EARLY_ACCESS_PROMISE}
          </p>
        </div>
      </form>
    </GlassSurface>
  )
}
