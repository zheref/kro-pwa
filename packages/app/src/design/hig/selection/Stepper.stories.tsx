import { Stepper } from './Stepper'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'Forms/Stepper',
  component: Stepper,
}

const SessionMinutes = {
  name: 'Session minutes · nudge one tick',
  render: () => (
    <HigStage>
      <HigRow label="A 25-minute session">
        <Stepper label="Minutes" defaultValue={25} step={5} min={5} max={90} />
      </HigRow>
    </HigStage>
  ),
}

const AtTheFloor = {
  name: 'At the minimum · minus is the bound',
  render: () => (
    <HigStage>
      <HigRow label="Cannot drop below five minutes">
        <Stepper label="Minutes" defaultValue={5} step={5} min={5} max={90} />
      </HigRow>
      <HigRow label="Cannot pass fifty reward points">
        <Stepper label="Points" defaultValue={50} min={0} max={50} />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the count still reads',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="On the indigoGrape field">
        <Stepper label="Minutes" defaultValue={25} step={5} min={5} max={90} />
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <Stepper
          density={density}
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
