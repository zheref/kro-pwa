import { Tabs, TabsList, TabsTrigger } from '../../system/primitives/tabs'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Navigation/Tablist',
  component: TabsList,
}

const Default = {
  name: 'Transparent / subtle · in-surface modes, not navigation',
  render: () => (
    <FluentStage gradient>
      <FluentRow label="Plan mode">
        <Tabs defaultValue="list">
          <TabsList aria-label="Plan mode">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="matrix">Matrix</TabsTrigger>
          </TabsList>
        </Tabs>
      </FluentRow>
    </FluentStage>
  ),
}

const Disabled = {
  name: 'Disabled tab · the fade is applied once',
  render: () => (
    <FluentStage gradient>
      <FluentRow label="Matrix is not ready">
        <Tabs defaultValue="list">
          <TabsList aria-label="Plan mode">
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="matrix" disabled>
              Matrix
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the raised segment still reads',
  render: () => (
    <FluentBothSchemes gradient>
      <FluentRow label="Focus">
        <Tabs defaultValue="focus">
          <TabsList aria-label="Session kind">
            <TabsTrigger value="focus">Focus</TabsTrigger>
            <TabsTrigger value="break">Break</TabsTrigger>
          </TabsList>
        </Tabs>
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities',
  render: () => (
    <FluentDensities
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
      {Default.render()}
      {Disabled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
