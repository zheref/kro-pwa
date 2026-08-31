'use client'

/**
 * The Plan PRIORITY MATRIX destination — the port of
 * `KroUI/Plan/PriorityMatrixView.swift` (`RC-15`).
 *
 * A non-scrolling 2×2: Prioritize · Schedule on the top row, Delegate · Archive
 * on the bottom, each quadrant filling half the width and half the height of
 * what Plan gives it. Only the *cards inside a quadrant* scroll, which is
 * canon's shape and the reason the board never grows a page scrollbar.
 *
 * ## What appears here is #18's answer, not this file's
 *
 * The items arrive already admitted and already classified —
 * `selectPlanMatrixItems` → `planMatrixItems` → *"open, admissible by resolved
 * kind, and carrying both a due date and a value"*, with the quadrant derived
 * and never stored. This Fragment partitions the given items by the quadrant
 * they already carry and draws nothing else. An untriaged row (missing a due
 * date or a value) is therefore absent by construction rather than filtered out
 * again here.
 *
 * ## The FAB stands down, and this surface does not say so
 *
 * Canon hides the app-wide quick-action button over the matrix *"because each
 * quadrant carries its own add actions"*. That rule is #18's
 * `isPlanFabAvailable` and #19's `PlanFragment` consumes it; this file only
 * supplies the per-quadrant add actions the rule assumes exist.
 *
 * ## One add control, two ways in
 *
 * The header carries a single `+` that opens a two-entry menu — **Add new**
 * (the capture prompt, pre-set to Task) and **Add existing** (the picker) —
 * exactly as canon's `Menu` does; an EMPTY quadrant additionally shows the two
 * as plain buttons in its body, which is canon's own empty-quadrant treatment
 * and the thing that makes a blank quadrant self-explanatory. The menu is a
 * hand-built disclosure rather than the kit's Radix dropdown for the reason
 * `FindFragment` records: a popper costs seconds to mount under jsdom, and this
 * flow is asserted by an ordinary interaction test.
 *
 * ## Canon's quadrant drill-in is NOT ported
 *
 * `onShowQuadrant` pushes `PriorityMatrixQuadrantView`, a focused list for one
 * quadrant. The epic puts the standalone Priority Matrix destination out of
 * scope (it stays a Thirst dead-end on the web), and there is no route to push
 * onto, so the header's two lines are a heading rather than a button. Named in
 * the PR body; the count beside the title is what a user would otherwise open
 * the drill-in to learn.
 */
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useId,
  useRef,
  useState,
} from 'react'
import type { PlanMatrixItem } from '../../PlanMatrix'
import { endeavorIcon } from '../../../../design/endeavor/endeavorIcons'
import { colorVar, radiusVar } from '../../../../design/system/tokens/roles'
import { cn } from '../../../../design/system/utils/cn'
import {
  type PlanMatrixQuadrant,
  planMatrixActionForeground,
  planMatrixAddExistingLabel,
  planMatrixAddLabel,
  planMatrixAddNewLabel,
  planMatrixItemSymbol,
  planMatrixQuadrantCaption,
  planMatrixQuadrantFor,
  planMatrixQuadrantTint,
  planMatrixQuadrantTitle,
  planMatrixQuadrants,
} from './planMatrixPresentation'

const Plus = endeavorIcon('plus')
/**
 * Canon's "Add existing" glyph is `rectangle.stack.badge.plus`, which neither
 * icon map holds. The nearest mapped neighbour is the tray — "pick from what
 * you already have" — and adding the real row belongs to whichever child next
 * owns `design/system/icons/icons.ts`, the same follow-up `findPresentation`
 * records for its two symbols.
 */
const Stack = endeavorIcon('tray')

/** The fallback card glyph, resolved once rather than per rendered card. */
const GenericCard = endeavorIcon('checkmark.circle')

/** Canon's `.opacity(0.18)` quadrant fill, kept as one number. */
export const MATRIX_TINT_ALPHA = 0.18

