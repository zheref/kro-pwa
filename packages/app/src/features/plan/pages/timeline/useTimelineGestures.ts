'use client'

/**
 * The timeline's three pointer gestures, as headless hooks.
 *
 * Canon expresses these as SwiftUI gestures — `onLongPressGesture`,
 * `onTapGesture(count: 2)` and `DragGesture` — which the framework already
 * arbitrates against the enclosing `ScrollView`. The web has no such
 * arbitration, so the same three behaviours are rebuilt here on **Pointer
 * Events**, and that choice is the whole reason one implementation serves both
 * input paths the issue names: a mouse, a finger and a pen all arrive as
 * `pointerdown` / `pointermove` / `pointerup`, so "mouse drag = touch drag" and
 * "hold = long-press or mouse-down-hold" are not two code paths that have to be
 * kept in step — they are one.
 *
 * ## Why `useState` here is not the thing `RC-4` forbids
 *
 * `RC-4` forbids `useState` for *feature* state — *"if it needs to survive a
 * re-render for a domain reason, it belongs in the slice"*. Edit mode does, and
 * #18 duly moved it there, because the reflow preview makes every other card's
 * position depend on the draft.
 *
 * A **press highlight** is the opposite case on every axis: nothing outside the
 * pressed card can observe it, it is discarded the instant the finger lifts, no
 * Producer reads it, and it survives no navigation. Putting it in the slice
 * would dispatch an action per `pointerdown` and re-render every card on the
 * canvas to light one of them. The in-flight *bookkeeping* (start position,
 * timers, tap history) is kept in refs rather than state for the same reason
 * canon keeps the drag base out of its draft: a value that changes on every
 * frame must not drive a render.
 *
 * ## Cancellation is what makes scrolling still work
 *
 * Canon relies on the long press *yielding* — *"it fails as soon as the finger
 * travels — so scrolling still starts from anywhere"*. The web equivalent is
 * two guards, and both are load-bearing: a `pointermove` past
 * `maxDistancePx` releases the press explicitly, and `pointercancel` (which the
 * browser fires the moment the scroll container claims the touch) releases it
 * too. Without the second, a fling started on a block leaves it lit for the
 * whole scroll.
 */
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

/** Live `prefers-reduced-motion`, tracked so a mid-session change is honoured. */
export function useReducedMotionPreference(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/** Straight-line distance between two client points, in CSS pixels. */
export const pointerDistance = (
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
): number => Math.hypot(to.x - from.x, to.y - from.y)

// ---------------------------------------------------------------- block press

export interface BlockPressHandlers {
  readonly onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerLeave: (event: ReactPointerEvent<HTMLElement>) => void
}

export interface UseBlockPressOptions {
  /** Fired when the press ended without travelling and without arming a hold. */
  readonly onTap: () => void
  /**
   * Fired when the press was held for `holdMs` without travelling. `null`
   * means this block can never arm — canon's past events, which *"still answer
   * a touch — they open detail — so they report the press, but never promote
   * to edit mode."*
   */
  readonly onHold: (() => void) | null
  readonly holdMs: number
  readonly maxDistancePx: number
  /** `true` suppresses the gesture outright — the canvas is not interactive. */
  readonly disabled?: boolean
}

export interface BlockPress {
  /** Whether the block is lit. Drives the deepened fill and the wave. */
  readonly isPressed: boolean
  readonly handlers: BlockPressHandlers
}

/**
 * One block's press: an instant highlight, an optional hold, and a tap on
 * release.
 *
 * The tap fires on release rather than on `click` because the same gesture has
 * to be able to *not* fire — a hold that armed edit mode, or a press that slid
 * into a scroll, must not also open detail. A `click` listener would fire in
 * both cases, since the browser synthesises one from any press that ends on the
 * element.
 */
export function useBlockPress(options: UseBlockPressOptions): BlockPress {
  const { onTap, onHold, holdMs, maxDistancePx, disabled = false } = options

  const [isPressed, setIsPressed] = useState(false)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didHold = useRef(false)

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  // A block can unmount mid-press (a day step, a reflow) — the timer would
  // otherwise fire into a dead component and arm edit mode on nothing.
  useEffect(() => clearTimer, [clearTimer])

  const release = useCallback(() => {
    clearTimer()
    origin.current = null
    setIsPressed(false)
  }, [clearTimer])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (disabled) return
      // Secondary buttons open context menus; they are not presses.
      if (event.button !== 0 && event.pointerType === 'mouse') return
      origin.current = { x: event.clientX, y: event.clientY }
      didHold.current = false
      setIsPressed(true)
      if (onHold === null) return
      timer.current = setTimeout(() => {
        timer.current = null
        if (origin.current === null) return
        didHold.current = true
        onHold()
      }, holdMs)
    },
    [disabled, holdMs, onHold],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const start = origin.current
      if (start === null) return
      const travelled = pointerDistance(start, {
        x: event.clientX,
        y: event.clientY,
      })
      if (travelled > maxDistancePx) release()
    },
    [maxDistancePx, release],
  )

  const onPointerUp = useCallback(() => {
    const wasPressing = origin.current !== null
    const held = didHold.current
    release()
    if (wasPressing && !held) onTap()
  }, [onTap, release])

  return {
    isPressed,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: release,
      onPointerLeave: release,
    },
  }
}

