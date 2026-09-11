import { SplitButton } from './SplitButton'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'
import { FLUENT_CONTROL_SIZES, fluentSizeForDensity } from '../sizes'

export default {
  title: 'Fluent 2/Actions/Split button',
  component: SplitButton,
}

function saveItems() {
  return [
    { id: 'save-copy', label: 'Save a copy', onSelect: () => {} },
    { id: 'save-as', label: 'Save as template', onSelect: () => {} },
    {
      id: 'delete',
      label: 'Delete endeavor',
      tone: 'destructive' as const,
      onSelect: () => {},
    },
  ]
}

const Appearances = {
  name: 'Appearances · primary action plus related ones',
  render: () => (
    <FluentStage gradient>
      <FluentRow label="Primary · secondary · outline">
        <SplitButton appearance="primary" items={saveItems()}>
          Save
        </SplitButton>
        <SplitButton items={saveItems()}>Save</SplitButton>
        <SplitButton appearance="outline" items={saveItems()}>
          Save
        </SplitButton>
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
          <SplitButton key={size} size={size} items={saveItems()}>
            Save
          </SplitButton>
        ))}
      </FluentRow>
    </FluentStage>
  ),
}

const Disabled = {
  name: 'Disabled · the fade is applied once, on each face',
  render: () => (
    <FluentStage>
      <FluentRow label="Locked">
        <SplitButton appearance="primary" items={saveItems()} disabled>
          Save
        </SplitButton>
        <SplitButton items={saveItems()} disabled>
          Save
        </SplitButton>
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · Save is still the face',
  render: () => (
    <FluentBothSchemes gradient>
      <FluentRow label="Save">
        <SplitButton items={saveItems()}>Save</SplitButton>
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
        <SplitButton size={fluentSizeForDensity(density)} items={saveItems()}>
          Save
        </SplitButton>
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
