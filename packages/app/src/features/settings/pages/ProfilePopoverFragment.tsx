'use client'

/**
 * The profile popover's content — canon `ProfilePopoverView` (`RC-15`: passive;
 * every intent is a callback prop).
 *
 * Canon's structure, kept: a header that is either the signed-in identity (with
 * avatar, email and the Free badge) or the *"Sign In to Kro"* invitation, a
 * divider, and a `Menu` below it — the navigation list, not a one-off row.
 * Width 300 is the shell's, not this Fragment's —
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
import {
  MENU_CLASSES,
  Menu,
  MenuItem,
  MenuSeparator,
} from '../../../design/hig/navigation/Menu'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
} from '../../../design/system/density'
import { colorVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import { Avatar } from './SettingsHubFragment'
import { settingsIcon } from './settingsIcons'

export interface ProfilePopoverFragmentProps {
  /** `null` is canon's unauthenticated header. */
  readonly accountName: string | null
  readonly accountEmail: string | null
  readonly accountInitials: string
  /** The provider picture. Absent keeps the initials face. */
  readonly accountAvatarUrl?: string | null
  /** Canon's `Free` capsule under the email. */
  readonly planName: string
  readonly onTapSignIn: () => void
  readonly onTapAllEndeavors: () => void
  readonly onTapSettings: () => void
  readonly onTapSignOut: () => void
  /**
   * Compact on the desktop popover, comfortable when the same content is a
   * sheet. The identity block is a menu row with a larger face: same
   * inset, fill, and stroke.
   */
  readonly density?: ControlDensity
}

export function ProfilePopoverFragment({
  accountName,
  accountEmail,
  accountInitials,
  accountAvatarUrl = null,
  planName,
  onTapSignIn,
  onTapAllEndeavors,
  onTapSettings,
  onTapSignOut,
  density = DEFAULT_CONTROL_DENSITY,
}: ProfilePopoverFragmentProps) {
  const isSignedIn = accountEmail !== null
  const isCompact = density === 'compact'
  const headerClass = cn(
    MENU_CLASSES.item,
    isCompact ? MENU_CLASSES.itemCompact : MENU_CLASSES.itemComfortable,
  )

  return (
    <div
      data-testid="profile-popover"
      data-signed-in={isSignedIn}
      data-density={density}
      className="flex w-full flex-col"
    >
      {isSignedIn ? (
        <button
          type="button"
          data-testid="profile-popover-identity"
          onClick={onTapSettings}
          className={headerClass}
        >
          <Avatar
            initials={accountInitials}
            isSignedIn
            avatarUrl={accountAvatarUrl}
            size={40}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className="truncate text-sm font-semibold"
              style={{ color: colorVar('fore') }}
            >
              {accountName ?? 'Kro User'}
            </span>
            <span
              className="truncate text-xs"
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
          className={headerClass}
        >
          <Avatar initials="" isSignedIn={false} size={40} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className="text-sm font-semibold"
              style={{ color: colorVar('fore') }}
            >
              Sign In to Kro
            </span>
            <span
              className="text-xs"
              style={{ color: colorVar('foreSecondary') }}
            >
              Sync your data across devices
            </span>
          </span>
          <Chevron />
        </button>
      )}

      <hr
        data-slot="menu-separator"
        className={cn(
          MENU_CLASSES.separator,
          isCompact
            ? MENU_CLASSES.separatorCompact
            : MENU_CLASSES.separatorComfortable,
        )}
      />

      <Menu density={density} label="Profile">
        <MenuItem data-testid="profile-menu-row" onSelect={onTapAllEndeavors}>
          <RowIcon glyph="checklist" />
          All Endeavors
        </MenuItem>
        <MenuItem data-testid="profile-menu-row" onSelect={onTapSettings}>
          <RowIcon glyph="creditcard" />
          Subscription
        </MenuItem>
        <MenuItem data-testid="profile-menu-row" onSelect={onTapSettings}>
          <RowIcon glyph="gearshape" />
          Settings
        </MenuItem>
        {isSignedIn ? (
          <>
            <MenuSeparator />
            <MenuItem
              destructive
              data-testid="profile-menu-row"
              onSelect={onTapSignOut}
            >
              <RowIcon glyph="rectangle.portrait.and.arrow.right" />
              Sign Out
            </MenuItem>
          </>
        ) : null}
      </Menu>
    </div>
  )
}

function RowIcon({ glyph }: { readonly glyph: string }) {
  const Icon = settingsIcon(glyph)
  return <Icon strokeWidth={2} aria-hidden />
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
