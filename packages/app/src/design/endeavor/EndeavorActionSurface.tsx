/**
 * `EndeavorActionSurface` — one set of props, two input grammars.
 *
 * This is the component the epic's acceptance criterion 3 names: *"rows expose
 * swipe surfaces on touch and hover/context actions on pointer FROM THE SAME
 * PROPS."* The props are `EndeavorCapabilities` — the vista's ordered binding
 * list — and nothing else. There is no `swipeActions` prop beside a
 * `hoverActions` prop, because two props are two things to keep in sync and
 * they will not stay in sync.
 *
 * `resolveRowActions` (in `rowActions.ts`) is the split; this file is the
 * rendering of it:
 *
 *   · TOUCH — the content slides under the finger and the edge's actions are
 *     revealed beneath it. Past the commit threshold, releasing performs the
 *     edge's FIRST binding directly, which is the iOS full-swipe idiom. Past
 *     the reveal threshold it parks open so the buttons can be tapped, each at
 *     the 44px floor with 8px separation.
 *   · POINTER — the same bindings appear as a hover-revealed strip on the
 *     trailing edge (28px targets, 4px separation, per the desktop idiom) AND
 *     as entries in the right-click menu, so a mouse user reaches by two routes
 *     what a finger reaches by one.
 *
 * ## The swipe reads the POINTER, never the rendered offset
 *
 * `pointermove` is a continuous event and React batches, so the last
 * `setOffset` has usually not flushed when `pointerup` runs. Deciding
 * commit-versus-park from the rendered `offset` therefore judges the swipe on
 * stale data — a full swipe snaps shut and fires nothing, and a short one can
 * commit the previous drag's distance. Both thresholds are measured against the
 * pointer's own `clientX` at release instead. The drag is pointer-CAPTURED for
 * the same reason the transform lags: the finger leaves the content element
 * mid-swipe, and without capture the release lands somewhere else entirely.
 *
 * ## Capture is taken at the THRESHOLD, never at `pointerdown`
 *
 * A captured pointer retargets the subsequent `click` to the capturing element.
 * Capturing on `pointerdown` therefore ate every tap that landed on a control
 * INSIDE the row — canon's in-row Triage and Add for Today buttons never fired
 * in a real browser, on any touch device. Releasing the capture in the
 * `pointerup` handler does not help: by then `pointerup` has already been
 * dispatched at the capturing element, and that is what the browser builds the
 * click's target from.
 *
 * So capture is deferred until the drag has actually crossed
 * `SWIPE_DRAG_THRESHOLD_PX` in a direction the row can move. A tap captures
 * nothing and its click reaches the button it landed on; a real swipe captures
 * on its first meaningful move, which is still well before the finger can leave
 * the content element. jsdom implements no pointer capture at all, which is why
 * the kit's suite was green throughout — the regression is proven in Chromium
 * by `apps/web/e2e-kit/action-surface.spec.ts` and pinned here by the capture
 * log in `__tests__/pointerEnvironment.ts`.
 *
 * ## Why the strip is not `display: none` until hover
 *
 * It is `opacity-0` + `pointer-events-none`, revealed by `group-hover` and by
 * `group-focus-within`. The second half is the point: a keyboard user never
 * hovers, so a hover-only action would be unreachable. Tabbing into the strip
 * reveals it, which is the same guarantee the context menu gives a mouse.
 *
 * ## What this component does NOT do
 *
 * It never dispatches, never imports a slice, never knows an endeavor (`RC-14`).
 * It raises `onOperation(operation, endeavorId)` and stops.
 */

import { type CSSProperties, type ReactNode, useCallback, useRef, useState } from 'react'
import type { EndeavorCapabilities, EndeavorOperationBinding } from '@kro/core'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../system/primitives/dropdown-menu'
import { colorVar, radiusVar } from '../system/tokens/roles'
import { cn } from '../system/utils/cn'
import { endeavorIcon, iconForBindingSymbol } from './endeavorIcons'
import {
  type OnEndeavorOperation,
  bindingColorRole,
  onFillRole,
  resolveRowActions,
} from './rowActions'
import { type InputCapability, useInputCapability } from './useInputCapability'

/** Drag distance, in px, at which an edge's actions park open. */
export const SWIPE_REVEAL_PX = 56

/** Drag distance at which releasing performs the edge's first binding. */
export const SWIPE_COMMIT_PX = 140

/**
 * Below this, a release is a TAP and not a swipe.
 *
 * It commits nothing AND moves nothing: a row parked open stays parked, so its
 * revealed buttons remain tappable. Without it, every touch that lands on the
 * content — including the one aimed at a parked button's neighbour — reads as a
 * zero-distance swipe and snaps the row shut under the finger.
 */
