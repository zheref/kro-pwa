/**
 * Focus — the Session, its Pill, the Lock Screen Live Activity and the Watch.
 * Subtle tone: one step recessed, so the product shots carry the weight.
 */
import { Layers, Smartphone, Timer, Watch } from 'lucide-react'
import { ICON_SIZE } from '../../../../design'
import {
  MarketingSection,
  PhoneFrame,
  Reveal,
  SectionHeader,
  WatchFrame,
} from '../../../../design/marketing'
import { focusCopy } from '../../LandingCopy'
import { LANDING_SECTION_IDS, headingIdFor } from '../../LandingSections'
import { shotFor } from '../../LandingShots'

const BLOCKS = [
  { icon: Timer, ...focusCopy.modes },
  { icon: Layers, ...focusCopy.pill },
  { icon: Smartphone, ...focusCopy.liveActivity },
  { icon: Watch, ...focusCopy.watch },
] as const

export function FocusSection() {
  const titleId = headingIdFor(LANDING_SECTION_IDS.focus)
  const live = shotFor('iosLiveActivityRunning')
  return (
    <MarketingSection
      id={LANDING_SECTION_IDS.focus}
      tone="subtle"
      width="wide"
      labelledBy={titleId}
    >
      <SectionHeader
        eyebrow={focusCopy.eyebrow}
        title={focusCopy.title}
        lede={focusCopy.lede}
        headingId={titleId}
      />
      <div className="grid grid-cols-1 items-center gap-kro-xx-large lg:grid-cols-2">
        <Reveal
          as="ul"
          className="m-0 grid grid-cols-1 list-none gap-kro-large p-0"
        >
          {BLOCKS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-kro-medium">
              <span
                aria-hidden="true"
                className="mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-kro-field border border-kro-hairline text-kro-accent"
              >
                <Icon size={ICON_SIZE.medium} />
              </span>
              <div>
                <h3 className="m-0 font-semibold text-kro-fore text-lg">
                  {title}
                </h3>
                <p className="m-0 mt-1 text-kro-fore-secondary">{body}</p>
              </div>
            </li>
          ))}
        </Reveal>
        <Reveal className="grid grid-cols-1 justify-items-center gap-kro-x-large">
          <div className="flex items-end justify-center gap-kro-large">
            <div className="w-[min(60vw,260px)]">
              <PhoneFrame {...shotFor('iosSessionRunning')} />
            </div>
            <div className="w-[min(30vw,150px)]">
              <WatchFrame {...shotFor('watchosFeatured')} />
            </div>
          </div>
          <figure className="m-0 w-full max-w-[420px]">
            <img
              src={live.src}
              width={live.width}
              height={live.height}
              alt={live.alt}
              loading="lazy"
              decoding="async"
              className="block h-auto w-full rounded-kro-surface border border-kro-hairline shadow-kro-card"
            />
          </figure>
        </Reveal>
      </div>
    </MarketingSection>
  )
}
