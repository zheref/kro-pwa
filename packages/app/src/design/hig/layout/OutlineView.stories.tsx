import { useState } from 'react'
import { OutlineView, type OutlineViewItem } from './OutlineView'
import { HigBothSchemes, HigDensities, HigStage } from '../higStoryStage'
import { StoryGallery } from '../../storybook/storyGallery'

export default {
  title: 'Layout/Outline view',
  component: OutlineView,
}

const TREE: readonly OutlineViewItem[] = [
  {
    id: 'plan',
    title: 'Plan',
    children: [
      { id: 'inbox', title: 'Inbox triage' },
      {
        id: 'blueprints',
        title: 'Blueprints',
        children: [{ id: 'launch', title: 'Launch kit' }],
      },
    ],
  },
  {
    id: 'do',
    title: 'Do',
    children: [
      { id: 'deep', title: 'Deep work' },
      { id: 'run', title: 'Morning run' },
    ],
  },
  { id: 'earn', title: 'Earn' },
]

function OutlinePlayground() {
  const [expanded, setExpanded] = useState<readonly string[]>(['plan'])

  return (
    <OutlineView
      items={TREE}
      expanded={expanded}
      onExpandedChange={setExpanded}
    />
  )
}

const Collapsed = {
  name: 'Collapsed · roots only',
  render: () => (
    <HigStage>
      <OutlineView items={TREE} />
    </HigStage>
  ),
}

const Expanded = {
  name: 'Expanded · walk Plan into Blueprints',
  render: () => (
    <HigStage>
      <OutlinePlayground />
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · indent still reads as depth',
  render: () => (
    <HigBothSchemes>
      <OutlineView items={TREE} defaultExpanded={['do']} />
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <OutlineView
          density={density}
          items={TREE}
          defaultExpanded={['plan']}
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Collapsed.render()}
      {Expanded.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
