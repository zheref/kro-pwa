import { ComboBox } from '../../hig/selection/ComboBox'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Forms/Combobox',
  component: ComboBox,
}

const OPTIONS = ['Focus', 'Habit', 'Event', 'Reminder'] as const

const Default = {
  name: 'Type or pick · the field stays editable',
  render: () => (
    <FluentStage>
      <FluentRow label="Kind">
        <ComboBox
          label="Kind"
          options={[...OPTIONS]}
          placeholder="Task, habit, event…"
        />
      </FluentRow>
    </FluentStage>
  ),
}

const Disabled = {
  name: 'Disabled · the fade lives on Input once',
  render: () => (
    <FluentStage>
      <FluentRow label="Read-only from the calendar">
        <ComboBox
          label="Host"
          options={['Google Calendar']}
          defaultValue="Google Calendar"
          disabled
        />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the field still reads',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Kind">
        <ComboBox label="Kind" options={[...OPTIONS]} defaultValue="Focus" />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <FluentDensities
      render={(density) => (
        <ComboBox
          density={density}
          label="Kind"
          options={[...OPTIONS]}
          placeholder="Kind"
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
