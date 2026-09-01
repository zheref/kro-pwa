/**
 * `ComingSoonFragment` — canon `KroUI/ComingSoon/ComingSoonView.swift` (epic
 * #83, sub-issue #87). Pure renderer (`RC-15`): plain values + callbacks, no
 * `useAppSelector`/`useAppDispatch`, no store import. Shown at flag-gated
 * dead-ends that map to an *available soon* registry feature; the caller
 * (`ComingSoonPage.tsx`) resolves the featureKey against the registry and
 * passes `status.kind === 'notVotable'` for an unmapped dead-end, at which
 * point this Fragment renders the plain "coming soon" card with no vote
 * affordance — no count, no CTA.
 */
import { Apple, Globe, Heart, Monitor, Smartphone } from 'lucide-react'
import { InlineBanner } from '../../design/endeavor/InlineBanner'
import { KroChip } from '../../design/endeavor/KroChip'
import { colorVar } from '../../design/system/tokens/roles'
import { cn } from '../../design/system/utils/cn'
import { Button } from '../../design/system/primitives/button'
import {
  ICON_SIZE,
  iconForSymbol,
  type LucideIcon,
} from '../../design/system/icons/icons'
import {
  type PlatformVoteTally,
  type ThirstVoteStatus,
  VotePlatform,
  votePlatformLabel,
} from './ThirstModels'

const PLATFORM_ICON: Readonly<Record<VotePlatform, LucideIcon>> = {
  [VotePlatform.ios]: Apple,
  [VotePlatform.android]: Smartphone,
  [VotePlatform.web]: Globe,
  [VotePlatform.windows]: Monitor,
}

export interface ComingSoonFragmentProps {
  readonly featureTitle: string
  readonly featureBlurb?: string | null
  readonly status: ThirstVoteStatus
  /** Whether real counts have loaded — hides the count block rather than
   * showing a misleading "0 people want this" (canon's `hasCounts`). */
  readonly hasCounts: boolean
  readonly totalCount: number
  readonly perPlatform: readonly PlatformVoteTally[]
  readonly isVoting: boolean
  /** A transient error from a failed vote attempt. Distinct from
   * `status.kind === 'unavailable'`, which blocks voting outright. */
  readonly voteErrorMessage?: string | null
  readonly onVote?: () => void
}

export function ComingSoonFragment({
  featureTitle,
  featureBlurb,
  status,
  hasCounts,
  totalCount,
  perPlatform,
  isVoting,
  voteErrorMessage,
  onVote,
}: ComingSoonFragmentProps) {
  const SparklesIcon = iconForSymbol('sparkles')

  return (
    <section
      // `aria-label`, not `aria-labelledby` + a fixed id (found in review):
      // a fixed id collides the moment two Fragments render on one page
      // (e.g. Storybook's `BothSchemes` story), producing duplicate DOM ids
      // — invalid HTML that leaves assistive tech pointing at the wrong
      // instance's heading. `aria-label` needs no id to stay unique.
      aria-label={featureTitle}
      data-testid="coming-soon-surface"
      className={cn(
        'flex h-full flex-col items-center justify-center',
        'gap-kro-large p-kro-x-large text-center',
      )}
    >
      <div className="flex flex-col items-center gap-kro-small">
        <SparklesIcon
          size={ICON_SIZE.large}
          aria-hidden="true"
          style={{ color: colorVar('accent') }}
        />
        <h2 className="font-semibold text-2xl text-kro-fore">{featureTitle}</h2>
        <p className="font-semibold text-kro-fore-secondary text-xs uppercase tracking-wide">
          Available soon
        </p>
        {featureBlurb === null ||
        featureBlurb === undefined ||
        featureBlurb.length === 0 ? null : (
          <p className="max-w-prose text-kro-fore-secondary text-sm">
            {featureBlurb}
          </p>
        )}
      </div>

      {status.kind === 'notVotable' ? null : (
        <>
          <CountsPanel
            status={status}
            hasCounts={hasCounts}
            totalCount={totalCount}
            perPlatform={perPlatform}
          />
          <CtaPanel
            status={status}
            isVoting={isVoting}
            voteErrorMessage={voteErrorMessage}
            onVote={onVote}
          />
        </>
      )}
    </section>
  )
}

function CountsPanel({
  status,
  hasCounts,
  totalCount,
  perPlatform,
}: {
  readonly status: ThirstVoteStatus
  readonly hasCounts: boolean
  readonly totalCount: number
  readonly perPlatform: readonly PlatformVoteTally[]
}) {
  if (status.kind === 'loading') {
    return (
      <div
        role="status"
        aria-label="Loading votes"
        className="flex h-16 items-center justify-center"
      >
        <span
          aria-hidden="true"
          className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent"
          style={{ color: colorVar('accent') }}
        />
      </div>
    )
  }

  if (!hasCounts) return null

  return (
    <div className="flex flex-col items-center gap-kro-tiny">
      <span className="font-extrabold text-5xl text-kro-fore tabular-nums">
        {totalCount}
      </span>
      <span className="text-kro-fore-secondary text-sm">
        {totalCount === 1 ? 'person wants this' : 'people want this'}
      </span>
      {perPlatform.length === 0 ? null : (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
          {perPlatform.map((tally) => (
            <PlatformTallyChip key={tally.platform} tally={tally} />
          ))}
        </div>
      )}
    </div>
  )
}

function PlatformTallyChip({ tally }: { readonly tally: PlatformVoteTally }) {
  const PlatformIcon = PLATFORM_ICON[tally.platform]
  return (
    <span
      role="img"
      aria-label={`${votePlatformLabel(tally.platform)}: ${tally.count}`}
      className="inline-flex items-center gap-1 rounded-kro-pill bg-kro-back-inner px-2.5 py-1.5 text-kro-fore-secondary text-xs"
    >
      <PlatformIcon size={12} aria-hidden="true" />
      <span className="font-semibold tabular-nums">{tally.count}</span>
    </span>
  )
}

function CtaPanel({
  status,
  isVoting,
  voteErrorMessage,
  onVote,
}: {
  readonly status: ThirstVoteStatus
  readonly isVoting: boolean
  readonly voteErrorMessage?: string | null
  readonly onVote?: () => void
}) {
  if (status.kind === 'voted') {
    return (
      <KroChip
        title="You voted"
        icon="checkmark.circle.fill"
        tint={{ kind: 'color', role: 'badgeGreen' }}
        emphasis="soft"
      />
    )
  }

  if (status.kind === 'unavailable') {
    return (
      <div className="flex w-full max-w-xs flex-col items-center gap-kro-small">
        <InlineBanner kind="info" message={status.message} />
        <Button
          variant="primary"
          size="lg"
          disabled
          className="w-full max-w-xs"
        >
          <Heart size={ICON_SIZE.medium} aria-hidden="true" />
          Vote to get it sooner
        </Button>
      </div>
    )
  }

  if (status.kind === 'votable' || status.kind === 'loading') {
    return (
      <div className="flex w-full max-w-xs flex-col items-center gap-kro-small">
        <Button
          variant="primary"
          size="lg"
          className="w-full max-w-xs"
          disabled={isVoting || status.kind === 'loading'}
          onClick={onVote}
        >
          {isVoting ? (
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          ) : (
            <Heart size={ICON_SIZE.medium} aria-hidden="true" />
          )}
          Vote to get it sooner
        </Button>
        {voteErrorMessage === null || voteErrorMessage === undefined ? null : (
          <p className="text-xs" style={{ color: colorVar('bannerDanger') }}>
            {voteErrorMessage}
          </p>
        )}
      </div>
    )
  }

  return null
}
