import { Globe, Laptop, Smartphone, Watch } from 'lucide-react'
import { PlatformBadge } from './PlatformBadge'
import { MarketingStage } from './marketingStage'

export default {
  title: 'Marketing/PlatformBadge',
  component: PlatformBadge,
  parameters: { layout: 'fullscreen' },
}

const ROW = { display: 'flex', flexWrap: 'wrap', gap: 12, padding: 24 } as const

export const EveryStatus = {
  name: 'Every status · live, TestFlight, in progress, coming',
  render: () => (
    <MarketingStage>
      <div style={ROW}>
        <PlatformBadge icon={Globe} label="Web" status="live" />
        <PlatformBadge icon={Smartphone} label="iPhone" status="testflight" />
        <PlatformBadge icon={Laptop} label="Mac" status="in-progress" />
        <PlatformBadge icon={Watch} label="Watch" status="coming" />
      </div>
    </MarketingStage>
  ),
}

export const AsLinks = {
  name: 'Links and buttons · in dark',
  render: () => (
    <MarketingStage theme="dark">
      <div style={ROW}>
        <PlatformBadge icon={Globe} label="Web" status="live" href="/my-day" />
        <PlatformBadge
          icon={Smartphone}
          label="iPhone"
          status="testflight"
          onClick={() => undefined}
        />
      </div>
    </MarketingStage>
  ),
}

export const Mobile = {
  name: 'Phone width · wraps',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <div style={ROW}>
        <PlatformBadge icon={Globe} label="Web" status="live" />
        <PlatformBadge icon={Watch} label="Watch" status="coming" />
        <PlatformBadge icon={Laptop} label="Mac" status="in-progress" />
      </div>
    </MarketingStage>
  ),
}
