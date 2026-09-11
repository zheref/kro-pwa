import { Breadcrumb } from './Breadcrumb'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'
import { fluentSizeForDensity } from '../sizes'

export default {
  title: 'Fluent 2/Navigation/Breadcrumb',
  component: Breadcrumb,
}

const DEEP = [
  { id: 'plan', label: 'Plan' },
  { id: 'today', label: 'Today' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'triage', label: 'Triage' },
  { id: 'now', label: 'Write the KroTokens port' },
]

const Hierarchy = {
  name: 'Hierarchy · ancestors are buttons',
  render: () => (
    <FluentStage>
      <FluentRow label="Five levels">
        <Breadcrumb items={DEEP} />
      </FluentRow>
    </FluentStage>
  ),
}

const Overflow = {
  name: 'Overflow · the middle collapses into More',
  render: () => (
    <FluentStage>
      <FluentRow label="maxItems 3">
        <Breadcrumb items={DEEP} maxItems={3} />
      </FluentRow>
    </FluentStage>
  ),
}

const CurrentOnly = {
  name: 'Current only · nothing to jump to',
  render: () => (
    <FluentStage>
      <FluentRow label="A single crumb">
        <Breadcrumb items={[{ id: 'today', label: 'Today' }]} />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the current crumb still reads',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Path">
        <Breadcrumb items={DEEP} />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact small, comfortable medium',
  render: () => (
    <FluentDensities
      render={(density) => (
        <Breadcrumb size={fluentSizeForDensity(density)} items={DEEP} />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Hierarchy.render()}
      {Overflow.render()}
      {CurrentOnly.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
