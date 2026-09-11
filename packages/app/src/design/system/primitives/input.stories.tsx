import type { ReactNode } from 'react'
import { Input } from './input'
import { StoryGallery } from '../../storybook/storyGallery'

export default {
  title: 'Design system/Primitives/Input',
  component: Input,
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
        background: 'var(--kro-color-back)',
        padding: 24,
        minHeight: 220,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 420,
          display: 'grid',
          gap: 'var(--kro-space-medium)',
          background: 'var(--kro-color-absolute)',
          borderRadius: 'var(--kro-radius-surface)',
          boxShadow: 'var(--kro-shadow-surface)',
          padding: 'var(--kro-space-medium)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control arrives as `children` — every call site passes an <Input>, which the rule cannot see through a prop
    <label style={{ display: 'grid', gap: 6 }}>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--kro-color-fore)',
        }}
      >
        {label}
      </span>
      {children}
      {hint === undefined ? null : (
        <span
          style={{ fontSize: 12, color: 'var(--kro-color-fore-secondary)' }}
        >
          {hint}
        </span>
      )}
    </label>
  )
}

const Default = {
  name: 'Default · on a card',
  render: () => (
    <Stage>
      <Field label="Title">
        <Input placeholder="What needs doing?" />
      </Field>
      <Field label="When">
        <Input type="date" />
      </Field>
    </Stage>
  ),
}

const Invalid = {
  name: 'Invalid · named, not just red',
  render: () => (
    <Stage>
      <Field label="Title" hint="A title is required before this can be saved.">
        <Input aria-invalid defaultValue="" placeholder="What needs doing?" />
      </Field>
    </Stage>
  ),
}

const Disabled = {
  render: () => (
    <Stage>
      <Field
        label="Host"
        hint="This endeavor is read-only — it came from Google Calendar."
      >
        <Input disabled defaultValue="Google Calendar" />
      </Field>
    </Stage>
  ),
}

const DarkScheme = {
  name: 'Dark scheme · the border is why it stays visible',
  render: () => (
    <Stage theme="dark">
      <Field label="Title">
        <Input placeholder="What needs doing?" />
      </Field>
      <Field label="Host">
        <Input disabled defaultValue="Google Calendar" />
      </Field>
    </Stage>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <Stage>
      <Field label="Compact · default">
        <Input density="compact" placeholder="What needs doing?" />
      </Field>
      <Field label="Comfortable · mobile">
        <Input density="comfortable" placeholder="What needs doing?" />
      </Field>
    </Stage>
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Default.render()}
      {Invalid.render()}
      {Disabled.render()}
      {DarkScheme.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
