import { Check, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button, buttonSizeForDensity } from './button'

export default {
  title: 'Design system/Primitives/Button',
  component: Button,
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--kro-color-fore-secondary)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {children}
      </div>
    </div>
  )
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
        color: 'var(--kro-color-fore)',
        padding: 24,
        minHeight: 200,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {children}
    </div>
  )
}

export const Variants = {
  render: () => (
    <Stage>
      <Row label="Variants">
        <Button variant="primary">Start session</Button>
        <Button variant="secondary">Reschedule</Button>
        <Button variant="ghost">Skip</Button>
        <Button variant="destructive">Delete endeavor</Button>
        <Button variant="glass">Focus</Button>
      </Row>
    </Stage>
  ),
}

export const Sizes = {
  render: () => (
    <Stage>
      <Row label="Sizes — compact 28px pointer / comfortable 44px touch">
        <Button size={buttonSizeForDensity('compact')}>Compact</Button>
        <Button size={buttonSizeForDensity('comfortable')}>Comfortable</Button>
        <Button size="lg">Large</Button>
        <Button size="pill">Pill</Button>
      </Row>
      <Row label="Icon only">
        <Button size="icon" aria-label="Add endeavor">
          <Plus />
        </Button>
        <Button size="icon-sm" aria-label="Add endeavor">
          <Plus />
        </Button>
      </Row>
    </Stage>
  ),
}

export const WithIcons = {
  name: 'With icons · lucide, mapped from SF Symbols',
  render: () => (
    <Stage>
      <Row label="Leading glyph">
        <Button variant="primary">
          <Check /> Complete
        </Button>
        <Button variant="secondary">
          <Plus /> Add for today
        </Button>
        <Button variant="destructive">
          <Trash2 /> Delete
        </Button>
      </Row>
    </Stage>
  ),
}

export const Disabled = {
  name: 'Disabled · the fade is applied once',
  render: () => (
    <Stage>
      <Row label="Disabled">
        <Button variant="primary" disabled>
          Start session
        </Button>
        <Button variant="secondary" disabled>
          Reschedule
        </Button>
        <Button variant="destructive" disabled>
          Delete
        </Button>
      </Row>
      <p
        style={{
          fontSize: 13,
          color: 'var(--kro-color-fore-secondary)',
          maxWidth: '52ch',
        }}
      >
        0.62 opacity, once per control. A wrapper that dims its subtree as well
        would multiply the two to roughly 0.38 and put the control under the 3:1
        floor for UI elements.
      </p>
    </Stage>
  ),
}

export const DarkScheme = {
  render: () => (
    <Stage theme="dark">
      <Row label="Variants">
        <Button variant="primary">Start session</Button>
        <Button variant="secondary">Reschedule</Button>
        <Button variant="ghost">Skip</Button>
        <Button variant="destructive">Delete endeavor</Button>
      </Row>
    </Stage>
  ),
}
