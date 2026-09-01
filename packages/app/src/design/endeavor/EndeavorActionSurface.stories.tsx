/**
 * `EndeavorActionSurface` — the input duality, isolated from any row.
 *
 * Every story below passes the SAME `capabilities` value. What changes is the
 * `input` prop, and in production even that is a media query rather than a
 * prop. That is the whole claim of acceptance criterion 3, made visible: two
 * grammars, one set of props.
 *
 * To exercise the touch column you have to drag — the surface commits an
 * operation past 140px and parks the buttons open past 56px. The pointer
 * column reveals its strip on hover, and on focus, which is the half a
 * hover-only implementation forgets.
 */

import { EndeavorsVistas } from '@kro/core'
import { useState } from 'react'
import { EndeavorActionSurface } from './EndeavorActionSurface'
import { NOW, endeavorCardMocks } from './endeavorMocks'
import { EndeavorRow, endeavorRowPropsFromCardModel } from './EndeavorRow'
import { BothSchemes, Cell, Stage } from './storyStage'
import type { InputCapability } from './useInputCapability'

export default {
  title: 'Endeavor/EndeavorActionSurface',
  component: EndeavorActionSurface,
  parameters: { layout: 'fullscreen' },
}

const model = endeavorCardMocks.mediumUrgency

function Row() {
  return (
    <EndeavorRow
      {...endeavorRowPropsFromCardModel(model)}
      config="inbox"
      now={NOW}
      locale="en-US"
    />
  )
}

export const Touch = {
  name: 'Touch · swipe surfaces on both edges',
  render: () => (
    <Stage width={520}>
      <Cell label="Drag right for the leading action, left for the trailing ones">
        <EndeavorActionSurface
          endeavorId={model.id}
          capabilities={EndeavorsVistas.planDay.capabilities}
          onOperation={() => undefined}
          input="touch"
          label={model.title}
        >
          <Row />
        </EndeavorActionSurface>
      </Cell>
    </Stage>
  ),
}

export const Pointer = {
  name: 'Pointer · hover strip and right-click menu',
  render: () => (
    <Stage width={520}>
      <Cell label="Hover the row, or tab into it, or right-click it">
        <EndeavorActionSurface
          endeavorId={model.id}
          capabilities={EndeavorsVistas.planDay.capabilities}
          onOperation={() => undefined}
          input="pointer"
          label={model.title}
        >
          <Row />
        </EndeavorActionSurface>
      </Cell>
    </Stage>
  ),
}

export const SideBySide = {
  name: 'Side by side · the same props, twice',
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {(['touch', 'pointer'] as const).map((input) => (
        <Stage key={input}>
          <Cell label={input}>
            <div style={{ width: 420 }}>
              <EndeavorActionSurface
                endeavorId={model.id}
                capabilities={EndeavorsVistas.inbox.capabilities}
                onOperation={() => undefined}
                input={input}
                label={model.title}
              >
                <Row />
              </EndeavorActionSurface>
            </div>
          </Cell>
        </Stage>
      ))}
    </div>
  ),
}

/**
 * The Inbox's own row: two explicit in-row buttons at the trailing edge, wrapped
 * by the surface. This is the arrangement that carried two defects at once —
 * the surface captured the pointer on `pointerdown`, which retargeted the click
 * away from whichever button the tap landed on, and its hover chrome sat
 * exactly on top of them. Both are browser-only, so this story is also the
 * fixture `apps/web/e2e-kit/action-surface.spec.ts` drives in Chromium.
 */
function InboxTrailingButtons({ input }: { readonly input: InputCapability }) {
  const [tapped, setTapped] = useState<readonly string[]>([])

  return (
    <div style={{ width: 460, display: 'grid', gap: 12 }}>
      <EndeavorActionSurface
        endeavorId={model.id}
        capabilities={EndeavorsVistas.inbox.capabilities}
        onOperation={() => undefined}
        input={input}
        label={model.title}
      >
        <EndeavorRow
          {...endeavorRowPropsFromCardModel(model)}
          config="inbox"
          now={NOW}
          locale="en-US"
          trailing={
            <div
              data-testid="inbox-row-buttons"
              style={{ display: 'grid', gap: 8, width: 130 }}
            >
              {['Triage', 'Add for Today'].map((label) => (
                <button
                  key={label}
                  type="button"
                  data-testid={`row-button-${label.replace(/\s+/g, '-')}`}
                  onClick={() => setTapped((all) => [...all, label])}
                  style={{
                    minHeight: 'var(--kro-size-min-touch-target)',
                    borderRadius: 'var(--kro-radius-field)',
                    border: '1px solid var(--kro-color-hairline)',
                    background: 'var(--kro-color-back-inner)',
                    color: 'var(--kro-color-fore)',
                    font: 'inherit',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        />
      </EndeavorActionSurface>

      <p
        data-testid="tap-log"
        style={{ margin: 0, color: 'var(--kro-color-fore-secondary)' }}
      >
        {tapped.length === 0 ? 'No button tapped yet' : tapped.join(', ')}
      </p>
    </div>
  )
}

export const TouchWithTrailingButtons = {
  name: 'Touch · in-row buttons must still fire',
  render: () => (
    <Stage width={520}>
      <Cell label="Tap Triage. A swipe still swipes; a tap must reach the button.">
        <InboxTrailingButtons input="touch" />
      </Cell>
    </Stage>
  ),
}

export const PointerWithTrailingButtons = {
  name: 'Pointer · the chrome gets its own gutter',
  render: () => (
    <Stage width={560}>
      <Cell label="Hover the row: the strip and the ⋯ trigger sit BESIDE the buttons, not on them.">
        <InboxTrailingButtons input="pointer" />
      </Cell>
    </Stage>
  ),
}

export const BothThemes = {
  name: 'Both schemes',
  render: () => (
    <BothSchemes>
      <div style={{ width: 400 }}>
        <EndeavorActionSurface
          endeavorId={model.id}
          capabilities={EndeavorsVistas.inbox.capabilities}
          onOperation={() => undefined}
          input="pointer"
          label={model.title}
        >
          <Row />
        </EndeavorActionSurface>
      </div>
    </BothSchemes>
  ),
}
