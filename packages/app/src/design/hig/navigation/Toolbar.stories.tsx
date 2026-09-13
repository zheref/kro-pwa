import { Info, Plus } from 'lucide-react'
import { Button } from '../../system/primitives/button'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'
import { Toolbar } from './Toolbar'
import { StoryGallery } from '../../storybook/storyGallery'

export default {
  title: 'Navigation/Toolbar',
  component: Toolbar,
}

function ComposeGroup() {
  return (
    <Button variant="ghost" size="icon-sm" aria-label="Add endeavor">
      <Plus />
    </Button>
  )
}

function InfoGroup() {
  return (
    <Button variant="ghost" size="icon-sm" aria-label="About this day">
      <Info />
    </Button>
  )
}

const ComposeAndInfo = {
  name: 'Compose · info · a hairline between',
  render: () => (
    <HigStage gradient>
      <HigRow label="Two groups">
        <Toolbar
          groups={[
            [<ComposeGroup key="compose" />],
            [<InfoGroup key="info" />],
          ]}
        />
      </HigRow>
    </HigStage>
  ),
}

const SingleGroup = {
  name: 'Single group · no hairline',
  render: () => (
    <HigStage>
      <HigRow label="Compose only">
        <Toolbar groups={[[<ComposeGroup key="compose" />]]} />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the cluster stays glass',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="Over the field">
        <Toolbar
          groups={[
            [<ComposeGroup key="compose" />],
            [<InfoGroup key="info" />],
          ]}
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
        <Toolbar
          density={density}
          groups={[
            [<ComposeGroup key="compose" />],
            [<InfoGroup key="info" />],
          ]}
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {ComposeAndInfo.render()}
      {SingleGroup.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
