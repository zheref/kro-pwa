import { ToggleButton } from './ToggleButton'
import { FLUENT_BUTTON_APPEARANCES } from './appearance'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'
import { FLUENT_CONTROL_SIZES, fluentSizeForDensity } from '../sizes'

export default {
  title: 'Fluent 2/Actions/Toggle button',
  component: ToggleButton,
}

const Appearances = {
  name: 'Appearances · rest and pressed. Glass is the state, not colour',
  render: () => (
    <FluentStage gradient>
      <FluentRow label="Rest">
        {FLUENT_BUTTON_APPEARANCES.map((appearance) => (
          <ToggleButton key={appearance} appearance={appearance}>
            {appearance}
          </ToggleButton>
        ))}
      </FluentRow>
      <FluentRow label="Pressed">
        {FLUENT_BUTTON_APPEARANCES.map((appearance) => (
          <ToggleButton
            key={`${appearance}-on`}
            appearance={appearance}
            defaultChecked
          >
            {appearance}
          </ToggleButton>
        ))}
      </FluentRow>
    </FluentStage>
  ),
}

const Sizes = {
  name: 'Sizes · small default, medium for mobile, large is the 44px floor',
  render: () => (
    <FluentStage>
      <FluentRow label="Small · medium · large">
        {FLUENT_CONTROL_SIZES.map((size) => (
          <ToggleButton key={size} size={size} defaultChecked>
            Bold
          </ToggleButton>
        ))}
      </FluentRow>
    </FluentStage>
  ),
}

const Disabled = {
  name: 'Disabled · the fade is applied once',
  render: () => (
    <FluentStage>
      <FluentRow label="Locked">
        <ToggleButton disabled>Bold</ToggleButton>
        <ToggleButton disabled defaultChecked>
          Italic
        </ToggleButton>
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · pressed glass still reads',
  render: () => (
    <FluentBothSchemes gradient>
      <FluentRow label="Rest and pressed">
        <ToggleButton>Bold</ToggleButton>
        <ToggleButton defaultChecked>Italic</ToggleButton>
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <FluentDensities
      gradient
      render={(density) => (
        <>
          <ToggleButton size={fluentSizeForDensity(density)}>Bold</ToggleButton>
          <ToggleButton size={fluentSizeForDensity(density)} defaultChecked>
            Italic
          </ToggleButton>
        </>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Appearances.render()}
      {Sizes.render()}
      {Disabled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
