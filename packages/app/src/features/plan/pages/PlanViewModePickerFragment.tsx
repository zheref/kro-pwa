'use client'

/**
 * The rotary view-mode selector — the port of `KroUI/Plan/PlanViewModePicker.swift`.
 *
 * A glass capsule with the selected destination's glyph large in a centre lens
 * and its neighbours smaller either side. Dragging carries the strip under the
 * lens; releasing settles onto whichever glyph the gesture committed to, and
 * the set wraps, so `Priority Matrix → Day View` is one step forward rather
 * than two back.
 *
 * ## The rebasing is what makes three items feel endless
 *
 * Canon's trick, kept verbatim: while the finger is down, every whole
 * `itemSpacing` the drag has covered is folded into a *displayed* selection
 * (`advancePlanViewMode(selection, -dragStep)`) and subtracted from the visual
 * translation. The strip therefore re-centres on each passed slot instead of
 * running out of items after one width — *"this rebasing lets the three modes
 * loop continuously at the finger's speed"*. Take the rebasing out and the
 * control still works, still animates, and stops dead after one item; that is
 * why this note exists.
 *
 * ## Five slots, three of them real
 *
 * Canon renders `ForEach(-2...2)` and gates hit-testing to `abs(index) <= 1`.
 * With exactly three modes, that is the three modes as buttons plus two
 * decorative duplicates at the capsule's edges, which are what the mask reveals
 * mid-drag. So the ±2 slots are `aria-hidden` here rather than being a fourth
 * and fifth actionable copy of a destination that is already on screen.
 *
 * ## Accessibility diverges from canon, deliberately
 *
 * Canon collapses the control to one element with an *adjustable action*
 * (VoiceOver's swipe-up/down). The web has no adjustable-action idiom; the
 * closest honest equivalent is what is already true of the DOM here — three
 * ordinary buttons, one per destination, each with its canon label
 * (`planViewModeLabel`) and `aria-pressed` on the selected one. Arrow keys move
 * the selection for a keyboard user, which is the behaviour canon's adjustable
 * action provides. Announcing a "slider" (the only ARIA role with increment
 * semantics) would promise a value a screen reader could read out, and there is
 * no value here — there are three named destinations.
 */
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { springEasing, settleMs } from '../../../design/chrome/layout/chromeMotion'
import { cn } from '../../../design/system/utils/cn'
import {
  type PlanViewMode,
  advancePlanViewMode,
  planViewModeLabel,
  planViewModes,
} from '../PlanNavigation'
import {
  capturePointer,
  releasePointer,
  useReducedMotionPreference,
} from './timeline/useTimelineGestures'

/** Canon's `itemSpacing`. */
export const MODE_ITEM_SPACING = 35
/** Canon's `selectionThreshold` — how far past a whole step commits one more. */
export const MODE_SELECTION_THRESHOLD = 28
/** Canon's `.frame(width: 128, height: 56)`. */
export const MODE_PICKER_SIZE = { width: 128, height: 56 } as const
/** Canon's centre lens — `Circle().frame(width: 44, height: 44)`. */
const LENS_DIAMETER = 44
/** Canon's per-glyph `.frame(width: 46, height: 46)`. */
const GLYPH_BOX = 46
/** Canon's `DragGesture(minimumDistance: 8)`. */
const DRAG_MINIMUM_PX = 8

/**
 * `.snappy(duration: 0.34, extraBounce: 0.08)`.
 *
 * SwiftUI's `.snappy` carries a base bounce of 0.15, so `extraBounce: 0.08`
 * makes 0.23 — and the damping fraction the chrome kit's sampler takes is
 * `1 - bounce`. Spelling the arithmetic out here rather than writing `0.77`
 * is what lets a reviewer check it against the one line of canon.
 */
const SETTLE_SPRING = { response: 0.34, dampingFraction: 1 - 0.23 } as const

/** `committedSteps(for:)` — how many slots a released drag commits to. */
export const committedModeSteps = (translationPx: number): number | null => {
  const wholeSteps = Math.trunc(translationPx / MODE_ITEM_SPACING)
  const remainder = translationPx - wholeSteps * MODE_ITEM_SPACING
  const crossesIntentMargin = Math.abs(remainder) >= MODE_SELECTION_THRESHOLD
  const direction = translationPx < 0 ? 1 : -1
  if (wholeSteps === 0 && !crossesIntentMargin) return null
  return direction * (Math.abs(wholeSteps) + (crossesIntentMargin ? 1 : 0))
}

