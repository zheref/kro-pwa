'use client'

/**
 * The suggestions pane above the desktop capture prompt (web-only,
 * `captureSuggestions`) — canon's "Suggestion Carousel" re-cut for a pointer
 * and a keyboard: a vertical, scrolling list of suggested endeavors drawn
 * with the design system's `EndeavorRow` in its pick-and-select mode, with a
 * single pick that fills the prompt and a multi-select that adds straight to
 * the Inbox.
 *
 * A pure Fragment (`RC-15`): it dispatches nothing; every intent is a callback.
 *
 * ## Keys (the prompt's map, extended)
 *
 * - **⌥S** opens the pane if hidden, moves focus into the grid, and back to
 *   the title (handled by the prompt, which owns focus).
 * - **← / →** move one card, **↑ / ↓** one row.
 * - **Return** on a focused card picks it into the prompt and returns focus
 *   to the title; the next Return is the prompt's own (Add, or the walk).
 * - **Space** (⇧Space kept as an alias, or **⌥-click**, or the card's
 *   checkbox) ticks it for a multi-add; **⇧⏎** adds every ticked card.
 *
 * Every card can be picked and ticked, whatever the prompt's kind. A ticked
 * event is added at its seeded time and lands in the Plan (the Inbox holds no
 * events); every other kind lands in the Inbox.
 */

import { type KeyboardEvent, useState } from 'react'
import { EndeavorRow } from '../../../design/endeavor/EndeavorRow'
import { Button, ShortcutHint } from '../../../design/system/primitives/button'
import {
  colorVar,
  semanticVar,
  radiusVar,
  shadowVar,
  spacingVar,
} from '../../../design/system/tokens/roles'
import { captureKindLabel, endeavorKindForCaptureKind } from '../CaptureRules'
import type { CaptureSuggestion } from '../CaptureSuggestions'
import { kindTint } from '../../../design/endeavor/endeavorProjections'
import { suggestionGridNeighbour } from './capturePromptKeyboard'

export interface CaptureSuggestionsFragmentProps {
  readonly suggestions: readonly CaptureSuggestion[]
  readonly selectedIds: readonly string[]
  /** How many ticked rows **Add N** would write, events included. */
  readonly addCount: number
  /** A multi-add is being written — Add is spent until it settles. */
  readonly isAdding?: boolean
  /** The ⌥S keycap, revealed while Option is held. */
  readonly revealChord: boolean
  /** `now` for the rows' formatting — never a clock read. */
  readonly now: Date
  readonly onPick: (suggestionId: string) => void
  readonly onToggle: (suggestionId: string) => void
  readonly onAddSelected: () => void
}

/**
 * The shortest the pane may be and still be worth showing: a header and two
 * compact rows. Below it the prompt hides the pane rather than squeezing it.
 */
export const SUGGESTIONS_PANE_MIN_HEIGHT_PX = 200

/** A card's narrowest — two across the 680px pane, so titles read in full. */
export const SUGGESTION_CARD_MIN_WIDTH_PX = 280

/**
 * How many columns the grid is laying out right now: the cards sharing the
 * first card's top edge. Without layout (a test environment) it is one.
 */
const gridColumnCount = (cards: readonly HTMLElement[]): number => {
  const first = cards[0]?.getBoundingClientRect()
  if (first === undefined || first.width === 0) return 1
  return cards.filter(
    (card) => Math.abs(card.getBoundingClientRect().top - first.top) < 1,
  ).length
}

/** The multi-add action's label — never "Add 0". */
export const suggestionsAddLabel = (count: number): string =>
  count === 0 ? 'Select to add' : `Add ${count}`

