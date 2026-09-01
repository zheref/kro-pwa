/**
 * `SurfaceCard` and the two compositions built on it.
 *
 * The separator inset is what to look at: in `SectionRows` the hairlines start
 * after the icon column, so the card reads as a grouped list rather than a
 * stack of cut lines. Set `separatorInset` to `0` and the difference is
 * immediate.
 */

import { PropertyRow } from './PropertyRow'
import { CardRow, CardRowStack, SectionCard, SurfaceCard } from './SurfaceCard'
import { semanticTint } from './KroChip'
import { BothSchemes, Cell, Stage } from './storyStage'

export default {
  title: 'Endeavor/SurfaceCard',
  component: SurfaceCard,
}

export const Plain = {
  name: 'A plain grouped card',
  render: () => (
    <Stage width={460}>
      <SurfaceCard>
        <p style={{ margin: 0, color: 'var(--kro-color-fore)' }}>
          Two sessions logged this week.
        </p>
      </SurfaceCard>
      <Cell label="isElevated={false}">
        <SurfaceCard isElevated={false}>
          <p style={{ margin: 0, color: 'var(--kro-color-fore)' }}>
            Flat, for a nested card.
          </p>
        </SurfaceCard>
      </Cell>
    </Stage>
  ),
}

export const SectionRows = {
  name: 'SectionCard · header outside, inset hairlines inside',
  render: () => (
    <Stage width={460}>
      <SectionCard title="Core" icon="info.circle" padding={null}>
        <CardRowStack>
          <CardRow>
            <PropertyRow
              label="Status"
              icon="circle"
              value={{
                kind: 'chip',
                title: 'Pending',
                icon: 'circle',
                tint: semanticTint('statusPending'),
              }}
            />
          </CardRow>
          <CardRow>
            <PropertyRow
              label="Due"
              icon="calendar"
              value={{ kind: 'text', text: 'Apr 22, 2026 at 2:30 PM' }}
            />
          </CardRow>
          <CardRow>
            <PropertyRow
              label="Duration"
              icon="timer"
              value={{ kind: 'emphasis', text: '45m' }}
            />
          </CardRow>
        </CardRowStack>
      </SectionCard>
    </Stage>
  ),
}

export const SectionWithAction = {
  name: 'SectionCard · count and a trailing action',
  render: () => (
    <Stage width={460}>
      <SectionCard
        title="Performances"
        icon="clock.arrow.circlepath"
        count={2}
        actionTitle="Manage"
        onAction={() => undefined}
      >
        <p style={{ margin: 0, color: 'var(--kro-color-fore)' }}>
          2 sessions logged
        </p>
      </SectionCard>
    </Stage>
  ),
}

export const BothThemes = {
  name: 'Both schemes',
  render: () => (
    <BothSchemes>
      <SectionCard title="Core" padding={null}>
        <CardRowStack>
          <CardRow>
            <PropertyRow
              label="Status"
              value={{ kind: 'text', text: 'Pending' }}
            />
          </CardRow>
          <CardRow>
            <PropertyRow
              label="Duration"
              value={{ kind: 'emphasis', text: '45m' }}
            />
          </CardRow>
        </CardRowStack>
      </SectionCard>
    </BothSchemes>
  ),
}
