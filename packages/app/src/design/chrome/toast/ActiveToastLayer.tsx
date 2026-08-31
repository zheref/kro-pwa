import { type CSSProperties, useEffect, useState } from 'react'
import {
  CHROME_LAYOUT,
  SHELL_BOTTOM_INSET_FALLBACK,
  toastLiftAbovePill,
} from '../layout/chromeLayout'
import { TOAST_LIFT, settleMs, springEasing } from '../layout/chromeMotion'
import { CHROME_SPRINGS } from '../layout/chromeMotion'
import type { ActiveToastModel } from './activeToast'
import { ActiveToastView } from './ActiveToastView'

/**
 * Where the toast sits, and how it arrives and leaves.
 *
 * Port of `Kro/Application/Fragments/ActiveToast/ActiveToastModifier.swift` —
 * everything that modifier does EXCEPT the auto-dismiss timer, which belongs to
 * the host that owns the toast's lifetime.
 *
 * PLACEMENT (canon, `ActiveToast.md` § Positioning). Bottom-anchored, 16pt in
 * from the leading edge and 96pt from the trailing edge so it clears the FAB,
 * 24pt off the bottom, then lifted 15pt so its centre lines up with the FAB's.
 * Every one of those numbers comes from `CHROME_LAYOUT`, never a literal here.
 *
 * THE SHELL'S BOTTOM INSET. Canon's 24pt is measured inside a tab, where
 * SwiftUI's safe area has already excluded the tab bar. The web shell's tab bar
 * is an ordinary flex child, so the viewport bottom is BELOW it and 24pt alone
 * puts the toast under the bar. `bottomInset` is what closes that gap: a length
 * the shell supplies, defaulting to `var(--kro-shell-bottom-inset, 0px)` so a
 * shell can publish it once on its root rather than threading a prop through
 * every surface that mounts a host — and so a toast mounted with no shell
 * around it, or on the sidebar shell that has no bar, is exactly where it was.
 * The kit never imports the shell; it names the property and honours it.
 *
 * THE LIFT-ABOVE-PILL RULE. When the Session Pill is on screen the toast rises
 * clear of it entirely — `pillBottomPadding + pillHeight + pillToastSpacing -
 * toastBottomPadding`, derived rather than measured, exactly as
 * `MainScreen.toastLiftAbovePill` derives it. The pill itself is `#22`'s; this
 * layer only needs to be told whether it is there.
 *
 * MOTION. Canon animates presentation on `.spring(response: 0.4,
 * dampingFraction: 0.8)` combined with `.move(edge: .trailing)` and `.opacity`,
 * and animates the LIFT separately on `.easeInOut(duration: 0.22)` — a
 * deliberate split, because the lift is a layout correction and should not
 * overshoot back into the pill it just moved to clear. Both are ported;
 * `chromeMotion` samples the spring from KroApple's own parameters.
 *
 * ANNOUNCEMENT. A `role="status"` region that is present BEFORE the toast is —
 * an `aria-live` region only announces mutations to a region the assistive
 * technology was already observing, so mounting the region and the message
 * together is the classic way to announce nothing at all. The region is
 * therefore always mounted, visually hidden, and holds ONLY the message; the
 * visible toast, with its buttons, is rendered outside it. See the note at the
 * region itself for why the buttons must stay out.
 */

export interface ActiveToastLayerProps {
  /** The toast to show, or `null`. Canon's `ActiveToast?`. */
  readonly toast: ActiveToastModel | null
  /** Whether the Session Pill is on screen — the lift-above-pill input. */
  readonly isSessionPillVisible?: boolean
  /**
   * Positioning. `fixed` pins the layer to the viewport (what the shell wants);
   * `absolute` pins it to the nearest positioned ancestor (what a story and a
   * test want, so the matrix can be shown in a box).
   */
  readonly position?: 'fixed' | 'absolute'
  /**
   * How far the shell's own bottom chrome (the tab bar) reaches up from the
   * viewport edge. A number is read as px; a string is any CSS length, so a
   * shell may hand over `env(safe-area-inset-bottom)` or a custom property.
   */
  readonly bottomInset?: number | string
  readonly className?: string
  readonly style?: CSSProperties
}