/** `lensProminence(at:)` — 1 in the lens, 0 a full slot away. */
export const lensProminence = (
  relativeIndex: number,
  visualTranslationPx: number,
): number => {
  const focus = -visualTranslationPx / MODE_ITEM_SPACING
  const distance = Math.abs(relativeIndex - focus)
  return Math.max(0, 1 - Math.min(distance, 1))
}

/** `scale(at:)` — canon's `0.62 + 0.38 * prominence`. */
export const modeGlyphScale = (prominence: number): number =>
  0.62 + 0.38 * prominence

/** Canon's `tint(for:)`, as design-system roles rather than SwiftUI colours. */
const MODE_TINT: Record<PlanViewMode, string> = {
  timeline: 'var(--kro-color-badge-cyan)',
  list: 'var(--kro-color-ring-emerald)',
  priorityMatrix: 'var(--kro-color-badge-orange)',
}

/**
 * Canon's `glyphName(for:)`, drawn inline.
 *
 * `calendar.day.timeline.left` and `square.grid.2x2.fill` have no entry in the
 * design system's SF-Symbol map, and minting two rows in a shared map from this
 * lane is exactly the kind of edit that collides with a sibling child. Three
 * 20×20 paths, drawn to the same 2.25 stroke weight lucide uses, keep the
 * control self-contained.
 */
function ModeGlyph({ mode }: { readonly mode: PlanViewMode }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.25,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  // `aria-hidden` rather than a `<title>`: the name lives on the button that
  // wraps this, and a titled SVG inside a labelled button is announced twice.
  switch (mode) {
    case 'timeline':
      return (
        <svg {...common}>
          <path d="M3 6h3M3 12h3M3 18h3" />
          <rect x="9" y="4" width="12" height="6" rx="1.5" />
          <rect x="9" y="14" width="8" height="6" rx="1.5" />
        </svg>
      )
    case 'list':
      return (
        <svg {...common}>
          <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
          <rect x="13" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" fill="currentColor" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" fill="currentColor" />
        </svg>
      )
  }
}

export interface PlanViewModePickerFragmentProps {
  readonly selection: PlanViewMode
  readonly onSelect: (mode: PlanViewMode) => void
  readonly className?: string
}

