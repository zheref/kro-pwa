/**
 * The claim confirmation — canon `EarnView.swift`'s `ClaimRewardSheet`, split
 * into a shared body (`ClaimConfirmationBody`, used inline by a row's own
 * `Popover` on desktop — see `RewardListRow.tsx`) and one mobile wrapper
 * (`ClaimRewardSheetDialog`) that presents it as a bottom sheet, driven by the
 * SAME `claimingRewardId`/`claimingReward` state either way.
 *
 * Idiom split is the epic's own rule ("sheet mobile / popover desktop for the
 * same content") — `EarnFragment` picks which of the two mounts by
 * `presentation`, never both at once.
 */
import type { Reward } from '@kro/core'
import { Zap } from 'lucide-react'
import { Button } from '../../../design/system/primitives/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '../../../design/system/primitives/sheet'
import { colorVar } from '../../../design/system/tokens/roles'

export interface ClaimConfirmationBodyProps {
  readonly reward: Reward
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

/** The content shared by the sheet and the popover — canon's copy, verbatim. */
export function ClaimConfirmationBody({
  reward,
  onConfirm,
  onCancel,
}: ClaimConfirmationBodyProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span aria-hidden className="text-6xl">
        {reward.glyph}
      </span>
      <div className="flex flex-col gap-1">
        <p className="m-0 font-bold text-lg" style={{ color: colorVar('fore') }}>
          Claim {reward.title}?
        </p>
        <p
          className="m-0 flex items-center justify-center gap-1 font-semibold text-sm"
          style={{ color: colorVar('foreSecondary') }}
        >
          <Zap
            className="size-4"
            aria-hidden
            style={{ color: colorVar('rewardYellow') }}
          />
          {reward.pointsRequired} points
        </p>
      </div>
      <p className="m-0 text-sm" style={{ color: colorVar('foreSecondary') }}>
        This will spend your points and mark the reward as claimed.
      </p>
      <div className="flex w-full flex-col gap-2">
        <Button variant="primary" size="lg" onClick={onConfirm}>
          Confirm Claim
        </Button>
        <Button variant="ghost" size="md" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

export interface ClaimRewardSheetDialogProps {
  readonly reward: Reward | null
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

/** The mobile idiom: a full-width bottom sheet over the same body. */
export function ClaimRewardSheetDialog({
  reward,
  onConfirm,
  onCancel,
}: ClaimRewardSheetDialogProps) {
  return (
    <Sheet
      open={reward !== null}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <SheetContent>
        <SheetTitle className="sr-only">Claim Reward</SheetTitle>
        <SheetDescription className="sr-only">
          Confirm spending your points to claim this reward.
        </SheetDescription>
        {reward === null ? null : (
          <ClaimConfirmationBody
            reward={reward}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
