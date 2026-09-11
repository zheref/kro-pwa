import { Checkbox } from './Checkbox'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'HIG/Selection and input/Checkboxes',
  component: Checkbox,
}

const OffAndOn = {
  name: 'Off and on · the tick is the state',
  render: () => (
    <HigStage>
      <HigRow label="Off">
        <Checkbox label="Show archived" />
      </HigRow>
      <HigRow label="On">
        <Checkbox label="Complete with session" defaultChecked />
      </HigRow>
    </HigStage>
  ),
}

const Disabled = {
  name: 'Disabled · the fade is applied once',
  render: () => (
    <HigStage>
      <HigRow label="Disabled off">
        <Checkbox label="Show archived" disabled />
      </HigRow>
      <HigRow label="Disabled on">
        <Checkbox label="Complete with session" defaultChecked disabled />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the tick still reads',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="Plan and Do">
        <Checkbox label="Remind me" defaultChecked />
        <Checkbox label="Carry into Earn" />
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <>
          <Checkbox density={density} label="Remind me" />
          <Checkbox
            density={density}
            label="Complete with session"
            defaultChecked
          />
        </>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {OffAndOn.render()}
      {Disabled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