export const SWIPE_DRAG_THRESHOLD_PX = 4

/**
 * The pointer chrome's geometry — the numbers the classes below actually use.
 *
 * Read off this file, not guessed: `right-2` is 8, `gap-1` is 4, the hover
 * buttons are rendered at `size={28}`, and the menu trigger is `size-7` at
 * `right-1`. They live here as named values so `pointerChromeGutterPx` derives
 * the reserved gutter from the same numbers the chrome is drawn with, instead
 * of a literal at a call site that nobody re-measures when a class changes.
 */
export const POINTER_CHROME = {
  /** `endeavor-hover-actions` — `right-2`. */
  stripInset: 8,
  /** One hover button — `<ActionButton size={28}>`. */
  stripButton: 28,
  /** `gap-1` between two hover buttons. */
  stripGap: 4,
  /** The context-menu trigger — `right-1`. */
  triggerInset: 4,
  /** The context-menu trigger — `size-7`. */
  triggerSize: 28,
} as const

/**
 * The custom property the surface publishes its reserved gutter on.
 *
 * PUBLISHED, not imposed. The surface wraps arbitrary children and cannot know
 * what is at their trailing edge, so it states how much room its own chrome
 * needs and the child decides. `EndeavorRow` reserves it whenever it renders
 * trailing content; a child that has nothing at that edge ignores it and is
 * unchanged. The `0px` fallback means a row rendered OUTSIDE a surface reads
 * the same as it always did.
 */
export const POINTER_GUTTER_VAR = '--kro-endeavor-pointer-gutter'

/**
 * How much room, in px, the pointer chrome needs at the row's trailing edge.
 *
 * The hover strip and the menu trigger are both anchored to that edge and both
 * become clickable on hover, so anything underneath them is covered — which on
 * an Inbox row is exactly where canon puts Triage and Add for Today. The wider
 * of the two extents wins because they overlap rather than sit side by side.
 */
export function pointerChromeGutterPx(options: {
  readonly hoverActionCount: number
  readonly hasContextMenu: boolean
}): number {
  const { hoverActionCount, hasContextMenu } = options

  const strip =
    hoverActionCount === 0
      ? 0
      : POINTER_CHROME.stripInset +
        hoverActionCount * POINTER_CHROME.stripButton +
        (hoverActionCount - 1) * POINTER_CHROME.stripGap

  const trigger = hasContextMenu
    ? POINTER_CHROME.triggerInset + POINTER_CHROME.triggerSize
    : 0

  return Math.max(strip, trigger)
}

const Ellipsis = endeavorIcon('ellipsis')

export interface EndeavorActionSurfaceProps {
  readonly endeavorId: string
  readonly capabilities: EndeavorCapabilities
  readonly onOperation: OnEndeavorOperation
  /**
   * Force an input type. Stories and tests use it to show both grammars side by
   * side; production leaves it undefined and the media query answers.
   */
  readonly input?: InputCapability
  /** Names the surface for the context menu's trigger. */
  readonly label: string
  readonly children: ReactNode
  readonly className?: string
}

