import { Check, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { StoryGallery } from '../../storybook/storyGallery'
import { StoryTheme } from '../../storybook/galleryAppearance'
import { Button, buttonSizeForDensity } from './button'

export default {
  title: 'Actions/Button',
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
    <StoryTheme
      theme={theme}
      style={{
        background:
          'linear-gradient(135deg, var(--kro-color-header-gradient-indigo), var(--kro-color-header-gradient-grape))',
        color: 'var(--kro-color-fore)',
        padding: 24,
        minHeight: 200,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {children}
    </StoryTheme>
  )
}

const Variants = {
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

const Sizes = {
  render: () => (
    <Stage>
      <Row label="Sizes — compact default / comfortable mobile / 44px lg">
        <Button size={buttonSizeForDensity('compact')}>Compact</Button>
        <Button size={buttonSizeForDensity('comfortable')}>Comfortable</Button>
        <Button size="lg">Large · 44px floor</Button>
        <Button size="pill">Pill</Button>
      </Row>
      <Row label="Icon only">
        <Button size="icon-sm" aria-label="Add endeavor">
          <Plus />
        </Button>
        <Button size="icon" aria-label="Add endeavor">
          <Plus />
        </Button>
      </Row>
    </Stage>
  ),
}

const WithIcons = {
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

const Appearances = {
  name: 'Appearances · outline, subtle and transparent live on Button',
  render: () => (
    <Stage>
      <Row label="Fluent appearances">
        <Button variant="outline">outline</Button>
        <Button variant="subtle">subtle</Button>
        <Button variant="transparent">transparent</Button>
      </Row>
      <Row label="Shapes">
        <Button shape="rounded">Rounded</Button>
        <Button shape="circular">Circular</Button>
        <Button shape="square">Square</Button>
      </Row>
    </Stage>
  ),
}

const Disabled = {
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

const DarkScheme = {
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

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <Stage>
      <Row label="Compact · default">
        <Button size={buttonSizeForDensity('compact')} variant="primary">
          Start session
        </Button>
        <Button size={buttonSizeForDensity('compact')}>Reschedule</Button>
      </Row>
      <Row label="Comfortable · mobile">
        <Button size={buttonSizeForDensity('comfortable')} variant="primary">
          Start session
        </Button>
        <Button size={buttonSizeForDensity('comfortable')}>Reschedule</Button>
      </Row>
    </Stage>
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Variants.render()}
      {Sizes.render()}
      {WithIcons.render()}
      {Appearances.render()}
      {Disabled.render()}
      {DarkScheme.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
