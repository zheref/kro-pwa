/**
 * `InlineBanner` — the three kinds, with and without a recovery path.
 *
 * The opaque fills are the point. Put the browser in dark mode and the warning
 * and danger banners do not move: their tokens are the same value in both
 * schemes, because a translucent fill's contrast is a property of whatever is
 * behind it and cannot be verified once.
 */

import { InlineBanner } from './InlineBanner'
import { BothSchemes, Cell, Stage } from './storyStage'

export default {
  title: 'Endeavor/InlineBanner',
  component: InlineBanner,
}

export const Kinds = {
  name: 'The three kinds',
  render: () => (
    <Stage width={520}>
      <Cell label="error">
        <InlineBanner message="Google Calendar rejected the change." />
      </Cell>
      <Cell label="warning">
        <InlineBanner
          kind="warning"
          message="This endeavor is past its expiry."
          detail="It will stop appearing in Do at midnight."
        />
      </Cell>
      <Cell label="info">
        <InlineBanner
          kind="info"
          message="This endeavor's kind doesn't support editing performances."
        />
      </Cell>
    </Stage>
  ),
}

export const WithRecovery = {
  name: 'With a recovery action',
  render: () => (
    <Stage width={520}>
      <InlineBanner
        message="Google Calendar rejected the change."
        detail="The event may have been deleted on the host."
        actionTitle="Try again"
        onAction={() => undefined}
      />
    </Stage>
  ),
}

export const LongMessage = {
  name: 'A message that wraps',
  render: () => (
    <Stage width={420}>
      <InlineBanner
        kind="warning"
        message="Rescheduling failed because the quarterly budget reconciliation report needs another department's sign-off before it can be finalized and submitted."
        actionTitle="Open the report"
        onAction={() => undefined}
      />
    </Stage>
  ),
}

export const BothThemes = {
  name: 'Both schemes',
  render: () => (
    <BothSchemes>
      <InlineBanner message="You're offline — this host will sync once you're back online." />
      <InlineBanner kind="warning" message="Two hosts disagree about this endeavor." />
      <InlineBanner kind="info" message="Read-only: this host does not accept edits." />
    </BothSchemes>
  ),
}
