'use client'

/**
 * The Plan timeline canvas — the port of `TimelineDayView`'s `canvas`,
 * `gridLayer`, `slotLayer`, `draftLayer`, `eventsLayer` and `nowIndicator`.
 *
 * Pure (`RC-15`): every value arrives already derived — the placements from
 * `selectPlanTimelinePlacements`, the band from `selectPlanHourBand`, the slot
 * count from `selectPlanSlotCount` — and every gesture leaves as a callback.
 * It dispatches nothing, reads no clock, and holds no feature state; the only
 * `useState` in its tree is the per-card press highlight, and
 * `useTimelineGestures` explains at length why that is not the thing `RC-4`
 * forbids.
 *
 * ## The five layers, and why their order is load-bearing
 *
 * Bottom to top: the hour grid, the quarter-hour press targets, the
 * uncommitted ghost, the event cards, and the now line. Canon puts the slot
 * layer **under** the cards with a one-line reason that is the whole gesture
 * design: *"a press that lands on an event reaches the card (edit mode) and
 * never the slot"*. Invert the two and holding a block creates an event behind
 * it. The slots also span the full width so *"the empty column beside a narrow
 * card is still pressable"*.
 *
 * ## Geometry is `calc()`, never a measurement
 *
 * Canon reads `geometry.size.width` and computes each column's x and width from
 * it. Here the same arithmetic is CSS: the content area is
 * `100% − hourLabelWidth − 2·horizontalInset`, and a column is that times the
 * placement's `xFraction` / `widthFraction`. No `ResizeObserver`, nothing to
 * re-measure on rotation, and a card is positioned correctly on its very first
 * paint rather than one frame later.
 *
 * ## The band, not midnight, is the origin
 *
 * `selectPlanTimelinePlacements` already anchors offsets to the band's top
 * (`startHour`), so a Business-hours day view draws 08:00 at y = 0. The grid,
 * the ghost and the now line subtract `band.start * hourHeight` for the same
 * reason. #18's `timelinePlacements` carries the note in full.
 */
import type { Endeavor } from '@kro/core'
import { endOf } from '@kro/core'
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
} from 'react'
import {
  computedSymbol,
  displayTitle,
} from '../../../../design/endeavor/endeavorCardModel'
import { formatTimeRange } from '../../../../design/endeavor/formatting'
import { colorVar } from '../../../../design/system/tokens/roles'
import { cn } from '../../../../design/system/utils/cn'
import {
  startOfNextPlanDay,
  startOfPlanDay,
} from '../../PlanCalendar'
import {
  BLOCK_PRESS_MAX_DISTANCE_PX,
  BLOCK_RIPPLE_TIMING_MS,
  EDIT_MODE_HOLD_DURATION_MS,
  SLOT_PRESS_DURATION_MS,
  SLOT_PRESS_MAX_DISTANCE_PX,
  TIMELINE_HORIZONTAL_INSET_PX,
  TIMELINE_HOUR_HEIGHT_PX,
  TIMELINE_HOUR_LABEL_WIDTH_PX,
  TIMELINE_MINIMUM_CARD_HEIGHT_PX,
  TIMELINE_SLOTS_PER_HOUR,
} from '../../PlanConstants'
import { TimelineDragHandle, isPastTimelineEvent } from '../../PlanEditSession'
import type { PlacedEvent } from '../../TimelineLayout'
import {
  placedEventWidthFraction,
  placedEventXFraction,
  timelinePointOffset,
} from '../../TimelineLayout'
import type { QuickCreateDraft, TimelineHourBand } from '../../TimelineSlots'
import {
  isOnTheHourSlot,
  timelineSlotHeightMultiples,
  timelineSlotStart,
} from '../../TimelineSlots'
import {
  CardTier,
  RIPPLE_SETTLED_OPACITY,
  cardAccentColor,
  cardFillBackground,
  cardTierFor,
  rippleDiameterCss,
} from './timelineCardStyle'
import { slotAccessibilityLabel, timelineHourLabel } from './timelineFormat'
import {
  SLOT_INDEX_ATTRIBUTE,
  useBlockPress,
  useReducedMotionPreference,
  useSlotPress,
  useVerticalDrag,
} from './useTimelineGestures'

