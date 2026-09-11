import { Calendar, Circle, Inbox, LayoutGrid, Search } from 'lucide-react'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'
import { Sidebar } from './Sidebar'
import { StoryGallery } from '../../storybook/storyGallery'

export default {
  title: 'HIG/Navigation and search/Sidebars',
  component: Sidebar,
}

const ITEMS = [
  { id: 'today', label: 'Today', icon: Calendar, section: 'Do' },
  { id: 'inbox', label: 'Inbox', icon: Inbox, section: 'Do' },
  { id: 'plan', label: 'Plan', icon: LayoutGrid, section: 'Plan' },
  { id: 'earn', label: 'Earn', icon: Circle, section: 'Reflect' },
  { id: 'find', label: 'Find', icon: Search, section: 'Reflect' },
]

const Destinations = {
  name: 'Destinations · sections and a pressed row',
  render: () => (
    <HigStage gradient>
      <HigRow label="Today is current">
        <Sidebar
          title="Kro"
          items={ITEMS}
          selectedId="today"
          onSelect={() => {}}
        />
      </HigRow>
    </HigStage>
  ),
}

const Unselected = {
  name: 'Nothing selected · rows stay flush',
  render: () => (
    <HigStage gradient>
      <HigRow label="No current page">
        <Sidebar items={ITEMS} onSelect={() => {}} />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · pressed glass still reads',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="Plan selected">
        <Sidebar
          title="Kro"
          items={ITEMS}
          selectedId="plan"
          onSelect={() => {}}
        />
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <Sidebar
          density={density}
          title="Kro"
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
      {Unselected.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
