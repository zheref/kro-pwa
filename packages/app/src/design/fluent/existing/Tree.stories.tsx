import { OutlineView, type OutlineViewItem } from '../../hig/layout/OutlineView'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Navigation/Tree',
  component: OutlineView,
}

const TREE: readonly OutlineViewItem[] = [
  {
    id: 'plan',
    title: 'Plan',
    children: [
      { id: 'inbox', title: 'Inbox triage' },
      { id: 'blueprints', title: 'Blueprints' },
    ],
  },
  { id: 'do', title: 'Do', children: [{ id: 'deep', title: 'Deep work' }] },
  { id: 'earn', title: 'Earn' },
]

const Default = {
  name: 'Hierarchical nested data · rows expand in place',
  render: () => (
    <FluentStage>
      <FluentRow label="Destinations">
        <OutlineView items={TREE} defaultExpanded={['plan']} />
      </FluentRow>
    </FluentStage>
  ),
}

const Collapsed = {
  name: 'All collapsed',
  render: () => (
    <FluentStage>
      <FluentRow label="Closed">
        <OutlineView items={TREE} defaultExpanded={[]} />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Plan open">
        <OutlineView items={TREE} defaultExpanded={['plan']} />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities',
  render: () => (
    <FluentDensities
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
      {Default.render()}
      {Collapsed.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
