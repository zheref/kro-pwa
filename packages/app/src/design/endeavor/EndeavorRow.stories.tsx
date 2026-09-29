/**
 * `EndeavorRow`, in its four canon presets and in both input grammars.
 *
 * The `InputDuality` story is the one to read against acceptance criterion 3:
 * the two columns are the SAME `capabilities` prop rendered twice. On the left
 * (touch) the bindings are swipe surfaces — drag a row sideways. On the right
 * (pointer) the same bindings are a hover strip and a right-click menu. Nothing
 * about the props differs between the columns; only `input` does, and in
 * production even that is answered by a media query.
 */

import { EndeavorsVistas } from '@kro/core'
import { EndeavorRow, endeavorRowPropsFromCardModel } from './EndeavorRow'
import type { EndeavorRowConfigName } from './EndeavorRow'
import { NOW, endeavorCardMocks } from './endeavorMocks'
import { BothSchemes, Cell, Stage } from './storyStage'
import { StoryGallery } from '../storybook/storyGallery'

export default {
  title: 'Endeavor/EndeavorRow',
  component: EndeavorRow,
  parameters: { layout: 'fullscreen' },
}

const CONFIGS: readonly EndeavorRowConfigName[] = [
  'default',
  'inbox',
  'compactDesktopInbox',
  'find',
]

const Presets = {
  name: 'The four canon presets',
  render: () => (
    <Stage>
      {CONFIGS.map((config) => (
        <Cell key={config} label={config}>
          <div style={{ width: 520 }}>
            <EndeavorRow
              {...endeavorRowPropsFromCardModel(
                endeavorCardMocks.mediumUrgency,
              )}
              config={config}
              now={NOW}
              locale="en-US"
            />
          </div>
        </Cell>
      ))}
    </Stage>
  ),
}

