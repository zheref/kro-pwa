import type { ReactNode } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

/**
 * Plan's in-tab modes. This primitive is for switching a MODE inside a
 * surface; the tab bar and the sidebar are routes, and belong to the shell
 * (#13).
 */
export default {
  title: 'Design system/Primitives/Tabs',
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
    <div
      data-theme={theme}
      style={{
        background:
          'linear-gradient(120deg, var(--kro-color-header-gradient-indigo), var(--kro-color-header-gradient-grape))',
        padding: 32,
        minHeight: 240,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {children}
    </div>
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

export const PlanModes = {
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

export const WithDisabled = {
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

export const TwoModes = {
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

export const DarkScheme = {
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
