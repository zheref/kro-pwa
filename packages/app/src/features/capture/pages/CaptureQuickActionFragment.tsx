'use client'

/**
 * The quick-action FAB's **default** branch — canon
 * `MainScreen.quickActionFAB`'s `default:` case, a 62pt glass disc drawing
 * `plus` in the bottom-trailing corner (`RC-15`: pure, intent by callback).
 *
 * ## Which destinations it appears on
 *
 * Canon switches on the selected tab: Plan gets an unfurling kind menu, Do gets
 * an action menu, Earn gets Add Reward, and *everything else* gets this one.
 * Those three per-tab configurations belong to their own children (KC-IS-#17,
 * KC-IS-#19, KC-IS-#28) — this child ships the default and exports the
 * open-prompt intent for them to reuse, which is what `captureQuickActionShows`
 * encodes. Canon's `isQuickActionAvailable` also hides the button on Search;
 * that row is ported too.
 *
 * ## What it does, and where that parts company with canon's code
 *
 * Canon's `default:` branch calls `selectInbox()`, and says why in its own
 * comment: *"Routes a quick-input / quick-action tap to the Inbox **until each
 * option has its own dedicated creation flow**. Keeps the menus functional
 * today and makes the future wiring an obvious one-line swap per case."* The
 * dedicated creation flow is exactly what this issue ships, so the web takes
 * the swap canon signposted: `plus` opens the capture prompt on Task — canon's
 * own `plus`/"Quick Add" pairing from the Do menu
 * (`.init(label: "Quick Add", glyph: "plus") { showPrompt(kind: .task) }`).
 * The Inbox keeps its own front door: the shell's tray toolbar button and the
 * sidebar's "Jot Down" row both reach the `/inbox` destination. Recorded as a
 * divergence in the delivery PR.
 *
 * ## Where it is drawn
 *
 * Canon puts the FAB in the two phone bodies only; `padBody` and `wideBody`
 * have none, because the Mac reaches the prompt through Do's empty-state
 * Create and Plan's press-to-create. Neither of those exists on the web yet, so
 * confining the disc to the tab-bar shell would leave the desktop with no
 * capture entry point at all — it is drawn on both shells until #17/#19 land
 * theirs, at which point narrowing it is one line. Also recorded in the PR.
 */

import { LiquidGlassFAB } from '../../../design/chrome/fab/LiquidGlassFAB'
import { CHROME_LAYOUT } from '../../../design/chrome/layout/chromeLayout'
import {
  DestinationKind,
  type SidebarDestination,
} from '../../main/SidebarDestination'

/**
 * Whether the default quick action is drawn for `destination`.
 *
 * Canon's `default:` branch minus canon's `isQuickActionAvailable`: Plan, Do
 * and Earn own their own FAB, and Search hides it outright.
 */
export const captureQuickActionShows = (
  destination: SidebarDestination,
): boolean => {
  switch (destination.kind) {
    case DestinationKind.plan:
    case DestinationKind.myDay:
    case DestinationKind.earn:
    case DestinationKind.search:
      return false
    default:
      return true
  }
}

export interface CaptureQuickActionFragmentProps {
  readonly isVisible: boolean
  readonly onPress: () => void
}

export function CaptureQuickActionFragment({
  isVisible,
  onPress,
}: CaptureQuickActionFragmentProps) {
  if (!isVisible) return null

  return (
    <div
      data-testid="capture-quick-action"
      className="fixed z-40"
      // Canon's `fabTrailingPadding` / `fabBottomPadding`, read from the chrome
      // kit rather than retyped — the kit exists so the pill and the toast can
      // compute their own offsets from the same two numbers.
      style={{
        right: `${CHROME_LAYOUT.fabTrailingPadding}px`,
        bottom: `calc(${CHROME_LAYOUT.fabBottomPadding}px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <LiquidGlassFAB
        glyph="plus"
        accessibilityLabel="Quick add"
        onClick={onPress}
      />
    </div>
  )
}
