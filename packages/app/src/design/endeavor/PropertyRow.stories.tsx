/**
 * `PropertyRow` — every value kind, and the restack.
 *
 * `Restacked` is the accessibility-text-size story: it renders the same rows in
 * a narrow container, which is what a reader at 200% text sees on an ordinary
 * viewport, because the breakpoint is in `rem`. Compare it to `ValueKinds` and
 * the label/value pair should read the same way in both.
 */

import { KroChip, colorTint, semanticTint } from './KroChip'
import { PropertyRow } from './PropertyRow'
import { CardRow, CardRowStack, SurfaceCard } from './SurfaceCard'
import { BothSchemes, Stage } from './storyStage'

export default {
  title: 'Endeavor/PropertyRow',
  component: PropertyRow,
}

const ROWS = (
  <>
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
      <PropertyRow label="Duration" icon="timer" value={{ kind: 'emphasis', text: '45m' }} />
    </CardRow>
    <CardRow>
      <PropertyRow
        label="Value"
        icon="star"
        value={{ kind: 'rating', value: 4, outOf: 5, symbol: 'star' }}
      />
    </CardRow>
    <CardRow>
      <PropertyRow
        label="Tags"
        icon="tag"
        value={{ kind: 'tags', tags: ['Engaging', 'On desk', 'Session'] }}
      />
    </CardRow>
    <CardRow>
      <PropertyRow
        label="Hosts"
        icon="network"
        value={{
          kind: 'chips',
          chips: [
            {
              id: 'supabase',
              title: 'Kro Cloud',
              icon: 'network',
              tint: semanticTint('hostSupabase'),
            },
            {
              id: 'google',
              title: 'Google Calendar',
              icon: 'g.circle.fill',
              tint: semanticTint('hostGoogleCalendar'),
            },
          ],
        }}
      />
    </CardRow>
    <CardRow>
      <PropertyRow
        label="Color"
        icon="paintpalette"
        value={{ kind: 'tint', tint: colorTint('celeste'), label: '#B8F2E6' }}
      />
    </CardRow>
    <CardRow>
      <PropertyRow
        label="Expires"
        icon="hourglass"
        value={{ kind: 'empty', placeholder: 'No expiry' }}
      />
    </CardRow>
  </>
)

export const ValueKinds = {
  name: 'Every value kind',
  render: () => (
    <Stage width={520}>
      <SurfaceCard padding={null}>
        <CardRowStack>{ROWS}</CardRowStack>
      </SurfaceCard>
    </Stage>
  ),
}

export const Restacked = {
  name: 'Narrow container · the accessibility-size restack',
  render: () => (
    <Stage width={300}>
      <SurfaceCard padding={null}>
        <CardRowStack>{ROWS}</CardRowStack>
      </SurfaceCard>
    </Stage>
  ),
}

export const EmptyCollections = {
  name: 'Empty collections read as a placeholder, not a blank',
  render: () => (
    <Stage width={520}>
      <SurfaceCard padding={null}>
        <CardRowStack>
          <CardRow>
            <PropertyRow label="Tags" icon="tag" value={{ kind: 'tags', tags: [] }} />
          </CardRow>
          <CardRow>
            <PropertyRow label="Hosts" icon="network" value={{ kind: 'chips', chips: [] }} />
          </CardRow>
          <CardRow>
            <PropertyRow
              label="Associated Project or List"
              value={{ kind: 'empty', placeholder: 'None' }}
            />
          </CardRow>
        </CardRowStack>
      </SurfaceCard>
    </Stage>
  ),
}

export const BothThemes = {
  name: 'Both schemes',
  render: () => (
    <BothSchemes>
      <SurfaceCard padding={null}>
        <CardRowStack>
          <CardRow>
            <PropertyRow
              label="Kind"
              icon="checkmark.circle.fill"
              value={{
                kind: 'chip',
                title: 'Task',
                icon: 'checkmark.circle.fill',
                tint: semanticTint('kindTask'),
              }}
            />
          </CardRow>
          <CardRow>
            <PropertyRow
              label="Reward"
              icon="bolt.fill"
              value={{ kind: 'emphasis', text: '50 points' }}
            />
          </CardRow>
        </CardRowStack>
      </SurfaceCard>
      <KroChip title="Detail" icon="info.circle" tint={colorTint('accent')} size="small" />
    </BothSchemes>
  ),
}
