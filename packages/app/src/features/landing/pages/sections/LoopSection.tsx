/**
 * "A day, resolved." — capture → triage → plan → do → earn as five chapters.
 * Every image is a mock-fixture render from the catalog, with its real alt.
 */
import {
  MacWindowFrame,
  MarketingSection,
  PhoneFrame,
  SectionHeader,
} from '../../../../design/marketing'
import { loopChapters, loopCopy } from '../../LandingCopy'
import { LANDING_SECTION_IDS, headingIdFor } from '../../LandingSections'
import { shotFor } from '../../LandingShots'
import { Chapter } from './Chapter'

const PHONE_COLUMN = 'mx-auto w-full max-w-[300px]'

function chapter(id: string) {
  const found = loopChapters.find((entry) => entry.id === id)
  if (found === undefined) throw new Error(`no loop chapter named ${id}`)
  return found
}

export function LoopSection() {
  const titleId = headingIdFor(LANDING_SECTION_IDS.loop)
  return (
    <MarketingSection
      id={LANDING_SECTION_IDS.loop}
      width="wide"
      labelledBy={titleId}
    >
      <SectionHeader
        eyebrow={loopCopy.eyebrow}
        title={loopCopy.title}
        lede={loopCopy.lede}
        headingId={titleId}
      />
      <Chapter {...chapter('capture')}>
        <div className={PHONE_COLUMN}>
          <PhoneFrame {...shotFor('iosInbox')} />
        </div>
      </Chapter>
      <Chapter {...chapter('triage')} flip>
        <div className={PHONE_COLUMN}>
          <PhoneFrame {...shotFor('iosTriagePrioritize')} />
        </div>
      </Chapter>
      <Chapter {...chapter('plan')}>
        <div className="flex items-start justify-center gap-kro-large">
          <div className="w-[46%] max-w-[240px]">
            <PhoneFrame {...shotFor('iosPlanTimeline')} />
          </div>
          <div className="mt-kro-xx-large w-[46%] max-w-[240px]">
            <PhoneFrame {...shotFor('iosPlanMatrix')} />
          </div>
        </div>
      </Chapter>
      <Chapter {...chapter('do')} flip>
        <div className="flex items-end justify-center gap-kro-medium">
          <div className="w-[68%]">
            <MacWindowFrame {...shotFor('webMyDayDesktopDark')} title="Kro" />
          </div>
          <div className="w-[28%] max-w-[170px]">
            <PhoneFrame {...shotFor('iosDoPopulatedLanes')} />
          </div>
        </div>
      </Chapter>
      <Chapter {...chapter('earn')}>
        <div className="flex items-start justify-center gap-kro-large">
          <div className="w-[46%] max-w-[240px]">
            <PhoneFrame
              {...shotFor('androidEarnCelebrating')}
              platform="android"
            />
          </div>
          <div className="mt-kro-xx-large w-[46%] max-w-[240px]">
            <PhoneFrame {...shotFor('iosDayProgress')} />
          </div>
        </div>
      </Chapter>
    </MarketingSection>
  )
}
