/**
 * The two plans, side by side from `md` and stacked below it. Each card has
 * its price, one promise, what it includes and one door: Free opens the app,
 * Plus — not on sale yet — leads to the landing's early-access form.
 */
import { Check } from 'lucide-react'
import { Button, ICON_SIZE, cn } from '../../../../design'
import { MarketingSection, Reveal } from '../../../../design/marketing'
import { type PricingTier, pricingCopy, pricingTiers } from '../../LandingCopy'
import type { CtaPlacement } from '../../LandingProducer'
import {
  LANDING_SECTION_IDS,
  PRICING_SECTION_IDS,
  headingIdFor,
  landingSectionHref,
} from '../../LandingSections'

export interface PricingTiersSectionProps {
  readonly hubUrl: string
  readonly onOpenHub: (placement: CtaPlacement) => void
  readonly onGetEarlyAccess: (placement: CtaPlacement) => void
}

interface TierCardProps {
  readonly tier: PricingTier
  readonly href: string
  readonly onPress: () => void
}

function TierCard({ tier, href, onPress }: TierCardProps) {
  const featured = tier.id === 'plus'
  const nameId = `tier-${tier.id}-title`
  return (
    <article
      aria-labelledby={nameId}
      data-tier={tier.id}
      className={cn(
        'flex h-full flex-col gap-kro-large rounded-kro-surface border bg-kro-back p-kro-x-large text-kro-fore',
        featured ? 'border-2 border-kro-accent' : 'border-kro-hairline',
      )}
    >
      <header className="grid gap-kro-small">
        <div className="flex flex-wrap items-center justify-between gap-kro-small">
          <h3 id={nameId} className="m-0 font-semibold text-2xl">
            {tier.name}
          </h3>
          <span className="rounded-kro-pill border border-kro-hairline px-kro-small py-kro-tiny font-medium text-kro-fore-secondary text-sm">
            {tier.status}
          </span>
        </div>
        <p className="m-0 flex flex-wrap items-baseline gap-x-kro-small">
          <span className="font-semibold text-5xl tracking-tight">
            {tier.price}
          </span>
          <span className="text-kro-fore-secondary">{tier.cadence}</span>
        </p>
        {tier.alternate === undefined ? null : (
          <p className="m-0 text-kro-fore-secondary">{tier.alternate}</p>
        )}
        <p className="m-0 font-medium">{tier.promise}</p>
      </header>
      <ul className="m-0 grid list-none gap-kro-small p-0">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-kro-small">
            <Check
              aria-hidden="true"
              size={ICON_SIZE.small}
              className="mt-1 shrink-0 text-kro-accent"
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto grid gap-kro-small">
        <Button
          asChild
          variant={featured ? 'secondary' : 'primary'}
          size="lg"
          shape="circular"
        >
          <a href={href} onClick={onPress}>
            {tier.cta}
          </a>
        </Button>
        <p className="m-0 text-kro-fore-secondary text-sm">{tier.ctaNote}</p>
      </div>
    </article>
  )
}

export function PricingTiersSection({
  hubUrl,
  onOpenHub,
  onGetEarlyAccess,
}: PricingTiersSectionProps) {
  const titleId = headingIdFor(PRICING_SECTION_IDS.tiers)
  return (
    <MarketingSection
      id={PRICING_SECTION_IDS.tiers}
      width="default"
      labelledBy={titleId}
    >
      <h2 id={titleId} className="sr-only">
        {pricingCopy.tiersTitle}
      </h2>
      <Reveal className="grid grid-cols-1 items-stretch gap-kro-large md:grid-cols-2">
        {pricingTiers.map((tier) =>
          tier.id === 'free' ? (
            <TierCard
              key={tier.id}
              tier={tier}
              href={hubUrl}
              onPress={() => onOpenHub('pricing')}
            />
          ) : (
            <TierCard
              key={tier.id}
              tier={tier}
              href={landingSectionHref(
                LANDING_SECTION_IDS.earlyAccess,
                'pricing',
              )}
              onPress={() => onGetEarlyAccess('pricing')}
            />
          ),
        )}
      </Reveal>
    </MarketingSection>
  )
}
