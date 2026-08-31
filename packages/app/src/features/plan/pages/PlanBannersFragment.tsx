'use client'

/**
 * Plan's status column — the port of `PlanView.statusColumn`'s two banners.
 *
 * Canon stacks them directly under the title, above the canvas, and measures
 * the column so the scrollable canvas can inset past it. Here the column is a
 * normal block in the header stack, so nothing has to be measured; the
 * canvas's own `topInsetPx` is what carries the clearance.
 *
 * ## Both banners are `InlineBanner`, not two hand-built rows
 *
 * Canon draws them inline with `KroTokens.Colors.bannerWarning` /
 * `bannerDanger` and white text. The endeavor kit's `InlineBanner` is the port
 * of exactly that pair — same tokens, same opaque fill, and it already carries
 * the three things canon's raw `Text(error)` was missing (a glyph, a container,
 * a recovery path) plus the `sr-only` severity prefix. Re-drawing the fills
 * here would be a second answer to a question the design system has already
 * answered and contrast-tested.
 *
 * ## What each banner is FOR — the states are not interchangeable
 *
 * - **Stale sync** is canon's `isShowingStaleSync`: `syncError == .rateLimited
 *   && !googleEvents.isEmpty`. Google is refusing new reads *and* the day is
 *   still showing the last good ones, so the copy names when they were fetched
 *   rather than claiming the day is empty.
 * - **Reconnect** is canon's `shouldPromptReconnect`: the grant stopped
 *   working. That one has an action behind it, which is why it is the banner
 *   with a button.
 *
 * `GoogleCalendarConnection`'s own header draws the same line: `needsReconnect`
 * answers `false` to `canOfferGoogleConnect`, because *"a surface that treated
 * the two as one would tell a user whose access was revoked that they have
 * never connected"*. So this Fragment never offers **Connect** — that is the
 * Settings surface's (KC-IS-#32), and a first connection is not a Plan banner.
 */
import { InlineBanner } from '../../../design/endeavor/InlineBanner'
import { cn } from '../../../design/system/utils/cn'

export interface PlanBannersFragmentProps {
  /**
   * The rate-limit line, already composed — canon's `lastSyncedLabel`, which
   * reads *"Rate limit hit. Last synced 3 min ago"* or, with no successful sync
   * on record, *"Rate limit reached — try again later"*. `null` hides it.
   */
  readonly staleSyncLabel: string | null
  /** Whether the grant stopped working — canon's `shouldPromptReconnect`. */
  readonly needsReconnect: boolean
  /**
   * Why it stopped, for the supporting line. Optional because the recovery is
   * the same either way and the banner is still correct without it.
   */
  readonly reconnectDetail?: string | null
  readonly onTapReconnect: () => void
  readonly className?: string
}

export function PlanBannersFragment({
  staleSyncLabel,
  needsReconnect,
  reconnectDetail = null,
  onTapReconnect,
  className,
}: PlanBannersFragmentProps) {
  if (staleSyncLabel === null && !needsReconnect) return null

  return (
    <div
      data-testid="plan-banners"
      className={cn('flex flex-col gap-kro-small', className)}
    >
      {staleSyncLabel !== null && (
        <div data-testid="plan-stale-sync-banner">
          <InlineBanner kind="warning" message={staleSyncLabel} />
        </div>
      )}

      {needsReconnect && (
        <div data-testid="plan-reconnect-banner">
          <InlineBanner
            kind="error"
            message="Google Calendar disconnected"
            detail={
              reconnectDetail ??
              'Your session expired. Reconnect to keep events in sync.'
            }
            actionTitle="Reconnect"
            onAction={onTapReconnect}
          />
        </div>
      )}
    </div>
  )
}
