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
import { EndeavorActionSurface } from './EndeavorActionSurface'
import { NOW, endeavorCardMocks } from './endeavorMocks'
import { EndeavorRow, endeavorRowPropsFromCardModel } from './EndeavorRow'
import { BothSchemes, Cell, Stage } from './storyStage'

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
