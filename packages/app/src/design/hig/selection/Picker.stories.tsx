import { Picker } from './Picker'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

const QUADRANTS = [
  { value: 'prioritize', label: 'Prioritize — Urgent · Important' },
  { value: 'decide', label: 'Schedule — Important · Not Urgent' },
  { value: 'delegate', label: 'Delegate — Urgent · Not Important' },
  { value: 'delete', label: 'Archive — Neither' },
] as const

export default {
  title: 'Forms/Picker',
  component: Picker,
}

const DueDate = {
  name: 'Date · the platform owns the calendar',
  render: () => (
    <HigStage>
      <HigRow label="When this endeavor is due">
        <Picker kind="date" label="Due date" defaultValue="2026-09-09" />
      </HigRow>
    </HigStage>
  ),
}

const SessionTime = {
  name: 'Time · the platform owns the clock',
  render: () => (
    <HigStage>
      <HigRow label="When the next session starts">
        <Picker kind="time" label="Session starts" defaultValue="09:30" />
      </HigRow>
    </HigStage>
  ),
}

const QuadrantList = {
  name: 'List · Prioritize, Schedule, Delegate, Archive',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="Triage this endeavor">
        <Picker
          kind="list"
          label="Quadrant"
          options={QUADRANTS}
          defaultValue="prioritize"
        />
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <Picker
          density={density}
          kind="list"
          id={`quadrant-${density}`}
          label="Quadrant"
          options={QUADRANTS}
          defaultValue="prioritize"
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {DueDate.render()}
      {SessionTime.render()}
      {QuadrantList.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
