import { TextView } from '../../hig/content/TextView'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Forms/Textarea',
  component: TextView,
}

const Default = {
  name: 'Outline · the same recessed field as Input',
  render: () => (
    <FluentStage>
      <FluentRow label="Notes">
        <TextView label="Notes" placeholder="What happened in the session?" />
      </FluentRow>
    </FluentStage>
  ),
}

const Disabled = {
  name: 'Disabled · the fade is applied once',
  render: () => (
    <FluentStage>
      <FluentRow label="Read-only">
        <TextView
          label="Notes"
          defaultValue="Imported from the calendar."
          disabled
        />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the hairline is why it stays visible',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Notes">
        <TextView label="Notes" placeholder="Notes" />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities',
  render: () => (
    <FluentDensities
      render={(density) => (
        <TextView density={density} label="Notes" placeholder="Notes" />
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
