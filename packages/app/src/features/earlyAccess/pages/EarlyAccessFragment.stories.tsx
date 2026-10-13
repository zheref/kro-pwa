import { MarketingStage } from '../../../design/marketing/marketingStage'
import { EarlyAccessMocks, earlyAccessFragmentProps } from '../EarlyAccessMocks'
import { EarlyAccessFragment } from './EarlyAccessFragment'

/**
 * `EarlyAccessFragment` stories — one per state the render tests mirror
 * (`EarlyAccessFragment.test.tsx`), all from `EarlyAccessMocks`.
 */
export default {
  title: 'Landing/EarlyAccessFragment',
  component: EarlyAccessFragment,
  parameters: { layout: 'fullscreen' },
}

const frame = (
  state: typeof EarlyAccessMocks.idle,
  theme: 'light' | 'dark' = 'light',
) => (
  <MarketingStage theme={theme} width={560}>
    <div style={{ padding: 24 }}>
      <EarlyAccessFragment {...earlyAccessFragmentProps(state)} />
    </div>
  </MarketingStage>
)

export const Idle = { name: 'Idle', render: () => frame(EarlyAccessMocks.idle) }
export const Typing = {
  name: 'Typing',
  render: () => frame(EarlyAccessMocks.typing),
}
export const TypingInvalid = {
  name: 'Email left, not valid',
  render: () => frame(EarlyAccessMocks.typingInvalid),
}
export const Submitting = {
  name: 'Submitting',
  render: () => frame(EarlyAccessMocks.submitting),
}
export const Joined = {
  name: 'Joined',
  render: () => frame(EarlyAccessMocks.joined),
}
export const JoinedDark = {
  name: 'Joined · dark',
  render: () => frame(EarlyAccessMocks.joined, 'dark'),
}
export const FailedInvalid = {
  name: 'Failed · invalid email',
  render: () => frame(EarlyAccessMocks.failedInvalid),
}
export const FailedAlreadyJoined = {
  name: 'Failed · already on the list',
  render: () => frame(EarlyAccessMocks.failedAlreadyJoined),
}
export const FailedOffline = {
  name: 'Failed · offline',
  render: () => frame(EarlyAccessMocks.failedOffline),
}
export const FailedUnavailable = {
  name: 'Failed · unavailable',
  render: () => frame(EarlyAccessMocks.failedUnavailable, 'dark'),
}
