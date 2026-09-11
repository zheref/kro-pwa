import { useState } from 'react'
import { ColumnView, type ColumnViewColumn } from './ColumnView'
import { HigBothSchemes, HigDensities, HigStage } from '../higStoryStage'
import { StoryGallery } from '../../storybook/storyGallery'

export default {
  title: 'HIG/Layout and organization/Column views',
  component: ColumnView,
}

const COLUMNS: readonly ColumnViewColumn[] = [
  {
    id: 'areas',
    title: 'Areas',
    items: [
      { id: 'plan', label: 'Plan' },
      { id: 'do', label: 'Do' },
      { id: 'earn', label: 'Earn' },
    ],
  },
  {
    id: 'endeavors',
    title: 'Endeavors',
    items: [
      { id: 'inbox', label: 'Inbox triage' },
      { id: 'review', label: 'Weekly review' },
      { id: 'run', label: 'Morning run' },
    ],
  },
  {
    id: 'sessions',
    title: 'Sessions',
    items: [
      { id: 'focus', label: 'Deep work' },
      { id: 'admin', label: 'Admin sweep' },
    ],
  },
]

function ColumnViewPlayground({
  selected: initial,
}: {
  readonly selected?: Readonly<Record<number, string>>
}) {
  const [selected, setSelected] = useState<Record<number, string>>(
    initial ?? { 0: 'plan', 1: 'inbox' },
  )

  return (
    <ColumnView
      columns={COLUMNS}
      selected={selected}
      onSelect={(columnIndex, itemId) => {
        setSelected((current) => {
          const next: Record<number, string> = {}
          for (let index = 0; index < columnIndex; index += 1) {
            const previous = current[index]
            if (previous !== undefined) next[index] = previous
          }
          next[columnIndex] = itemId
          return next
        })
      }}
    />
  )
}

const Browse = {
  name: 'Browse · select a row to walk the path',
  render: () => (
    <HigStage>
      <ColumnViewPlayground />
    </HigStage>
  ),
}

const DoSelected = {
  name: 'Do selected · the accent row is the path',
  render: () => (
    <HigStage>
      <ColumnView
        columns={COLUMNS}
        selected={{ 0: 'do', 1: 'run' }}
        onSelect={() => {}}
      />
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · on-accent type still reads',
  render: () => (
    <HigBothSchemes>
      <ColumnView
        columns={COLUMNS}
        selected={{ 0: 'earn', 1: 'review' }}
        onSelect={() => {}}
      />
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <ColumnView
          density={density}
          columns={COLUMNS}
          selected={{ 0: 'plan', 1: 'inbox' }}
          onSelect={() => {}}
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Browse.render()}
      {DoSelected.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
