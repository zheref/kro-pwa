import { ChevronLeft, Ellipsis } from 'lucide-react'
import { iconButtonSizeForDensity } from '../../system/density'
import { Button } from '../../system/primitives/button'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'
import { NavigationBar } from './NavigationBar'
import { StoryGallery } from '../../storybook/storyGallery'

export default {
  title: 'HIG/Navigation and search/Navigation bars',
  component: NavigationBar,
}

function BackButton() {
  return (
    <Button variant="ghost" size="icon" aria-label="Back">
      <ChevronLeft />
    </Button>
  )
}

function MoreButton() {
  return (
    <Button variant="ghost" size="icon" aria-label="More">
      <Ellipsis />
    </Button>
  )
}

const Compact = {
  name: 'Compact · title in the bar',
  render: () => (
    <HigStage gradient>
      <HigRow label="Leading back · trailing more">
        <div style={{ width: '100%' }}>
          <NavigationBar
            title="Write the KroTokens port"
            leading={<BackButton />}
            trailing={<MoreButton />}
          />
        </div>
      </HigRow>
    </HigStage>
  ),
}

const LargeTitle = {
  name: 'Large title · below the bar',
  render: () => (
    <HigStage gradient>
      <HigRow label="My Day">
        <div style={{ width: '100%' }}>
          <NavigationBar
            title="My Day"
            leading={<BackButton />}
            trailing={<MoreButton />}
            large
          />
        </div>
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the bar still reads',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="Over the field">
        <div style={{ width: '100%' }}>
          <NavigationBar
            title="Plan"
            leading={<BackButton />}
            trailing={<MoreButton />}
          />
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
        <div style={{ width: '100%' }}>
          <NavigationBar
            density={density}
            title="Write the KroTokens port"
            leading={
              <Button
                variant="ghost"
                size={iconButtonSizeForDensity(density)}
                aria-label="Back"
              >
                <ChevronLeft />
              </Button>
            }
            trailing={
              <Button
                variant="ghost"
                size={iconButtonSizeForDensity(density)}
                aria-label="More"
              >
                <Ellipsis />
              </Button>
            }
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
      {Compact.render()}
      {LargeTitle.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
