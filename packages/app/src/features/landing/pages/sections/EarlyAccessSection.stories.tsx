import { MarketingStage } from '../../../../design/marketing/marketingStage'
import {
  EarlyAccessMocks,
  earlyAccessFragmentProps,
} from '../../../earlyAccess/EarlyAccessMocks'
import { EarlyAccessFragment } from '../../../earlyAccess/pages/EarlyAccessFragment'
import { EarlyAccessSection } from './EarlyAccessSection'

/**
 * `EarlyAccessSection` stories — the band around the form, with the form
 * built from `EarlyAccessMocks` (never a store): idle, typing, joined.
 */
export default {
  title: 'Landing/EarlyAccessSection',
  component: EarlyAccessSection,
  parameters: { layout: 'fullscreen' },
}

export const Idle = {
  name: 'Desktop · light · idle form',
  render: () => (
    <MarketingStage>
      <EarlyAccessSection>
        <EarlyAccessFragment
          {...earlyAccessFragmentProps(EarlyAccessMocks.idle)}
        />
      </EarlyAccessSection>
    </MarketingStage>
  ),
}

export const TypingDark = {
  name: 'Desktop · dark · typing',
  render: () => (
    <MarketingStage theme="dark">
      <EarlyAccessSection>
        <EarlyAccessFragment
          {...earlyAccessFragmentProps(EarlyAccessMocks.typing)}
        />
      </EarlyAccessSection>
    </MarketingStage>
  ),
}

export const JoinedPhone = {
  name: 'Phone · 390px · joined',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <EarlyAccessSection>
        <EarlyAccessFragment
          {...earlyAccessFragmentProps(EarlyAccessMocks.joined)}
        />
      </EarlyAccessSection>
    </MarketingStage>
  ),
}
