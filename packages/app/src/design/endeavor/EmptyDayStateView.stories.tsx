/**
 * The two full-surface empty states.
 *
 * `EmptyDayStateView` belongs on the gradient — its whole palette is
 * white-on-translucent-dark, so on a flat page it is unreadable by design, and
 * the story puts it where it lives. `InboxTrayEmptyState` belongs under a pinned
 * header, which the third story supplies so the vertical centring can be judged.
 */

import { CompactPresentationHeader } from './CompactPresentationHeader'
import { EmptyDayStateView, InboxTrayEmptyState } from './EmptyDayStateView'
import { BothSchemes, Stage } from './storyStage'

export default {
  title: 'Endeavor/Empty states',
  component: EmptyDayStateView,
  parameters: { layout: 'fullscreen' },
}

export const DoPromotion = {
  name: 'Do tab · the first-launch promotion inset',
  render: () => (
    <Stage gradient>
      <EmptyDayStateView onCreateEndeavor={() => undefined} />
    </Stage>
  ),
}

export const PromotionWithoutAction = {
  name: 'Do tab · read-only, no CTA',
  render: () => (
    <Stage gradient>
      <EmptyDayStateView
        title="Nothing scheduled"
        message="Your day is clear. Connect a calendar to see what is already booked."
      />
    </Stage>
  ),
}

export const InboxTray = {
  name: 'Inbox tray · pinned header, centred illustration',
  render: () => (
    <Stage>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 380,
          height: 440,
          overflow: 'hidden',
          borderRadius: 'var(--kro-radius-surface)',
          background: 'var(--kro-color-absolute)',
          boxShadow: 'var(--kro-shadow-card)',
        }}
      >
        <CompactPresentationHeader
          title="Inbox"
          subtitle="0 endeavors"
          leadingAction={{ kind: 'dismiss', onPress: () => undefined }}
        />
        <InboxTrayEmptyState />
      </div>
    </Stage>
  ),
}

export const BothThemes = {
  name: 'Both schemes',
  render: () => (
    <BothSchemes>
      <div style={{ display: 'flex', height: 260, width: '100%' }}>
        <InboxTrayEmptyState />
      </div>
    </BothSchemes>
  ),
}
