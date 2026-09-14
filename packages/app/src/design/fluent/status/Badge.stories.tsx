import { Badge, BADGE_COLORS, CounterBadge } from './Badge'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Status/Badge',
  component: Badge,
}

const Appearances = {
  name: 'Appearances · the word is the signal',
  render: () => (
    <FluentStage>
      <FluentRow label="Filled">
        <Badge appearance="filled">New</Badge>
        <Badge appearance="filled" color="success">
          Done
        </Badge>
        <Badge appearance="filled" color="danger">
          Failed
        </Badge>
      </FluentRow>
      <FluentRow label="Ghost">
        <Badge appearance="ghost">Draft</Badge>
        <Badge appearance="ghost" color="informative">
          Info
        </Badge>
      </FluentRow>
      <FluentRow label="Outline">
        <Badge appearance="outline" color="warning">
          Late
        </Badge>
        <Badge appearance="outline" color="severe">
          Blocked
        </Badge>
      </FluentRow>
      <FluentRow label="Tint">
        <Badge appearance="tint" color="brand">
          Live
        </Badge>
        <Badge appearance="tint" color="important">
          Pinned
        </Badge>
      </FluentRow>
    </FluentStage>
  ),
}

const Colours = {
  name: 'Colours · every Fluent colour on a Kro token',
  render: () => (
    <FluentStage>
      <FluentRow label="Filled">
        {BADGE_COLORS.map((color) => (
          <Badge key={color} color={color}>
            {color}
          </Badge>
        ))}
      </FluentRow>
    </FluentStage>
  ),
}

const SizesAndShapes = {
  name: 'Sizes and shapes',
  render: () => (
    <FluentStage>
      <FluentRow label="Sizes">
        <Badge size="tiny">Tiny</Badge>
        <Badge size="extra-small">XS</Badge>
        <Badge size="small">Small</Badge>
        <Badge size="medium">Medium</Badge>
        <Badge size="large">Large</Badge>
        <Badge size="extra-large">XL</Badge>
      </FluentRow>
      <FluentRow label="Shapes">
        <Badge shape="rounded">Rounded</Badge>
        <Badge shape="circular">Circular</Badge>
        <Badge shape="square">Square</Badge>
      </FluentRow>
    </FluentStage>
  ),
}

const Counters = {
  name: 'Counter badge · the numeral, or a named dot',
  render: () => (
    <FluentStage>
      <FluentRow label="Count">
        <CounterBadge count={3} />
        <CounterBadge count={12} color="danger" />
        <CounterBadge count={120} />
      </FluentRow>
      <FluentRow label="Dot">
        <CounterBadge count={3} dot />
        <CounterBadge count={12} color="danger" dot size="small" />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the word still reads',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Status">
        <Badge color="brand">Live</Badge>
        <Badge appearance="tint" color="success">
          Done
        </Badge>
        <Badge appearance="outline" color="danger">
          Failed
        </Badge>
        <CounterBadge count={7} />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact small, comfortable large',
  render: () => (
    <FluentDensities
      render={(density) => (
        <>
          <Badge size={density === 'compact' ? 'small' : 'large'}>New</Badge>
          <CounterBadge
            count={4}
            size={density === 'compact' ? 'tiny' : 'medium'}
          />
        </>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Appearances.render()}
      {Colours.render()}
      {SizesAndShapes.render()}
      {Counters.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
