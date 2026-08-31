/**
 * The Add Reward form — canon `EarnScreen.swift`'s `AddRewardSheet`, raised
 * by the FAB (`EarnFragment`'s `plus` glyph, canon's `quickActionFAB` `.earn`
 * case).
 *
 * `trigger` is the FAB itself: on the desktop idiom it becomes the `Popover`'s
 * own anchor (`PopoverTrigger asChild`), so the form opens beside the button
 * that raised it; on the mobile idiom the FAB stays a plain button and the
 * sheet is a separate, Redux-driven overlay (`isAddingReward`) — the same
 * split `ClaimConfirmation.tsx` uses for the claim flow.
 *
 * Cost is a stepper (canon's `Stepper(... in: 0...100_000, step: 50)`); the
 * title field disables Add on a blank/whitespace-only value, mirroring
 * `AddRewardProducer`'s own validation so the button's disabled state and the
 * thunk's rejection never disagree.
 */
import type { ReactNode } from 'react'
import { Minus, Plus, Zap } from 'lucide-react'
import { Button } from '../../../design/system/primitives/button'
import { Input } from '../../../design/system/primitives/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../design/system/primitives/popover'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '../../../design/system/primitives/sheet'
import { colorVar } from '../../../design/system/tokens/roles'
import type { EarnRewardDraft } from '../EarnFeature'

const POINTS_STEP = 50
const POINTS_MIN = 0
const POINTS_MAX = 100_000

export interface AddRewardFormProps {
  readonly isOpen: boolean
  readonly draft: EarnRewardDraft
  readonly presentation: 'sheet' | 'popover'
  /** The FAB. On `'popover'` this becomes the popover's own anchor. */
  readonly trigger: ReactNode
  readonly onChangeTitle: (title: string) => void
  readonly onChangeGlyph: (glyph: string) => void
  readonly onChangePoints: (pointsRequired: number) => void
  readonly onChangeNotes: (notes: string) => void
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

export function AddRewardForm({
  isOpen,
  draft,
  presentation,
  trigger,
  onChangeTitle,
  onChangeGlyph,
  onChangePoints,
  onChangeNotes,
  onConfirm,
  onCancel,
}: AddRewardFormProps) {
  const fields = (
    <AddRewardFields
      draft={draft}
      onChangeTitle={onChangeTitle}
      onChangeGlyph={onChangeGlyph}
      onChangePoints={onChangePoints}
      onChangeNotes={onChangeNotes}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )

  if (presentation === 'popover') {
    return (
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onCancel()
        }}
      >
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="end" style={{ width: 340 }}>
          {fields}
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <>
      {trigger}
      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onCancel()
        }}
      >
        <SheetContent>
          <SheetTitle>New Reward</SheetTitle>
          <SheetDescription className="sr-only">
            Name a reward, set its glyph and its point cost.
          </SheetDescription>
          {fields}
        </SheetContent>
      </Sheet>
    </>
  )
}

function AddRewardFields({
  draft,
  onChangeTitle,
  onChangeGlyph,
  onChangePoints,
  onChangeNotes,
  onConfirm,
  onCancel,
}: Omit<
  AddRewardFormProps,
  'isOpen' | 'presentation' | 'trigger'
>) {
  const canConfirm = draft.title.trim().length > 0

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (canConfirm) onConfirm()
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="earn-add-reward-title"
          className="font-medium text-xs"
          style={{ color: colorVar('foreSecondary') }}
        >
          What do you want to earn?
        </label>
        <Input
          id="earn-add-reward-title"
          value={draft.title}
          onChange={(event) => onChangeTitle(event.target.value)}
          placeholder="Movie night"
          autoFocus
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="earn-add-reward-glyph"
          className="font-medium text-xs"
          style={{ color: colorVar('foreSecondary') }}
        >
          Emoji
        </label>
        <Input
          id="earn-add-reward-glyph"
          value={draft.glyph}
          onChange={(event) => onChangeGlyph(event.target.value)}
          className="w-20 text-center"
          maxLength={4}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span
          className="font-medium text-xs"
          style={{ color: colorVar('foreSecondary') }}
        >
          Cost
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            aria-label="Fewer points"
            onClick={() =>
              onChangePoints(Math.max(POINTS_MIN, draft.pointsRequired - POINTS_STEP))
            }
          >
            <Minus className="size-4" aria-hidden />
          </Button>
          <span
            className="flex flex-1 items-center justify-center gap-1 font-semibold text-sm"
            style={{ color: colorVar('fore') }}
          >
            <Zap
              className="size-4"
              aria-hidden
              style={{ color: colorVar('rewardYellow') }}
            />
            {draft.pointsRequired} points
          </span>
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            aria-label="More points"
            onClick={() =>
              onChangePoints(Math.min(POINTS_MAX, draft.pointsRequired + POINTS_STEP))
            }
          >
            <Plus className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="earn-add-reward-notes"
          className="font-medium text-xs"
          style={{ color: colorVar('foreSecondary') }}
        >
          Notes (optional)
        </label>
        <textarea
          id="earn-add-reward-notes"
          value={draft.notes ?? ''}
          onChange={(event) => onChangeNotes(event.target.value)}
          placeholder="Why this matters to you…"
          rows={2}
          className="w-full min-w-0 rounded-kro-field border border-kro-hairline bg-kro-back-inner px-kro-small py-kro-small text-kro-fore text-sm outline-none focus-visible:border-kro-accent focus-visible:shadow-[var(--kro-ring)]"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="md" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="md" disabled={!canConfirm}>
          Add
        </Button>
      </div>
    </form>
  )
}