/** Canon's `spacing: 12` between quadrants and `spacing: 10` between cards. */
export const MATRIX_QUADRANT_GAP = 12
export const MATRIX_CARD_GAP = 10

/**
 * The narrowest a card track may be — canon's own card side at phone width,
 * which is what makes a 390px viewport draw canon's two columns exactly.
 */
export const MATRIX_CARD_MIN_PX = 76

export interface PlanMatrixFragmentProps {
  /** Already admitted and already classified by `selectPlanMatrixItems`. */
  readonly items: readonly PlanMatrixItem[]
  readonly onAddNew: (quadrant: PlanMatrixQuadrant) => void
  readonly onAddExisting: (quadrant: PlanMatrixQuadrant) => void
  readonly onTapItem: (endeavorId: string) => void
  readonly className?: string
}

export function PlanMatrixFragment({
  items,
  onAddNew,
  onAddExisting,
  onTapItem,
  className,
}: PlanMatrixFragmentProps) {
  return (
    <section
      data-testid="plan-matrix"
      aria-label="Priority Matrix"
      className={cn(
        // `overflow-hidden` is the non-scrolling contract: the board is exactly
        // the space Plan gives it, and only a quadrant's card grid scrolls.
        'grid h-full min-h-0 grid-cols-2 grid-rows-2 overflow-hidden p-kro-small',
        className,
      )}
      style={{ gap: MATRIX_QUADRANT_GAP }}
    >
      {planMatrixQuadrants.map((quadrant) => (
        <QuadrantBox
          key={quadrant}
          quadrant={quadrant}
          /*
            The item carries the DOMAIN quadrant (`decide` / `delete`); the box
            is named for the SURFACE one (`schedule` / `archive`). Comparing the
            two raw values would match Prioritize and Delegate by coincidence
            and silently empty the other two — mapped, never compared.
          */
          items={items.filter(
            (item) => planMatrixQuadrantFor(item.quadrant) === quadrant,
          )}
          onAddNew={onAddNew}
          onAddExisting={onAddExisting}
          onTapItem={onTapItem}
        />
      ))}
    </section>
  )
}

