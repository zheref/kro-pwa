import type { ReactNode } from 'react'
import { Input } from '../../system/primitives/input'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'HIG/Selection and input/Text fields',
  component: Input,
}

function Field({
  label,
  hint,
  children,
}: {
  readonly label: string
  readonly hint?: string
  readonly children: ReactNode
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control arrives as `children` — every call site passes an <Input>
    <label style={{ display: 'grid', gap: 6, width: 320 }}>
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
    <HigStage>
      <HigRow label="Title and when">
        <Field label="Title">
          <Input placeholder="What needs doing?" />
        </Field>
        <Field label="When">
          <Input type="date" />
        </Field>
      </HigRow>
    </HigStage>
  ),
}

const Invalid = {
  name: 'Invalid · named, not just red',
  render: () => (
    <HigStage>
      <HigRow label="A title is required">
        <Field
          label="Title"
          hint="A title is required before this can be saved."
        >
          <Input aria-invalid defaultValue="" placeholder="What needs doing?" />
        </Field>
      </HigRow>
    </HigStage>
  ),
}

const Disabled = {
  name: 'Disabled · read-only from the calendar',
  render: () => (
    <HigStage>
      <HigRow label="Host">
        <Field
          label="Host"
          hint="This endeavor is read-only — it came from Google Calendar."
        >
          <Input disabled defaultValue="Google Calendar" />
        </Field>
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the border is why it stays visible',
  render: () => (
    <HigBothSchemes>
      <HigRow label="Title">
        <Field label="Title">
          <Input placeholder="What needs doing?" />
        </Field>
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <Field label="Title">
          <Input density={density} placeholder="What needs doing?" />
        </Field>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Default.render()}
      {Invalid.render()}
      {Disabled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
