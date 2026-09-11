import { Button } from '../../system/primitives/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '../../system/primitives/dropdown-menu'
import { Popover, PopoverTrigger } from '../../system/primitives/popover'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Surfaces/Menu',
  component: DropdownMenu,
}

const Default = {
  name: 'Trigger · the panel is Storybook-only (Radix stalls jsdom)',
  render: () => (
    <FluentStage>
      <FluentRow label="Menu">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">Add</Button>
          </DropdownMenuTrigger>
        </DropdownMenu>
      </FluentRow>
    </FluentStage>
  ),
}

const PopoverTriggerRow = {
  name: 'Popover trigger · same constraint',
  render: () => (
    <FluentStage>
      <FluentRow label="Popover">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary">Visibility</Button>
          </PopoverTrigger>
        </Popover>
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark',
  render: () => (
    <FluentBothSchemes gradient>
      <FluentRow label="Trigger">
        <Button variant="secondary">Add</Button>
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities',
  render: () => (
    <FluentDensities
      gradient
      render={(density) => (
        <Button size={density === 'compact' ? 'sm' : 'md'}>Add</Button>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Default.render()}
      {PopoverTriggerRow.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