export function PlanViewModePickerFragment({
  selection,
  onSelect,
  className,
}: PlanViewModePickerFragmentProps) {
  const [dragTranslation, setDragTranslation] = useState(0)
  const [isSettling, setIsSettling] = useState(false)
  const reduceMotion = useReducedMotionPreference()

  const origin = useRef<number | null>(null)
  const isDragging = useRef(false)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (settleTimer.current !== null) clearTimeout(settleTimer.current)
    },
    [],
  )

  /**
   * `rebase(after:)` — commit the selection and drop the translation with the
   * animation off, so the glyph under the lens is never swapped mid-flight.
   */
  const rebase = useCallback(
    (steps: number | null) => {
      if (steps !== null && steps !== 0) {
        onSelect(advancePlanViewMode(selection, steps))
      }
      setDragTranslation(0)
      setIsSettling(false)
    },
    [onSelect, selection],
  )

  /** `settle(steps:)` — animate the strip onto the target, then rebase. */
  const settle = useCallback(
    (steps: number | null) => {
      if (isSettling) return
      if (reduceMotion) {
        rebase(steps)
        return
      }
      setIsSettling(true)
      setDragTranslation(-(steps ?? 0) * MODE_ITEM_SPACING)
      settleTimer.current = setTimeout(() => {
        settleTimer.current = null
        rebase(steps)
      }, settleMs(SETTLE_SPRING))
    },
    [isSettling, reduceMotion, rebase],
  )

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    origin.current = event.clientX
    isDragging.current = false
  }, [])

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const start = origin.current
      if (start === null || isSettling) return
      const translation = event.clientX - start
      if (!isDragging.current) {
        if (Math.abs(translation) < DRAG_MINIMUM_PX) return
        isDragging.current = true
        capturePointer(event.currentTarget, event.pointerId)
      }
      setDragTranslation(translation)
    },
    [isSettling],
  )

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const start = origin.current
      const dragged = isDragging.current
      origin.current = null
      isDragging.current = false
      releasePointer(event.currentTarget, event.pointerId)
      if (start === null || !dragged) return
      // A drag that reached here is not also a click on the glyph underneath.
      event.preventDefault()
      settle(committedModeSteps(event.clientX - start))
    },
    [settle],
  )

  const onPointerCancel = useCallback(() => {
    origin.current = null
    isDragging.current = false
    setDragTranslation(0)
  }, [])

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        settle(1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        settle(-1)
      }
    },
    [settle],
  )

  // `dragStep` folds every whole slot the finger has covered into the DISPLAYED
  // selection, leaving only the sub-slot remainder as visual translation.
  const dragStep = Math.trunc(dragTranslation / MODE_ITEM_SPACING)
  const displayedSelection = advancePlanViewMode(selection, -dragStep)
  const visualTranslation = dragTranslation - dragStep * MODE_ITEM_SPACING

  const motion = isSettling
    ? {
        transitionProperty: 'transform',
        transitionDuration: `${settleMs(SETTLE_SPRING)}ms`,
        transitionTimingFunction: springEasing(SETTLE_SPRING),
      }
    : {}

  return (
    <div
      data-testid="plan-view-mode-picker"
      data-selection={selection}
      role="group"
      aria-label="Plan view"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={cn(
        'kro-glass kro-glass--control relative shrink-0 touch-pan-y select-none',
        className,
      )}
      style={{
        width: MODE_PICKER_SIZE.width,
        height: MODE_PICKER_SIZE.height,
        borderRadius: 9999,
        // Canon masks the capsule inset by 3 so a glyph sliding out is clipped
        // by the control rather than escaping it.
        overflow: 'hidden',
      }}
    >
      {/* The lens — part of the one glass surface, never a second floating disc. */}
      <div
        aria-hidden="true"
        data-testid="plan-view-mode-lens"
        className="pointer-events-none absolute"
        style={{
          left: '50%',
          top: '50%',
          width: LENS_DIAMETER,
          height: LENS_DIAMETER,
          marginLeft: -LENS_DIAMETER / 2,
          marginTop: -LENS_DIAMETER / 2,
          borderRadius: '50%',
          background: 'rgb(255 255 255 / 0.14)',
          border: '1px solid rgb(255 255 255 / 0.16)',
        }}
      />

      {[-2, -1, 0, 1, 2].map((relativeIndex) => {
        const mode = advancePlanViewMode(displayedSelection, relativeIndex)
        const prominence = lensProminence(relativeIndex, visualTranslation)
        const isReachable = Math.abs(relativeIndex) <= 1
        const offset = relativeIndex * MODE_ITEM_SPACING + visualTranslation

        const content = (
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: GLYPH_BOX,
              height: GLYPH_BOX,
              // Colour arrives only as a glyph passes through the lens —
              // canon layers a white glyph under a tinted one and fades the
              // tinted copy in. One element with an interpolated colour would
              // pass through grey; two stacked copies never do.
              position: 'relative',
            }}
          >
            <span style={{ position: 'absolute', color: 'rgb(255 255 255)' }}>
              <ModeGlyph mode={mode} />
            </span>
            <span
              style={{
                position: 'absolute',
                color: MODE_TINT[mode],
                opacity: prominence,
              }}
            >
              <ModeGlyph mode={mode} />
            </span>
          </span>
        )

        const style = {
          position: 'absolute' as const,
          left: '50%',
          top: '50%',
          width: GLYPH_BOX,
          height: GLYPH_BOX,
          marginLeft: -GLYPH_BOX / 2,
          marginTop: -GLYPH_BOX / 2,
          transform: `translateX(${offset}px) scale(${modeGlyphScale(prominence)})`,
          zIndex: 3 - Math.abs(relativeIndex),
          ...motion,
        }

        return isReachable ? (
          <button
            key={`mode-slot-${relativeIndex}`}
            type="button"
            data-testid="plan-view-mode-option"
            data-mode={mode}
            aria-label={planViewModeLabel(mode)}
            aria-pressed={relativeIndex === 0}
            onClick={() => {
              if (relativeIndex !== 0) settle(relativeIndex)
            }}
            className="cursor-pointer border-none bg-transparent p-0"
            style={style}
          >
            {content}
          </button>
        ) : (
          <span
            key={`mode-slot-${relativeIndex}`}
            aria-hidden="true"
            className="pointer-events-none"
            style={style}
          >
            {content}
          </span>
        )
      })}
    </div>
  )
}