// ----------------------------------------------------------------- slot press

export interface SlotPressHandlers {
  readonly onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerCancel: () => void
}

export interface UseSlotPressOptions {
  /**
   * A slot asked for a new event. `isHold` distinguishes the two gestures so
   * the caller can honour canon's haptic rule: *"the haptic is the hold's
   * confirmation, so it fires only for a hold; a double-tap already confirms
   * itself visually and needs no buzz."*
   */
  readonly onCreate: (index: number, isHold: boolean) => void
  readonly holdMs: number
  readonly maxDistancePx: number
  /** How long the second tap of a double-tap may arrive after the first. */
  readonly doubleTapMs: number
  readonly disabled?: boolean
}

/** The DOM attribute a slot element carries so the layer can name it. */
export const SLOT_INDEX_ATTRIBUTE = 'data-timeline-slot'

const slotIndexFrom = (target: EventTarget | null): number | null => {
  if (!(target instanceof Element)) return null
  const element = target.closest(`[${SLOT_INDEX_ATTRIBUTE}]`)
  const raw = element?.getAttribute(SLOT_INDEX_ATTRIBUTE)
  if (raw === null || raw === undefined) return null
  const index = Number.parseInt(raw, 10)
  return Number.isNaN(index) ? null : index
}

/**
 * The empty-canvas gesture, wired **once on the layer** rather than once per
 * slot.
 *
 * A full day at business hours is 48 press targets and a full-range day is 96;
 * giving each its own five closures would allocate 480 functions on every
 * render of the canvas. The index instead travels on the element as a data
 * attribute and is read back from the event's target, which is one set of
 * handlers however long the day is.
 */
export function useSlotPress(options: UseSlotPressOptions): {
  readonly handlers: SlotPressHandlers
} {
  const { onCreate, holdMs, maxDistancePx, doubleTapMs, disabled = false } = options

  const origin = useRef<{ x: number; y: number; index: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didHold = useRef(false)
  const lastTap = useRef<{ index: number; at: number; x: number; y: number } | null>(
    null,
  )

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  useEffect(() => clearTimer, [clearTimer])

  const cancel = useCallback(() => {
    clearTimer()
    origin.current = null
  }, [clearTimer])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (disabled) return
      if (event.button !== 0 && event.pointerType === 'mouse') return
      const index = slotIndexFrom(event.target)
      if (index === null) return
      origin.current = { x: event.clientX, y: event.clientY, index }
      didHold.current = false
      timer.current = setTimeout(() => {
        timer.current = null
        if (origin.current === null) return
        didHold.current = true
        // A hold supersedes any half-finished double-tap: the user has said
        // what they want, and leaving the first tap on record would make the
        // NEXT tap anywhere nearby a phantom double.
        lastTap.current = null
        onCreate(index, true)
      }, holdMs)
    },
    [disabled, holdMs, onCreate],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const start = origin.current
      if (start === null) return
      const travelled = pointerDistance(start, {
        x: event.clientX,
        y: event.clientY,
      })
      // Travelling hands the touch back to the scroll view — and invalidates
      // the first half of a double-tap, which must be two presses in one place.
      if (travelled > maxDistancePx) {
        cancel()
        lastTap.current = null
      }
    },
    [cancel, maxDistancePx],
  )

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const start = origin.current
      const held = didHold.current
      cancel()
      if (start === null || held) return

      const now = Date.now()
      const point = { x: event.clientX, y: event.clientY }
      const previous = lastTap.current

      if (
        previous !== null &&
        previous.index === start.index &&
        now - previous.at <= doubleTapMs &&
        pointerDistance(previous, point) <= maxDistancePx * 2
      ) {
        lastTap.current = null
        onCreate(start.index, false)
        return
      }

      lastTap.current = { index: start.index, at: now, x: point.x, y: point.y }
    },
    [cancel, doubleTapMs, maxDistancePx, onCreate],
  )

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: cancel },
  }
}

// -------------------------------------------------------------- vertical drag

export interface VerticalDragHandlers {
  readonly onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void
}

