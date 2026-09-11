import { Calendar, Circle, LayoutGrid, Search } from 'lucide-react'
import { Nav } from './Nav'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'
import { fluentSizeForDensity } from '../sizes'

export default {
  title: 'Fluent 2/Navigation/Nav',
  component: Nav,
}

const ITEMS = [
  {
    id: 'do',
    label: 'Do',
    icon: Calendar,
    children: [
      { id: 'today', label: 'Today' },
      { id: 'inbox', label: 'Inbox' },
    ],
  },
  {
    id: 'plan',
    label: 'Plan',
    icon: LayoutGrid,
    children: [
      { id: 'matrix', label: 'Matrix' },
      { id: 'blueprint', label: 'Blueprint' },
    ],
  },
  { id: 'earn', label: 'Earn', icon: Circle },
  { id: 'find', label: 'Find', icon: Search },
]

const Destinations = {
  name: 'Destinations · nested categories and a pressed row',
  render: () => (
    <FluentStage gradient>
      <FluentRow label="Today is current">
        <Nav items={ITEMS} selectedId="today" onSelect={() => {}} />
      </FluentRow>
    </FluentStage>
  ),
}

const Subtle = {
  name: 'Subtle · the same destinations, quieter chrome',
  render: () => (
    <FluentStage gradient>
      <FluentRow label="Appearance">
        <Nav
          items={ITEMS}
          selectedId="plan"
          appearance="subtle"
          onSelect={() => {}}
        />
      </FluentRow>
    </FluentStage>
  ),
}

const Unselected = {
  name: 'Nothing selected · rows stay flush',
  render: () => (
    <FluentStage gradient>
      <FluentRow label="No current page">
        <Nav items={ITEMS} onSelect={() => {}} />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · pressed glass still reads',
  render: () => (
    <FluentBothSchemes gradient>
      <FluentRow label="Inbox selected">
        <Nav items={ITEMS} selectedId="inbox" onSelect={() => {}} />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact small, comfortable medium',
  render: () => (
    <FluentDensities
      gradient
      render={(density) => (
        <Nav
          size={fluentSizeForDensity(density)}
          items={ITEMS}
          selectedId="today"
          onSelect={() => {}}
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Destinations.render()}
      {Subtle.render()}
      {Unselected.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
