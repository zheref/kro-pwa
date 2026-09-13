import { Plus } from 'lucide-react'
import { CompoundButton } from './CompoundButton'
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
  title: 'Actions/Compound button',
  component: CompoundButton,
}

const Appearances = {
  name: 'Appearances · title plus a supporting line',
  render: () => (
    <FluentStage gradient>
      <FluentRow label="Appearances">
        {FLUENT_BUTTON_APPEARANCES.map((appearance) => (
          <CompoundButton
            key={appearance}
            appearance={appearance}
            secondaryContent="Opens today's plan"
          >
            Start session
          </CompoundButton>
        ))}
      </FluentRow>
    </FluentStage>
  ),
}

const WithIcon = {
  name: 'With icon · the action is still a word',
  render: () => (
    <FluentStage>
      <FluentRow label="Leading glyph">
        <CompoundButton
          appearance="primary"
          icon={<Plus />}
          secondaryContent="Adds a task for today"
        >
          Add task
        </CompoundButton>
        <CompoundButton
          icon={<Plus />}
          secondaryContent="Adds a habit for today"
        >
          Add habit
        </CompoundButton>
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
          <CompoundButton
            key={size}
            size={size}
            secondaryContent="Opens today's plan"
          >
            Start session
          </CompoundButton>
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
        <CompoundButton
          appearance="primary"
          disabled
          secondaryContent="Opens today's plan"
        >
          Start session
        </CompoundButton>
        <CompoundButton disabled secondaryContent="Adds a task for today">
          Add task
        </CompoundButton>
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the supporting line still reads',
  render: () => (
    <FluentBothSchemes gradient>
      <FluentRow label="Primary and secondary">
        <CompoundButton
          appearance="primary"
          secondaryContent="Opens today's plan"
        >
          Start session
        </CompoundButton>
        <CompoundButton secondaryContent="Adds a task for today">
          Add task
        </CompoundButton>
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
        <CompoundButton
          size={fluentSizeForDensity(density)}
          secondaryContent="Opens today's plan"
        >
          Start session
        </CompoundButton>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Appearances.render()}
      {WithIcon.render()}
      {Sizes.render()}
      {Disabled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
