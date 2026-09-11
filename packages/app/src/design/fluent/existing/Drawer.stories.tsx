import { Button } from '../../system/primitives/button'
import { Sheet, SheetTrigger } from '../../system/primitives/sheet'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Surfaces/Drawer',
  component: Sheet,
}

const Default = {
  name: 'Trigger · the panel is Storybook-only (Radix stalls jsdom)',
  render: () => (
    <FluentStage>
      <FluentRow label="Overlay from an edge">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary">Open inbox</Button>
          </SheetTrigger>
        </Sheet>
      </FluentRow>
    </FluentStage>
  ),
}

const Disabled = {
  name: 'Disabled trigger',
  render: () => (
    <FluentStage>
      <FluentRow label="Locked">
        <Button variant="secondary" disabled>
          Open inbox
        </Button>
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark',
  render: () => (
    <FluentBothSchemes gradient>
      <FluentRow label="Trigger">
        <Button variant="secondary">Open inbox</Button>
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
        <Button size={density === 'compact' ? 'sm' : 'md'}>Open inbox</Button>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Default.render()}
      {Disabled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
