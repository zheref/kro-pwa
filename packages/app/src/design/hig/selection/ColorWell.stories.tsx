import { ColorWell } from './ColorWell'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'HIG/Selection and input/Color wells',
  component: ColorWell,
}

const KroSwatch = {
  name: 'The well is the swatch',
  render: () => (
    <HigStage>
      <HigRow label="Caller-supplied kro">
        {/* #5e6472 is Kro's light `--kro-color-kro`. The well cannot default a hex. */}
        <ColorWell defaultValue="#5e6472" label="Endeavor accent" />
      </HigRow>
    </HigStage>
  ),
}

const Disabled = {
  name: 'Disabled · the fade is applied once',
  render: () => (
    <HigStage>
      <HigRow label="Locked accent">
        <ColorWell defaultValue="#5e6472" label="Endeavor accent" disabled />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the swatch still reads',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="On the indigoGrape field">
        <ColorWell defaultValue="#5e6472" label="Endeavor accent" />
        <ColorWell defaultValue="#b0b9d4" label="Dark-scheme kro" />
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <ColorWell
          density={density}
          defaultValue="#5e6472"
          label="Endeavor accent"
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {KroSwatch.render()}
      {Disabled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