export function CaptureSuggestionsFragment({
  suggestions,
  selectedIds,
  addCount,
  isAdding = false,
  revealChord,
  now,
  onPick,
  onToggle,
  onAddSelected,
}: CaptureSuggestionsFragmentProps) {
  /** ←/→ one card, ↑/↓ one row, Space ticks (⇧Space too). */
  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target instanceof HTMLElement ? event.target : null
    const row = target?.closest<HTMLElement>('[data-kro-row-pick]')
    if (row === null || row === undefined) return
    const id = row.dataset.kroRowPick ?? ''
    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight'
    ) {
      event.preventDefault()
      const cards = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>(
          '[data-kro-row-pick]',
        ),
      )
      const next = suggestionGridNeighbour(
        cards.indexOf(row),
        cards.length,
        gridColumnCount(cards),
        event.key,
      )
      const card = next === null ? undefined : cards[next]
      card?.focus()
      card?.scrollIntoView?.({ block: 'nearest' })
      return
    }
    // Space ticks (⇧Space kept as an alias). Picking is Return, handled by
    // the prompt so the next Return can be its own.
    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault()
      onToggle(id)
    }
  }

  const hasSelection = addCount > 0
  /** Whether a card holds focus — the arrow keys only mean something then. */
  const [isBrowsing, setBrowsing] = useState(false)

  return (
    <section
      aria-label="Suggestions"
      data-testid="capture-suggestions"
      className="kro-glass flex h-full flex-col overflow-hidden"
      style={{
        // The prompt's own corner — the pane and the prompt share it.
        borderRadius: radiusVar('panel'),
        boxShadow: shadowVar('surface'),
        // No bottom padding: the scroller runs to the pane's bottom edge and
        // the list carries its own top and bottom inset, which scrolls with it.
        padding: `${spacingVar('medium')} ${spacingVar('medium')} 0`,
        gap: spacingVar('small'),
      }}
    >
      <div
        className="flex shrink-0 items-baseline text-xs"
        style={{ gap: spacingVar('small') }}
      >
        {/* A real heading — the pane's title, on the panel-title scale. */}
        <h2
          className="relative m-0 font-semibold text-base"
          style={{ color: colorVar('fore') }}
        >
          <ShortcutHint placement="keycap" reveal={revealChord}>
            ⌥S
          </ShortcutHint>
          Suggestions
        </h2>
        <span
          aria-hidden
          data-testid="capture-suggestions-keys"
          className="min-w-0 flex-1 truncate"
          style={{ color: colorVar('foreSecondary') }}
        >
          {isBrowsing
            ? 'Arrows move · Return picks · Space selects · esc back'
            : '⌥S to browse with the keyboard'}
        </span>
        <Button
          variant={hasSelection ? 'primary' : 'secondary'}
          size="sm"
          data-testid="capture-suggestions-add"
          disabled={!hasSelection || isAdding}
          aria-keyshortcuts={hasSelection ? 'Shift+Enter' : undefined}
          onClick={onAddSelected}
        >
          {suggestionsAddLabel(addCount)}
          {hasSelection ? (
            <ShortcutHint className="ms-1">⇧⏎</ShortcutHint>
          ) : null}
        </Button>
      </div>

      {/* biome-ignore lint/a11y/noStaticElementInteractions: the list routes ↑/↓/Space between its rows' own pick buttons; every row is a real button. */}
      <div
        role="group"
        aria-label="Suggested endeavors"
        // Scrolls, but draws no scrollbar — the design system's hidden-bar
        // utility pair, as the trailing detail panel uses.
        className="relative z-[1] grid min-h-0 flex-1 content-start overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          // Rows and columns equally apart, on the spacing scale.
          rowGap: spacingVar('small'),
          columnGap: spacingVar('small'),
          // Room inside the scroller so the first and last rows (and their
          // shadows) are never clipped at its edges or under the header.
          padding: `${spacingVar('small')} ${spacingVar('tiny')} ${spacingVar('medium')}`,
          // Canon's horizontal cards, as many across as fit: 3 at 680px.
          gridTemplateColumns: `repeat(auto-fill, minmax(${SUGGESTION_CARD_MIN_WIDTH_PX}px, 1fr))`,
        }}
        onKeyDown={onListKeyDown}
        onFocus={() => setBrowsing(true)}
        onBlur={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            setBrowsing(false)
          }
        }}
      >
        {suggestions.map((suggestion) => {
          const kindLabel = captureKindLabel(suggestion.kind)
          return (
            <EndeavorRow
              key={suggestion.id}
              symbol={suggestion.emoji}
              title={suggestion.title}
              config="horizontalCard"
              symbolWash={semanticVar(
                kindTint(endeavorKindForCaptureKind(suggestion.kind)),
              )}
              now={now}
              badges={[
                {
                  kind: 'endeavorKind',
                  value: endeavorKindForCaptureKind(suggestion.kind),
                },
                ...(suggestion.rewards > 0
                  ? [{ kind: 'reward' as const, amount: suggestion.rewards }]
                  : []),
              ]}
              pickId={suggestion.id}
              pickLabel={`${suggestion.title}, ${kindLabel}${
                suggestion.rewards > 0 ? `, ${suggestion.rewards} points` : ''
              }`}
              onPick={({ altKey }) => {
                if (altKey) onToggle(suggestion.id)
                else onPick(suggestion.id)
              }}
              selection={{
                checked: selectedIds.includes(suggestion.id),
                label: `Select ${suggestion.title}`,
                onToggle: () => onToggle(suggestion.id),
              }}
            />
          )
        })}
      </div>
      {/*
        The glass rim, redrawn ABOVE the content. `.kro-glass::after` paints
        its rim at z-index -1 — behind the element's children — so cards
        scrolling under the pane's edge covered it. This overlay carries the
        same light rim on top; the ::after keeps the sheen below.
      */}
      <span
        aria-hidden
        data-slot="capture-suggestions-rim"
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          borderRadius: 'inherit',
          boxShadow: 'var(--kro-glass-light-rim)',
        }}
      />
    </section>
  )
}
