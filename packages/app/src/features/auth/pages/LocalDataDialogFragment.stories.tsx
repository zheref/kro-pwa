import type { ReactNode } from 'react'
import { LocalDataDialogFragment } from './LocalDataDialogFragment'

/**
 * The existing-local-data dialog — canon's three-button alert.
 *
 * It is a Radix dialog and renders into a portal, so each story mounts it
 * inside a themed stage that fills the frame; what the story shows is the
 * panel over its scrim, which is what the user sees.
 */
export default {
  title: 'Auth/Local data dialog',
  component: LocalDataDialogFragment,
  parameters: { layout: 'fullscreen' },
}

const noop = () => {}

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
        minHeight: 420,
        background: 'var(--kro-color-back)',
      }}
    >
      {children}
    </div>
  )
}

const dialog = (
  overrides: Partial<Parameters<typeof LocalDataDialogFragment>[0]> = {},
) => (
  <LocalDataDialogFragment
    isPresented
    anonymousCount={3}
    isResolving={false}
    onChoose={noop}
    onDismiss={noop}
    {...overrides}
  />
)

/** The ordinary case: several rows on the device, three ways forward. */
export const ThreeChoices = {
  render: () => <Stage>{dialog()}</Stage>,
}

/** A single row — the message reads in the singular. */
export const SingleEndeavor = {
  render: () => <Stage>{dialog({ anonymousCount: 1 })}</Stage>,
}

/** A choice being applied: every button locks, the prompt stays. */
export const Resolving = {
  render: () => <Stage>{dialog({ isResolving: true })}</Stage>,
}

/** Both schemes. */
export const BothSchemes = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Stage theme="light">{dialog()}</Stage>
      <Stage theme="dark">{dialog({ anonymousCount: 12 })}</Stage>
    </div>
  ),
}
