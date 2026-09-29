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
 * - **⌥S** moves focus into the row and back to the title (handled by the
 *   prompt, which owns focus).
 * - **↑ / ↓** move between rows; **Space** picks the focused card into the
 *   prompt; **⇧Space** (or **⌥-click**, or the card's checkbox) ticks it for
 *   a multi-add; **⇧⏎** adds every ticked card to the Inbox.
 * - Plain **Return** stays the prompt's Add, from here too.
 *
 * Event cards cannot be ticked: the Inbox holds no events, so an event is
 * picked into the prompt, where its start and end are seeded.
 */

import type { KeyboardEvent } from 'react'
import { EndeavorRow } from '../../../design/endeavor/EndeavorRow'
import { Button, ShortcutHint } from '../../../design/system/primitives/button'
import {
  colorVar,
  radiusVar,
  shadowVar,
  spacingVar,
} from '../../../design/system/tokens/roles'
import { captureKindLabel, endeavorKindForCaptureKind } from '../CaptureRules'
import {
  type CaptureSuggestion,
  isCaptureSuggestionInboxable,
} from '../CaptureSuggestions'

export interface CaptureSuggestionsFragmentProps {
  readonly suggestions: readonly CaptureSuggestion[]
  readonly selectedIds: readonly string[]
  /** How many ticked rows **Add to Inbox** would write (events excluded). */
  readonly inboxCount: number
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

/** The multi-add action's label — never "Add 0". */
export const suggestionsAddLabel = (count: number): string =>
  count === 0
    ? 'Select to add'
    : count === 1
      ? 'Add 1 to Inbox'
      : `Add ${count} to Inbox`

export function CaptureSuggestionsFragment({
  suggestions,
  selectedIds,
  inboxCount,
  revealChord,
  now,
  onPick,
  onToggle,
  onAddSelected,
}: CaptureSuggestionsFragmentProps) {
  /** ↑ / ↓ between rows, Space picks, ⇧Space ticks. */
  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target instanceof HTMLElement ? event.target : null
    const row = target?.closest<HTMLElement>('[data-kro-row-pick]')
    if (row === null || row === undefined) return
    const id = row.dataset.kroRowPick ?? ''
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const rows = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>(
          '[data-kro-row-pick]',
        ),
      )
      const next =
        rows[rows.indexOf(row) + (event.key === 'ArrowDown' ? 1 : -1)]
      next?.focus()
      next?.scrollIntoView?.({ block: 'nearest' })
      return
    }
    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault()
      if (event.shiftKey) onToggle(id)
      else onPick(id)
    }
  }

  const hasSelection = inboxCount > 0

  return (
    <section
      aria-label="Suggestions"
      data-testid="capture-suggestions"
      className="kro-glass flex h-full flex-col overflow-hidden"
      style={{
        // The prompt's own corner — the pane and the prompt share it.
        borderRadius: radiusVar('panel'),
        boxShadow: shadowVar('surface'),
        padding: spacingVar('medium'),
        gap: spacingVar('small'),
      }}
    >
      <div
        className="flex shrink-0 items-center text-xs"
        style={{ gap: spacingVar('small') }}
      >
        <span
          className="relative font-semibold"
          style={{ color: colorVar('foreSecondary') }}
        >
          <ShortcutHint placement="keycap" reveal={revealChord}>
            ⌥S
          </ShortcutHint>
          Suggestions
        </span>
        <span
          aria-hidden
          data-testid="capture-suggestions-keys"
          className="min-w-0 flex-1 truncate"
          style={{ color: colorVar('foreSecondary') }}
        >
          ↑↓ move · Space picks · ⇧Space selects
        </span>
        <Button
          variant={hasSelection ? 'primary' : 'secondary'}
          size="sm"
          data-testid="capture-suggestions-add"
          disabled={!hasSelection}
          aria-keyshortcuts={hasSelection ? 'Shift+Enter' : undefined}
          onClick={onAddSelected}
        >
          {suggestionsAddLabel(inboxCount)}
          {hasSelection ? (
            <ShortcutHint className="ms-1">⇧⏎</ShortcutHint>
          ) : null}
        </Button>
      </div>

      {/* biome-ignore lint/a11y/noStaticElementInteractions: the list routes ↑/↓/Space between its rows' own pick buttons; every row is a real button. */}
      <div
        role="group"
        aria-label="Suggested endeavors"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        style={{ gap: spacingVar('small') }}
        onKeyDown={onListKeyDown}
      >
        {suggestions.map((suggestion) => {
          const canSelect = isCaptureSuggestionInboxable(suggestion)
          const kindLabel = captureKindLabel(suggestion.kind)
          return (
            <EndeavorRow
              key={suggestion.id}
              symbol={suggestion.emoji}
              title={suggestion.title}
              config="compactDesktopInbox"
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
                if (altKey && canSelect) onToggle(suggestion.id)
                else onPick(suggestion.id)
              }}
              selection={{
                checked: selectedIds.includes(suggestion.id),
                disabled: !canSelect,
                label: canSelect
                  ? `Select ${suggestion.title} for the Inbox`
                  : `${suggestion.title} needs a time — pick it instead`,
                onToggle: () => onToggle(suggestion.id),
              }}
            />
          )
        })}
      </div>
    </section>
  )
}
