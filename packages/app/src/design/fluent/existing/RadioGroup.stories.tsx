import { Radio, RadioGroup } from '../../hig/selection/RadioGroup'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Forms/Radio group',
  component: RadioGroup,
}

const Default = {
  name: 'Vertical · one session-end choice',
  render: () => (
    <FluentStage>
      <FluentRow label="When the session ends">
        <RadioGroup
          name="fluent-session-end"
          legend="When the session ends"
          defaultValue="complete"
        >
          <Radio value="complete" label="Complete the endeavor" />
          <Radio value="pause" label="Pause and keep the clock" />
          <Radio value="defer" label="Defer to later today" />
        </RadioGroup>
      </FluentRow>
    </FluentStage>
  ),
}

const Disabled = {
  name: 'Disabled option · the fade is applied once',
  render: () => (
    <FluentStage>
      <FluentRow label="Archive is not offered">
        <RadioGroup
          name="fluent-quadrant"
          legend="Quadrant"
          defaultValue="prioritize"
        >
          <Radio value="prioritize" label="Prioritize" />
          <Radio value="delete" label="Archive" disabled />
        </RadioGroup>
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the disc is the state',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Kind">
        <RadioGroup name="fluent-kind" legend="Kind" defaultValue="focus">
          <Radio value="focus" label="Focus" />
          <Radio value="habit" label="Habit" />
        </RadioGroup>
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities',
  render: () => (
    <FluentDensities
      render={(density) => (
        <RadioGroup
          name={`fluent-kind-${density}`}
          legend="Kind"
          defaultValue="focus"
          density={density}
        >
          <Radio value="focus" label="Focus" />
          <Radio value="habit" label="Habit" />
        </RadioGroup>
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
