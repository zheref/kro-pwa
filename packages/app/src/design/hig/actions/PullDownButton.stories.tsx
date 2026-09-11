import { PullDownButton } from './PullDownButton'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'HIG/Actions/Pull-down buttons',
  component: PullDownButton,
}

function addItems() {
  return [
    { id: 'task', label: 'Task', onSelect: () => {} },
    { id: 'habit', label: 'Habit', onSelect: () => {} },
    { id: 'event', label: 'Event', onSelect: () => {} },
    {
      id: 'delete',
      label: 'Delete endeavor',
      tone: 'destructive' as const,
      onSelect: () => {},
    },
  ]
}

const Add = {
  name: 'Add · the label never becomes the last action',
  render: () => (
    <HigStage>
      <HigRow label="Always Add">
        <PullDownButton label="Add" items={addItems()} />
      </HigRow>
    </HigStage>
  ),
}

const Disabled = {
  name: 'Disabled · the fade is applied once',
  render: () => (
    <HigStage>
      <HigRow label="Locked">
        <PullDownButton label="Add" items={addItems()} disabled />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · Add is still Add',
  render: () => (
    <HigBothSchemes>
      <HigRow label="Add">
        <PullDownButton label="Add" items={addItems()} />
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <PullDownButton density={density} label="Add" items={addItems()} />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Add.render()}
      {Disabled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
