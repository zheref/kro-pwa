import { Toggle } from '../../hig/selection/Toggle'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Forms/Switch',
  component: Toggle,
}

const Default = {
  name: 'Off and on · the knob is the state',
  render: () => (
    <FluentStage>
      <FluentRow label="Off">
        <Toggle label="Remind me" />
      </FluentRow>
      <FluentRow label="On">
        <Toggle label="Complete with session" defaultChecked />
      </FluentRow>
    </FluentStage>
  ),
}

const Disabled = {
  name: 'Disabled · the fade is applied once',
  render: () => (
    <FluentStage>
      <FluentRow label="Disabled">
        <Toggle label="Remind me" disabled />
        <Toggle label="Complete with session" defaultChecked disabled />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the knob still reads',
  render: () => (
    <FluentBothSchemes gradient>
      <FluentRow label="Live accent">
        <Toggle label="Focus sounds" defaultChecked />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities',
  render: () => (
    <FluentDensities
      render={(density) => (
        <Toggle density={density} label="Remind me" defaultChecked />
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
