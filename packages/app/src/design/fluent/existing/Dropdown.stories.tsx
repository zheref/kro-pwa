import { useState } from 'react'
import { PopupButton } from '../../hig/actions/PopupButton'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  FluentBothSchemes,
  FluentDensities,
  FluentRow,
  FluentStage,
} from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Forms/Dropdown',
  component: PopupButton,
}

const OPTIONS = [
  { value: 'focus', label: 'Focus' },
  { value: 'habit', label: 'Habit' },
  { value: 'event', label: 'Event' },
] as const

function KindDropdown({
  disabled,
  density,
}: {
  readonly disabled?: boolean
  readonly density?: 'compact' | 'comfortable'
}) {
  const [value, setValue] = useState('focus')
  return (
    <PopupButton
      value={value}
      options={[...OPTIONS]}
      onValueChange={setValue}
      aria-label="Kind"
      disabled={disabled}
      density={density}
    />
  )
}

const Default = {
  name: 'Closed list · the trigger shows the current choice',
  render: () => (
    <FluentStage>
      <FluentRow label="Kind">
        <KindDropdown />
      </FluentRow>
    </FluentStage>
  ),
}

const Disabled = {
  name: 'Disabled',
  render: () => (
    <FluentStage>
      <FluentRow label="Kind">
        <KindDropdown disabled />
      </FluentRow>
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark',
  render: () => (
    <FluentBothSchemes>
      <FluentRow label="Kind">
        <KindDropdown />
      </FluentRow>
    </FluentBothSchemes>
  ),
}

const Densities = {
  name: 'Densities',
  render: () => (
    <FluentDensities render={(density) => <KindDropdown density={density} />} />
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
