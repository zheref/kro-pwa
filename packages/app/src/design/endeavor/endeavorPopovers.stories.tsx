/**
 * The three popover CONTENTS, rendered inline.
 *
 * Inline on purpose. Mounting a Radix popper under jsdom costs seconds — see
 * `system/primitives/__tests__/radixEnvironment.tsx` — so the Vitest suite
 * exercises these panels directly and never through their triggers. Rendering
 * them the same way here keeps the story and the test looking at the same
 * thing, and the anchored behaviour (placement, dismissal, the arrow) is judged
 * on the `EndeavorCard` stories where the triggers actually live.
 */

import {
  DeferPopover,
  DeleteConfirmationPopover,
  MarkCompletePopover,
  defaultDeferTarget,
} from './endeavorPopovers'
import { NOW, endeavorCardMocks } from './endeavorMocks'
import { BothSchemes, Cell, Stage } from './storyStage'

export default {
  title: 'Endeavor/Popovers',
  component: MarkCompletePopover,
}

function Panel({ children }: { readonly children: React.ReactNode }) {
  return (
    <div
      className="kro-glass"
      style={{
        padding: 'var(--kro-space-medium)',
        borderRadius: 'var(--kro-radius-surface)',
      }}
    >
      {children}
    </div>
  )
}

export const MarkComplete = {
  name: 'Mark complete · the backdate picker',
  render: () => (
    <Stage gradient>
      <Cell label="Defaults to now; the user may set an earlier moment">
        <Panel>
          <MarkCompletePopover
            initialDate={NOW}
            onConfirm={() => undefined}
            onCancel={() => undefined}
          />
        </Panel>
      </Cell>
    </Stage>
  ),
}

export const Defer = {
  name: 'Defer · with and without Skip',
  render: () => (
    <Stage gradient>
      <Cell label="From the overflow menu — Skip sits alongside">
        <Panel>
          <DeferPopover
            initialTarget={defaultDeferTarget(endeavorCardMocks.highUrgency.dueTime, NOW)}
            onConfirm={() => undefined}
            onSkip={() => undefined}
          />
        </Panel>
      </Cell>
      <Cell label="From the dedicated Defer button — no Skip">
        <Panel>
          <DeferPopover
            initialTarget={defaultDeferTarget(null, NOW)}
            onConfirm={() => undefined}
          />
        </Panel>
      </Cell>
    </Stage>
  ),
}

export const DeleteConfirmation = {
  name: 'Delete · the confirmation',
  render: () => (
    <Stage gradient>
      <Panel>
        <DeleteConfirmationPopover
          title={endeavorCardMocks.longTitle.title}
          onConfirm={() => undefined}
          onCancel={() => undefined}
        />
      </Panel>
    </Stage>
  ),
}

export const BothThemes = {
  name: 'Both schemes',
  render: () => (
    <BothSchemes gradient>
      <Panel>
        <MarkCompletePopover
          initialDate={NOW}
          onConfirm={() => undefined}
          onCancel={() => undefined}
        />
      </Panel>
    </BothSchemes>
  ),
}
