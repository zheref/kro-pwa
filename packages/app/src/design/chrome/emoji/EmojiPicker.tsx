import type { CSSProperties } from 'react'
import { cn } from '../../system/utils/cn'
import { DEFAULT_EMOJI_CATEGORIES, type EmojiCategory } from './emojiCategories'

/**
 * The emoji picker — a categorised grid with pinned section headers.
 *
 * Port of `KroUI/Components/EmojiPicker.swift`, at canon's scope and no wider.
 *
 * WHAT CANON DOES NOT HAVE, STATED SO IT IS NOT MISTAKEN FOR AN OVERSIGHT.
 * There is no search field and no recents row in `EmojiPicker.swift`; the seven
 * pinned section headers ARE the navigation. Adding either here would put a
 * behaviour on web that the iOS app does not have, which is the opposite of
 * parity — so neither is here, and if the product wants them the right place to
 * decide that is KroApple.
 *
 * PRESENTATION-AGNOSTIC, exactly as canon is: "callers wrap it in whatever
 * container fits — popover, sheet, inline". `EmojiPickerPopover` is that
 * wrapper for the desktop case; this component fills whatever box it is given.
 */

export interface EmojiPickerProps {
  /** The currently-selected glyph, highlighted in the grid. */
  readonly selection?: string
  /** Fires the moment a glyph is chosen. The picker never dismisses itself. */
  readonly onPick?: (emoji: string) => void
  /** Categories, in display order. Defaults to canon's palette. */
  readonly categories?: readonly EmojiCategory[]
  readonly className?: string
  readonly style?: CSSProperties
}

export function EmojiPicker({
  selection = '',
  onPick,
  categories = DEFAULT_EMOJI_CATEGORIES,
  className,
  style,
}: EmojiPickerProps) {
  return (
    <div
      data-kro-emoji-picker=""
      // One scroll axis: vertical. The grid below adapts its column count to
      // the pane's width, so nothing ever overflows sideways.
      className={cn(
        'overflow-x-hidden overflow-y-auto overscroll-contain',
        className,
      )}
      style={{ height: '100%', touchAction: 'pan-y', ...style }}
      // The picker is usually portaled out of a modal dialog, whose scroll
      // lock listens for wheel/touchmove on the document and cancels any that
      // did not start inside the dialog. Stopping the bubble here keeps the
      // browser's own scroll of this element, on both axes, and only hides
      // the event from that lock.
      onWheel={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
    >
      {categories.map((category) => (
        <section key={category.id} data-kro-emoji-category={category.id}>
          <h3
            data-kro-emoji-heading=""
            className="kro-glass kro-glass--bar text-kro-fore-secondary"
            style={{
              // Canon pins the section headers (`pinnedViews: [.sectionHeaders]`)
              // and backs them with `.regularMaterial` so the grid scrolls under
              // them legibly. `position: sticky` plus the bar material is the
              // same two properties.
              position: 'sticky',
              top: 0,
              // Full pane width, so rows scroll under the whole bar.
              width: '100%',
              boxSizing: 'border-box',
              zIndex: 1,
              margin: 0,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
            }}
          >
            {category.name}
          </h3>

          <div
            role="group"
            aria-label={category.name}
            style={{
              display: 'grid',
              // As many touch-sized columns as the pane's width holds, each
              // stretched to share the leftover — never wider than the pane.
              gridTemplateColumns:
                'repeat(auto-fill, minmax(var(--kro-size-min-touch-target), 1fr))',
              gap: 4,
              // No side inset: the grid takes the pane's whole width.
              padding: '4px 0 8px',
            }}
          >
            {category.emojis.map((emoji) => {
              const selected = emoji === selection
              return (
                <button
                  key={`${category.id}-${emoji}`}
                  type="button"
                  aria-label={emoji}
                  aria-pressed={selected}
                  onClick={() => onPick?.(emoji)}
                  data-kro-emoji={selected ? 'selected' : 'available'}
                  className="kro-motion-quick outline-none focus-visible:shadow-[var(--kro-ring)]"
                  style={{
                    // Canon: `minHeight: 38`, radius 8, accent at 22% when
                    // selected.
                    //
                    // 38 is the ONE canon number this port does not take. It is
                    // below the 44pt floor the epic's Design Direction sets for
                    // touch targets — and below Apple's own HIG minimum, which
                    // canon gets away with because the grid is pointer-first on
                    // macOS. The web picker is reachable at phone width, so the
                    // cell is a full target and the popover is sized to fit
                    // seven of them (see `EmojiPickerPopover`).
                    minHeight: 'var(--kro-size-min-touch-target)',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'default',
                    fontSize: 26,
                    lineHeight: 1,
                    background: selected
                      ? 'color-mix(in srgb, var(--kro-color-accent) 22%, transparent)'
                      : 'transparent',
                  }}
                >
                  <span aria-hidden="true">{emoji}</span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
