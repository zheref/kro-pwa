/**
 * `EarnFragment` — canon `EarnView.swift` + `EarnScreen.swift`'s phone body,
 * folded into one pure renderer (`RC-15`; implements `UZF-4`/`UZF-5`).
 *
 * Takes every value and every intent as a prop/callback — no `useAppSelector`,
 * no `useAppDispatch`, no store import, so it is Storybook- and render-test-
 * able with zero Provider wrapping (`05-page-and-screen.md`).
 *
 * ## Section order and visibility — canon's exactly
 *
 * Claimable ("Available to Claim") and Locked ("Keep Earning") render only
 * when non-empty; Suggestions ("Get Started" when the catalog is empty,
 * "Discover More" otherwise) renders whenever there is at least one available
 * suggestion — which is how canon's empty-state copy ("Pick a reward to start
 * working towards, or add your own with the + button.") surfaces: it is the
 * Suggestions section's own intro line when `isCatalogEmpty`, never a
 * separate empty-state screen.
 *
 * ## Why no "Rewards" heading here
 *
 * The shell's own toolbar already renders `destinationHeading(selected)` —
 * "Rewards" — as an `<h1>` on BOTH shells (`MainShellFragment.tsx`'s
 * `TabBarToolbar` and `ContentToolbar`). Repeating it here would be two
 * headings reading the same word. What canon's `LargeScreenTitle` subtitle
 * carries that the shell's plain `<h1>` does not — the live points balance —
 * is what this Fragment owns instead.
 *
 * ## The per-tab gear (epic scope, mobile only)
 *
 * Canon's `mainScreenToolbar` installs a SECOND, tab-specific gear at
 * `topBarTrailing` beside the shell's own generic one, only on the phone
 * toolbar (`ios26TabContent`/`legacyPhoneBody`) and only for `.earn`'s
 * `preferencesSection`. That is a `ToolbarSlot` portal (`../../main`), and it
 * mounts only on the `tabBar` shell shape — the sidebar toolbar has no
 * per-destination preferences gear in canon's own Mac composition.
 */
import { ToolbarSlot } from '../../main'
import { Settings, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Reward } from '@kro/core'
import { LiquidGlassFAB } from '../../../design/chrome/fab/LiquidGlassFAB'
import { colorVar } from '../../../design/system/tokens/roles'
import type { EarnRewardDraft } from '../EarnFeature'
import { AddRewardForm } from './AddRewardForm'
import { ClaimRewardSheetDialog } from './ClaimConfirmation'
import { RewardListRow } from './RewardListRow'
import { SuggestionRewardRow } from './SuggestionRewardRow'

/** `MainScreen.fabTrailingPadding` / `fabBottomPadding` — the "legacy" pair. */
const FAB_TRAILING_PADDING = 16
const FAB_BOTTOM_PADDING = 60

export interface EarnFragmentProps {
  readonly claimableRewards: readonly Reward[]
  readonly lockedRewards: readonly Reward[]
  readonly availableSuggestions: readonly Reward[]
  readonly currentPoints: number
  readonly isCatalogEmpty: boolean

  readonly isAddingReward: boolean
  readonly addRewardDraft: EarnRewardDraft

  readonly claimingRewardId: string | null
  readonly claimingReward: Reward | null

  /** `'popover'` on the sidebar (desktop) idiom, `'sheet'` on the tab bar. */
  readonly presentation: 'sheet' | 'popover'
  /** The per-tab gear only exists on canon's phone toolbar. */
  readonly showsMobileEarnPreferencesGear: boolean

  readonly onTapClaim: (id: string) => void
  readonly onConfirmClaim: () => void
  readonly onCancelClaim: () => void
  readonly onDelete: (id: string) => void

  readonly onTapAddReward: () => void
  readonly onChangeDraftTitle: (title: string) => void
  readonly onChangeDraftGlyph: (glyph: string) => void
  readonly onChangeDraftPoints: (pointsRequired: number) => void
  readonly onChangeDraftNotes: (notes: string) => void
  readonly onConfirmAddReward: () => void
  readonly onCancelAddReward: () => void

  readonly onTapAddSuggestion: (reward: Reward) => void
  readonly onTapEarnPreferences: () => void
}

