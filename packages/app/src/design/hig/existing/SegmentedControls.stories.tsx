import { Tabs, TabsList, TabsTrigger } from '../../system/primitives/tabs'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'HIG/Selection and input/Segmented controls',
  component: TabsList,
}

const TwoSegments = {
  name: 'Two segments · Focus or Break',
  render: () => (
    <HigStage gradient>
      <HigRow label="Session kind">
        <Tabs defaultValue="focus">
          <TabsList aria-label="Session kind">
            <TabsTrigger value="focus">Focus</TabsTrigger>
            <TabsTrigger value="break">Break</TabsTrigger>
          </TabsList>
        </Tabs>
      </HigRow>
    </HigStage>
  ),
}

const ThreeSegments = {
  name: 'Three segments · Plan modes',
  render: () => (
    <HigStage gradient>
      <HigRow label="No panels — the control is the story">
        <Tabs defaultValue="list">
          <TabsList aria-label="Plan mode">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="matrix">Matrix</TabsTrigger>
          </TabsList>
        </Tabs>
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the raised segment still reads',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="Focus">
        <Tabs defaultValue="focus">
          <TabsList aria-label="Session kind">
            <TabsTrigger value="focus">Focus</TabsTrigger>
            <TabsTrigger value="break">Break</TabsTrigger>
          </TabsList>
        </Tabs>
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <Tabs defaultValue="focus">
          <TabsList aria-label="Session kind" density={density}>
            <TabsTrigger value="focus" density={density}>
              Focus
            </TabsTrigger>
            <TabsTrigger value="break" density={density}>
              Break
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {TwoSegments.render()}
      {ThreeSegments.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
