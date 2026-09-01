/**
 * `EmptyStateCard` — the inset a grouped card shows instead of nothing.
 *
 * Read it against the row it replaced: a property whose value happens to be
 * blank tells the user their data is missing; an empty state tells them what
 * the thing is and offers the action that fills it.
 */

import { EmptyStateCard } from './EmptyStateCard'
import { SurfaceCard } from './SurfaceCard'
import { BothSchemes, Stage } from './storyStage'

export default {
  title: 'Endeavor/EmptyStateCard',
  component: EmptyStateCard,
}

export const TitleOnly = {
  name: 'Title only',
  render: () => (
    <Stage width={460}>
      <SurfaceCard>
        <EmptyStateCard
          icon="clock.arrow.circlepath"
          title="No performances yet"
        />
      </SurfaceCard>
    </Stage>
  ),
}

export const WithMessage = {
  name: 'With a message',
  render: () => (
    <Stage width={460}>
      <SurfaceCard>
        <EmptyStateCard
          icon="arrow.uturn.forward.circle"
          title="Never deferred"
          message="Defers appear here each time you push this endeavor's due date back."
        />
      </SurfaceCard>
    </Stage>
  ),
}

export const WithAction = {
  name: 'With the action that fills it',
  render: () => (
    <Stage width={460}>
      <SurfaceCard>
        <EmptyStateCard
          icon="network"
          title="Not mirrored anywhere"
          message="Attach a calendar or reminders account to keep this endeavor in sync."
          actionTitle="Attach a host"
          onAction={() => undefined}
        />
      </SurfaceCard>
    </Stage>
  ),
}

export const BothThemes = {
  name: 'Both schemes',
  render: () => (
    <BothSchemes>
      <SurfaceCard>
        <EmptyStateCard
          icon="tray"
          title="Nothing to triage"
          message="Captured endeavors land here first."
          actionTitle="Capture something"
          onAction={() => undefined}
        />
      </SurfaceCard>
    </BothSchemes>
  ),
}