export function EndeavorActionSurface({
  endeavorId,
  capabilities,
  onOperation,
  input,
  label,
  children,
  className,
}: EndeavorActionSurfaceProps) {
  const detected = useInputCapability()
  const resolved = resolveRowActions(capabilities, input ?? detected)
  const isPointer = (input ?? detected) === 'pointer'

  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const dragStart = useRef<number | null>(null)
  // Whether THIS drag has taken the capture yet. A ref, not state: it is one
  // gesture's bookkeeping and painting it would be a wasted render (`RC-4`).
  const hasCaptured = useRef(false)

  const perform = useCallback(
    (binding: EndeavorOperationBinding) => {
      setOffset(0)
      setMenuOpen(false)
      onOperation(binding.operation, endeavorId)
    },
    [endeavorId, onOperation],
  )

  const canSwipe =
    !isPointer &&
    (resolved.leadingSwipe.length > 0 || resolved.trailingSwipe.length > 0)

  /**
   * A raw finger delta, clamped to what the row actually affords.
   *
   * An edge with no bindings does not move: a row that slides open onto nothing
   * reads as broken, not as "no actions here". Both the drawing and the release
   * decision run through this, so the two can never disagree about how far the
   * row travelled.
   */
  const boundDelta = useCallback(
    (delta: number): number => {
      if (delta > 0 && resolved.leadingSwipe.length === 0) return 0
      if (delta < 0 && resolved.trailingSwipe.length === 0) return 0
      return delta
    },
    [resolved.leadingSwipe.length, resolved.trailingSwipe.length],
  )

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canSwipe) return
    dragStart.current = event.clientX
    hasCaptured.current = false
    setIsDragging(true)
    // NO capture here. See the header note: a captured pointer retargets the
    // click, so capturing on `pointerdown` swallows every tap aimed at a
    // control inside the row. Capture is taken by the first move that crosses
    // the drag threshold instead.
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current
    if (start === null) return

    const delta = boundDelta(event.clientX - start)

    // CAPTURE, so the gesture cannot be lost mid-swipe — but only once this is
    // demonstrably a swipe. The row's transform is one React frame behind the
    // finger, so the pointer routinely leaves the content element while the
    // drag is still running; without capture the remaining moves and the
    // release land on whatever is underneath and the row stays open with
    // nothing to close it.
    //
    // The gate reads the BOUNDED delta: an edge with no bindings does not
    // move, so a drag in that direction is still a tap as far as the row is
    // concerned and must not eat the click either.
    if (!hasCaptured.current && Math.abs(delta) >= SWIPE_DRAG_THRESHOLD_PX) {
      const target = event.currentTarget
      if (typeof target.setPointerCapture === 'function') {
        target.setPointerCapture(event.pointerId)
        hasCaptured.current = true
      }
    }

    setOffset(delta)
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current
    // A release that never started a drag is not ours. `pointerup` and
    // `pointercancel` can BOTH fire for one gesture, so whichever arrives first
    // owns the release and the second finds no drag and returns — otherwise the
    // same swipe commits twice.
    if (start === null) return
    dragStart.current = null
    setIsDragging(false)

    const target = event.currentTarget
    if (
      hasCaptured.current &&
      typeof target.hasPointerCapture === 'function' &&
      target.hasPointerCapture(event.pointerId)
    ) {
      target.releasePointerCapture(event.pointerId)
    }
    hasCaptured.current = false

    // The decision reads THE POINTER, never the last-rendered `offset`.
    // `pointermove` is continuous, so the final `setOffset` has usually not
    // flushed by the time `pointerup` runs: reading state here makes a full
    // swipe snap shut and fire nothing, and can make a short swipe commit the
    // PREVIOUS drag's distance.
    const delta = boundDelta(event.clientX - start)

    // Below the threshold this was a tap, not a swipe: perform nothing and
    // leave the row exactly where it was.
    if (Math.abs(delta) < SWIPE_DRAG_THRESHOLD_PX) return

    const edge = delta > 0 ? resolved.leadingSwipe : resolved.trailingSwipe
    const first = edge[0]

    if (Math.abs(delta) >= SWIPE_COMMIT_PX && first !== undefined) {
      perform(first)
      return
    }
    if (Math.abs(delta) >= SWIPE_REVEAL_PX && first !== undefined) {
      setOffset(delta > 0 ? SWIPE_REVEAL_PX * edge.length : -SWIPE_REVEAL_PX * edge.length)
      return
    }
    setOffset(0)
  }

  /**
   * The room the pointer chrome needs, published for the children to reserve.
   *
   * Zero on touch, where the chrome is not rendered at all — so a touch row is
   * byte-for-byte what it was.
   */
  const pointerGutter = isPointer
    ? pointerChromeGutterPx({
        hoverActionCount: resolved.hoverActions.length,
        hasContextMenu: resolved.contextMenu.length > 0,
      })
    : 0

  const surfaceStyle = {
    borderRadius: radiusVar('surface'),
    [POINTER_GUTTER_VAR]: `${pointerGutter}px`,
  } as CSSProperties

  return (
    <div
      data-slot="endeavor-action-surface"
      data-input={isPointer ? 'pointer' : 'touch'}
      data-pointer-gutter={pointerGutter}
      className={cn('group relative isolate w-full overflow-hidden', className)}
      style={surfaceStyle}
      onContextMenu={
        resolved.contextMenu.length === 0
          ? undefined
          : (event) => {
              event.preventDefault()
              setMenuOpen(true)
            }
      }
    >
      {/* The swipe panels sit BEHIND the content, revealed as it slides. */}
      {canSwipe ? (
        <>
          <SwipeEdge
            edge="leading"
            bindings={resolved.leadingSwipe}
            visible={offset > 0}
            onPerform={perform}
          />
          <SwipeEdge
            edge="trailing"
            bindings={resolved.trailingSwipe}
            visible={offset < 0}
            onPerform={perform}
          />
        </>
      ) : null}

      <div
        data-slot="endeavor-action-content"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? undefined : 'transform 240ms var(--kro-ease-standard)',
          touchAction: canSwipe ? 'pan-y' : undefined,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </div>

      {/* Pointer: the hover-revealed strip. Same bindings, second grammar. */}
      {isPointer && resolved.hoverActions.length > 0 ? (
        <div
          data-slot="endeavor-hover-actions"
          className={cn(
            'absolute inset-y-0 right-2 z-2 flex items-center gap-1',
            'opacity-0 transition-opacity duration-150',
            'group-hover:opacity-100 group-focus-within:opacity-100',
            'pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto',
          )}
        >
          {resolved.hoverActions.map((binding) => (
            <ActionButton
              key={`${binding.operation}-${binding.gesture.kind}`}
              binding={binding}
              size={28}
              onPerform={perform}
            />
          ))}
        </div>
      ) : null}

      {/* The context menu. Long-press on touch, right-click on pointer. Its
          trigger is a real, focusable control so the menu is not mouse-only. */}
      {resolved.contextMenu.length > 0 ? (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${label}`}
              className={cn(
                'absolute top-1 right-1 z-3 inline-flex size-7 items-center justify-center',
                'rounded-kro-small opacity-0 outline-none',
                'group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100',
                // Invisible AND untouchable, the same pairing the hover strip
                // above uses. Left in the hit-test tree it sits at `z-3` in the
                // top-right of every row, so on touch a tap or a swipe that
                // starts there opens a menu the user cannot see instead of
                // moving the row. `pointer-events` does not gate the keyboard,
                // so tabbing to it still works — and that is what reveals it.
                'pointer-events-none group-hover:pointer-events-auto',
                'group-focus-within:pointer-events-auto focus-visible:pointer-events-auto',
                'focus-visible:shadow-[var(--kro-ring)]',
              )}
              style={{ color: colorVar('foreSecondary') }}
            >
              <Ellipsis size={16} aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {resolved.contextMenu.map((binding) => (
              <DropdownMenuItem
                key={`${binding.operation}-${binding.gesture.kind}`}
                destructive={binding.role === 'destructive'}
                onSelect={() => perform(binding)}
              >
                <BindingIcon binding={binding} size={18} />
                {binding.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}

function BindingIcon({
  binding,
  size,
}: {
  readonly binding: EndeavorOperationBinding
  readonly size: number
}) {
  const Icon = iconForBindingSymbol(binding.icon)
  return <Icon size={size} aria-hidden />
}

function ActionButton({
  binding,
  size,
  onPerform,
}: {
  readonly binding: EndeavorOperationBinding
  readonly size: number
  readonly onPerform: (binding: EndeavorOperationBinding) => void
}) {
  return (
    <button
      type="button"
      aria-label={binding.label}
      onClick={() => onPerform(binding)}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-kro-small',
        'outline-none focus-visible:shadow-[var(--kro-ring)]',
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: colorVar(bindingColorRole(binding)),
        color: colorVar(onFillRole(bindingColorRole(binding))),
      }}
    >
      <BindingIcon binding={binding} size={Math.round(size * 0.5)} />
    </button>
  )
}

/**
 * One edge's revealed actions. Full-height blocks, as on iOS — each carries the
 * binding's own tint, its glyph AND its label, so an action is never a coloured
 * rectangle a user has to guess at.
 */
function SwipeEdge({
  edge,
  bindings,
  visible,
  onPerform,
}: {
  readonly edge: 'leading' | 'trailing'
  readonly bindings: readonly EndeavorOperationBinding[]
  readonly visible: boolean
  readonly onPerform: (binding: EndeavorOperationBinding) => void
}) {
  if (bindings.length === 0) return null

  return (
    <div
      data-slot={`endeavor-swipe-${edge}`}
      aria-hidden={!visible}
      className={cn(
        'absolute inset-y-0 z-0 flex items-stretch gap-2 p-1',
        edge === 'leading' ? 'left-0' : 'right-0',
      )}
    >
      {bindings.map((binding) => (
        <button
          key={`${binding.operation}-${binding.gesture.kind}`}
          type="button"
          tabIndex={visible ? 0 : -1}
          aria-label={binding.label}
          onClick={() => onPerform(binding)}
          className={cn(
            'inline-flex flex-col items-center justify-center gap-0.5 px-3',
            'text-[11px] font-semibold outline-none focus-visible:shadow-[var(--kro-ring)]',
          )}
          style={{
            minWidth: 'var(--kro-size-min-touch-target)',
            borderRadius: radiusVar('field'),
            backgroundColor: colorVar(bindingColorRole(binding)),
            color: colorVar(onFillRole(bindingColorRole(binding))),
          }}
        >
          <BindingIcon binding={binding} size={18} />
          {binding.label}
        </button>
      ))}
    </div>
  )
}