/** A px number or a CSS length, as a CSS length. */
const asLength = (value: number | string): string =>
  typeof value === 'number' ? `${value}px` : value

const PRESENT_SPRING_MS = settleMs(CHROME_SPRINGS.toast)
const PRESENT_EASING = springEasing(CHROME_SPRINGS.toast)

/** Screen-reader-only, and only ever text. */
const VISUALLY_HIDDEN: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  border: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
}

export function ActiveToastLayer({
  toast,
  isSessionPillVisible = false,
  position = 'fixed',
  bottomInset = SHELL_BOTTOM_INSET_FALLBACK,
  className,
  style,
}: ActiveToastLayerProps) {
  // The inset raises the pill by the same amount, so the gap between the two —
  // which is what the lift is — does not depend on it. `chromeLayout.ts` says
  // so where the arithmetic lives, and its suite proves it.
  const lift = isSessionPillVisible ? toastLiftAbovePill() : 0
  const inset = asLength(bottomInset)

  return (
    <div
      data-kro-toast-layer=""
      data-kro-toast-lifted={isSessionPillVisible ? 'true' : 'false'}
      className={className}
      style={{
        position,
        left: 0,
        right: 0,
        bottom: `calc(${CHROME_LAYOUT.toastBottomPadding}px + ${inset})`,
        paddingLeft: CHROME_LAYOUT.toastLeadingPadding,
        paddingRight: CHROME_LAYOUT.toastTrailingPadding,
        display: 'flex',
        justifyContent: 'flex-start',
        // The layer spans the width so the toast can be measured against the
        // trailing inset; only the toast inside it may take a pointer.
        pointerEvents: 'none',
        transform: `translateY(${-(CHROME_LAYOUT.toastVerticalOffset + lift)}px)`,
        transitionProperty: 'transform',
        transitionDuration: `${TOAST_LIFT.ms}ms`,
        transitionTimingFunction: TOAST_LIFT.easing,
        ...style,
      }}
    >
      {/*
        The live region holds the MESSAGE and nothing else.

        Wrapping the visible toast in it instead puts the action buttons inside
        a region assistive technology is watching for text changes, and the
        announcement becomes "…marked complete, Undo button, View button" — or,
        on some screen readers, fires twice. `aria-atomic` makes the message
        read as one sentence rather than as the diff of the previous one.

        Always mounted, empty, before any toast exists: a region created
        together with its first message announces nothing at all, because the
        technology was not yet observing it.
      */}
      <div role="status" aria-live="polite" aria-atomic="true" style={VISUALLY_HIDDEN}>
        {toast?.message ?? ''}
      </div>

      {toast ? <PresentedToast key={toast.id} toast={toast} /> : null}
    </div>
  )
}

/**
 * One presented toast, and its entry animation.
 *
 * KEYED AND SEPARATE ON PURPOSE. `entered` has to start `false` for EVERY
 * toast, not just the first — a one-deep replace swaps the model while the
 * layer is still mounted, and a flag living on the layer would still be `true`,
 * so the replacement would paint on-stage and skip the slide entirely. Owning
 * the flag in a component the parent keys by `toast.id` makes the reset a
 * remount, which cannot be forgotten.
 */
function PresentedToast({ toast }: { toast: ActiveToastModel }) {
  // One frame of "mounted but off-stage" so the browser has a start value to
  // transition FROM. Without it the toast is painted at its resting position on
  // the first frame and there is nothing to animate.
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <ActiveToastView
      toast={toast}
      style={{
        pointerEvents: 'auto',
        // Canon: `.move(edge: .trailing).combined(with: .opacity)`.
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateX(0)' : 'translateX(24px)',
        transitionProperty: 'opacity, transform',
        transitionDuration: `${PRESENT_SPRING_MS}ms`,
        transitionTimingFunction: PRESENT_EASING,
      }}
    />
  )
}
