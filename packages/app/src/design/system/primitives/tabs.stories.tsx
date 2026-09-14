import type { ReactNode } from 'react'
import { StoryGallery } from '../../storybook/storyGallery'
import { StoryTheme } from '../../storybook/galleryAppearance'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

/**
 * Plan's in-tab modes. This primitive is for switching a MODE inside a
 * surface; the tab bar and the sidebar are routes, and belong to the shell
 * (#13).
 */
export default {
  title: 'Navigation/Tabs',
  component: TabsList,
}

function Stage({
  theme = 'light',
  children,
}: {
  theme?: 'light' | 'dark'
  children: ReactNode
}) {
  return (
    <StoryTheme
      theme={theme}
      style={{
        background:
          'linear-gradient(120deg, var(--kro-color-header-gradient-indigo), var(--kro-color-header-gradient-grape))',
        padding: 32,
        minHeight: 240,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {children}
    </StoryTheme>
  )
}

function Panel({ children }: { children: ReactNode }) {
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
  render: () => (
    <Stage>
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
    </Stage>
  ),
}

const WithDisabled = {
  name: 'With a disabled mode',
  render: () => (
    <Stage>
      <Tabs defaultValue="timeline">
        <TabsList aria-label="Plan mode">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="matrix" disabled>
            Matrix
          </TabsTrigger>
        </TabsList>
        <TabsContent value="timeline">
          <Panel>Matrix is behind a feature flag that is off by default.</Panel>
        </TabsContent>
      </Tabs>
    </Stage>
  ),
}

const TwoModes = {
  name: 'Two modes',
  render: () => (
    <Stage>
      <Tabs defaultValue="focus">
        <TabsList aria-label="Session kind">
          <TabsTrigger value="focus">Focus</TabsTrigger>
          <TabsTrigger value="break">Break</TabsTrigger>
        </TabsList>
        <TabsContent value="focus">
          <Panel>25 minutes.</Panel>
        </TabsContent>
        <TabsContent value="break">
          <Panel>5 minutes.</Panel>
        </TabsContent>
      </Tabs>
    </Stage>
  ),
}

const DarkScheme = {
  render: () => (
    <Stage theme="dark">
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
    </Stage>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <Stage>
      <div style={{ display: 'grid', gap: 24 }}>
        <Tabs defaultValue="timeline">
          <TabsList aria-label="Compact plan mode" density="compact">
            <TabsTrigger value="timeline" density="compact">
              Timeline
            </TabsTrigger>
            <TabsTrigger value="list" density="compact">
              List
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs defaultValue="timeline">
          <TabsList aria-label="Comfortable plan mode" density="comfortable">
            <TabsTrigger value="timeline" density="comfortable">
              Timeline
            </TabsTrigger>
            <TabsTrigger value="list" density="comfortable">
              List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </Stage>
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {PlanModes.render()}
      {WithDisabled.render()}
      {TwoModes.render()}
      {DarkScheme.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
