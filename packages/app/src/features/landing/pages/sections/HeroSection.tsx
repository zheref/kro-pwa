/**
 * The hero — the page's one `h1`, on the indigo→grape field.
 *
 * Nothing in it animates on load: the copy and both device frames occupy their
 * final boxes from the first paint (explicit width/height), so layout shift is
 * zero. On a phone the composition stacks, phone first; from `md` the phone
 * overlaps the Mac window at its lower right.
 */
import { Button } from '../../../../design'
import {
  MacWindowFrame,
  MarketingSection,
  PhoneFrame,
} from '../../../../design/marketing'
import { heroCopy } from '../../LandingCopy'
import {
  LANDING_SECTION_IDS,
  headingIdFor,
  sectionHref,
} from '../../LandingSections'
import { shotFor } from '../../LandingShots'
import type { CtaPlacement } from '../../LandingProducer'

export interface HeroSectionProps {
  readonly hubUrl: string
  readonly onOpenHub: (placement: CtaPlacement) => void
  readonly onGetEarlyAccess: (placement: CtaPlacement) => void
}

export function HeroSection({
  hubUrl,
  onOpenHub,
  onGetEarlyAccess,
}: HeroSectionProps) {
  const mac = shotFor('webMyDayDesktopDark')
  const phone = shotFor('iosPlanTimeline')
  const titleId = headingIdFor(LANDING_SECTION_IDS.top)
  return (
    <MarketingSection
      id={LANDING_SECTION_IDS.top}
      tone="gradient"
      width="wide"
      labelledBy={titleId}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="kro-hairline-grid absolute inset-0 opacity-30" />
        <span className="kro-glow-blob" style={{ top: '-30%', left: '-12%' }} />
        <span
          className="kro-glow-blob kro-glow-blob--grape"
          style={{ bottom: '-34%', right: '-10%' }}
        />
      </div>
      <div className="relative grid grid-cols-1 items-center gap-kro-xx-large lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="kro-hero-copy grid grid-cols-1 justify-items-start gap-kro-large">
          <p className="kro-eyebrow">{heroCopy.eyebrow}</p>
          <h1 id={titleId} className="kro-display-hero">
            {heroCopy.title}
          </h1>
          <p className="kro-lede">{heroCopy.lede}</p>
          <div className="flex flex-wrap gap-kro-small">
            <Button asChild variant="primary" size="lg" shape="circular">
              <a href={hubUrl} onClick={() => onOpenHub('hero')}>
                {heroCopy.primary}
              </a>
            </Button>
            {/* The secondary keeps its glass ink (fore), not the field's snow:
                light control glass over the gradient cannot carry white. */}
            <Button asChild variant="secondary" size="lg" shape="circular">
              <a
                href={sectionHref(LANDING_SECTION_IDS.earlyAccess)}
                onClick={() => onGetEarlyAccess('hero')}
              >
                {heroCopy.secondary}
              </a>
            </Button>
          </div>
        </div>
        <div className="relative flex flex-col md:block md:pb-12">
          <div className="order-first mx-auto mb-kro-large w-[min(100%,240px)] md:absolute md:right-[2%] md:bottom-0 md:order-none md:mx-0 md:mb-0 md:w-[30%] md:min-w-[180px]">
            <PhoneFrame {...phone} priority />
          </div>
          <div className="md:w-[88%]">
            <MacWindowFrame {...mac} title="Kro" priority />
          </div>
        </div>
      </div>
    </MarketingSection>
  )
}
