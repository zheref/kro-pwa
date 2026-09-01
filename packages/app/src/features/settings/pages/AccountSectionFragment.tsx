'use client'

/**
 * The two Account-group panes — canon `ProfileView` and `SubscriptionView`
 * (`RC-15`: passive; every intent is a callback prop).
 *
 * One Fragment for both because neither is schema-driven and both are static
 * reads of the session: Profile lists what the account says about itself and
 * offers Sign Out, Subscription lists a plan name. Splitting them would be two
 * files whose only difference is which four labels they print.
 *
 * ## What is deliberately absent
 *
 * Canon's Profile pane also offers **Edit Profile** and **Request Data
 * Deletion**. Both write to the account, and the auth/sync engine (KC-IS-#31)
 * ships neither a profile update nor a deletion request — so porting the
 * buttons would mean inventing the flows behind them. Canon's Subscription
 * pane is the same shape and says so out loud: it has a row, a "Manage
 * Subscription" button wired to nothing, and no store. This port mirrors that
 * honestly rather than pretending: the rows are here, the flows are not, and
 * the pane says which.
 */
import {
  type AuthProvider,
  type User,
  authProviderDisplayName,
  authProviderIcon,
  primaryEmail,
  userInitials,
} from '@kro/core'
import type { ReactNode } from 'react'
import { colorVar } from '../../../design/system/tokens/roles'
import { SurfaceCard } from '../../../design/endeavor/SurfaceCard'
import {
  FieldSectionLabel,
  OnGradient,
} from '../../../design/system/gradient/OnGradient'
import { cn } from '../../../design/system/utils/cn'
import { SUBSCRIPTION_PLAN_NAME } from '../SettingsState'
import { Avatar } from './SettingsHubFragment'
import { settingsIcon } from './settingsIcons'

export type AccountPane = 'profile' | 'subscription'

export interface AccountSectionFragmentProps {
  readonly pane: AccountPane
  /** `null` is canon's unauthenticated placeholder. */
  readonly user: User | null
  readonly onTapSignIn: () => void
  readonly onTapSignOut: () => void
}

