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
 *   · **`CaptureQuickActionPage`** — canon's default quick-action disc.
 *   · **`CapturePromptPage`** — renders nothing until a draft exists, so any
 *     surface can open the prompt by dispatching `userDidRequestCapture`.
 *   · **`InboxOverlayPage`** — renders nothing until the Inbox is open, and
 *     owns the scheduling Undo window.
 *
 * The order is the paint order: the disc sits under both overlays, which
 * portal to the document body anyway.
 *
 * ## What used to be here, and why it is gone (KC-IS-#71 item 15)
 *
 * This file also mounted `ActiveToastHost` — the only mount in the repo at the
 * time — inside a zero-height anchor lifted `fabBottomPadding -
 * toastBottomPadding` off the viewport bottom, because the kit's layer had no
 * way to learn the tab bar's height. Both are now the shell's: `MainShellPage`
 * mounts the one host and hands it `shellBottomInset(shape, layout)`, which is
 * the shell's own reservation rather than a FAB-derived stand-in. Nothing here
 * changes as a result — `useActiveToasts()` resolves through context, and the
 * context now comes from an ancestor rather than from this anchor.
 */

import { CapturePromptPage } from './CapturePromptPage'
import { CaptureQuickActionPage } from './CaptureQuickActionPage'
import { InboxOverlayPage } from './InboxOverlayPage'

export function CaptureOverlays() {
  return (
    // A zero-height, zero-area anchor: every surface below either portals to
    // the document body or pins itself, so this element intercepts nothing.
    <div data-testid="capture-overlays" style={{ height: 0 }}>
      <CaptureQuickActionPage />
      <CapturePromptPage />
      <InboxOverlayPage />
    </div>
  )
}
