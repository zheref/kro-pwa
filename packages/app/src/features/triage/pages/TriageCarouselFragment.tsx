'use client'

/**
 * The Triage carousel — canon `Kro/Application/Inbox/InboxScreen.swift`'s
 * private `TriageCarousel`, as one pure Fragment (`RC-15`: it dispatches
 * nothing; the only intent it raises is `onDismiss`).
 *
 * ## Why this is a carousel and not a route
 *
 * Canon is explicit, in `TriageScreen.swift`'s own comment: *"Triage is
 * presented via the Inbox sheet's custom carousel transition (not a
 * NavigationStack push)"* — because the Triage screen renders with a clear
 * background so the Inbox sheet's glass shows through, and a transparent
 * background breaks the system push animation. The web inherits the decision
 * for the same reason plus a second one: the Inbox is a Radix dialog, and
 * routing away from it would close the very surface Triage is supposed to sit
 * inside. So this layer mounts **inside** the Inbox surface, over its list.
 *
 * ## The escape gesture, ported rule for rule
 *
 * | canon | here |
 * |---|---|
 * | `edgeSwipeStartWidth: 72` | `TRIAGE_EDGE_STRIP_WIDTH` |
 * | `dismissThresholdFraction: 0.18` | `TRIAGE_DISMISS_THRESHOLD_FRACTION` |
 * | `DragGesture(minimumDistance: 10)` | `TRIAGE_DRAG_MINIMUM_DISTANCE` |
 * | `startLocation.x <= edgeSwipeStartWidth` | the `pointerdown` x, measured against the panel's own box |
 * | `max(0, min(translation.width, width))` | `triageCarouselOffset` |
 * | `translation.width > width * fraction` | `triageCarouselCompletes` |
 *
 * All six numbers and both decisions are pure functions in
 * `triagePresentation.ts`, so "released at 17.9% springs back, at 18.1%
 * dismisses" is a unit test that never needs a rendered pixel — and the
 * interaction test then proves the component asks them.
 *
 * ## It follows the kit's post-KC-IS-#73 pointer grammar exactly
 *
 * Three rules, and every one of them was learned the expensive way in
 * `design/endeavor/EndeavorActionSurface.tsx`:
 *
 * 1. **Capture is taken at the threshold, never at `pointerdown`.** A captured
 *    pointer retargets the subsequent `click` to the capturing element, so
 *    capturing on `pointerdown` would eat every tap that lands on a control
 *    inside the form — the quadrant tiles, the chips, the back chevron. A tap
 *    captures nothing; a real drag captures on its first meaningful move.
 * 2. **The release decision reads the POINTER, never the rendered offset.**
 *    `pointermove` is continuous and React batches, so the last `setOffset`
 *    has usually not flushed when `pointerup` runs; judging the gesture on
 *    state means a full swipe snaps shut and fires nothing.
 * 3. **`pointerup` and `pointercancel` both end the gesture, and the first one
 *    wins.** Both can fire for one gesture; without the guard a single swipe
 *    dismisses twice.
 *
 * The one rule this adds, which the row does not need: the latch also requires
 * the gesture to be **more horizontal than vertical**. The form scrolls
 * vertically and the strip sits over it, so a thumb starting a scroll at the
 * leading edge must keep scrolling. SwiftUI gets this from gesture arbitration
 * between the `ScrollView`'s pan and the `simultaneousGesture`; the web gets it
 * from `touch-action: pan-y` plus this comparison.
 *
 * ## Two named departures from the SwiftUI drawing
 *
 * 1. **The Inbox layer does not counter-translate.** Canon slides the Inbox to
 *    `-width + backSwipeOffset` while Triage slides in, so the two move as one
 *    filmstrip. Doing that here would mean the Inbox *body* accepting a
 *    transform driven by this component's drag state — a prop on a merged
 *    sibling lane's Fragment, plumbed through a context or the store at 60 fps.
 *    So Triage travels alone over an opaque panel: the gesture, the strip and
 *    both thresholds are identical, and what is lost is the parallax.
 * 2. **Completing the gesture dismisses immediately** rather than springing the
 *    panel out over ~0.32 s first. Canon's `withAnimation { … } completion:`
 *    has no dependency-free web equivalent that cannot strand the panel: a
 *    `transitionend` never fires under `prefers-reduced-motion: reduce` (the
 *    transition is removed, not shortened), and a timer would make the
 *    dismissal race the unmount. The *decision* — which release dismisses — is
 *    what canon's rule is about, and it is ported exactly.
 */

