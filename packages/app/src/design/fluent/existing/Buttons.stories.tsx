import { Check, Plus } from 'lucide-react'
import { Button, buttonSizeForDensity } from '../../system/primitives/button'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'
import { FLUENT_BUTTON_APPEARANCES } from '../actions/appearance'

export default {
  title: 'Fluent 2/Actions/Button',
  component: Button,
}

const Appearances = {
  name: 'Appearances · outline, subtle and transparent live on Button',
  render: () => (
    <FluentStage gradient>
      <FluentRow label="Fluent appearances">
        {FLUENT_BUTTON_APPEARANCES.map((appearance) => (
          <Button key={appearance} variant={appearance}>
            {appearance}
          </Button>
        ))}
      </FluentRow>
    </FluentStage>
  ),
}

const ShapesAndSizes = {
  name: 'Shapes and sizes · rounded, circular, square × small, medium, large',
  render: () => (
    <FluentStage>
      <FluentRow label="Shapes">
        <Button shape="rounded">Rounded</Button>
        <Button shape="circular">Circular</Button>
        <Button shape="square">Square</Button>
      </FluentRow>
      <FluentRow label="Sizes">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
        <Button size="icon-sm" aria-label="Add">
          <Plus />
        </Button>
      </FluentRow>
    </FluentStage>
  ),
}

const Disabled = {
  name: 'Disabled · the fade is applied once',
  render: () => (
    <FluentStage>
      <FluentRow label="Disabled">
        <Button variant="primary" disabled>
          Start session
        </Button>
        <Button variant="outline" disabled>
          Outline
        </Button>
        <Button variant="transparent" disabled>
          Transparent
        </Button>
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · every appearance still reads',
  render: () => (
    <FluentBothSchemes gradient>
      <FluentRow label="Primary and outline">
        <Button variant="primary">
          <Check /> Complete
        </Button>
        <Button variant="outline">Reschedule</Button>
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
        <Button size={buttonSizeForDensity(density)} variant="primary">
          Start session
        </Button>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Appearances.render()}
      {ShapesAndSizes.render()}
      {Disabled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
