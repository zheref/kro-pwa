import {
  type CSSProperties,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
} from 'react'
import { ShortcutHint } from '../../system/primitives/button'
import { type SfSymbolName, iconForSymbol } from '../../system/icons/icons'
import { cn } from '../../system/utils/cn'
import { RotatingGlow, type RotatingGlowProps } from '../glow/RotatingGlow'
import { springTransition } from '../layout/chromeMotion'
import { useDisclosure } from '../useDisclosure'
import { LiquidGlassFAB } from './LiquidGlassFAB'

/**
 * The FAB menu — a toggle FAB that unfurls a column of labelled actions.
 *
 * Port of `KroUI/Components/LiquidGlassFABMenu.swift`, itself iOS's rendition
 * of Material 3's `FloatingActionButtonMenu`. Rows sit ABOVE the button,
 * trailing-aligned, 12pt apart; the main glyph becomes a close mark while open;
 * choosing a row fires its action and snaps the menu shut.
 *
 * THE GLOW BELONGS TO THE BUTTON, NOT THE MENU — canon states the reason and it
 * transfers exactly: this component's box grows to hold the unfurled rows, so a
 * glow applied to the whole menu would trace that growing box and paint a
 * full-height halo around an open menu. `RotatingGlow` therefore wraps the main
 * button alone.
 *
 * WEB ADDITIONS, and why they are not scope creep. SwiftUI's `Button` stack
 * gets focus order, VoiceOver grouping and dismissal from the platform. The web
 * gets none of that free, so the port adds the equivalents a keyboard user
 * needs and nothing else: a disclosure trigger (`aria-expanded` +
 * `aria-controls`), a labelled group of ordinary buttons, `inert` while closed,
 * Escape to close, and focus returned to the disc afterwards. Without them the
 * menu is unreachable by keyboard, which would fail the epic's own
 * accessibility bar rather than match canon. See the group's own note below for
 * why it is deliberately NOT `role="menu"`.
 */

export interface FABMenuEntry {
  /** Stable identity. Canon mints a `UUID` per entry; a caller-owned key is better. */
  readonly id: string
  readonly label: string
  readonly glyph: SfSymbolName
  readonly onSelect: () => void
  readonly disabled?: boolean
  /**
   * A single key that performs this entry while the menu is open (`a`).
   * Shown as a trailing hint and exposed through `aria-keyshortcuts`.
   */
  readonly shortcut?: string
}

export interface LiquidGlassFABMenuProps {
  readonly items: readonly FABMenuEntry[]
  /** The closed-state glyph. Open, canon swaps it for `xmark`. */
  readonly mainGlyph: SfSymbolName
  readonly mainAccessibilityLabel: string
  /**
   * Controlled open state. Omit to let the menu own it — the uncontrolled form
   * is what a story and most call sites want.
   */
  readonly isExpanded?: boolean
  readonly onExpandedChange?: (expanded: boolean) => void
  /**
   * The glow cast from behind the main button. `null` leaves it plain, which is
   * canon's default (`mainGlow: RotatingGlowStyle? = nil`).
   */
  readonly glow?: Omit<RotatingGlowProps, 'children'> | null
  /** Switches the glow off without dropping its configuration — canon's `isMainGlowActive`. */
  readonly isGlowActive?: boolean
  readonly className?: string
  readonly style?: CSSProperties
  /**
   * Plain Return anywhere on the page toggles the menu, whenever nothing else
   * owns Return (see `ownsReturn`). A web addition; canon has no keyboard here.
   */
  readonly returnKeyToggles?: boolean
  /** Whether entries draw their key hints — off on touch-primary layouts. */
  readonly showShortcutHints?: boolean
}

/**
 * Whether something on the page should keep Return (or a letter) for itself:
 * a focused field or control, an IME composition, or an open dialog, popover
 * or menu elsewhere. The FAB's global keys only act when this is false.
 */
