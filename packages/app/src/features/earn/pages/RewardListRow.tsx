/**
 * `RewardListRow` — canon `EarnView.swift`'s `RewardListRow`.
 *
 * One row, two lanes: `isClaimable` picks between the Claim button and the
 * locked lock-icon + percentage trailing control, and only a locked row draws
 * the progress bar + "N to go" caption (canon's exact split — a claimable row
 * never shows a bar it has already cleared).
 *
 * Context-menu delete (epic scope) is the endeavor kit's own idiom, narrowed:
 * `EndeavorActionSurface` (`../../../design/endeavor`) is built around
 * `EndeavorCapabilities`, an Endeavor-domain shape a `Reward` is not — forcing
 * one through the other would be the cross-domain coupling `UZF-6` forbids.
 * Rewards have exactly one action (delete), so this row carries its own
 * minimal version of the same grammar instead: an always-mounted, hover/focus
 * revealed ellipsis trigger opening a `DropdownMenu`, plus a native
 * `contextmenu` handler that opens the identical menu — matching canon's
 * `.contextMenu { Button(role: .destructive, action: onDelete) }` one-for-one.
 *
 * `presentation` decides how the Claim confirmation appears (`#28`'s idiom
 * rule): `'popover'` anchors a Radix `Popover` to THIS row's own Claim
 * button (so it opens beside the control that raised it, canon's `.sheet`
 * on the corresponding row's action); `'sheet'` leaves the button a plain
 * dispatch — the single shared confirmation sheet is the Fragment's, driven
 * by the same `claimingRewardId`.
 */
import { useState } from 'react'
import type { Reward } from '@kro/core'
import { Ellipsis, Gift, Lock, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../design/system/primitives/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../design/system/primitives/popover'
import { Button } from '../../../design/system/primitives/button'
import { KroChip, colorTint } from '../../../design/endeavor/KroChip'
import { colorVar, radiusVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import { claimProgress, pointsToGo } from '../EarnRules'
import { ClaimConfirmationBody } from './ClaimConfirmation'

export interface RewardListRowProps {
  readonly reward: Reward
  readonly currentPoints: number
  readonly isClaimable: boolean
  /** `claimingRewardId === reward.id` — drives the row's own popover open state. */
  readonly isConfirmingClaim: boolean
  readonly presentation: 'sheet' | 'popover'
  readonly onTapClaim: (id: string) => void
  readonly onConfirmClaim: () => void
  readonly onCancelClaim: () => void
  readonly onDelete: (id: string) => void
}

export function RewardListRow({
  reward,
  currentPoints,
  isClaimable,
  isConfirmingClaim,
  presentation,
  onTapClaim,
  onConfirmClaim,
  onCancelClaim,
  onDelete,
}: RewardListRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const progress = claimProgress(reward, currentPoints)
  const remaining = pointsToGo(reward, currentPoints)

  return (
    <div
      data-slot="reward-list-row"
      data-testid={`reward-row-${reward.id}`}
      className="group relative flex w-full items-center gap-3 overflow-hidden"
      style={{
        padding: '12px 14px',
        borderRadius: radiusVar('surface'),
        backgroundColor: colorVar('absolute'),
        boxShadow: 'var(--kro-shadow-card)',
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        setMenuOpen(true)
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
        <div className="flex items-center gap-1.5">
          <KroChip
            icon="bolt.fill"
            title={String(reward.pointsRequired)}
            tint={colorTint('foreSecondary')}
            size="small"
          />
          {isClaimable ? null : (
            <span
              className="text-[11px]"
              style={{ color: colorVar('foreSecondary') }}
            >
              {remaining} to go
            </span>
          )}
        </div>
        {isClaimable ? null : (
          <div
            aria-hidden
            className="h-1.5 w-full max-w-[180px] overflow-hidden rounded-kro-pill"
            style={{ backgroundColor: colorVar('backInner') }}
          >
            <div
              className="h-full rounded-kro-pill"
              style={{
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: colorVar('accent'),
              }}
            />
          </div>
        )}
      </div>

      {isClaimable ? (
        presentation === 'popover' ? (
          <Popover
            open={isConfirmingClaim}
            onOpenChange={(open) => {
              if (!open) onCancelClaim()
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onTapClaim(reward.id)}
              >
                <Gift className="size-4" aria-hidden />
                Claim
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              style={{ width: 320 }}
              aria-label={`Claim ${reward.title}`}
            >
              <ClaimConfirmationBody
                reward={reward}
                onConfirm={onConfirmClaim}
                onCancel={onCancelClaim}
              />
            </PopoverContent>
          </Popover>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onTapClaim(reward.id)}
          >
            <Gift className="size-4" aria-hidden />
            Claim
          </Button>
        )
      ) : (
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <Lock
            className="size-3.5"
            aria-hidden
            style={{ color: colorVar('foreSecondary') }}
          />
          <span
            className="font-semibold text-[11px]"
            style={{ color: colorVar('foreSecondary') }}
          >
            {Math.round(progress * 100)}%
          </span>
        </div>
      )}

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${reward.title}`}
            className={cn(
              'absolute top-1 right-1 inline-flex size-7 items-center justify-center',
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
          <DropdownMenuItem destructive onSelect={() => onDelete(reward.id)}>
            <Trash2 className="size-4" aria-hidden />
            Remove from list
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
