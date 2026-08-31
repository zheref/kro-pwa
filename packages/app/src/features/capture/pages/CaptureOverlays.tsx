'use client'

/**
 * The capture feature's mount point — one line in the shell, three surfaces.
 *
 * This is **not** a UZF Page: it calls no hook, reads no state and dispatches
 * nothing. It is the composition that lets `apps/web`'s shell wrapper carry a
 * single anchor (`<CaptureOverlays />`) while the Pages beneath it stay one
 * Fragment each — the same shape `MainShellPage` uses when it wraps its own
 * Fragment in `ToolbarSlotsProvider`.
 *
 * What it mounts, and why here:
 *
 *   · **`ActiveToastHost`** (chrome kit, KC-IS-#15) — the toast host has no
 *     mount anywhere in the repo yet, and the Add-for-Today Undo is its first
 *     consumer. `useActiveToasts()` throws outside a host on purpose, so the
 *     host has to be above the Pages that enqueue. When a second feature needs
 *     toasts, lifting this one line into the shell is the follow-up; nothing
 *     below it changes, because the hook resolves through context.
 *   · **`CaptureQuickActionPage`** — canon's default quick-action disc.
 *   · **`CapturePromptPage`** — renders nothing until a draft exists, so any
 *     surface can open the prompt by dispatching `userDidRequestCapture`.
 *   · **`InboxOverlayPage`** — renders nothing until the Inbox is open, and
 *     owns the scheduling Undo window.
 *
 * The order is the paint order: the disc sits under both overlays, which
 * portal to the document body anyway.
 */

import { CHROME_LAYOUT } from '../../../design/chrome/layout/chromeLayout'
import { ActiveToastHost } from '../../../design/chrome/toast/ActiveToastHost'
import { CapturePromptPage } from './CapturePromptPage'
import { CaptureQuickActionPage } from './CaptureQuickActionPage'
import { InboxOverlayPage } from './InboxOverlayPage'

/**
 * How far the toast rises above where the chrome kit would put it.
 *
 * Canon places the toast 24pt off the bottom (`toastBottomPadding`) — but it
 * places it INSIDE a tab, where SwiftUI's safe-area inset already excludes the
 * tab bar, so 24pt is measured from the top of that bar. The web has no such
 * inset: the shell's tab bar is an ordinary flex child, so a viewport-anchored
 * toast at 24px lands underneath it and the message is clipped.
 *
 * The lift closes exactly that gap, and it is derived rather than measured:
 * `fabBottomPadding - toastBottomPadding` puts the toast's bottom level with
 * the FAB's, which is canon's own stated intent for the pair ("lifted so its
 * centre lines up with the FAB's"). It is applied on both shells because 60px
 * of bottom inset is right on either — the sidebar shell simply has no tab bar
 * to clear.
 *
 * That the kit's layer takes no bottom-inset prop, and the shell's tab bar
 * publishes no height, is the cross-lane gap this works around; it is reported
 * with this PR against KC-IS-#15's lane.
 */
const TOAST_LIFT_ABOVE_TAB_BAR =
  CHROME_LAYOUT.fabBottomPadding - CHROME_LAYOUT.toastBottomPadding

export function CaptureOverlays() {
  return (
    // A zero-height anchor, so it intercepts nothing: the toast layer is
    // `absolute` within it and overflows upward, which is the only part with
    // any area at all.
    <div
      data-testid="capture-overlays"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: `calc(${TOAST_LIFT_ABOVE_TAB_BAR}px + env(safe-area-inset-bottom, 0px))`,
        height: 0,
      }}
    >
      <ActiveToastHost position="absolute">
        <CaptureQuickActionPage />
        <CapturePromptPage />
        <InboxOverlayPage />
      </ActiveToastHost>
    </div>
  )
}
