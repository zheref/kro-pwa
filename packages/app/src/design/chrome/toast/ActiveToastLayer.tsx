import { type CSSProperties, useEffect, useState } from 'react'
import { CHROME_LAYOUT, toastLiftAbovePill } from '../layout/chromeLayout'
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
 * ANNOUNCEMENT. `role="status"` on a container that is present BEFORE the toast
 * is: an `aria-live` region only announces mutations to a region the assistive
 * technology was already observing, so mounting the region and the message
 * together is the classic way to announce nothing at all. The region is
 * therefore always mounted and only its contents change.
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
  readonly className?: string
  readonly style?: CSSProperties
}

const PRESENT_SPRING_MS = settleMs(CHROME_SPRINGS.toast)
const PRESENT_EASING = springEasing(CHROME_SPRINGS.toast)

export function ActiveToastLayer({
  toast,
  isSessionPillVisible = false,
  position = 'fixed',
  className,
  style,
}: ActiveToastLayerProps) {
  // One frame of "mounted but off-stage" so the browser has a start value to
  // transition FROM. Without it the toast is painted at its resting position on
  // the first frame and there is nothing to animate.
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (!toast) {
      setEntered(false)
      return
    }
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [toast])

  const lift = isSessionPillVisible ? toastLiftAbovePill() : 0

  return (
    <div
      // Always mounted — see the announcement note above.
      role="status"
      aria-live="polite"
      data-kro-toast-layer=""
      data-kro-toast-lifted={isSessionPillVisible ? 'true' : 'false'}
      className={className}
      style={{
        position,
        left: 0,
        right: 0,
        bottom: CHROME_LAYOUT.toastBottomPadding,
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
      {toast ? (
        <ActiveToastView
          key={toast.id}
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
      ) : null}
    </div>
  )
}
