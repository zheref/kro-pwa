/**
 * `CompactPresentationHeader` at the canonical desktop popover widths.
 *
 * The widths are not decoration: `POPOVER_SIZE` in the design system fixes them
 * (Inbox 560×620, Visibility 460×560, Profile 300, Do notifications 380×440),
 * and a header that only looks right at one of them is a header that will look
 * wrong at three.
 */

import { POPOVER_SIZE } from '../system/primitives/popover'
import { CompactPresentationHeader } from './CompactPresentationHeader'
import { BothSchemes, Cell, Stage } from './storyStage'

export default {
  title: 'Endeavor/CompactPresentationHeader',
  component: CompactPresentationHeader,
}

function Panel({
  width,
  children,
}: {
  readonly width: number
  readonly children: React.ReactNode
}) {
  return (
    <div
      style={{
        width,
        overflow: 'hidden',
        borderRadius: 'var(--kro-radius-surface)',
        background: 'var(--kro-color-absolute)',
        boxShadow: 'var(--kro-shadow-card)',
      }}
    >
      {children}
    </div>
  )
}

export const Dismiss = {
  name: 'Dismiss · the Inbox popover width',
  render: () => (
    <Stage>
      <Panel width={POPOVER_SIZE.inbox.width}>
        <CompactPresentationHeader
          title="Inbox"
          subtitle="3 endeavors"
          leadingAction={{ kind: 'dismiss', onPress: () => undefined }}
        />
      </Panel>
    </Stage>
  ),
}

export const Back = {
  name: 'Back · a pushed Triage step',
  render: () => (
    <Stage>
      <Panel width={POPOVER_SIZE.visibility.width}>
        <CompactPresentationHeader
          title="Triage"
          subtitle="Prepare presentation slides"
          leadingAction={{ kind: 'back', onPress: () => undefined }}
        />
      </Panel>
    </Stage>
  ),
}

export const TitleOnly = {
  name: 'Title only · no leading control',
  render: () => (
    <Stage>
      <Cell label="Profile width (300)">
        <Panel width={POPOVER_SIZE.profile.width}>
          <CompactPresentationHeader title="Visibility" />
        </Panel>
      </Cell>
      <Cell label="Do notifications width (380), long title">
        <Panel width={POPOVER_SIZE.doNotifications.width}>
          <CompactPresentationHeader
            title="Reconciliation conflicts across every connected host"
            subtitle="Three endeavors disagree"
            leadingAction={{ kind: 'dismiss', onPress: () => undefined }}
          />
        </Panel>
      </Cell>
    </Stage>
  ),
}

export const BothThemes = {
  name: 'Both schemes',
  render: () => (
    <BothSchemes>
      <Panel width={POPOVER_SIZE.doNotifications.width}>
        <CompactPresentationHeader
          title="Inbox"
          subtitle="3 endeavors"
          leadingAction={{ kind: 'dismiss', onPress: () => undefined }}
        />
      </Panel>
    </BothSchemes>
  ),
}
