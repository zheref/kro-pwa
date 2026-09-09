import type { ReactNode } from 'react'
import { designSystemMocks } from '../DesignSystemMocks'
import { DesignSystemFragment } from './DesignSystemFragment'

/**
 * The in-app Storybook gallery. Every story is built from `designSystemMocks`
 * — never from inline props — so the story set and the render tests cannot
 * drift (`RC-11`, `RC-31`).
 */
export default {
  title: 'Design system/Gallery',
  component: DesignSystemFragment,
  parameters: { layout: 'fullscreen' },
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
        position: 'relative',
        height: 640,
        background: 'var(--kro-color-back)',
      }}
    >
      {children}
    </div>
  )
}

/** Lands on Tokens / Palette, the catalog's default story. */
export const Default = {
  render: () => (
    <Stage>
      <DesignSystemFragment {...designSystemMocks.default} />
    </Stage>
  ),
}

/** A primitive in the canvas — Button / Variants. */
export const ButtonVariants = {
  render: () => (
    <Stage>
      <DesignSystemFragment {...designSystemMocks.buttonVariants} />
    </Stage>
  ),
}

/** Bottom chrome — the FAB against the busy backdrop. */
export const ChromeFab = {
  render: () => (
    <Stage>
      <DesignSystemFragment {...designSystemMocks.chromeFab} />
    </Stage>
  ),
}

/** The same gallery in the dark scheme. */
export const DarkScheme = {
  render: () => (
    <Stage theme="dark">
      <DesignSystemFragment {...designSystemMocks.endeavorCard} />
    </Stage>
  ),
}
