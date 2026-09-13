import { Slider } from './Slider'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'Forms/Slider',
  component: Slider,
}

const SessionLength = {
  name: 'Focus minutes · the thumb is the state',
  render: () => (
    <HigStage>
      <HigRow label="A 25-minute session">
        <Slider
          label="Focus minutes"
          defaultValue={25}
          min={5}
          max={90}
          step={5}
          showValue
        />
      </HigRow>
    </HigStage>
  ),
}

const Disabled = {
  name: 'Disabled · the fade is applied once',
  render: () => (
    <HigStage>
      <HigRow label="Reward points locked">
        <Slider
          label="Reward points"
          defaultValue={12}
          min={0}
          max={50}
          showValue
          disabled
        />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the thumb still reads',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="On the indigoGrape field">
        <Slider
          label="Focus minutes"
          defaultValue={45}
          min={5}
          max={90}
          step={5}
          showValue
        />
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <Slider
          density={density}
          label="Focus minutes"
          defaultValue={25}
          min={5}
          max={90}
          step={5}
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
      {SessionLength.render()}
      {Disabled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
