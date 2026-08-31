/**
 * `SuggestionRewardRow` — canon `EarnView.swift`'s `SuggestionRewardRow`.
 *
 * No context menu, no claim button — a suggestion is a template
 * (`Reward.suggestionsCatalog`) the user has not adopted yet, so its one
 * action is "Add", which quick-adds it via `addSuggestionThunk`
 * (`rewardForInsertion`, canon's `copyForInsertion()`).
 */
import type { Reward } from '@kro/core'
import { Plus } from 'lucide-react'
import { Button } from '../../../design/system/primitives/button'
import { KroChip, colorTint } from '../../../design/endeavor/KroChip'
import { colorVar, radiusVar } from '../../../design/system/tokens/roles'

export interface SuggestionRewardRowProps {
  readonly reward: Reward
  readonly onAdd: (reward: Reward) => void
}

export function SuggestionRewardRow({ reward, onAdd }: SuggestionRewardRowProps) {
  return (
    <div
      data-slot="suggestion-reward-row"
      data-testid={`suggestion-row-${reward.id}`}
      className="flex w-full items-center gap-3"
      style={{
        padding: '12px 14px',
        borderRadius: radiusVar('surface'),
        backgroundColor: colorVar('absolute'),
        boxShadow: 'var(--kro-shadow-card)',
      }}
    >
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-kro-field text-2xl"
        style={{ backgroundColor: colorVar('backInner') }}
      >
        {reward.glyph}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p
          className="m-0 line-clamp-2 font-semibold text-sm"
          style={{ color: colorVar('fore') }}
        >
          {reward.title}
        </p>
        <KroChip
          icon="bolt.fill"
          title={`${reward.pointsRequired} points`}
          tint={colorTint('foreSecondary')}
          size="small"
        />
      </div>

      <Button variant="secondary" size="sm" onClick={() => onAdd(reward)}>
        <Plus className="size-4" aria-hidden />
        Add
      </Button>
    </div>
  )
}
