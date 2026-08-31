import type { ReactNode } from 'react'
import { Input } from './input'

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
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--kro-color-fore)' }}>
        {label}
      </span>
      {children}
      {hint === undefined ? null : (
        <span style={{ fontSize: 12, color: 'var(--kro-color-fore-secondary)' }}>
          {hint}
        </span>
      )}
    </label>
  )
}

export const Default = {
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

export const Invalid = {
  name: 'Invalid · named, not just red',
  render: () => (
    <Stage>
      <Field label="Title" hint="A title is required before this can be saved.">
        <Input aria-invalid defaultValue="" placeholder="What needs doing?" />
      </Field>
    </Stage>
  ),
}

export const Disabled = {
  render: () => (
    <Stage>
      <Field label="Host" hint="This endeavor is read-only — it came from Google Calendar.">
        <Input disabled defaultValue="Google Calendar" />
      </Field>
    </Stage>
  ),
}

export const DarkScheme = {
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
