import { Tooltip } from './Tooltip'
import { StoryGallery } from '../../storybook/storyGallery'
import { Button } from '../../system/primitives/button'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'
import { buttonSizeForDensity } from '../sizes'

export default {
  title: 'Fluent 2/Surfaces/Tooltip',
  component: Tooltip,
}

const Label = {
  name: 'Label · names the control',
  render: () => (
    <FluentStage>
      <FluentRow label="Hover or focus">
        <Tooltip content="Save the endeavor">
          <Button>Save</Button>
        </Tooltip>
      </FluentRow>
    </FluentStage>
  ),
}

const Description = {
  name: 'Description · extra copy, not the name',
  render: () => (
    <FluentStage>
      <FluentRow label="relationship=description">
        <Tooltip
          content="Writes the current draft back to the plan."
          relationship="description"
        >
          <Button>Save</Button>
        </Tooltip>
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the bubble is glass',
  render: () => (
    <FluentBothSchemes gradient>
      <FluentRow label="Trigger">
        <Tooltip content="Save the endeavor">
          <Button>Save</Button>
        </Tooltip>
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact small, comfortable medium',
  render: () => (
    <FluentDensities
      render={(density) => (
        <Tooltip content="Save the endeavor">
          <Button size={buttonSizeForDensity(density)}>Save</Button>
        </Tooltip>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Label.render()}
      {Description.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
