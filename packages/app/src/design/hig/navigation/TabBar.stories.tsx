import { Calendar, Circle, LayoutGrid, Search } from 'lucide-react'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'
import { TabBar } from './TabBar'
import { StoryGallery } from '../../storybook/storyGallery'

export default {
  title: 'Navigation/Tab bar',
  component: TabBar,
}

const THREE = [
  { id: 'plan', label: 'Plan', icon: LayoutGrid },
  { id: 'do', label: 'Do', icon: Calendar },
  { id: 'earn', label: 'Earn', icon: Circle },
]

const WITH_SEARCH = [{ id: 'search', label: 'Search', icon: Search }, ...THREE]

const ThreeDestinations = {
  name: 'Plan · Do · Earn',
  render: () => (
    <HigStage gradient>
      <HigRow label="Do is current — the dot is the state">
        <div style={{ width: 360 }}>
          <TabBar items={THREE} selectedId="do" onSelect={() => {}} />
        </div>
      </HigRow>
    </HigStage>
  ),
}

const WithSearch = {
  name: 'With Search · four tabs',
  render: () => (
    <HigStage gradient>
      <HigRow label="Search sits beside the destinations">
        <div style={{ width: 400 }}>
          <TabBar items={WITH_SEARCH} selectedId="plan" onSelect={() => {}} />
        </div>
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the dock still floats',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="Earn">
        <div style={{ width: '100%' }}>
          <TabBar items={THREE} selectedId="earn" onSelect={() => {}} />
        </div>
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <div style={{ width: 360 }}>
          <TabBar
            density={density}
            items={THREE}
            selectedId="do"
            onSelect={() => {}}
          />
        </div>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {ThreeDestinations.render()}
      {WithSearch.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
