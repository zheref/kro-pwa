/**
 * The two corner pills, on their own.
 *
 * The scheme story is the one worth looking at twice: both fills are
 * NON-ADAPTIVE by canon (`AthensGray`, `ScotchMist` have one value each), so
 * the pills stay light chips on a dark card. That is deliberate parity, and it
 * is the reason their labels are fixed-value dark roles rather than the badge
 * palette — see the contrast note at the top of `CardBadge.tsx`.
 */

import { CardBadge, RewardBadge, UrgencyBadge } from './CardBadge'
import { endeavorUrgencies } from './endeavorCardModel'
import { BothSchemes, Cell, Stage } from './storyStage'

export default {
  title: 'Endeavor/CardBadge',
  component: CardBadge,
}

export const Urgency = {
  name: 'Urgency · all three levels',
  render: () => (
    <Stage>
      <div style={{ display: 'flex', gap: 12 }}>
        {endeavorUrgencies.map((urgency) => (
          <Cell key={urgency} label={urgency}>
            <UrgencyBadge urgency={urgency} />
          </Cell>
        ))}
      </div>
    </Stage>
  ),
}

export const CompactUrgency = {
  name: 'Urgency · the circle form used on small cards',
  render: () => (
    <Stage>
      <div style={{ display: 'flex', gap: 12 }}>
        {endeavorUrgencies.map((urgency) => (
          <Cell key={urgency} label={urgency}>
            <UrgencyBadge urgency={urgency} compact />
          </Cell>
        ))}
      </div>
    </Stage>
  ),
}

export const Reward = {
  name: 'Reward · bolt plus amount',
  render: () => (
    <Stage>
      <div style={{ display: 'flex', gap: 12 }}>
        {[5, 10, 30, 120, 9999].map((amount) => (
          <Cell key={amount} label={`⚡${amount}`}>
            <RewardBadge amount={amount} />
          </Cell>
        ))}
      </div>
    </Stage>
  ),
}

export const BothThemes = {
  name: 'Both schemes · the pills do not flip',
  render: () => (
    <BothSchemes>
      <div style={{ display: 'flex', gap: 8 }}>
        {endeavorUrgencies.map((urgency) => (
          <UrgencyBadge key={urgency} urgency={urgency} />
        ))}
        <RewardBadge amount={50} />
      </div>
    </BothSchemes>
  ),
}