import { type ReactNode, useCallback, useRef, useState } from 'react'
import { colorVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import {
  TRIAGE_DRAG_MINIMUM_DISTANCE,
  TRIAGE_EDGE_STRIP_WIDTH,
  isTriageEdgeStripStart,
  triageCarouselCompletes,
  triageCarouselOffset,
} from './triagePresentation'

export interface TriageCarouselFragmentProps {
  /** Whether a Triage session is mounted. */
  readonly isPresenting: boolean
  /** The Triage form. Passed in so this layer owns the gesture and nothing else. */
  readonly children: ReactNode
  /** The back chevron and a completed edge swipe both raise this. */
  readonly onDismiss: () => void
  /**
   * The durable save's status, for the window in which the form is already
   * gone.
   *
   * `#25`'s slice header states the reason there is a `.pending` arm at all:
   * *"the save outlives its form: the screen has already popped, so 'saving' is
   * the only thing the status surface has left to show."* Confirming raises the
   * outcome AND clears the session in one reducer step, so by the time the
   * write lands there is no form to report into — this strip is what canon's
   * app-wide operation-status indicator is, scoped to the surface that started
   * the operation.
   */
  readonly isSaving?: boolean
  /** A **local** save failure — the one case the decision was not captured. */
  readonly saveExceptionMessage?: string | null
  /** A push that did not land, or a share that fell back to the clipboard. */
  readonly notice?: string | null
  /**
   * The carousel's width, in CSS pixels.
   *
   * Production leaves this undefined and the panel measures itself. Stories and
   * tests pin it, because **jsdom measures every element as 0 x 0** — a
   * threshold test against a zero width would assert nothing (and
   * `triageCarouselCompletes` refuses to complete on one, which is the correct
   * behaviour and a useless test).
   */
  readonly carouselWidth?: number
}

export function TriageCarouselFragment({
  isPresenting,
  children,
  onDismiss,
  isSaving = false,
  saveExceptionMessage = null,
  notice = null,
  carouselWidth,
}: TriageCarouselFragmentProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)

  /**
   * The live drag offset.
   *
   * This is `@State` in canon and it is view state here for the same reason:
   * it exists for the duration of one gesture, it is meaningless the instant
   * the finger lifts, and no rule reads it. `RC-4` bars `useState` for anything
   * *"part of feature state"* — the decision this offset feeds (dismiss or
   * spring back) is a pure function one tier down, and the pixel it paints is
   * not a fact about the triage session.
   */
  const [offset, setOffset] = useState(0)

  /** Where the gesture started, or `null` when no gesture is ours. */
  const dragStartX = useRef<number | null>(null)
  const dragStartY = useRef<number | null>(null)
  /** Whether this gesture has latched into a back-swipe. A ref: painting it would be a wasted render. */
  const isSwiping = useRef(false)

  const measuredWidth = useCallback((): number => {
    if (carouselWidth !== undefined) return carouselWidth
    return panelRef.current?.getBoundingClientRect().width ?? 0
  }, [carouselWidth])

  const resetGesture = useCallback(() => {
    dragStartX.current = null
    dragStartY.current = null
    isSwiping.current = false
  }, [])

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // Canon's `startLocation.x <= edgeSwipeStartWidth`, measured against the
      // panel's own box rather than the viewport: on a desktop the Inbox is a
      // 560 x 620 popover somewhere in the middle of the screen, and the strip
      // belongs to the panel's leading edge, not the window's.
      const left = event.currentTarget.getBoundingClientRect().left
      if (!isTriageEdgeStripStart(event.clientX - left)) return
      dragStartX.current = event.clientX
      dragStartY.current = event.clientY
      isSwiping.current = false
      // NO capture here — see the header note. A captured pointer retargets the
      // click, and every control on this form sits inside the panel.
    },
    [],
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const startX = dragStartX.current
      const startY = dragStartY.current
      if (startX === null || startY === null) return

      const dx = event.clientX - startX
      const dy = event.clientY - startY

      if (!isSwiping.current) {
        // Below the minimum distance nothing happens at all: no capture, no
        // paint. A 1px jitter that painted would strand the panel at that 1px.
        if (Math.abs(dx) < TRIAGE_DRAG_MINIMUM_DISTANCE) return
        // A gesture that is mostly vertical belongs to the form's scroller.
        // Abandoning it (rather than ignoring this move) is what lets the
        // scroll run uninterrupted for the rest of the gesture.
        if (Math.abs(dy) > Math.abs(dx)) {
          resetGesture()
          return
        }
        isSwiping.current = true
        const target = event.currentTarget
        if (typeof target.setPointerCapture === 'function') {
          target.setPointerCapture(event.pointerId)
        }
      }

      setOffset(triageCarouselOffset(dx, measuredWidth()))
    },
    [measuredWidth, resetGesture],
  )

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const startX = dragStartX.current
      // `pointerup` and `pointercancel` can both fire for one gesture; the
      // first one owns the release and the second finds nothing.
      if (startX === null) return
      const wasSwiping = isSwiping.current
      resetGesture()

      const target = event.currentTarget
      if (
        typeof target.hasPointerCapture === 'function' &&
        target.hasPointerCapture(event.pointerId)
      ) {
        target.releasePointerCapture(event.pointerId)
      }

      // The decision reads the POINTER, never the last-rendered offset.
      const dx = event.clientX - startX
      const width = measuredWidth()
      setOffset(0)

      if (!wasSwiping) return
      if (triageCarouselCompletes(dx, width)) onDismiss()
    },
    [measuredWidth, onDismiss, resetGesture],
  )

  if (!isPresenting) {
    return (
      <TriageStatusStrip
        isSaving={isSaving}
        saveExceptionMessage={saveExceptionMessage}
        notice={notice}
      />
    )
  }

  return (
    <div
      ref={panelRef}
      data-testid="triage-carousel"
      data-kro-dragging={offset > 0 ? 'true' : 'false'}
      role="group"
      aria-label="Triage"
      className={cn(
        'absolute inset-0 z-10 flex flex-col overflow-hidden',
        // The panel follows the finger frame by frame while a drag is live, so
        // the transition is only for the release. `kro-motion-standard`
        // collapses to 0 under `prefers-reduced-motion`, which is the correct
        // behaviour and needs no branch here.
        offset > 0 ? undefined : 'kro-motion-standard transition-transform',
      )}
      style={{
        transform: `translateX(${offset}px)`,
        backgroundColor: colorVar('back'),
        // Vertical panning stays the browser's (the form scrolls); horizontal
        // gestures come to us. Without this the browser can claim the drag as
        // an overscroll and `pointercancel` the gesture mid-swipe.
        touchAction: 'pan-y',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/*
        The strip itself is drawn, not merely implied — it is `aria-hidden` and
        `pointer-events-none` because it is a *region*, not a control: the
        gesture is filtered by where it started (canon's own `startLocation`
        test), and a strip that swallowed pointer events would put a 72px dead
        band over the form's leading edge.
      */}
      <span
        aria-hidden
        data-testid="triage-edge-strip"
        className="pointer-events-none absolute inset-y-0 left-0"
        style={{ width: `${TRIAGE_EDGE_STRIP_WIDTH}px` }}
      />
      {children}
    </div>
  )
}

