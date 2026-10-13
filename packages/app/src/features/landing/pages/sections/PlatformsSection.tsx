/**
 * Platforms — what is live, what is on TestFlight, what is on the way — and the
 * vote for what to build next. Statuses are the product's honest ones; there
 * are no download counts because there is nothing to count.
 */
import type { KroPlatform } from '@kro/core'
import {
  type LucideIcon,
  Globe,
  Laptop,
  Monitor,
  Smartphone,
  Tablet,
  Watch,
} from 'lucide-react'
import { Button } from '../../../../design'
import {
  FeatureCard,
  MacWindowFrame,
  MarketingSection,
  PhoneFrame,
  PlatformBadge,
  Reveal,
  SectionHeader,
  TabletFrame,
  WatchFrame,
} from '../../../../design/marketing'
import { platformCards, platformsCopy } from '../../LandingCopy'
import type { CtaPlacement } from '../../LandingProducer'
import { LANDING_SECTION_IDS, headingIdFor } from '../../LandingSections'
import { shotFor } from '../../LandingShots'

/**
 * Every device at the same scale, so their sizes read true against each other
 * (an iPhone is 390 pt wide, an iPad 820, the Watch 198, the web window 1440).
 */
const DEVICE_SCALE = 0.28

function labelOf(platform: KroPlatform): string {
  return platformCards.find((card) => card.platform === platform)?.label ?? ''
}

const ICONS: Record<KroPlatform, LucideIcon> = {
  ios: Smartphone,
  ipados: Tablet,
  macos: Laptop,
  watchos: Watch,
  web: Globe,
  android: Smartphone,
  windows: Monitor,
}

export interface PlatformsSectionProps {
  readonly hubUrl: string
  /** A TestFlight badge was pressed: pre-select that platform in the form. */
  readonly onPickPlatform: (platform: KroPlatform) => void
  /** A vote button was pressed. */
  readonly onVotePlatform: (platform: KroPlatform) => void
  readonly onOpenHub: (placement: CtaPlacement) => void
}

export function PlatformsSection({
  hubUrl,
  onPickPlatform,
  onVotePlatform,
  onOpenHub,
}: PlatformsSectionProps) {
  const titleId = headingIdFor(LANDING_SECTION_IDS.platforms)
  const voteTitleId = `${LANDING_SECTION_IDS.platforms}-vote-title`
  const votable = platformCards.filter(
    (card) => card.status === 'in-progress' || card.status === 'coming',
  )
  return (
    <MarketingSection
      id={LANDING_SECTION_IDS.platforms}
      width="wide"
      labelledBy={titleId}
    >
      <SectionHeader
        eyebrow={platformsCopy.eyebrow}
        title={platformsCopy.title}
        lede={platformsCopy.lede}
        headingId={titleId}
      />
      <Reveal>
        <ul className="m-0 mb-kro-xx-large flex list-none flex-wrap gap-kro-small p-0">
          {platformCards.map((card) => (
            <li key={card.platform}>
              {card.status === 'live' ? (
                <PlatformBadge
                  icon={ICONS[card.platform]}
                  label={card.label}
                  status={card.status}
                  href={hubUrl}
                  onClick={() => onOpenHub('platforms')}
                />
              ) : card.status === 'testflight' ? (
                <PlatformBadge
                  icon={ICONS[card.platform]}
                  label={card.label}
                  status={card.status}
                  onClick={() => onPickPlatform(card.platform)}
                />
              ) : (
                <PlatformBadge
                  icon={ICONS[card.platform]}
                  label={card.label}
                  status={card.status}
                />
              )}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal
        as="div"
        className="mb-kro-xx-large flex flex-wrap items-end justify-center gap-x-kro-xx-large gap-y-kro-x-large"
      >
        <figure className="m-0 grid min-w-0 max-w-full grid-cols-1 justify-items-center gap-kro-small">
          <MacWindowFrame
            {...shotFor('webMyDayDesktopLight')}
            scale={DEVICE_SCALE}
          />
          <figcaption className="font-medium text-kro-fore text-sm">
            {labelOf('web')}
          </figcaption>
        </figure>
        <figure className="m-0 grid min-w-0 max-w-full grid-cols-1 justify-items-center gap-kro-small">
          <TabletFrame {...shotFor('ipadosSidebar')} scale={DEVICE_SCALE} />
          <figcaption className="font-medium text-kro-fore text-sm">
            {labelOf('ipados')}
          </figcaption>
        </figure>
        <figure className="m-0 grid min-w-0 max-w-full grid-cols-1 justify-items-center gap-kro-small">
          <PhoneFrame
            {...shotFor('iosDoPopulatedLanes')}
            scale={DEVICE_SCALE}
          />
          <figcaption className="font-medium text-kro-fore text-sm">
            {labelOf('ios')}
          </figcaption>
        </figure>
        <figure className="m-0 grid min-w-0 max-w-full grid-cols-1 justify-items-center gap-kro-small">
          <PhoneFrame
            {...shotFor('androidDayProgress')}
            platform="android"
            scale={DEVICE_SCALE}
          />
          <figcaption className="font-medium text-kro-fore text-sm">
            {labelOf('android')}
          </figcaption>
        </figure>
        <figure className="m-0 grid min-w-0 max-w-full grid-cols-1 justify-items-center gap-kro-small">
          <WatchFrame {...shotFor('watchosFeatured')} scale={DEVICE_SCALE} />
          <figcaption className="font-medium text-kro-fore text-sm">
            {labelOf('watchos')}
          </figcaption>
        </figure>
      </Reveal>
      <Reveal className="grid grid-cols-1 gap-kro-large sm:grid-cols-2 lg:grid-cols-3">
        {platformCards.map((card) => (
          <FeatureCard
            key={card.platform}
            icon={ICONS[card.platform]}
            title={card.label}
            body={card.body}
            accentRole={card.status === 'live' ? 'focusGreen' : 'accent'}
          />
        ))}
      </Reveal>
      <Reveal
        as="div"
        className="mt-kro-xx-large grid gap-kro-medium rounded-kro-surface border border-kro-hairline p-kro-large"
      >
        <h3
          id={voteTitleId}
          className="m-0 font-semibold text-kro-fore text-xl"
        >
          {platformsCopy.voteHint}
        </h3>
        <div
          role="group"
          aria-labelledby={voteTitleId}
          className="flex flex-wrap gap-kro-small"
        >
          {votable.map((card) => (
            <Button
              key={card.platform}
              variant="secondary"
              size="lg"
              shape="circular"
              onClick={() => onVotePlatform(card.platform)}
            >
              {platformsCopy.voteLabel} {card.label}
            </Button>
          ))}
        </div>
      </Reveal>
    </MarketingSection>
  )
}
