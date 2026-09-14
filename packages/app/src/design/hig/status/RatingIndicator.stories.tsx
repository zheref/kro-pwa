import { useState } from 'react'
import { RatingIndicator } from './RatingIndicator'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'Forms/Rating indicator',
  component: RatingIndicator,
}

function LiveRating() {
  const [value, setValue] = useState(3)
  return (
    <RatingIndicator
      value={value}
      label="Session energy"
      onValueChange={setValue}
    />
  )
}

const SessionEnergy = {
  name: 'Session energy · the score is printed beside the stars',
  render: () => (
    <HigStage>
      <HigRow label="Interactive">
        <LiveRating />
      </HigRow>
    </HigStage>
  ),
}

const ReadOnly = {
  name: 'Read-only · an image, not five disabled buttons',
  render: () => (
    <HigStage>
      <HigRow label="Logged">
        <RatingIndicator value={4} label="Session energy" readOnly />
      </HigRow>
      <HigRow label="Empty">
        <RatingIndicator value={0} label="Session energy" readOnly />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · filled stars still read as reward',
  render: () => (
    <HigBothSchemes>
      <HigRow label="Logged">
        <RatingIndicator value={3} label="Session energy" readOnly />
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <RatingIndicator density={density} value={3} label="Session energy" />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {SessionEnergy.render()}
      {ReadOnly.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