function QuadrantBox({
  quadrant,
  items,
  onAddNew,
  onAddExisting,
  onTapItem,
}: {
  readonly quadrant: PlanMatrixQuadrant
  readonly items: readonly PlanMatrixItem[]
  readonly onAddNew: (quadrant: PlanMatrixQuadrant) => void
  readonly onAddExisting: (quadrant: PlanMatrixQuadrant) => void
  readonly onTapItem: (endeavorId: string) => void
}) {
  const title = planMatrixQuadrantTitle(quadrant)
  const tint = planMatrixQuadrantTint(quadrant)
  const isEmpty = items.length === 0

  return (
    <section
      data-testid="plan-matrix-quadrant"
      data-quadrant={quadrant}
      data-count={items.length}
      aria-label={title}
      className="flex min-h-0 min-w-0 flex-col overflow-hidden"
      style={{
        borderRadius: radiusVar('surface'),
        backgroundColor: colorVar('absolute'),
        boxShadow: 'var(--kro-shadow-card)',
      }}
    >
      <QuadrantHeader
        quadrant={quadrant}
        count={items.length}
        onAddNew={onAddNew}
        onAddExisting={onAddExisting}
      />

      {isEmpty ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-kro-small p-kro-small">
          <QuadrantAction
            quadrant={quadrant}
            label="Add new"
            accessibleLabel={planMatrixAddNewLabel(quadrant)}
            testId="plan-matrix-empty-add-new"
            icon={<Plus size={12} aria-hidden />}
            onPress={() => onAddNew(quadrant)}
          />
          <QuadrantAction
            quadrant={quadrant}
            label="Add existing"
            accessibleLabel={planMatrixAddExistingLabel(quadrant)}
            testId="plan-matrix-empty-add-existing"
            icon={<Stack size={12} aria-hidden />}
            onPress={() => onAddExisting(quadrant)}
          />
        </div>
      ) : (
        <ul
          data-testid="plan-matrix-grid"
          className="m-0 grid min-h-0 flex-1 list-none content-start overflow-y-auto p-kro-small"
          style={{
            gap: MATRIX_CARD_GAP,
            /*
              Canon fixes TWO columns and sizes each card at half the quadrant's
              width, because on a phone the quadrant is always about 180pt wide
              — so the card lands near 85pt. The web's desktop quadrant is three
              times that, and two columns there would draw a pair of 270pt
              squares for two short tasks.

              The CARD SIZE is what is ported, not the column count: a track
              floor of `MATRIX_CARD_MIN_PX` gives exactly canon's two columns at
              phone width and more of the same-sized cards as the quadrant
              grows, which is what "a 2-column responsive grid" asks for.
            */
            gridTemplateColumns: `repeat(auto-fill, minmax(${MATRIX_CARD_MIN_PX}px, 1fr))`,
          }}
        >
          {items.map((item) => {
            const glyph = planMatrixItemSymbol(item.title)
            const Icon = glyph.isGeneric ? GenericCard : null
            return (
              <li key={item.id} className="min-w-0">
                <button
                  type="button"
                  data-testid="plan-matrix-card"
                  data-endeavor-id={item.id}
                  aria-label={item.title}
                  title={item.title}
                  onClick={() => onTapItem(item.id)}
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-center',
                    'border-none outline-none focus-visible:shadow-[var(--kro-ring)]',
                  )}
                  style={{
                    // 1:1 square cards — the aspect ratio is what makes the
                    // grid responsive without measuring the container, which
                    // is what canon's `GeometryReader` was doing by hand.
                    aspectRatio: '1 / 1',
                    borderRadius: radiusVar('field'),
                    backgroundColor: `color-mix(in srgb, ${colorVar(tint)} ${
                      MATRIX_TINT_ALPHA * 100
                    }%, transparent)`,
                    color: colorVar('fore'),
                    fontSize: 28,
                  }}
                >
                  {Icon === null ? (
                    <span aria-hidden>{glyph.symbol}</span>
                  ) : (
                    <Icon size={26} aria-hidden style={{ color: colorVar(tint) }} />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/**
 * Canon's two-line header plus its single add menu, laid out as ONE row.
 *
 * Canon's own comment explains the row: *"the add actions collapse into one
 * menu button centered against them. Laid out as a row rather than a third
 * stacked line, which is what forced the caption to wrap and made every header
 * tall."*
 */
function QuadrantHeader({
  quadrant,
  count,
  onAddNew,
  onAddExisting,
}: {
  readonly quadrant: PlanMatrixQuadrant
  readonly count: number
  readonly onAddNew: (quadrant: PlanMatrixQuadrant) => void
  readonly onAddExisting: (quadrant: PlanMatrixQuadrant) => void
}) {
  return (
    <header
      data-testid="plan-matrix-header"
      className="flex shrink-0 items-center gap-kro-tiny px-kro-small pt-kro-small pb-kro-tiny"
    >
      <div className="min-w-0 flex-1">
        <h3
          className="m-0 truncate font-semibold text-sm"
          style={{ color: colorVar('fore') }}
        >
          {planMatrixQuadrantTitle(quadrant)}
          <span
            data-testid="plan-matrix-count"
            className="ml-1 font-normal text-xs"
            style={{ color: colorVar('foreSecondary') }}
          >
            {count}
          </span>
        </h3>
        <p
          data-testid="plan-matrix-caption"
          className="m-0 truncate text-[11px]"
          style={{ color: colorVar('foreSecondary') }}
        >
          {planMatrixQuadrantCaption(quadrant)}
        </p>
      </div>

      <QuadrantAddMenu
        quadrant={quadrant}
        onAddNew={onAddNew}
        onAddExisting={onAddExisting}
      />
    </header>
  )
}

/**
 * The `+` and its two entries.
 *
 * A hand-built disclosure over ordinary buttons, `aria-expanded` on the
 * trigger, Escape to close and focus returned — the same shape the chrome kit's
 * FAB menu and Find's bulk menu already use, and the reason is theirs: a Radix
 * popper under jsdom costs seconds to mount, and both quadrant add flows are
 * interaction-tested.
 */
function QuadrantAddMenu({
  quadrant,
  onAddNew,
  onAddExisting,
}: {
  readonly quadrant: PlanMatrixQuadrant
  readonly onAddNew: (quadrant: PlanMatrixQuadrant) => void
  readonly onAddExisting: (quadrant: PlanMatrixQuadrant) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const foreground = planMatrixActionForeground(quadrant)

  const close = useCallback(() => {
    setIsOpen(false)
    triggerRef.current?.focus()
  }, [])

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Escape' || !isOpen) return
      event.stopPropagation()
      close()
    },
    [close, isOpen],
  )

  return (
    <div className="relative shrink-0" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        data-testid="plan-matrix-add"
        data-quadrant={quadrant}
        aria-label={planMatrixAddLabel(quadrant)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center rounded-kro-pill border-none bg-transparent outline-none focus-visible:shadow-[var(--kro-ring)]"
        style={{
          minWidth: 'var(--kro-size-min-pointer-target)',
          minHeight: 'var(--kro-size-min-pointer-target)',
          color: colorVar(foreground),
        }}
      >
        <Plus size={16} aria-hidden />
      </button>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label={planMatrixAddLabel(quadrant)}
          data-testid="plan-matrix-add-menu"
          className="kro-glass absolute top-full right-0 z-50 mt-kro-tiny flex min-w-44 flex-col p-kro-tiny"
          style={{ borderRadius: radiusVar('field') }}
        >
          <MenuEntry
            testId="plan-matrix-menu-add-new"
            label="Add new"
            accessibleLabel={planMatrixAddNewLabel(quadrant)}
            icon={<Plus size={14} aria-hidden />}
            onPress={() => {
              close()
              onAddNew(quadrant)
            }}
          />
          <MenuEntry
            testId="plan-matrix-menu-add-existing"
            label="Add existing"
            accessibleLabel={planMatrixAddExistingLabel(quadrant)}
            icon={<Stack size={14} aria-hidden />}
            onPress={() => {
              close()
              onAddExisting(quadrant)
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

function MenuEntry({
  testId,
  label,
  accessibleLabel,
  icon,
  onPress,
}: {
  readonly testId: string
  readonly label: string
  readonly accessibleLabel: string
  readonly icon: ReactNode
  readonly onPress: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-testid={testId}
      aria-label={accessibleLabel}
      onClick={onPress}
      className="flex h-11 items-center gap-kro-small rounded-kro-small border-none bg-transparent px-kro-small text-left text-sm outline-none focus-visible:shadow-[var(--kro-ring)]"
      style={{ color: colorVar('fore') }}
    >
      {icon}
      {label}
    </button>
  )
}

/** The two buttons an EMPTY quadrant draws in place of its card grid. */
function QuadrantAction({
  quadrant,
  label,
  accessibleLabel,
  testId,
  icon,
  onPress,
}: {
  readonly quadrant: PlanMatrixQuadrant
  readonly label: string
  readonly accessibleLabel: string
  readonly testId: string
  readonly icon: ReactNode
  readonly onPress: () => void
}) {
  const tint = planMatrixQuadrantTint(quadrant)
  return (
    <button
      type="button"
      data-testid={testId}
      data-quadrant={quadrant}
      aria-label={accessibleLabel}
      onClick={onPress}
      className="inline-flex items-center gap-1 border-none px-kro-small font-bold text-[11px] outline-none focus-visible:shadow-[var(--kro-ring)]"
      style={{
        borderRadius: radiusVar('pill'),
        minHeight: 'var(--kro-size-min-pointer-target)',
        backgroundColor: `color-mix(in srgb, ${colorVar(tint)} ${
          MATRIX_TINT_ALPHA * 100
        }%, transparent)`,
        color: colorVar(planMatrixActionForeground(quadrant)),
      }}
    >
      {icon}
      {label}
    </button>
  )
}
