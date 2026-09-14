import { Chart } from './Chart'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'Content/Chart',
  component: Chart,
}

const WEEK = [
  { label: 'Focus', value: 4, tone: 'accent' as const },
  { label: 'Habits', value: 2, tone: 'kind-habit' as const },
  { label: 'Events', value: 1, tone: 'kind-event' as const },
]

const HoursThisWeek = {
  name: 'Hours this week · the number sits beside the bar',
  render: () => (
    <HigStage>
      <HigRow label="By kind">
        <Chart values={WEEK} unit="h" />
      </HigRow>
    </HigStage>
  ),
}

const TasksVsHabits = {
  name: 'Tasks and habits · kind tones, not raw colours',
  render: () => (
    <HigStage>
      <HigRow label="Closed today">
        <Chart
          values={[
            { label: 'Write the port', value: 3, tone: 'kind-task' },
            { label: 'Morning walk', value: 1, tone: 'kind-habit' },
            { label: 'Team standup', value: 1, tone: 'kind-event' },
          ]}
        />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the track still recesses',
  render: () => (
    <HigBothSchemes>
      <HigRow label="Hours this week">
        <Chart values={WEEK} unit="h" />
      </HigRow>
    </HigBothSchemes>
  ),
}

const EmptyDay = {
  name: 'An empty day · every bar stays at rest',
  render: () => (
    <HigStage>
      <HigRow label="Nothing logged">
        <Chart
          values={[
            { label: 'Focus', value: 0, tone: 'accent' },
            { label: 'Habits', value: 0, tone: 'kind-habit' },
          ]}
          unit="h"
        />
      </HigRow>
    </HigStage>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => <Chart density={density} values={WEEK} unit="h" />}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {HoursThisWeek.render()}
      {TasksVsHabits.render()}
      {BothSchemes.render()}
      {EmptyDay.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
