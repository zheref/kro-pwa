import { Checkbox } from '../../hig/selection/Checkbox'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Forms/Checkbox',
  component: Checkbox,
}

const Default = {
  name: 'Unchecked, checked, mixed',
  render: () => (
    <FluentStage>
      <FluentRow label="States">
        <Checkbox label="Remind me" />
        <Checkbox label="Complete with session" defaultChecked />
        <Checkbox label="Some selected" defaultChecked />
      </FluentRow>
    </FluentStage>
  ),
}

const Disabled = {
  name: 'Disabled · the fade is applied once',
  render: () => (
    <FluentStage>
      <FluentRow label="Disabled">
        <Checkbox label="Remind me" disabled />
        <Checkbox label="Complete with session" defaultChecked disabled />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the tick is the state',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="On">
        <Checkbox label="Focus sounds" defaultChecked />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <FluentDensities
      render={(density) => (
        <Checkbox density={density} label="Remind me" defaultChecked />
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