export const fabKeysAreOwnedElsewhere = (
  root: Element,
  active: Element | null,
): boolean => {
  if (
    active !== null &&
    !root.contains(active) &&
    active.matches(
      'input, textarea, select, button, a[href], [contenteditable=""], [contenteditable="true"], [role="button"], [role="textbox"], [role="combobox"], [role="menuitem"], [role="option"], [role="slider"], [role="spinbutton"]',
    )
  ) {
    return true
  }
  // An open overlay owns the keyboard — unless the menu itself lives in it.
  const overlays = document.querySelectorAll(
    '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]',
  )
  for (const overlay of Array.from(overlays)) {
    if (!overlay.contains(root)) return true
  }
  return root.closest('[inert]') !== null
}

/** Canon: `VStack(alignment: .trailing, spacing: 12)`. */
const ROW_SPACING = 12
/**
 * Canon staggers the rows' insertion. SwiftUI does it through a transition;
 * here it is a per-row delay, bottom-most first, so the column unfurls upward
 * the way canon's `.move(edge: .bottom)` reads.
 */
const ROW_STAGGER_MS = 28

export function LiquidGlassFABMenu({
  items,
  mainGlyph,
  mainAccessibilityLabel,
  isExpanded,
  onExpandedChange,
  glow = null,
  isGlowActive = true,
  className,
  style,
  returnKeyToggles = true,
  showShortcutHints = true,
}: LiquidGlassFABMenuProps) {
  const [expanded, setExpanded] = useDisclosure(isExpanded, onExpandedChange)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)

  /**
   * Puts focus back on the disc.
   *
   * Closing the menu makes the open rows `inert`, and an `inert` element that
   * currently holds focus loses it to the document — so a keyboard user who
   * chooses a row or presses Escape would be dropped at the top of the page.
   * Queried rather than held in a ref because `Button`'s props are
   * `ComponentPropsWithoutRef`, so there is no ref to forward through it.
   */
  const returnFocusToTrigger = useCallback(() => {
    rootRef.current?.querySelector<HTMLButtonElement>('[data-kro-fab]')?.focus()
  }, [])

  const choose = useCallback(
    (entry: FABMenuEntry) => {
      entry.onSelect()
      setExpanded(false)
      returnFocusToTrigger()
    },
    [setExpanded, returnFocusToTrigger],
  )

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Escape' || !expanded) return
      event.stopPropagation()
      setExpanded(false)
      returnFocusToTrigger()
    },
    [expanded, setExpanded, returnFocusToTrigger],
  )

  /**
   * The page-level keys, capture phase on `window` so a plain Return reaches
   * the menu even with focus on the page body. Everything a focused control,
   * a text field, an IME or an open overlay should own is left alone.
   */
  useEffect(() => {
    if (!returnKeyToggles) return
    const onWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      const root = rootRef.current
      if (root === null || event.defaultPrevented || event.isComposing) return
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const active = document.activeElement
      const focusInMenu = active !== null && root.contains(active)
      if (fabKeysAreOwnedElsewhere(root, active)) return

      if (expanded && !event.shiftKey) {
        if (event.key === 'Escape' && !focusInMenu) {
          event.preventDefault()
          setExpanded(false)
          return
        }
        const entry = items.find(
          (candidate) =>
            candidate.shortcut !== undefined &&
            !candidate.disabled &&
            candidate.shortcut.toLowerCase() === event.key.toLowerCase(),
        )
        if (entry !== undefined) {
          event.preventDefault()
          event.stopPropagation()
          choose(entry)
          return
        }
      }

      // A focused disc or row handles Return natively (its own click).
      if (event.key !== 'Enter' || event.shiftKey || focusInMenu) return
      event.preventDefault()
      setExpanded(!expanded)
    }
    window.addEventListener('keydown', onWindowKeyDown, true)
    return () => window.removeEventListener('keydown', onWindowKeyDown, true)
  }, [returnKeyToggles, expanded, items, setExpanded, choose])

  const mainButton = (
    <LiquidGlassFAB
      glyph={expanded ? 'xmark' : mainGlyph}
      accessibilityLabel={mainAccessibilityLabel}
      onClick={() => setExpanded(!expanded)}
      aria-expanded={expanded}
      aria-controls={menuId}
      aria-keyshortcuts={returnKeyToggles ? 'Enter' : undefined}
    />
  )

  return (
    <div
      ref={rootRef}
      // `column-reverse` is load-bearing, not a styling choice. The rows have
      // to PAINT above the disc and be TABBED TO AFTER it, and those are
      // opposite orders — so the disc comes first in the DOM (tab order) and
      // the column is reversed for paint. Putting the rows first in the DOM
      // instead sends the next Tab straight past the component.
      className={cn(
        'inline-flex flex-col-reverse items-end overflow-visible',
        className,
      )}
      style={{ gap: ROW_SPACING, ...style }}
      data-kro-fab-menu={expanded ? 'expanded' : 'collapsed'}
      onKeyDown={onKeyDown}
    >
      {glow ? (
        <RotatingGlow
          {...glow}
          isActive={isGlowActive && (glow.isActive ?? true)}
        >
          {mainButton}
        </RotatingGlow>
      ) : (
        mainButton
      )}

      {/*
        A labelled group of ordinary buttons — deliberately NOT `role="menu"` /
        `role="menuitem"`.

        Those roles promise the ARIA menu interaction model: arrow-key
        navigation, a roving tabindex, Home/End, type-ahead. Canon's menu is a
        column of buttons you tab through, and announcing an interaction model
        the component does not implement is worse than announcing none — a
        screen-reader user told "menu" reaches for the arrow keys and finds
        nothing there.

        Always mounted, so the rows animate rather than pop. `inert` while
        closed is what keeps a collapsed row out of the tab order and out of
        the accessibility tree — the thing `opacity: 0` alone does not do.
      */}
      <div
        id={menuId}
        role="group"
        aria-label={mainAccessibilityLabel}
        inert={!expanded}
        className="flex flex-col items-end"
        style={{
          gap: ROW_SPACING,
          pointerEvents: expanded ? 'auto' : 'none',
        }}
      >
        {items.map((entry, index) => (
          <MenuRow
            key={entry.id}
            entry={entry}
            expanded={expanded}
            // Bottom-most row first: it is the one nearest the button, so it
            // is the one that should appear to push the others upward.
            delayMs={(items.length - 1 - index) * ROW_STAGGER_MS}
            showShortcutHint={showShortcutHints}
            onSelect={choose}
          />
        ))}
      </div>
    </div>
  )
}

