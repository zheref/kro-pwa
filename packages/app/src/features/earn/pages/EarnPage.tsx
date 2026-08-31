'use client'

/**
 * `EarnPage` — the Earn destination's stateful container (`RC-37`; implements
 * `UZF-4`). The only artifact in this lane that calls both `useAppSelector`
 * and `useAppDispatch`; it owns no markup beyond the single call into
 * `EarnFragment`.
 *
 * Mounts by dispatching the same two independent loads
 * `EarnProducer.ts`'s header documents (`loadEarnPreferencesThunk` /
 * `loadEarnCatalogThunk`) — canon's `.onAppeared`.
 *
 * ## The per-tab gear's stopgap destination
 *
 * `#32` (Auth + Settings UI) owns the Earn Preferences surface; it does not
 * exist yet. Exactly as `MainShellPage.tsx` already routes Profile to Adjust
 * "for now" (its own comment, verbatim: "the popover itself belongs to the
 * settings child … the shell routes straight to the destination that action
 * targets rather than shipping a control that does nothing"), the gear here
 * dispatches the SAME `navigateToDestinationThunk({ kind: settings })` —
 * emitting a real navigation intent today, one `#32` narrows to the Earn
 * Preferences section once that surface exists, rather than a dead button.
 */
import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import {
  DestinationKind,
  navigateToDestinationThunk,
  shellShapeFor,
  useSurfaceLayout,
} from '../../main'
import {
  userDidCancelAddReward,
  userDidCancelClaim,
  userDidChangeDraftGlyph,
  userDidChangeDraftNotes,
  userDidChangeDraftPoints,
  userDidChangeDraftTitle,
  userDidTapAddReward,
  userDidTapClaim,
} from '../EarnFeature'
import {
  addRewardThunk,
  addSuggestionThunk,
  claimRewardThunk,
  deleteRewardThunk,
  loadEarnCatalogThunk,
  loadEarnPreferencesThunk,
} from '../EarnProducer'
import {
  selectAddRewardDraft,
  selectAvailableSuggestions,
  selectClaimableRewards,
  selectClaimingReward,
  selectClaimingRewardId,
  selectCurrentPoints,
  selectIsAddingReward,
  selectIsEarnCatalogEmpty,
  selectLockedRewards,
} from '../EarnSelectors'
import { EarnFragment } from './EarnFragment'
import type { Reward } from '@kro/core'

export function EarnPage() {
  const dispatch = useAppDispatch()
  const surface = useSurfaceLayout()
  const shellShape = shellShapeFor(surface)
  const presentation = shellShape === 'tabBar' ? 'sheet' : 'popover'

  const claimableRewards = useAppSelector(selectClaimableRewards)
  const lockedRewards = useAppSelector(selectLockedRewards)
  const availableSuggestions = useAppSelector(selectAvailableSuggestions)
  const currentPoints = useAppSelector(selectCurrentPoints)
  const isCatalogEmpty = useAppSelector(selectIsEarnCatalogEmpty)
  const isAddingReward = useAppSelector(selectIsAddingReward)
  const addRewardDraft = useAppSelector(selectAddRewardDraft)
  const claimingRewardId = useAppSelector(selectClaimingRewardId)
  const claimingReward = useAppSelector(selectClaimingReward)

  useEffect(() => {
    void dispatch(loadEarnPreferencesThunk())
    const effect = dispatch(loadEarnCatalogThunk())
    return () => effect.abort()
  }, [dispatch])

  const onTapClaim = useCallback(
    (id: string) => dispatch(userDidTapClaim({ rewardId: id })),
    [dispatch],
  )
  const onCancelClaim = useCallback(
    () => dispatch(userDidCancelClaim()),
    [dispatch],
  )
  const onConfirmClaim = useCallback(() => {
    if (claimingRewardId === null) return
    void dispatch(claimRewardThunk({ id: claimingRewardId }))
  }, [dispatch, claimingRewardId])

  const onDelete = useCallback(
    (id: string) => void dispatch(deleteRewardThunk({ id })),
    [dispatch],
  )

  const onTapAddReward = useCallback(
    () => dispatch(userDidTapAddReward()),
    [dispatch],
  )
  const onCancelAddReward = useCallback(
    () => dispatch(userDidCancelAddReward()),
    [dispatch],
  )
  const onConfirmAddReward = useCallback(() => {
    void dispatch(
      // Identity is the composition root's to supply, never the Producer's
      // — the same rule `MainShellPage.tsx`'s `onCommitDraftProject` states.
      addRewardThunk({ draft: addRewardDraft, id: crypto.randomUUID(), now: new Date() }),
    )
  }, [dispatch, addRewardDraft])

  const onTapAddSuggestion = useCallback(
    (suggestion: Reward) => {
      void dispatch(
        addSuggestionThunk({ suggestion, id: crypto.randomUUID(), now: new Date() }),
      )
    },
    [dispatch],
  )

  const onTapEarnPreferences = useCallback(() => {
    void dispatch(
      navigateToDestinationThunk({ destination: { kind: DestinationKind.settings } }),
    )
  }, [dispatch])

  return (
    <EarnFragment
      claimableRewards={claimableRewards}
      lockedRewards={lockedRewards}
      availableSuggestions={availableSuggestions}
      currentPoints={currentPoints}
      isCatalogEmpty={isCatalogEmpty}
      isAddingReward={isAddingReward}
      addRewardDraft={addRewardDraft}
      claimingRewardId={claimingRewardId}
      claimingReward={claimingReward}
      presentation={presentation}
      showsMobileEarnPreferencesGear={shellShape === 'tabBar'}
      onTapClaim={onTapClaim}
      onConfirmClaim={onConfirmClaim}
      onCancelClaim={onCancelClaim}
      onDelete={onDelete}
      onTapAddReward={onTapAddReward}
      onChangeDraftTitle={(title) => dispatch(userDidChangeDraftTitle({ title }))}
      onChangeDraftGlyph={(glyph) => dispatch(userDidChangeDraftGlyph({ glyph }))}
      onChangeDraftPoints={(pointsRequired) =>
        dispatch(userDidChangeDraftPoints({ pointsRequired }))
      }
      onChangeDraftNotes={(notes) => dispatch(userDidChangeDraftNotes({ notes }))}
      onConfirmAddReward={onConfirmAddReward}
      onCancelAddReward={onCancelAddReward}
      onTapAddSuggestion={onTapAddSuggestion}
      onTapEarnPreferences={onTapEarnPreferences}
    />
  )
}
