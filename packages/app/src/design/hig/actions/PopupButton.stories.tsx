import { useState } from 'react'
import { PopupButton } from './PopupButton'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'Actions/Pop-up button',
  component: PopupButton,
}

const KINDS = [
  { value: 'task', label: 'Task' },
  { value: 'habit', label: 'Habit' },
  { value: 'event', label: 'Event' },
]

function KindPopup() {
  const [value, setValue] = useState('task')
  return (
    <PopupButton
      value={value}
      options={KINDS}
      onValueChange={setValue}
      aria-label="Endeavor kind"
    />
  )
}

const KindPicker = {
  name: 'Kind · the trigger shows the current choice',
  render: () => (
    <HigStage>
      <HigRow label="Current kind">
        <KindPopup />
      </HigRow>
    </HigStage>
  ),
}

const Disabled = {
  name: 'Disabled · the fade is applied once',
  render: () => (
    <HigStage>
      <HigRow label="Locked kind">
        <PopupButton
          value="habit"
          options={KINDS}
          disabled
          onValueChange={() => {}}
        />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the selection still reads',
  render: () => (
    <HigBothSchemes>
      <HigRow label="Kind">
        <KindPopup />
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <PopupButton
          density={density}
          value="task"
          options={KINDS}
          onValueChange={() => {}}
          aria-label="Endeavor kind"
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {KindPicker.render()}
      {Disabled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
