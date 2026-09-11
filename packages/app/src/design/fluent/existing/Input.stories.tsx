import { Input } from '../../system/primitives/input'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Forms/Input',
  component: Input,
}

const Default = {
  name: 'Outline field · recessed, with a hairline',
  render: () => (
    <FluentStage>
      <FluentRow label="Title">
        <Input placeholder="What needs doing?" aria-label="Title" />
      </FluentRow>
    </FluentStage>
  ),
}

const Disabled = {
  name: 'Disabled · the fade is applied once',
  render: () => (
    <FluentStage>
      <FluentRow label="Host">
        <Input disabled defaultValue="Google Calendar" aria-label="Host" />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the border is why it stays visible',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Title">
        <Input placeholder="What needs doing?" aria-label="Title" />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <FluentDensities
      render={(density) => (
        <Input density={density} placeholder="Title" aria-label="Title" />
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