/**
 * Pointer capture, defensively.
 *
 * jsdom implements neither `setPointerCapture` nor `releasePointerCapture`, and
 * the DOM spec has `releasePointerCapture` **throw** `NotFoundError` when the
 * pointer is not captured — which happens for real in a browser whenever the
 * gesture ends after the element was re-created by a reflow. Both are therefore
 * best-effort: capture is an optimisation for the drag, never its correctness.
 */
export const capturePointer = (element: Element, pointerId: number): void => {
  if (typeof element.setPointerCapture !== 'function') return
  try {
    element.setPointerCapture(pointerId)
  } catch {
    // Losing capture costs precision, never the drag: `pointermove` still
    // reports to whatever element the pointer is over, and the handlers are on
    // the card that owns the whole gesture.
  }
}

export const releasePointer = (element: Element, pointerId: number): void => {
  if (typeof element.releasePointerCapture !== 'function') return
  if (
    typeof element.hasPointerCapture === 'function' &&
    !element.hasPointerCapture(pointerId)
  ) {
    return
  }
  try {
    element.releasePointerCapture(pointerId)
  } catch {
    // Already released — the browser drops capture on `pointercancel` itself.
  }
}

export interface UseVerticalDragOptions {
  readonly onBegin: () => void
  /** Cumulative translation from finger-down, in px. Never a per-frame delta. */
  readonly onDrag: (translationPx: number) => void
  readonly onEnd: () => void
  /**
   * How far the pointer must travel before the drag starts reporting. Canon's
   * handles use `minimumDistance: 0` and the body uses `4`, because a body
   * drag shares the card with a tap and must not steal it.
   */
  readonly minimumDistancePx?: number
  readonly disabled?: boolean
}

/**
 * The edit-mode drag, for a handle or for the card body.
 *
 * `setPointerCapture` is what makes a drag that leaves the 14px handle keep
 * reporting to it — without it the first `pointermove` outside the dot
 * retargets and the drag dies, which on a handle two pixels wide is every
 * drag. It is also why `onPointerUp` is guaranteed to arrive: a captured
 * pointer cannot be lost to another element mid-gesture.
 *
 * The reported value is **cumulative from finger-down**, matching what
 * `applyTimelineDrag` requires — #18's note: *"passing a delta here would
 * quietly reintroduce"* the rounding drift the drag base exists to prevent.
 */
export function useVerticalDrag(options: UseVerticalDragOptions): {
  readonly handlers: VerticalDragHandlers
} {
  const { onBegin, onDrag, onEnd, minimumDistancePx = 0, disabled = false } = options

  const origin = useRef<{ x: number; y: number } | null>(null)
  const isDragging = useRef(false)

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (disabled) return
      if (event.button !== 0 && event.pointerType === 'mouse') return
      // The card underneath owns a tap and a hold; a drag that starts on a
      // handle is neither, and letting it bubble would fire both.
      event.stopPropagation()
      origin.current = { x: event.clientX, y: event.clientY }
      isDragging.current = minimumDistancePx === 0
      capturePointer(event.currentTarget, event.pointerId)
      if (isDragging.current) onBegin()
    },
    [disabled, minimumDistancePx, onBegin],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      let start = origin.current
      if (start === null) {
        // ADOPT a pointer that was already down.
        //
        // On the timeline a card becomes draggable *mid-press*: the 0.6s hold
        // arms edit mode while the finger is still on the glass, so this hook
        // is mounted onto a gesture whose `pointerdown` it never saw. Without
        // this branch a user who holds and then slides in one motion moves
        // nothing — they have to lift and press again, which is not what canon
        // does (its `blockDrag` becomes active under the same continued
        // press).
        //
        // `buttons` is the discriminator: it is non-zero exactly while a
        // button or a contact is down, so a stray `pointermove` from a mouse
        // merely hovering the card never starts a drag.
        if (disabled || event.buttons === 0) return
        start = { x: event.clientX, y: event.clientY }
        origin.current = start
        capturePointer(event.currentTarget, event.pointerId)
        // Measured from HERE, not from where the press began: the press was a
        // hold, and the translation the user means is the one they have made
        // since the card started answering to it.
        if (minimumDistancePx === 0) {
          isDragging.current = true
          onBegin()
        }
        return
      }
      const point = { x: event.clientX, y: event.clientY }
      if (!isDragging.current) {
        if (pointerDistance(start, point) < minimumDistancePx) return
        isDragging.current = true
        onBegin()
      }
      event.stopPropagation()
      onDrag(point.y - start.y)
    },
    [disabled, minimumDistancePx, onBegin, onDrag],
  )

  const finish = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const wasDragging = isDragging.current
      origin.current = null
      isDragging.current = false
      releasePointer(event.currentTarget, event.pointerId)
      if (wasDragging) {
        event.stopPropagation()
        onEnd()
      }
    },
    [onEnd],
  )

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
  }
}