/**
 * `TimelineDayView.labelRowHeight` — the fixed height of one (label + rule)
 * row, centred on its hour boundary so the rule bisects the label.
 */
export const LABEL_ROW_HEIGHT = 18

/** Canon's `.onTapGesture(count: 2)` window, as a web double-tap interval. */
export const SLOT_DOUBLE_TAP_MS = 350

/** Canon's `editHandleDot()` — `Circle().frame(width: 14, height: 14)`. */
const HANDLE_DIAMETER = 14

/** Canon's `availableWidth`, as CSS rather than as a measurement. */
const CONTENT_WIDTH = `calc(100% - ${TIMELINE_HOUR_LABEL_WIDTH_PX}px - ${
  TIMELINE_HORIZONTAL_INSET_PX * 2
}px)`

/** Where the content area starts — the label gutter plus the inset. */
const CONTENT_LEFT_PX =
  TIMELINE_HOUR_LABEL_WIDTH_PX + TIMELINE_HORIZONTAL_INSET_PX

export interface TimelineFragmentProps {
  /** The placed rectangles — `selectPlanTimelinePlacements`, band-anchored. */
  readonly placements: readonly PlacedEvent[]
  readonly selectedDate: Date
  /** The wall clock. Drives the now line and which blocks are inert. */
  readonly now: Date
  readonly band: TimelineHourBand
  /** Whether the selected day is today — the now line's gate. */
  readonly isShowingToday: boolean
  /** `selectPlanSlotCount`. */
  readonly slotCount: number
  readonly isQuickCreateAvailable: boolean
  readonly quickCreate: QuickCreateDraft | null
  readonly editingEndeavorId: string | null
  /** The chrome floating over the canvas — the five-day picker. */
  readonly overlay?: ReactNode
  /** Content inset so the first row clears `overlay`. */
  readonly topInsetPx?: number
  /** Content inset so the last row clears the tab bar and the FAB. */
  readonly bottomInsetPx?: number

  readonly onViewDetail: (endeavor: Endeavor) => void
  readonly onHoldBlock: (endeavor: Endeavor) => void
  readonly onGrabHandle: (handle: TimelineDragHandle) => void
  readonly onDragHandle: (translationPx: number) => void
  readonly onReleaseHandle: () => void
  readonly onTapOutsideEditing: () => void
  readonly onPressSlot: (index: number, isHold: boolean) => void
  readonly className?: string
}

