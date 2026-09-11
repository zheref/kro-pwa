import { useState } from 'react'
import { RatingIndicator } from '../../hig/status/RatingIndicator'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Forms/Rating',
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

const Default = {
  name: 'Filled stars · the score is printed beside them',
  render: () => (
    <FluentStage>
      <FluentRow label="Session energy">
        <LiveRating />
      </FluentRow>
    </FluentStage>
  ),
}

const ReadOnly = {
  name: 'Read-only · an image, not five faded buttons',
  render: () => (
    <FluentStage>
      <FluentRow label="Read-only">
        <RatingIndicator value={4} label="Session energy" readOnly />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Read-only">
        <RatingIndicator value={4} label="Session energy" readOnly />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities',
  render: () => (
    <FluentDensities
      render={(density) => (
        <RatingIndicator
          density={density}
          value={4}
          label="Session energy"
          readOnly
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
      {ReadOnly.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
