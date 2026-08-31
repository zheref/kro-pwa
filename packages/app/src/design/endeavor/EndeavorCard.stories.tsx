/**
 * `EndeavorCard`, on the surfaces it actually ships on.
 *
 * The first story is THE BADGE MATRIX — urgency × reward × mode, the grid
 * `docs/Features/EndeavorCard.md` calls the cross-platform reference. Read it
 * left to right and every rule in the spec is visible at once: the Low column
 * has no pill, the reward pill is in every cell, the Medium column carries the
 * floating warning at (−6, −6), and the mark-complete row puts the check or
 * skip at (14, −8) with the card tilted.
 *
 * What the stories are evidence OF, and what they are not: they prove the
 * geometry, the composition and the token wiring. Motion (the wiggle's period,
 * the settle on exit) and the Radix panels (the backdate popover, the overflow
 * menu) are browser answers — open them here, because the Vitest suite
 * deliberately does not mount a Radix popper under jsdom (see
 * `system/primitives/__tests__/radixEnvironment.tsx` for the measured reason).
 */

import { useState } from 'react'
import { EndeavorCard } from './EndeavorCard'
import type { EndeavorCardSize } from './EndeavorCard'
import { EndeavorUrgency } from './endeavorCardModel'
import type { EndeavorCardModel } from './endeavorCardModel'
import { NOW, endeavorCardMocks } from './endeavorMocks'
import { BothSchemes, Cell, Stage } from './storyStage'

export default {
  title: 'Endeavor/EndeavorCard',
  component: EndeavorCard,
  parameters: { layout: 'fullscreen' },
}

const MATRIX_URGENCIES = [
  EndeavorUrgency.low,
  EndeavorUrgency.medium,
  EndeavorUrgency.high,
] as const

function matrixModel(
  urgency: EndeavorUrgency,
  reward: number,
  isEvent: boolean,
): EndeavorCardModel {
  return {
    ...endeavorCardMocks.mediumUrgency,
    id: `${urgency}-${reward}-${isEvent}`,
    urgency,
    reward,
    isEvent,
    showWarning: urgency === EndeavorUrgency.medium,
    symbol: isEvent ? '🤝' : '💻',
    title: isEvent ? 'Team sync meeting' : 'Review pull request',
  }
}

export const BadgeMatrix = {
  name: 'Badge matrix · urgency × reward × mode',
  render: () => (
    <Stage gradient>
      {(
        [
          ['Do mode', false],
          ['Mark-complete mode', true],
        ] as const
      ).map(([modeLabel, markComplete]) => (
        <div key={modeLabel} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: 15 }}>{modeLabel}</h3>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {MATRIX_URGENCIES.map((urgency) =>
              [10, 120].map((reward) =>
                [false, true].map((isEvent) => (
                  <Cell
                    key={`${urgency}-${reward}-${isEvent}`}
                    label={`${urgency} · ⚡${reward} · ${isEvent ? 'event' : 'task'}`}
                  >
                    <EndeavorCard
                      model={matrixModel(urgency, reward, isEvent)}
                      now={NOW}
                      locale="en-US"
                      isInMarkCompleteMode={markComplete}
                    />
                  </Cell>
                )),
              ),
            )}
          </div>
        </div>
      ))}
    </Stage>
  ),
}

export const Sizes = {
  name: 'Vertical · small / medium / large',
  render: () => (
    <Stage gradient>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
        {(['small', 'medium', 'large'] as const).map((size: EndeavorCardSize) => (
          <Cell key={size} label={size}>
            <EndeavorCard
              model={endeavorCardMocks.highUrgency}
              size={size}
              now={NOW}
              locale="en-US"
              cardSize={
                size === 'small'
                  ? { width: 130, height: 170 }
                  : size === 'large'
                    ? { width: 200, height: 240 }
                    : undefined
              }
            />
          </Cell>
        ))}
      </div>
    </Stage>
  ),
}

export const PreparationOverlay = {
  name: 'Prepare on tap · the action overlay',
  render: () => {
    function Demo() {
      const [selectedId, setSelectedId] = useState<string | null>(null)
      const models = [
        endeavorCardMocks.highUrgency,
        endeavorCardMocks.event,
        endeavorCardMocks.longTitle,
      ]
      return (
        <Stage gradient>
          <p style={{ margin: 0, color: 'rgb(255 255 255 / 0.8)', fontSize: 13 }}>
            Tap a card to prepare it. The content blurs behind the action stack;
            an event card offers Skip where a task offers the backdate check.
          </p>
          <div style={{ display: 'flex', gap: 16 }}>
            {models.map((model) => (
              <EndeavorCard
                key={model.id}
                model={model}
                now={NOW}
                locale="en-US"
                size="large"
                cardSize={{ width: 200, height: 240 }}
                isSelected={selectedId === model.id}
                onPrepare={(id) => setSelectedId((current) => (current === id ? null : id))}
                onExecute={() => undefined}
                onMarkComplete={() => undefined}
                onSkip={() => undefined}
                onDefer={() => undefined}
                onDelegate={() => undefined}
                onShowDetails={() => undefined}
                onDelete={() => undefined}
              />
            ))}
          </div>
        </Stage>
      )
    }
    return <Demo />
  },
}

export const HorizontalLayout = {
  name: 'Horizontal · the full-width row (min-height 100)',
  render: () => (
    <Stage gradient>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
        {[
          endeavorCardMocks.mediumUrgency,
          endeavorCardMocks.overdue,
          endeavorCardMocks.event,
          endeavorCardMocks.bare,
        ].map((model) => (
          <EndeavorCard
            key={model.id}
            model={model}
            layout="horizontal"
            now={NOW}
            locale="en-US"
          />
        ))}
      </div>
    </Stage>
  ),
}

export const MarkCompleteMode = {
  name: 'Mark-complete mode · wiggle + corner glyph',
  render: () => (
    <Stage gradient>
      <p style={{ margin: 0, color: 'rgb(255 255 255 / 0.8)', fontSize: 13 }}>
        The cards tilt ±0.35° on a 0.32s half-period. Turn on Reduce Motion and
        reload: the tilt stops and the cards settle to exactly 0°.
      </p>
      <div style={{ display: 'flex', gap: 20 }}>
        <EndeavorCard
          model={endeavorCardMocks.highUrgency}
          now={NOW}
          locale="en-US"
          isInMarkCompleteMode
          onMarkComplete={() => undefined}
        />
        <EndeavorCard
          model={endeavorCardMocks.event}
          now={NOW}
          locale="en-US"
          isInMarkCompleteMode
          onSkip={() => undefined}
        />
      </div>
      <div style={{ width: '100%' }}>
        <EndeavorCard
          model={endeavorCardMocks.mediumUrgency}
          layout="horizontal"
          now={NOW}
          locale="en-US"
          isInMarkCompleteMode
          onMarkComplete={() => undefined}
        />
      </div>
    </Stage>
  ),
}

export const BothThemes = {
  name: 'Both schemes',
  render: () => (
    <BothSchemes>
      <EndeavorCard
        model={endeavorCardMocks.mediumUrgency}
        now={NOW}
        locale="en-US"
      />
      <div style={{ width: '100%' }}>
        <EndeavorCard
          model={endeavorCardMocks.unicode}
          layout="horizontal"
          now={NOW}
          locale="en-US"
        />
      </div>
    </BothSchemes>
  ),
}
