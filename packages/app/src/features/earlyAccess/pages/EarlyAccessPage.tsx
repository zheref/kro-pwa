/**
 * The early-access Page — the stateful container (`RC-37`, `UZF-4`).
 *
 * It owns no markup beyond its one Fragment: the headless hook supplies the
 * view model and the callbacks, and this file forwards them. It composes into
 * the landing page (a Page may compose across features) but reads only its own
 * slice. The hub link and the "an Open Kro press happened" signal come from the
 * landing as props, because the sign-up does not know where the app lives.
 */
import { EarlyAccessFragment } from './EarlyAccessFragment'
import { type RequestedPlatform, useEarlyAccess } from '../useEarlyAccess'

export interface EarlyAccessPageProps {
  /** Where the success card's "Open Kro for Web" goes. Default the hub route. */
  readonly hubUrl?: string
  /** Called when that link is pressed, so the landing can record the press. */
  readonly onOpenHub?: () => void
  /** A platform the landing asked for; the form selects it. */
  readonly requestedPlatform?: RequestedPlatform | null
  /** Where to write to be removed; the notice names it when given. */
  readonly contactEmail?: string | null
}

export function EarlyAccessPage({
  hubUrl = '/my-day',
  onOpenHub,
  requestedPlatform = null,
  contactEmail = null,
}: EarlyAccessPageProps) {
  const early = useEarlyAccess(requestedPlatform)
  return (
    <EarlyAccessFragment
      email={early.email}
      platform={early.platform}
      website={early.website}
      submit={early.submit}
      emailError={early.emailError}
      failureCopy={early.failureCopy}
      failureIsRetryable={early.failureIsRetryable}
      hubUrl={hubUrl}
      contactEmail={contactEmail}
      onEmailChange={early.onEmailChange}
      onEmailBlur={early.onEmailBlur}
      onPlatformChange={early.onPlatformChange}
      onHoneypotChange={early.onHoneypotChange}
      onSubmit={early.onSubmit}
      onDismissFailure={early.onDismissFailure}
      onStartOver={early.onStartOver}
      onOpenHub={() => onOpenHub?.()}
    />
  )
}