/**
 * What the surface shows once the form has popped — canon's app-wide
 * operation-status indicator, scoped to the Inbox.
 *
 * Three states, and the middle one is the important one: a **local** save
 * failure is *"the only case where the triage decision truly wasn't
 * captured"*, so it is an `alert` and it is the danger colour. A push that did
 * not land is neither — the decision is durable — so it is a polite status line
 * and nothing more, exactly as canon *"does not roll back or re-prompt the
 * just-completed triage decision"*.
 *
 * It clears itself the next time Triage opens (`withSessionOpened` resets the
 * save lifecycle), which is why there is no dismiss control: the slice offers
 * no event to clear it, and inventing one here would put the same fact in two
 * places.
 */
function TriageStatusStrip({
  isSaving,
  saveExceptionMessage,
  notice,
}: {
  readonly isSaving: boolean
  readonly saveExceptionMessage: string | null
  readonly notice: string | null
}) {
  if (!isSaving && saveExceptionMessage === null && notice === null) return null

  const isFailure = saveExceptionMessage !== null
  const message = saveExceptionMessage ?? (isSaving ? 'Saving…' : notice)
  if (message === null) return null

  return (
    <p
      data-testid="triage-status-strip"
      role={isFailure ? 'alert' : 'status'}
      className={cn(
        'absolute inset-x-3 bottom-3 z-10 m-0 rounded-kro-small px-3 py-2 text-sm',
      )}
      style={{
        color: isFailure ? 'white' : colorVar('fore'),
        backgroundColor: isFailure
          ? colorVar('bannerDanger')
          : colorVar('backInner'),
        boxShadow: 'var(--kro-shadow-card)',
      }}
    >
      {message}
    </p>
  )
}
