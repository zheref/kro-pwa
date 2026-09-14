import { Toggle } from './Toggle'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'Forms/Toggle',
  component: Toggle,
}

const OffAndOn = {
  name: 'Off and on · the knob is the state',
  render: () => (
    <HigStage>
      <HigRow label="Off">
        <Toggle label="Remind me" />
      </HigRow>
      <HigRow label="On">
        <Toggle label="Complete with session" defaultChecked />
      </HigRow>
    </HigStage>
  ),
}

const Disabled = {
  name: 'Disabled · the fade is applied once',
  render: () => (
    <HigStage>
      <HigRow label="Disabled off">
        <Toggle label="Remind me" disabled />
      </HigRow>
      <HigRow label="Disabled on">
        <Toggle label="Complete with session" defaultChecked disabled />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the knob still reads',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="Live accent">
        <Toggle label="Focus sounds" defaultChecked />
        <Toggle label="Haptics" />
      </HigRow>
    </HigBothSchemes>
  ),
}

const OnGradient = {
  name: 'Over the field · glass is not required; the knob is',
  render: () => (
    <HigStage gradient>
      <HigRow label="On the indigoGrape field">
        <Toggle label="Show completed" defaultChecked />
      </HigRow>
    </HigStage>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <>
          <Toggle density={density} label="Remind me" />
          <Toggle
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
      {OnGradient.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
