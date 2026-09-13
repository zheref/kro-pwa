import { Tag as TagIcon } from 'lucide-react'
import { Tag, TagGroup } from './Tag'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Status/Tag',
  component: Tag,
}

const Appearances = {
  name: 'Appearances · the word is the value',
  render: () => (
    <FluentStage>
      <FluentRow label="Filled">
        <Tag>Finance</Tag>
        <Tag appearance="filled">Quarterly</Tag>
      </FluentRow>
      <FluentRow label="Outline">
        <Tag appearance="outline">On desk</Tag>
      </FluentRow>
      <FluentRow label="Brand">
        <Tag appearance="brand">Session</Tag>
      </FluentRow>
    </FluentStage>
  ),
}

const Dismissible = {
  name: 'Dismissible · Remove names the value',
  render: () => (
    <FluentStage>
      <FluentRow label="With a glyph">
        <Tag
          dismissible
          onDismiss={() => undefined}
          icon={<TagIcon size={12} />}
        >
          Finance
        </Tag>
        <Tag appearance="brand" dismissible onDismiss={() => undefined}>
          Session
        </Tag>
        <Tag appearance="outline" dismissible onDismiss={() => undefined}>
          On desk
        </Tag>
      </FluentRow>
    </FluentStage>
  ),
}

const SizesAndShapes = {
  name: 'Sizes and shapes',
  render: () => (
    <FluentStage>
      <FluentRow label="Sizes">
        <Tag size="extra-small">XS</Tag>
        <Tag size="small">Small</Tag>
        <Tag size="medium">Medium</Tag>
      </FluentRow>
      <FluentRow label="Shapes">
        <Tag shape="rounded">Rounded</Tag>
        <Tag shape="circular">Circular</Tag>
      </FluentRow>
    </FluentStage>
  ),
}

const Group = {
  name: 'Tag group · wraps rather than scrolling off',
  render: () => (
    <FluentStage width={360}>
      <FluentRow label="A field of values">
        <TagGroup>
          {[
            'Engaging',
            'On desk',
            'Session',
            'Deep work',
            'Quarterly',
            'Finance',
            'Reconciliation',
          ].map((value) => (
            <Tag
              key={value}
              size="small"
              dismissible
              onDismiss={() => undefined}
            >
              {value}
            </Tag>
          ))}
        </TagGroup>
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the word still reads',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Picked values">
        <Tag>Finance</Tag>
        <Tag appearance="brand">Session</Tag>
        <Tag appearance="outline" dismissible onDismiss={() => undefined}>
          On desk
        </Tag>
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact extra-small, comfortable medium',
  render: () => (
    <FluentDensities
      render={(density) => (
        <Tag
          size={density === 'compact' ? 'extra-small' : 'medium'}
          dismissible
          onDismiss={() => undefined}
        >
          Finance
        </Tag>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Appearances.render()}
      {Dismissible.render()}
      {SizesAndShapes.render()}
      {Group.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