export function EarnFragment(props: EarnFragmentProps) {
  const {
    claimableRewards,
    lockedRewards,
    availableSuggestions,
    currentPoints,
    isCatalogEmpty,
    isAddingReward,
    addRewardDraft,
    claimingRewardId,
    claimingReward,
    presentation,
    showsMobileEarnPreferencesGear,
    onTapClaim,
    onConfirmClaim,
    onCancelClaim,
    onDelete,
    onTapAddReward,
    onChangeDraftTitle,
    onChangeDraftGlyph,
    onChangeDraftPoints,
    onChangeDraftNotes,
    onConfirmAddReward,
    onCancelAddReward,
    onTapAddSuggestion,
    onTapEarnPreferences,
  } = props

  const fab = (
    <LiquidGlassFAB
      glyph="plus"
      accessibilityLabel="Add Reward"
      onClick={onTapAddReward}
    />
  )

  return (
    <section
      data-testid="earn-fragment"
      className="relative flex h-full flex-col"
    >
      {showsMobileEarnPreferencesGear ? (
        <ToolbarSlot placement="trailing">
          <button
            type="button"
            aria-label="Earn Preferences"
            onClick={onTapEarnPreferences}
            className="inline-flex size-11 items-center justify-center rounded-kro-field outline-none focus-visible:shadow-[var(--kro-ring)]"
          >
            <Settings size={20} aria-hidden="true" className="text-white" />
          </button>
        </ToolbarSlot>
      ) : null}

      <div className="flex items-center gap-1.5 px-kro-medium pt-kro-small pb-kro-tiny">
        <Zap
          className="size-4"
          aria-hidden
          style={{ color: colorVar('rewardYellow') }}
        />
        <p
          className="m-0 text-sm"
          style={{ color: colorVar('foreSecondary') }}
        >
          {currentPoints} point{currentPoints === 1 ? '' : 's'} available
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-kro-medium pt-kro-small pb-24">
        {claimableRewards.length === 0 ? null : (
          <RewardSection title="Available to Claim" count={claimableRewards.length}>
            {claimableRewards.map((reward) => (
              <RewardListRow
                key={reward.id}
                reward={reward}
                currentPoints={currentPoints}
                isClaimable
                isConfirmingClaim={claimingRewardId === reward.id}
                presentation={presentation}
                onTapClaim={onTapClaim}
                onConfirmClaim={onConfirmClaim}
                onCancelClaim={onCancelClaim}
                onDelete={onDelete}
              />
            ))}
          </RewardSection>
        )}

        {lockedRewards.length === 0 ? null : (
          <RewardSection title="Keep Earning" count={lockedRewards.length}>
            {lockedRewards.map((reward) => (
              <RewardListRow
                key={reward.id}
                reward={reward}
                currentPoints={currentPoints}
                isClaimable={false}
                isConfirmingClaim={false}
                presentation={presentation}
                onTapClaim={onTapClaim}
                onConfirmClaim={onConfirmClaim}
                onCancelClaim={onCancelClaim}
                onDelete={onDelete}
              />
            ))}
          </RewardSection>
        )}

        {availableSuggestions.length === 0 ? null : (
          <RewardSection title={isCatalogEmpty ? 'Get Started' : 'Discover More'}>
            {isCatalogEmpty ? (
              <p
                className="m-0 px-1 text-sm"
                style={{ color: colorVar('foreSecondary') }}
              >
                Pick a reward to start working towards, or add your own with
                the + button.
              </p>
            ) : null}
            {availableSuggestions.map((suggestion) => (
              <SuggestionRewardRow
                key={suggestion.id}
                reward={suggestion}
                onAdd={onTapAddSuggestion}
              />
            ))}
          </RewardSection>
        )}
      </div>

      <div
        className="absolute z-10"
        style={{ right: FAB_TRAILING_PADDING, bottom: FAB_BOTTOM_PADDING }}
      >
        <AddRewardForm
          isOpen={isAddingReward}
          draft={addRewardDraft}
          presentation={presentation}
          trigger={fab}
          onChangeTitle={onChangeDraftTitle}
          onChangeGlyph={onChangeDraftGlyph}
          onChangePoints={onChangeDraftPoints}
          onChangeNotes={onChangeDraftNotes}
          onConfirm={onConfirmAddReward}
          onCancel={onCancelAddReward}
        />
      </div>

      {presentation === 'sheet' ? (
        <ClaimRewardSheetDialog
          reward={claimingReward}
          onConfirm={onConfirmClaim}
          onCancel={onCancelClaim}
        />
      ) : null}
    </section>
  )
}

function RewardSection({
  title,
  count,
  children,
}: {
  readonly title: string
  readonly count?: number
  readonly children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2
        className="m-0 flex items-center gap-1.5 font-semibold text-sm"
        style={{ color: colorVar('fore') }}
      >
        {title}
        {count === undefined ? null : (
          <span
            className="rounded-kro-pill px-1.5 py-0.5 text-[11px]"
            style={{
              backgroundColor: colorVar('backInner'),
              color: colorVar('foreSecondary'),
            }}
          >
            {count}
          </span>
        )}
      </h2>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  )
}