const FindPills = {
  name: 'Find · kind and status pills on the trailing edge',
  render: () => (
    <Stage>
      <div
        style={{
          width: 560,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <EndeavorRow
          symbol="📊"
          title="Prepare quarterly slides"
          timeInfo={{
            kind: 'dueTime',
            date: endeavorCardMocks.highUrgency.dueTime ?? NOW,
            duration: 2700,
          }}
          badges={[
            { kind: 'endeavorKind', value: 'task' },
            { kind: 'status', value: 'pending' },
          ]}
          config="find"
          now={NOW}
          locale="en-US"
        />
        <EndeavorRow
          symbol="calendar"
          isGenericSymbol
          title="Team sync meeting"
          timeInfo={{
            kind: 'timeRange',
            start: new Date(NOW.getTime() + 7_200_000),
            end: new Date(NOW.getTime() + 10_800_000),
          }}
          badges={[
            { kind: 'endeavorKind', value: 'calendarEvent' },
            { kind: 'status', value: 'planned' },
          ]}
          config="find"
          now={NOW}
          locale="en-US"
        />
        <EndeavorRow
          symbol="📚"
          title="Read the design-system PR"
          timeInfo={{ kind: 'duration', seconds: 900 }}
          badges={[
            { kind: 'endeavorKind', value: 'habit' },
            { kind: 'status', value: 'closed' },
          ]}
          config="find"
          now={NOW}
          locale="en-US"
        />
      </div>
    </Stage>
  ),
}

const InboxWithTrailingActions = {
  name: 'Inbox · trailing action buttons',
  render: () => (
    <Stage>
      <div
        style={{
          width: 560,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {[endeavorCardMocks.highUrgency, endeavorCardMocks.lowUrgency].map(
          (model) => (
            <EndeavorRow
              key={model.id}
              {...endeavorRowPropsFromCardModel(model)}
              config="inbox"
              now={NOW}
              locale="en-US"
              trailing={
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    style={{
                      minHeight: 'var(--kro-size-min-touch-target)',
                      padding: '0 12px',
                      borderRadius: 'var(--kro-radius-pill)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--kro-color-badge-blue)',
                      background:
                        'color-mix(in srgb, var(--kro-color-badge-blue) 15%, transparent)',
                    }}
                  >
                    Triage
                  </button>
                  <button
                    type="button"
                    style={{
                      minHeight: 'var(--kro-size-min-touch-target)',
                      padding: '0 12px',
                      borderRadius: 'var(--kro-radius-pill)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--kro-color-badge-green)',
                      background:
                        'color-mix(in srgb, var(--kro-color-badge-green) 15%, transparent)',
                    }}
                  >
                    Add for Today
                  </button>
                </div>
              }
            />
          ),
        )}
      </div>
    </Stage>
  ),
}

const InputDuality = {
  name: 'Input duality · one capability set, two grammars',
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {(['touch', 'pointer'] as const).map((input) => (
        <Stage key={input}>
          <Cell
            label={
              input === 'touch'
                ? 'touch — drag a row sideways'
                : 'pointer — hover the row, or right-click it'
            }
          >
            <div
              style={{
                width: 460,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {[endeavorCardMocks.mediumUrgency, endeavorCardMocks.overdue].map(
                (model) => (
                  <EndeavorRow
                    key={model.id}
                    {...endeavorRowPropsFromCardModel(model)}
                    config="inbox"
                    now={NOW}
                    locale="en-US"
                    endeavorId={model.id}
                    capabilities={EndeavorsVistas.planDay.capabilities}
                    onOperation={() => undefined}
                    input={input}
                  />
                ),
              )}
            </div>
          </Cell>
        </Stage>
      ))}
    </div>
  ),
}

const BothThemes = {
  name: 'Both schemes',
  render: () => (
    <BothSchemes>
      <div style={{ width: 420 }}>
        <EndeavorRow
          {...endeavorRowPropsFromCardModel(endeavorCardMocks.unicode)}
          config="default"
          now={NOW}
          locale="en-US"
        />
      </div>
    </BothSchemes>
  ),
}

/** The footer slot — the pane Inbox's actions, inside the card under the title. */
const WithFooter = {
  render: () => (
    <div style={{ width: 285, padding: 16 }}>
      <EndeavorRow
        symbol="📊"
        title="Review quarterly plan"
        badges={[{ kind: 'reward', amount: 30 }]}
        config="compactDesktopInbox"
        now={new Date(2026, 8, 28, 9, 0)}
        footer={
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button">Triage</button>
            <button type="button">Add for Today</button>
          </div>
        }
      />
    </div>
  ),
}

/**
 * Pick + selection mode on canon's horizontal card — the emoji in its
 * kind-washed tile, one row ticked, one that cannot be ticked.
 */
const PickAndSelect = {
  render: () => (
    <div
      style={{
        width: 680,
        padding: 16,
        display: 'grid',
        gap: 8,
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      }}
    >
      <EndeavorRow
        symbol="📊"
        title="Prepare presentation slides"
        badges={[{ kind: 'reward', amount: 30 }]}
        config="horizontalCard"
        symbolWash="var(--kro-role-kind-task)"
        now={new Date(2026, 8, 28, 9, 0)}
        onPick={() => {}}
        selection={{ checked: true, label: 'Select', onToggle: () => {} }}
      />
      <EndeavorRow
        symbol="🤝"
        title="Team sync meeting"
        config="horizontalCard"
        symbolWash="var(--kro-role-kind-event)"
        now={new Date(2026, 8, 28, 9, 0)}
        onPick={() => {}}
        selection={{ checked: false, label: 'Select', onToggle: () => {} }}
      />
      <EndeavorRow
        symbol="🧘"
        title="Meditate for 10 minutes"
        config="horizontalCard"
        symbolWash="var(--kro-role-kind-habit)"
        now={new Date(2026, 8, 28, 9, 0)}
        onPick={() => {}}
        selection={{
          checked: false,
          disabled: true,
          label: 'Unavailable',
          onToggle: () => {},
        }}
      />
    </div>
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Presets.render()}
      {FindPills.render()}
      {InboxWithTrailingActions.render()}
      {WithFooter.render()}
      {PickAndSelect.render()}
      {InputDuality.render()}
      {BothThemes.render()}
    </StoryGallery>
  ),
}