export function TimelineFragment({
  placements,
  selectedDate,
  now,
  band,
  isShowingToday,
  slotCount,
  isQuickCreateAvailable,
  quickCreate,
  editingEndeavorId,
  overlay,
  topInsetPx = 0,
  bottomInsetPx = 0,
  onViewDetail,
  onHoldBlock,
  onGrabHandle,
  onDragHandle,
  onReleaseHandle,
  onTapOutsideEditing,
  onPressSlot,
  className,
}: TimelineFragmentProps) {
  const isEditing = editingEndeavorId !== null
  const hourCount = Math.max(band.endExclusive - band.start, 0)
  const canvasHeight = hourCount * TIMELINE_HOUR_HEIGHT_PX

  /**
   * `handleEventTap` — canon's guard, verbatim in behaviour: while another
   * card is armed a tap is *"a way out of edit mode, not a selection"*, and a
   * tap on the armed card itself keeps its handles in place.
   */
  const handleBlockTap = useCallback(
    (endeavor: Endeavor) => {
      if (editingEndeavorId !== null) {
        if (editingEndeavorId !== endeavor.id) onTapOutsideEditing()
        return
      }
      onViewDetail(endeavor)
    },
    [editingEndeavorId, onTapOutsideEditing, onViewDetail],
  )

  return (
    <div
      data-testid="plan-timeline"
      data-editing={isEditing ? 'true' : 'false'}
      className={cn('relative min-h-0 flex-1', className)}
    >
      {overlay !== undefined && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-20 px-[10px]"
          data-testid="plan-timeline-overlay"
        >
          <div className="pointer-events-auto">{overlay}</div>
        </div>
      )}

      <div
        data-testid="plan-timeline-scroll"
        className="h-full w-full"
        style={{
          // Canon's `.scrollDisabled(editingEventID != nil)` — the scroll view
          // steals a vertical drag, so a handle drag would never reach the
          // card while it is scrollable.
          overflowY: isEditing ? 'hidden' : 'auto',
          overflowX: 'hidden',
          // Canon expresses the chrome as CONTENT insets rather than as layout
          // that shrinks the canvas, so every hour can still be scrolled into
          // the clear.
          paddingTop: topInsetPx,
          paddingBottom: bottomInsetPx,
        }}
      >
        <div
          data-testid="plan-timeline-canvas"
          className="relative w-full"
          style={{
            height: canvasHeight,
            // Half a label row top and bottom so the first and last labels —
            // whose centres sit on the boundary rules — are not clipped.
            marginTop: LABEL_ROW_HEIGHT / 2,
            marginBottom: LABEL_ROW_HEIGHT / 2,
          }}
        >
          <HourGrid band={band} />

          {isQuickCreateAvailable && slotCount > 0 && !isEditing && (
            <SlotLayer
              slotCount={slotCount}
              selectedDate={selectedDate}
              band={band}
              onPressSlot={onPressSlot}
            />
          )}

          {/*
            Canon commits an edit with `.onTapGesture` on the whole canvas.
            Here that is a real button covering the canvas, rendered only while
            a card is armed — which does canon's `allowsHitTesting(editingEventID
            == nil)` at the same time by sitting over the slot layer, and gives
            the gesture an accessible name instead of leaving it on a div.
          */}
          {isEditing && (
            <button
              type="button"
              data-testid="plan-timeline-commit-surface"
              aria-label="Confirm the new time and leave edit mode"
              onClick={onTapOutsideEditing}
              className="absolute inset-0 cursor-default border-none bg-transparent p-0"
              style={{ zIndex: 1 }}
            />
          )}

          <DraftLayer
            draft={quickCreate}
            selectedDate={selectedDate}
            band={band}
          />

          {placements.map((placement, index) => (
            <TimelineBlock
              key={placement.endeavor.id}
              placement={placement}
              index={index}
              now={now}
              isEditing={editingEndeavorId === placement.endeavor.id}
              onTap={handleBlockTap}
              onHold={onHoldBlock}
              onGrabHandle={onGrabHandle}
              onDragHandle={onDragHandle}
              onReleaseHandle={onReleaseHandle}
            />
          ))}

          {isShowingToday && (
            <NowIndicator selectedDate={selectedDate} now={now} band={band} />
          )}
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------- the grid

/**
 * `gridLayer` — one (label, rule) row per hour boundary in the band, **plus the
 * one that closes it**.
 *
 * Canon's `gridHours` is `Array(hourRange) + [hourRange.upperBound]`, and its
 * comment says why the closing rule matters: *"without that last rule the day
 * trails off into empty space with nothing marking where it ends."*
 */
function HourGrid({ band }: { readonly band: TimelineHourBand }) {
  const hours: number[] = []
  for (let hour = band.start; hour <= band.endExclusive; hour += 1) {
    hours.push(hour)
  }

  return (
    <div aria-hidden="true" data-testid="plan-timeline-grid">
      {hours.map((hour) => (
        <div
          key={`hour-${hour}`}
          data-testid="plan-timeline-hour-rule"
          data-hour={hour}
          className="absolute inset-x-0 flex items-center"
          style={{
            height: LABEL_ROW_HEIGHT,
            top:
              (hour - band.start) * TIMELINE_HOUR_HEIGHT_PX -
              LABEL_ROW_HEIGHT / 2,
          }}
        >
          <span
            className="shrink-0 pr-2 text-right text-[12px] text-kro-fore-secondary"
            style={{ width: TIMELINE_HOUR_LABEL_WIDTH_PX }}
          >
            {timelineHourLabel(hour)}
          </span>
          <span
            className="flex-1"
            style={{ height: 0.5, background: colorVar('hairline') }}
          />
        </div>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ the slots

/**
 * `slotLayer` — the transparent quarter-hour press targets.
 *
 * Each target straddles its own mark (`timelineSlotHeightMultiples`: 0.5 for
 * the first, 1.5 for the last, 1 between) so a press rounds to the *nearest*
 * quarter hour rather than flooring to it. #18's `TimelineSlots` owns that
 * identity and its proof; this layer only lays the heights out.
 *
 * Only the on-the-hour slots are exposed to assistive technology, exactly as
 * canon does — *"exposing all 96 quarter-hours instead would bury the rest of
 * the day under press targets to swipe past"* — and each of those is a real
 * `button`, so an affordance that is otherwise a hold or a double-tap has an
 * operable path for a keyboard or a screen reader.
 */
function SlotLayer({
  slotCount,
  selectedDate,
  band,
  onPressSlot,
}: {
  readonly slotCount: number
  readonly selectedDate: Date
  readonly band: TimelineHourBand
  readonly onPressSlot: (index: number, isHold: boolean) => void
}) {
  const { handlers } = useSlotPress({
    onCreate: onPressSlot,
    holdMs: SLOT_PRESS_DURATION_MS,
    maxDistancePx: SLOT_PRESS_MAX_DISTANCE_PX,
    doubleTapMs: SLOT_DOUBLE_TAP_MS,
  })

  const slotHeight = TIMELINE_HOUR_HEIGHT_PX / TIMELINE_SLOTS_PER_HOUR
  const multiples = timelineSlotHeightMultiples(slotCount)

  return (
    <div
      data-testid="plan-timeline-slots"
      className="absolute inset-0 flex flex-col"
      // `pan-y` keeps a flick scrolling the canvas while a stationary press is
      // still recognised as a hold. `none` would win every gesture and make the
      // timeline unscrollable from empty space.
      style={{ touchAction: 'pan-y' }}
      {...handlers}
    >
      {multiples.map((multiple, index) => {
        const start = timelineSlotStart(index, selectedDate, band.start)
        const onTheHour = isOnTheHourSlot(index)
        return (
          <button
            // The index IS the identity: slots are positional, and a slot's
            // wall-clock time is derived from it rather than stored.
            key={`slot-${index}`}
            type="button"
            {...{ [SLOT_INDEX_ATTRIBUTE]: index }}
            aria-hidden={!onTheHour}
            tabIndex={onTheHour ? 0 : -1}
            aria-label={slotAccessibilityLabel(start)}
            /*
              The accessible path — and ONLY the accessible path.

              `MouseEvent.detail` is the click count, and it is `0` exactly
              when the click was not produced by a pointer: a keyboard Enter or
              Space, and the synthetic activation a screen reader dispatches.
              A real click carries `1` or more.

              Without that guard this handler is a second, contradictory way to
              create an event: a plain single click would create one, which is
              precisely what `useSlotPress` is written to refuse — and the
              `click` the browser also synthesises after a hold or a double-tap
              would fire it a SECOND time, opening the capture prompt twice.

              Fires with `isHold: false`, so no haptic — canon's own
              accessibility action does the same.
            */
            onClick={(event) => {
              if (event.detail !== 0) return
              onPressSlot(index, false)
            }}
            className="w-full shrink-0 cursor-default border-none bg-transparent p-0"
            style={{ height: slotHeight * multiple }}
          />
        )
      })}
    </div>
  )
}

// ------------------------------------------------------------------ the ghost

/**
 * `draftLayer` — the uncommitted event drawn in place while the creation
 * prompt is open, *"so the slot they picked stays visible behind it"*.
 *
 * A dashed 2px outline in `timelineSelectionOutline` over a 22% fill of the
 * same, with the label drawn in the scheme's own foreground rather than in the
 * outline colour — canon's note: the block is *"filled with that same colour at
 * low opacity, so drawing the label in it puts a tint on its own tint — about
 * 2:1 in light mode, well under the 4.5:1 this 12pt semibold text needs."*
 */
function DraftLayer({
  draft,
  selectedDate,
  band,
}: {
  readonly draft: QuickCreateDraft | null
  readonly selectedDate: Date
  readonly band: TimelineHourBand
}) {
  if (draft === null) return null

  const dayStart = startOfPlanDay(selectedDate)
  const dayEnd = startOfNextPlanDay(selectedDate)
  // Canon guards on `isDate(start, inSameDayAs: selectedDate)` — a ghost seeded
  // on another day belongs to that day's canvas, not this one.
  if (
    draft.start.getTime() < dayStart.getTime() ||
    draft.start.getTime() >= dayEnd.getTime()
  ) {
    return null
  }

  const yOffset =
    timelinePointOffset(dayStart, draft.start) -
    band.start * TIMELINE_HOUR_HEIGHT_PX
  const height = Math.max(
    (draft.durationSeconds / 3600) * TIMELINE_HOUR_HEIGHT_PX,
    TIMELINE_MINIMUM_CARD_HEIGHT_PX,
  )

  return (
    <div
      data-testid="plan-timeline-draft"
      aria-label="New event being created"
      className="pointer-events-none absolute"
      style={{
        left: CONTENT_LEFT_PX,
        width: CONTENT_WIDTH,
        top: yOffset,
        height,
        borderRadius: 8,
        background: `color-mix(in srgb, ${colorVar(
          'timelineSelectionOutline',
        )} 22%, transparent)`,
        border: `2px dashed ${colorVar('timelineSelectionOutline')}`,
        zIndex: 1,
      }}
    >
      <span
        className="block px-2 py-1 font-semibold text-[12px]"
        style={{ color: colorVar('fore') }}
      >
        New event
      </span>
    </div>
  )
}

// ------------------------------------------------------------------ the cards

function TimelineBlock({
  placement,
  index,
  now,
  isEditing,
  onTap,
  onHold,
  onGrabHandle,
  onDragHandle,
  onReleaseHandle,
}: {
  readonly placement: PlacedEvent
  readonly index: number
  readonly now: Date
  readonly isEditing: boolean
  readonly onTap: (endeavor: Endeavor) => void
  readonly onHold: (endeavor: Endeavor) => void
  readonly onGrabHandle: (handle: TimelineDragHandle) => void
  readonly onDragHandle: (translationPx: number) => void
  readonly onReleaseHandle: () => void
}) {
  const { endeavor } = placement
  const isPast = isPastTimelineEvent(endeavor, now)
  const reduceMotion = useReducedMotionPreference()
  const accent = cardAccentColor(endeavor, index)
  const height = Math.max(placement.height, TIMELINE_MINIMUM_CARD_HEIGHT_PX)

  const { isPressed, handlers } = useBlockPress({
    onTap: () => onTap(endeavor),
    // Canon skips the long-press affordance for a finished event entirely,
    // *"so the user can't accidentally reschedule history"* — the block still
    // reports the press, because it still opens detail.
    onHold: isPast ? null : () => onHold(endeavor),
    holdMs: EDIT_MODE_HOLD_DURATION_MS,
    maxDistancePx: BLOCK_PRESS_MAX_DISTANCE_PX,
  })

  const isDraggable = isEditing && !isPast
  const body = useVerticalDrag({
    onBegin: () => onGrabHandle(TimelineDragHandle.body),
    onDrag: onDragHandle,
    onEnd: onReleaseHandle,
    // Canon's `DragGesture(minimumDistance: 4)` on the body: it shares the card
    // with a tap, so it must not claim the gesture the instant a finger lands.
    minimumDistancePx: 4,
    disabled: !isDraggable,
  })

  /**
   * The press and the body drag **share** one set of DOM handlers.
   *
   * Spreading `{...press} {...body}` looks equivalent and is not: the second
   * spread REPLACES the four keys they have in common, so the press hook stops
   * receiving `pointerup` the instant a card becomes draggable. Two things
   * break together — `isPressed` never clears, so the deepened fill sticks
   * after the edit commits; and the drag hook, mounted mid-gesture, never saw
   * the `pointerdown` it is waiting for, so a hold-then-slide moves nothing.
   *
   * Composing them explicitly fixes the first. The second is fixed inside
   * `useVerticalDrag`, which adopts a pointer that is already down.
   */
  const surfaceHandlers = {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      handlers.onPointerDown(event)
      if (isDraggable) body.handlers.onPointerDown(event)
    },
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      handlers.onPointerMove(event)
      if (isDraggable) body.handlers.onPointerMove(event)
    },
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
      handlers.onPointerUp(event)
      if (isDraggable) body.handlers.onPointerUp(event)
    },
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => {
      handlers.onPointerCancel(event)
      if (isDraggable) body.handlers.onPointerCancel(event)
    },
    onPointerLeave: handlers.onPointerLeave,
  }

  const tier = cardTierFor(endeavor)
  const end = endOf(endeavor)
  const calendarName = endeavor.shadows?.[0]?.group ?? null

  const columnStyle: CSSProperties = {
    position: 'absolute',
    top: placement.yOffset,
    height,
    left: `calc(${CONTENT_LEFT_PX}px + ${CONTENT_WIDTH} * ${placedEventXFraction(
      placement,
    )})`,
    // Canon's `max(columnWidth - 4, 40)` — the 4px gutter between neighbouring
    // columns, with a floor so a dense cluster stays tappable.
    width: `max(40px, calc(${CONTENT_WIDTH} * ${placedEventWidthFraction(
      placement,
    )} - 4px))`,
    // The armed card is raised so its handle dots are never occluded by an
    // overlapping neighbour — canon's `.zIndex(isEditing ? 1 : 0)`, one step
    // higher here because the commit surface occupies the layer beneath.
    zIndex: isEditing ? 3 : 2,
  }

  return (
    <div
      data-timeline-block=""
      data-testid="plan-timeline-block"
      data-endeavor-id={endeavor.id}
      data-pressed={isPressed ? 'true' : 'false'}
      data-past={isPast ? 'true' : 'false'}
      data-editing={isEditing ? 'true' : 'false'}
      style={columnStyle}
    >
      <button
        type="button"
        data-testid="plan-timeline-block-surface"
        aria-label={endeavor.title}
        className="relative block h-full w-full cursor-pointer overflow-hidden border-none bg-transparent p-0 text-left"
        style={{
          borderRadius: 8,
          // While armed the card owns the vertical gesture outright; otherwise
          // a vertical flick belongs to the scroll container.
          touchAction: isDraggable ? 'none' : 'pan-y',
        }}
        {...surfaceHandlers}
      >
        {/* The tint. `transition: none` on the way IN is the whole press
            feedback: canon's fill *"lands with no animation at all — a press
            has to be acknowledged on the frame it happens"*, and only the
            release is eased. */}
        <span
          data-testid="plan-timeline-block-fill"
          className="absolute inset-0"
          style={{
            background: cardFillBackground(accent, isPressed),
            transition: isPressed
              ? 'none'
              : `background ${BLOCK_RIPPLE_TIMING_MS.releaseMs}ms ease-out`,
          }}
        />

        {/* The leading accent bar — the calendar's identity at full strength. */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0"
          style={{ width: 4, background: accent }}
        />

        {/* The wave. Suppressed outright under reduced motion — it is motion
            with no informational content, and the deepened fill above already
            carries the acknowledgement. */}
        {!reduceMotion && (
          <span
            aria-hidden="true"
            data-testid="plan-timeline-block-ripple"
            className="pointer-events-none absolute"
            style={{
              left: '50%',
              top: '50%',
              width: rippleDiameterCss(height),
              aspectRatio: '1',
              translate: '-50% -50%',
              borderRadius: '50%',
              background: accent,
              // Canon's ripple is the accent at 0.38, thinning to
              // `1 - 0.45` of that as it reaches full spread.
              opacity: isPressed ? 0.38 * RIPPLE_SETTLED_OPACITY : 0,
              transform: isPressed ? 'scale(1)' : 'scale(0)',
              transition: `transform ${
                isPressed
                  ? BLOCK_RIPPLE_TIMING_MS.holdMs
                  : BLOCK_RIPPLE_TIMING_MS.releaseMs
              }ms ease-out, opacity ${
                isPressed
                  ? BLOCK_RIPPLE_TIMING_MS.holdMs
                  : BLOCK_RIPPLE_TIMING_MS.releaseMs
              }ms ease-out`,
            }}
          />
        )}

        <span className="relative flex h-full flex-col gap-[2px] py-[6px] pr-6 pl-3">
          {tier >= CardTier.emojiLine && (
            <span aria-hidden="true" className="text-[18px] leading-none">
              {computedSymbol(endeavor.title)}
            </span>
          )}
          <span
            className="font-semibold text-[13px] text-kro-fore"
            style={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: tier >= CardTier.twoLineTitle ? 2 : 1,
              overflow: 'hidden',
            }}
          >
            {tier >= CardTier.emojiLine
              ? displayTitle(endeavor.title)
              : endeavor.title}
          </span>
          {tier >= CardTier.timeRange &&
            endeavor.start !== null &&
            end !== null && (
              <span className="text-[11px] text-kro-fore-secondary">
                {formatTimeRange(endeavor.start, end)}
              </span>
            )}
          {tier >= CardTier.calendarName && calendarName !== null && (
            <span className="truncate text-[11px] text-kro-fore-secondary">
              {calendarName}
            </span>
          )}
        </span>
      </button>

      {isDraggable && (
        <>
          <span
            aria-hidden="true"
            data-testid="plan-timeline-edit-outline"
            className="pointer-events-none absolute inset-0"
            style={{ border: `2px solid ${accent}`, borderRadius: 8 }}
          />
          <EditHandle
            edge="start"
            onGrabHandle={onGrabHandle}
            onDragHandle={onDragHandle}
            onReleaseHandle={onReleaseHandle}
          />
          <EditHandle
            edge="end"
            onGrabHandle={onGrabHandle}
            onDragHandle={onDragHandle}
            onReleaseHandle={onReleaseHandle}
          />
        </>
      )}
    </div>
  )
}

/**
 * How far one keyboard press moves an edge, in pixels.
 *
 * One snap grain expressed in the grid's own units: 15 minutes at 60px an hour
 * is 15px. Derived rather than written as `15` so a change to the hour height
 * moves the keyboard step with it.
 */
export const HANDLE_KEYBOARD_STEP_PX =
  TIMELINE_HOUR_HEIGHT_PX / TIMELINE_SLOTS_PER_HOUR

/**
 * A top or bottom handle dot.
 *
 * `minimumDistancePx: 0` matches canon's `DragGesture(minimumDistance: 0)`: a
 * handle has nothing else to do, so it claims the gesture immediately and the
 * first pixel of travel already moves the edge.
 *
 * The arrow keys drive the same three callbacks a drag does — grab, translate
 * by one snap, release — so the keyboard path produces the identical committed
 * times rather than a second, parallel edit mechanism that could drift.
 */
function EditHandle({
  edge,
  onGrabHandle,
  onDragHandle,
  onReleaseHandle,
}: {
  readonly edge: 'start' | 'end'
  readonly onGrabHandle: (handle: TimelineDragHandle) => void
  readonly onDragHandle: (translationPx: number) => void
  readonly onReleaseHandle: () => void
}) {
  const handle =
    edge === 'start' ? TimelineDragHandle.start : TimelineDragHandle.end
  const { handlers } = useVerticalDrag({
    onBegin: () => onGrabHandle(handle),
    onDrag: onDragHandle,
    onEnd: onReleaseHandle,
  })

  return (
    <button
      type="button"
      aria-label={
        edge === 'start'
          ? 'Drag to move the start time'
          : 'Drag to move the end time'
      }
      data-testid="plan-timeline-edit-handle"
      data-edge={edge}
      className="absolute border-none p-0"
      onKeyDown={(event) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
        event.preventDefault()
        const direction = event.key === 'ArrowDown' ? 1 : -1
        onGrabHandle(handle)
        onDragHandle(direction * HANDLE_KEYBOARD_STEP_PX)
        onReleaseHandle()
      }}
      style={{
        left: '50%',
        top: edge === 'start' ? 0 : '100%',
        width: HANDLE_DIAMETER,
        height: HANDLE_DIAMETER,
        marginLeft: -HANDLE_DIAMETER / 2,
        marginTop: -HANDLE_DIAMETER / 2,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgb(0 0 0 / 0.3)',
        cursor: 'ns-resize',
        touchAction: 'none',
        zIndex: 4,
      }}
      {...handlers}
    />
  )
}

// -------------------------------------------------------------- the now line

/** `nowIndicator` — the red line with a dot on the leading edge. */
function NowIndicator({
  selectedDate,
  now,
  band,
}: {
  readonly selectedDate: Date
  readonly now: Date
  readonly band: TimelineHourBand
}) {
  const offset =
    timelinePointOffset(startOfPlanDay(selectedDate), now) -
    band.start * TIMELINE_HOUR_HEIGHT_PX

  return (
    <div
      aria-hidden="true"
      data-testid="plan-timeline-now"
      className="pointer-events-none absolute inset-x-0 flex items-center"
      style={{ top: offset, zIndex: 4 }}
    >
      <span style={{ width: TIMELINE_HOUR_LABEL_WIDTH_PX }} />
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: colorVar('kroRed'),
        }}
      />
      <span
        className="flex-1"
        style={{ height: 1.5, background: colorVar('kroRed') }}
      />
    </div>
  )
}
