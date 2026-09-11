import { Select } from './Select'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'
import { fluentSizeForDensity } from '../sizes'

const QUADRANTS = [
  { value: 'prioritize', label: 'Prioritize' },
  { value: 'decide', label: 'Schedule' },
  { value: 'delegate', label: 'Delegate' },
  { value: 'delete', label: 'Archive' },
] as const

export default {
  title: 'Fluent 2/Forms/Select',
  component: Select,
}

const Appearances = {
  name: 'Outline and underline · the platform owns the menu',
  render: () => (
    <FluentStage>
      <FluentRow label="Outline · hairline box">
        <Select
          label="Quadrant"
          options={QUADRANTS}
          defaultValue="prioritize"
        />
      </FluentRow>
      <FluentRow label="Underline · bottom edge only">
        <Select
          label="Quadrant"
          appearance="underline"
          options={QUADRANTS}
          defaultValue="decide"
        />
      </FluentRow>
      <FluentRow label="Disabled · fade once">
        <Select
          label="Quadrant"
          options={QUADRANTS}
          defaultValue="delegate"
          disabled
        />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the recessed field still reads',
  render: () => (
    <FluentBothSchemes gradient>
      <FluentRow label="On the indigoGrape field">
        <Select
          label="Quadrant"
          options={QUADRANTS}
          defaultValue="prioritize"
        />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <FluentDensities
      render={(density) => (
        <Select
          size={fluentSizeForDensity(density)}
          label="Quadrant"
          options={QUADRANTS}
          defaultValue="prioritize"
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Appearances.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