export function AccountSectionFragment({
  pane,
  user,
  onTapSignIn,
  onTapSignOut,
}: AccountSectionFragmentProps) {
  if (pane === 'subscription') return <SubscriptionPane />
  if (user === null) return <UnauthenticatedPane onTapSignIn={onTapSignIn} />
  return <ProfilePane user={user} onTapSignOut={onTapSignOut} />
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

function ProfilePane({
  user,
  onTapSignOut,
}: {
  readonly user: User
  readonly onTapSignOut: () => void
}) {
  const email = primaryEmail(user)
  // `authProviderIcon` answers an `IconRepresentation`; every provider's is a
  // glyph today, and the `emoji` arm is handled rather than asserted away.
  const providerIcon = authProviderIcon(user.authProvider)
  const ProviderIcon = settingsIcon(
    providerIcon.type === 'glyph' ? providerIcon.name : '',
  )

  return (
    <div
      data-testid="account-section"
      data-pane="profile"
      className="flex w-full flex-col gap-kro-large"
    >
      <SurfaceCard>
        <div className="flex w-full flex-col items-center gap-kro-small py-kro-medium">
          <Avatar initials={userInitials(user)} isSignedIn size={96} />
          <span
            className="text-xl font-semibold"
            style={{ color: colorVar('fore') }}
          >
            {user.name ?? 'Kro User'}
          </span>
          <span
            className="text-[15px]"
            style={{ color: colorVar('foreSecondary') }}
          >
            {email}
          </span>
        </div>
      </SurfaceCard>

      <Group title="Account">
        <Row label="Name" value={user.name ?? '—'} />
        <Row label="Email" value={email} />
        {user.username === null ? null : (
          <Row label="Username" value={`@${user.username}`} />
        )}
        <Row label="Member since" value={dateLabel(user.createdAt)} />
      </Group>

      <Group title="Personal Info">
        <Row
          label="Birthday"
          value={
            user.birthDate === null ? 'Not set' : dateLabel(user.birthDate)
          }
        />
        <Row label="Nationality" value={user.nationality ?? 'Not set'} />
      </Group>

      <Group title="Sign-In">
        <Row
          label="Method"
          value={authProviderDisplayName(user.authProvider)}
          icon={<ProviderIcon size={16} strokeWidth={2} aria-hidden />}
        />
        {user.connectedProviders.length === 0 ? null : (
          <Row
            label="Connected"
            value={user.connectedProviders
              .map((provider: AuthProvider) =>
                authProviderDisplayName(provider),
              )
              .join(', ')}
          />
        )}
      </Group>

      <SurfaceCard padding={null}>
        <button
          type="button"
          data-testid="sign-out"
          onClick={onTapSignOut}
          className={cn(
            'flex w-full items-center gap-kro-small px-kro-medium py-3 text-left',
            'text-[15px] font-semibold outline-none focus-visible:shadow-[var(--kro-ring)]',
          )}
          style={{ color: colorVar('kroRed') }}
        >
          <SignOutGlyph />
          Sign Out
        </button>
      </SurfaceCard>

      <OnGradient as="p" className="m-0 px-kro-tiny text-[13px] leading-snug">
        Signing out clears the preferences saved on this device, so the next
        account starts from defaults.
      </OnGradient>
    </div>
  )
}

function SignOutGlyph() {
  const Icon = settingsIcon('rectangle.portrait.and.arrow.right')
  return <Icon size={16} strokeWidth={2} aria-hidden />
}

function UnauthenticatedPane({
  onTapSignIn,
}: {
  readonly onTapSignIn: () => void
}) {
  const Icon = settingsIcon('person.crop.circle.badge.questionmark')

  return (
    <div
      data-testid="account-section"
      data-pane="profile"
      className="flex w-full flex-col items-center gap-kro-small py-kro-xx-large text-center"
    >
      <Icon
        size={56}
        strokeWidth={1.5}
        aria-hidden
        className="kro-on-gradient"
      />
      <OnGradient as="span" className="text-lg font-medium">
        Not Signed In
      </OnGradient>
      <OnGradient as="span" className="text-[15px]">
        Sign in to view and manage your profile.
      </OnGradient>
      <button
        type="button"
        onClick={onTapSignIn}
        className={cn(
          'mt-kro-small inline-flex h-11 items-center rounded-kro-field px-4',
          'text-[15px] font-semibold outline-none focus-visible:shadow-[var(--kro-ring)]',
        )}
        style={{
          backgroundColor: colorVar('accent'),
          color: colorVar('onAccent'),
        }}
      >
        Sign In
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

/**
 * Canon's `SubscriptionView` — a plan row and a button wired to nothing.
 *
 * The issue is explicit that subscription content is out of scope and that
 * canon "has a row, no flow — mirror it". So the row is here and the button is
 * **absent** rather than present-and-inert: a control that visibly does nothing
 * is worse than a sentence saying there is nothing to do yet.
 */
function SubscriptionPane() {
  return (
    <div
      data-testid="account-section"
      data-pane="subscription"
      className="flex w-full flex-col gap-kro-medium"
    >
      <Group title="Current plan">
        <Row label="Plan" value={SUBSCRIPTION_PLAN_NAME} />
      </Group>
      <OnGradient as="p" className="m-0 px-kro-tiny text-[13px] leading-snug">
        Kro has no paid plan yet. When one exists, managing it will live here.
      </OnGradient>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared row shapes
// ---------------------------------------------------------------------------

function Group({
  title,
  children,
}: {
  readonly title: string
  readonly children: ReactNode
}) {
  return (
    <section className="flex w-full flex-col gap-kro-small">
      <FieldSectionLabel>{title}</FieldSectionLabel>
      <SurfaceCard padding={null}>
        <div className="flex w-full flex-col">{children}</div>
      </SurfaceCard>
    </section>
  )
}

function Row({
  label,
  value,
  icon,
}: {
  readonly label: string
  readonly value: string
  readonly icon?: ReactNode
}) {
  return (
    <div
      data-testid="account-row"
      className="flex w-full items-center gap-kro-small px-kro-medium py-2.5"
    >
      <span className="text-[15px]" style={{ color: colorVar('fore') }}>
        {label}
      </span>
      <span className="flex-1" />
      <span
        className="flex items-center gap-1.5 truncate text-[15px]"
        style={{ color: colorVar('foreSecondary') }}
      >
        {icon}
        {value}
      </span>
    </div>
  )
}

/**
 * Canon's `Date.formatted(date: .abbreviated, time: .omitted)`.
 *
 * `en-US` explicitly rather than the host locale: a snapshot test that read the
 * runner's locale would pass on one machine and fail on another, and the date
 * here is a fact about the account, not a formatted quantity the user tunes.
 */
const dateLabel = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
