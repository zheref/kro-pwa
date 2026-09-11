import { Slider } from '../../hig/selection/Slider'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Forms/Slider',
  component: Slider,
}

const Default = {
  name: 'Focus minutes · the thumb is the state',
  render: () => (
    <FluentStage>
      <FluentRow label="A 25-minute session">
        <Slider
          label="Focus minutes"
          defaultValue={25}
          min={5}
          max={90}
          step={5}
          showValue
        />
      </FluentRow>
    </FluentStage>
  ),
}

const Disabled = {
  name: 'Disabled · the fade is applied once',
  render: () => (
    <FluentStage>
      <FluentRow label="Locked">
        <Slider label="Reward points" defaultValue={12} disabled showValue />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the thumb still reads',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Focus">
        <Slider label="Focus minutes" defaultValue={25} showValue />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities',
  render: () => (
    <FluentDensities
      render={(density) => (
        <Slider
          density={density}
          label="Focus minutes"
          defaultValue={25}
          showValue
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
      {Disabled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
