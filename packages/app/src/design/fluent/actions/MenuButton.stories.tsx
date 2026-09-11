import { MenuButton } from './MenuButton'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'
import { FLUENT_CONTROL_SIZES, fluentSizeForDensity } from '../sizes'

export default {
  title: 'Fluent 2/Actions/Menu button',
  component: MenuButton,
}

function addItems() {
  return [
    { id: 'task', label: 'Task', onSelect: () => {} },
    { id: 'habit', label: 'Habit', onSelect: () => {} },
    { id: 'event', label: 'Event', onSelect: () => {} },
    {
      id: 'delete',
      label: 'Delete endeavor',
      tone: 'destructive' as const,
      onSelect: () => {},
    },
  ]
}

const Appearances = {
  name: 'Appearances · the label never becomes the last action',
  render: () => (
    <FluentStage gradient>
      <FluentRow label="Always Add">
        <MenuButton appearance="primary" label="Add" items={addItems()} />
        <MenuButton label="Add" items={addItems()} />
        <MenuButton appearance="outline" label="Add" items={addItems()} />
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
          <MenuButton key={size} size={size} label="Add" items={addItems()} />
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
        <MenuButton label="Add" items={addItems()} disabled />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · Add is still Add',
  render: () => (
    <FluentBothSchemes gradient>
      <FluentRow label="Add">
        <MenuButton label="Add" items={addItems()} />
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
        <MenuButton
          size={fluentSizeForDensity(density)}
          label="Add"
          items={addItems()}
        />
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
