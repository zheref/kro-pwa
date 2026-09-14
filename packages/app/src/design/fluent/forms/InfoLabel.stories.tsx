import { InfoLabel } from './InfoLabel'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'
import { fluentSizeForDensity } from '../sizes'

export default {
  title: 'Forms/Info label',
  component: InfoLabel,
}

const Closed = {
  name: 'Starts closed · the button is More info',
  render: () => (
    <FluentStage>
      <FluentRow label="Tap the info glyph">
        <InfoLabel
          label="Host"
          info="This endeavor came from Google Calendar and cannot be renamed here."
        />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the glyph still reads',
  render: () => (
    <FluentBothSchemes gradient>
      <FluentRow label="On the indigoGrape field">
        <InfoLabel
          label="Host"
          info="This endeavor came from Google Calendar."
        />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <FluentDensities
      render={(density) => (
        <InfoLabel
          size={fluentSizeForDensity(density)}
          label="Host"
          info="This endeavor came from Google Calendar."
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Closed.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
