import { Label } from '../../hig/layout/Label'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Forms/Label',
  component: Label,
}

const Default = {
  name: 'Regular, required, disabled',
  render: () => (
    <FluentStage>
      <FluentRow label="Tones">
        <Label>Title</Label>
        <Label>
          Title <span aria-hidden="true">*</span>
          <span className="sr-only">required</span>
        </Label>
        <Label tone="secondary">Caption</Label>
      </FluentRow>
    </FluentStage>
  ),
}

const Disabled = {
  name: 'Destructive is named in words',
  render: () => (
    <FluentStage>
      <FluentRow label="Destructive">
        <Label tone="destructive">Delete endeavor</Label>
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Primary">
        <Label>Title</Label>
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities',
  render: () => (
    <FluentDensities
      render={(density) => <Label density={density}>Title</Label>}
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
