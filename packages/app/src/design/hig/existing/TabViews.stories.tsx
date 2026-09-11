import type { ReactNode } from 'react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../system/primitives/tabs'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'HIG/Layout and organization/Tab views',
  component: TabsList,
}

function Panel({ children }: { readonly children: ReactNode }) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: 'var(--kro-space-medium)',
        borderRadius: 'var(--kro-radius-surface)',
        background: 'var(--kro-color-absolute)',
        color: 'var(--kro-color-fore)',
        boxShadow: 'var(--kro-shadow-surface)',
      }}
    >
      {children}
    </div>
  )
}

const PlanModes = {
  name: 'Plan modes · timeline, list, matrix',
  render: () => (
    <HigStage gradient>
      <HigRow label="In-surface modes, not routes">
        <Tabs defaultValue="timeline">
          <TabsList aria-label="Plan mode">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="matrix">Matrix</TabsTrigger>
          </TabsList>
          <TabsContent value="timeline">
            <Panel>A 60px-per-hour grid for the selected day.</Panel>
          </TabsContent>
          <TabsContent value="list">
            <Panel>Everything for the day, flat and sortable.</Panel>
          </TabsContent>
          <TabsContent value="matrix">
            <Panel>Value against urgency, four quadrants.</Panel>
          </TabsContent>
        </Tabs>
      </HigRow>
    </HigStage>
  ),
}

const WithDisabled = {
  name: 'With a disabled mode',
  render: () => (
    <HigStage gradient>
      <HigRow label="Matrix is behind a flag">
        <Tabs defaultValue="timeline">
          <TabsList aria-label="Plan mode">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="matrix" disabled>
              Matrix
            </TabsTrigger>
          </TabsList>
          <TabsContent value="timeline">
            <Panel>
              Matrix is behind a feature flag that is off by default.
            </Panel>
          </TabsContent>
        </Tabs>
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the raised segment still reads',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="List">
        <Tabs defaultValue="list">
          <TabsList aria-label="Plan mode">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="matrix">Matrix</TabsTrigger>
          </TabsList>
          <TabsContent value="list">
            <Panel>Everything for the day, flat and sortable.</Panel>
          </TabsContent>
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
        <Tabs defaultValue="timeline">
          <TabsList aria-label="Plan mode" density={density}>
            <TabsTrigger value="timeline" density={density}>
              Timeline
            </TabsTrigger>
            <TabsTrigger value="list" density={density}>
              List
            </TabsTrigger>
          </TabsList>
          <TabsContent value="timeline">
            <Panel>A 60px-per-hour grid for the selected day.</Panel>
          </TabsContent>
        </Tabs>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {PlanModes.render()}
      {WithDisabled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