function MenuRow({
  entry,
  expanded,
  delayMs,
  showShortcutHint,
  onSelect,
}: {
  entry: FABMenuEntry
  expanded: boolean
  delayMs: number
  showShortcutHint: boolean
  onSelect: (entry: FABMenuEntry) => void
}) {
  const Glyph = iconForSymbol(entry.glyph)
  // Opening uses canon's expand spring; closing uses the tighter snap it
  // applies after a choice, so the menu shuts faster than it opened.
  const motion = springTransition(expanded ? 'menuExpand' : 'menuCollapse', [
    'opacity',
    'transform',
  ])

  return (
    <button
      type="button"
      disabled={entry.disabled}
      onClick={() => onSelect(entry)}
      aria-keyshortcuts={entry.shortcut?.toUpperCase()}
      data-kro-fab-menu-item=""
      className={cn(
        'kro-glass kro-glass--control kro-glass--interactive',
        'inline-flex items-center gap-[10px] whitespace-nowrap',
        'rounded-kro-pill text-kro-fore',
        'disabled:pointer-events-none disabled:opacity-[var(--kro-opacity-disabled)]',
      )}
      style={{
        // Canon: `.padding(.horizontal, 16).padding(.vertical, 12)`.
        padding: '12px 16px',
        border: 'none',
        cursor: 'default',
        fontSize: 14,
        fontWeight: 600,
        opacity: expanded ? 1 : 0,
        // Canon's rows enter from the bottom edge. One row-height of travel
        // reads as "pushed up from behind the button" without the whole column
        // sliding a screen's worth.
        transform: expanded ? 'translateY(0)' : 'translateY(12px)',
        transitionDelay: `${expanded ? delayMs : 0}ms`,
        ...motion,
      }}
    >
      <Glyph className="size-4" strokeWidth={2.25} aria-hidden="true" />
      {entry.label}
      {showShortcutHint && entry.shortcut !== undefined ? (
        <ShortcutHint className="ms-1">
          {entry.shortcut.toUpperCase()}
        </ShortcutHint>
      ) : null}
    </button>
  )
}
