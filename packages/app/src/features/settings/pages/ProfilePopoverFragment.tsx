'use client'

/**
 * The profile popover's content — canon `ProfilePopoverView` (`RC-15`: passive;
 * every intent is a callback prop).
 *
 * Canon's structure, kept: a header that is either the signed-in identity (with
 * avatar, email and the Free badge) or the *"Sign In to Kro"* invitation, a
 * divider, and a menu below it. Width 300 is the shell's, not this Fragment's —
 * `POPOVER_SIZE.profile` fixes it once and `ProfileControlPage` applies it, so
 * a story can render this content at any width without disagreeing with the app.
 *
 * ## Which menu rows are here, and why the others are not
 *
 * Canon's menu has seven rows: All Endeavors, Sources, Sync History,
 * Notifications (flag-gated, off by default), Subscription, Settings, and
 * Help & Feedback. Four of them target destinations this repo has: All
 * Endeavors is `/tasks`, Subscription and Settings are the hub, and the
 * signed-in case adds Sign Out. **Sources**, **Sync History** and **Help &
 * Feedback** have no destination in kro-pwa at this tip — porting them would be
 * three rows that navigate nowhere, which is exactly the "control that does
 * nothing" this port refuses elsewhere. Notifications is flag-gated off in
 * canon too (`showsNotifications`), and the flag registry here agrees.
 */
import { colorVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import { Avatar } from './SettingsHubFragment'
import { settingsIcon } from './settingsIcons'

export interface ProfilePopoverFragmentProps {
  /** `null` is canon's unauthenticated header. */
  readonly accountName: string | null
  readonly accountEmail: string | null
  readonly accountInitials: string
  /** Canon's `Free` capsule under the email. */
  readonly planName: string
  readonly onTapSignIn: () => void
  readonly onTapAllEndeavors: () => void
  readonly onTapSettings: () => void
  readonly onTapSignOut: () => void
}

export function ProfilePopoverFragment({
  accountName,
  accountEmail,
  accountInitials,
  planName,
  onTapSignIn,
  onTapAllEndeavors,
  onTapSettings,
  onTapSignOut,
}: ProfilePopoverFragmentProps) {
  const isSignedIn = accountEmail !== null

  return (
    <div
      data-testid="profile-popover"
      data-signed-in={isSignedIn}
      className="flex w-full flex-col"
    >
      {isSignedIn ? (
        <button
          type="button"
          data-testid="profile-popover-identity"
          onClick={onTapSettings}
          className={cn(
            'flex w-full items-center gap-3 px-kro-medium py-3.5 text-left',
            'outline-none focus-visible:shadow-[var(--kro-ring)]',
          )}
        >
          <Avatar initials={accountInitials} isSignedIn size={48} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className="truncate text-[15px] font-semibold"
              style={{ color: colorVar('fore') }}
            >
              {accountName ?? 'Kro User'}
            </span>
            <span
              className="truncate text-[12px]"
              style={{ color: colorVar('foreSecondary') }}
            >
              {accountEmail}
            </span>
            <span
              data-testid="profile-plan-badge"
              className="mt-0.5 w-fit rounded-kro-pill px-1.5 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: colorVar('badgeIndigo'),
                color: colorVar('onAccent'),
              }}
            >
              {planName}
            </span>
          </span>
          <Chevron />
        </button>
      ) : (
        <button
          type="button"
          data-testid="profile-popover-sign-in"
          onClick={onTapSignIn}
          className={cn(
            'flex w-full items-center gap-3 px-kro-medium py-3.5 text-left',
            'outline-none focus-visible:shadow-[var(--kro-ring)]',
          )}
        >
          <Avatar initials="" isSignedIn={false} size={44} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className="text-[15px] font-semibold"
              style={{ color: colorVar('fore') }}
            >
              Sign In to Kro
            </span>
            <span
              className="text-[12px]"
              style={{ color: colorVar('foreSecondary') }}
            >
              Sync your data across devices
            </span>
          </span>
          <Chevron />
        </button>
      )}

      <Divider />

      <div className="flex w-full flex-col py-1.5">
        <MenuRow
          glyph="checklist"
          label="All Endeavors"
          onClick={onTapAllEndeavors}
        />
        <MenuRow
          glyph="creditcard"
          label="Subscription"
          onClick={onTapSettings}
        />
        <MenuRow glyph="gearshape" label="Settings" onClick={onTapSettings} />
        {isSignedIn ? (
          <>
            <Divider inset />
            <MenuRow
              glyph="rectangle.portrait.and.arrow.right"
              label="Sign Out"
              tone="danger"
              onClick={onTapSignOut}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}

function Divider({ inset = false }: { readonly inset?: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        height: '0.75px',
        marginLeft: inset ? 44 : 0,
        marginTop: inset ? 4 : 0,
        marginBottom: inset ? 4 : 0,
        backgroundColor: colorVar('hairline'),
      }}
    />
  )
}

function Chevron() {
  const Icon = settingsIcon('chevron.right')
  return (
    <Icon
      size={14}
      strokeWidth={2.5}
      aria-hidden
      className="shrink-0"
      style={{ color: colorVar('foreSecondary') }}
    />
  )
}

function MenuRow({
  glyph,
  label,
  tone = 'normal',
  onClick,
}: {
  readonly glyph: string
  readonly label: string
  readonly tone?: 'normal' | 'danger'
  readonly onClick: () => void
}) {
  const Icon = settingsIcon(glyph)
  const color = tone === 'danger' ? colorVar('kroRed') : colorVar('fore')

  return (
    <button
      type="button"
      data-testid="profile-menu-row"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-kro-medium py-2.5 text-left text-[15px]',
        'outline-none focus-visible:shadow-[var(--kro-ring)]',
      )}
      style={{ color }}
    >
      <Icon size={16} strokeWidth={2} aria-hidden className="w-5 shrink-0" />
      {label}
    </button>
  )
}
