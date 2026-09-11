import { SpinButton } from './SpinButton'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'
import { fluentSizeForDensity } from '../sizes'

export default {
  title: 'Fluent 2/Forms/Spin button',
  component: SpinButton,
}

const SessionMinutes = {
  name: 'Session minutes · the value is a field',
  render: () => (
    <FluentStage>
      <FluentRow label="A 25-minute session">
        <SpinButton
          label="Minutes"
          defaultValue={25}
          step={5}
          min={5}
          max={90}
        />
      </FluentRow>
    </FluentStage>
  ),
}

const AtTheFloor = {
  name: 'At the bound · minus and plus disable',
  render: () => (
    <FluentStage>
      <FluentRow label="Cannot drop below five minutes">
        <SpinButton
          label="Minutes"
          defaultValue={5}
          step={5}
          min={5}
          max={90}
        />
      </FluentRow>
      <FluentRow label="Cannot pass fifty reward points">
        <SpinButton label="Points" defaultValue={50} min={0} max={50} />
      </FluentRow>
      <FluentRow label="Disabled · fade once on each control">
        <SpinButton label="Minutes" defaultValue={25} disabled />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the count still reads',
  render: () => (
    <FluentBothSchemes gradient>
      <FluentRow label="On the indigoGrape field">
        <SpinButton
          label="Minutes"
          defaultValue={25}
          step={5}
          min={5}
          max={90}
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
        <SpinButton
          size={fluentSizeForDensity(density)}
          label="Minutes"
          defaultValue={25}
          step={5}
          min={5}
          max={90}
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {SessionMinutes.render()}
      {AtTheFloor.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
