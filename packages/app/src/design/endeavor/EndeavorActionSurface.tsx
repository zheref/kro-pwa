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

import { type ReactNode, useCallback, useRef, useState } from 'react'
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

  const onPointerDown = (event: React.PointerEvent) => {
    if (!canSwipe) return
    dragStart.current = event.clientX
    setIsDragging(true)
  }

  const onPointerMove = (event: React.PointerEvent) => {
    const start = dragStart.current
    if (start === null) return
    const delta = event.clientX - start
    // An edge with no bindings does not move: a row that slides open onto
    // nothing reads as broken, not as "no actions here".
    if (delta > 0 && resolved.leadingSwipe.length === 0) return
    if (delta < 0 && resolved.trailingSwipe.length === 0) return
    setOffset(delta)
  }

  const endDrag = () => {
    const delta = offset
    dragStart.current = null
    setIsDragging(false)

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

  return (
    <div
      data-slot="endeavor-action-surface"
      data-input={isPointer ? 'pointer' : 'touch'}
      className={cn('group relative isolate w-full overflow-hidden', className)}
      style={{ borderRadius: radiusVar('surface') }}
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
