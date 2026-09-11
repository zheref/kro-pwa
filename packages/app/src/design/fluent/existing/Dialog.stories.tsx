import { Button } from '../../system/primitives/button'
import { Dialog, DialogTrigger } from '../../system/primitives/dialog'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Surfaces/Dialog',
  component: Dialog,
}

const Default = {
  name: 'Trigger · the panel is Storybook-only (Radix stalls jsdom)',
  render: () => (
    <FluentStage>
      <FluentRow label="Modal">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="primary">Triage inbox</Button>
          </DialogTrigger>
        </Dialog>
      </FluentRow>
    </FluentStage>
  ),
}

const Disabled = {
  name: 'Disabled trigger',
  render: () => (
    <FluentStage>
      <FluentRow label="Locked">
        <Button variant="primary" disabled>
          Triage inbox
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
        <Button variant="primary">Triage inbox</Button>
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
        <Button size={density === 'compact' ? 'sm' : 'md'} variant="primary">
          Triage inbox
        </Button>
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
