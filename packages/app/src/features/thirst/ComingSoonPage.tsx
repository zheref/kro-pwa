'use client'

/**
 * `ComingSoonPage` — stateful container (`RC-37`; implements `UZF-4`) for the
 * Thirst vote surface. Canon's `ComingSoonScreen.swift`: reads the Selectors,
 * dispatches the mount effects and the vote intent, renders the pure
 * `ComingSoonFragment`.
 */
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../library/hooks'
import { ComingSoonFragment } from './ComingSoonFragment'
import {
  castVoteThunk,
  checkVoteStateThunk,
  fetchCountsThunk,
} from './ThirstProducer'
import {
  isThirstVotable,
  thirstFeatureBlurb,
  thirstFeatureTitle,
} from './ThirstRegistry'
import {
  selectThirstHasLoadedCounts,
  selectThirstIsVoting,
  selectThirstPerPlatformTallies,
  selectThirstTotalCount,
  selectThirstVoteErrorMessage,
  selectThirstVoteStatus,
} from './ThirstSelectors'

export interface ComingSoonPageProps {
  readonly featureKey: string
  /** Shown for an unmapped dead-end (the *Unknown* fallback), which has no
   * registry entry — canon: "fall back to the caller's title for unmapped
   * dead-ends". Defaults to the raw key so a Page never renders blank. */
  readonly fallbackTitle?: string
}

export function ComingSoonPage({
  featureKey,
  fallbackTitle,
}: ComingSoonPageProps) {
  const dispatch = useAppDispatch()
  const status = useAppSelector((state) =>
    selectThirstVoteStatus(state, featureKey),
  )
  const hasCounts = useAppSelector((state) =>
    selectThirstHasLoadedCounts(state, featureKey),
  )
  const totalCount = useAppSelector((state) =>
    selectThirstTotalCount(state, featureKey),
  )
  const perPlatform = useAppSelector((state) =>
    selectThirstPerPlatformTallies(state, featureKey),
  )
  const isVoting = useAppSelector((state) =>
    selectThirstIsVoting(state, featureKey),
  )
  const voteErrorMessage = useAppSelector((state) =>
    selectThirstVoteErrorMessage(state, featureKey),
  )

  useEffect(() => {
    // Unmapped dead-ends never fetch and never offer a vote (canon:
    // "nothing is fetched and no vote is offered").
    if (!isThirstVotable(featureKey)) return
    const checking = dispatch(checkVoteStateThunk({ featureKey }))
    const fetching = dispatch(fetchCountsThunk({ featureKey }))
    return () => {
      checking.abort()
      fetching.abort()
    }
  }, [dispatch, featureKey])

  const onVote = () => {
    // Defense in depth, mirroring canon's `userDidTapVote` guard: reject a
    // vote unless the surface is genuinely votable right now, even if a
    // caller dispatches this outside the (disabled) CTA.
    if (status.kind !== 'votable') return
    dispatch(castVoteThunk({ featureKey, id: crypto.randomUUID() }))
  }

  return (
    <ComingSoonFragment
      featureTitle={
        thirstFeatureTitle(featureKey) ?? fallbackTitle ?? featureKey
      }
      featureBlurb={thirstFeatureBlurb(featureKey)}
      status={status}
      hasCounts={hasCounts}
      totalCount={totalCount}
      perPlatform={perPlatform}
      isVoting={isVoting}
      voteErrorMessage={voteErrorMessage}
      onVote={onVote}
    />
  )
}
