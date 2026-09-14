import { Radio, RadioGroup } from './RadioGroup'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'Forms/Radio group',
  component: RadioGroup,
}

const StackedList = {
  name: 'Stacked · one session-end choice',
  render: () => (
    <HigStage>
      <HigRow label="When the session ends">
        <RadioGroup
          name="session-end"
          legend="When the session ends"
          defaultValue="complete"
        >
          <Radio value="complete" label="Complete the endeavor" />
          <Radio value="pause" label="Pause and keep the clock" />
          <Radio value="defer" label="Defer to later today" />
        </RadioGroup>
      </HigRow>
    </HigStage>
  ),
}

const DisabledOption = {
  name: 'Disabled option · the fade is applied once',
  render: () => (
    <HigStage>
      <HigRow label="Archive is not offered here">
        <RadioGroup
          name="quadrant-radio"
          legend="Quadrant"
          defaultValue="prioritize"
        >
          <Radio value="prioritize" label="Prioritize" />
          <Radio value="decide" label="Schedule" />
          <Radio value="delegate" label="Delegate" />
          <Radio value="delete" label="Archive" disabled />
        </RadioGroup>
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the disc still reads',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="How this session earns">
        <RadioGroup name="earn-mode" defaultValue="session">
          <Radio value="session" label="One point per session" />
          <Radio value="minute" label="One point per 25 minutes" />
        </RadioGroup>
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <RadioGroup
          name={`earn-mode-${density}`}
          density={density}
          defaultValue="session"
        >
          <Radio value="session" label="One point per session" />
          <Radio value="minute" label="One point per 25 minutes" />
        </RadioGroup>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {StackedList.render()}
      {DisabledOption.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
