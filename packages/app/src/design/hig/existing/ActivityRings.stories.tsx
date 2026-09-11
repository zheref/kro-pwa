import {
  ActivityRings,
  dayProgressRings,
} from '../../chrome/rings/ActivityRings'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'HIG/Status/Activity rings',
  component: ActivityRings,
}

const BothRings = {
  name: 'Habits and tasks · gold outside, emerald in',
  render: () => (
    <HigStage gradient>
      <HigRow label="Partly done">
        <ActivityRings
          rings={dayProgressRings({
            habits: { completed: 3, expected: 5 },
            tasks: { completed: 1, expected: 4 },
          })}
          diameter={72}
          lineWidth={9}
          spacing={4}
        />
      </HigRow>
      <HigRow label="Both complete">
        <ActivityRings
          rings={dayProgressRings({
            habits: { completed: 5, expected: 5 },
            tasks: { completed: 4, expected: 4 },
          })}
          diameter={72}
          lineWidth={9}
          spacing={4}
        />
      </HigRow>
    </HigStage>
  ),
}

const TasksOnly = {
  name: 'No denominator · one emerald ring at full size',
  render: () => (
    <HigStage gradient>
      <HigRow label="A habit-less day">
        <ActivityRings
          rings={dayProgressRings({
            habits: { completed: 0, expected: 0 },
            tasks: { completed: 3, expected: 5 },
          })}
          diameter={88}
          lineWidth={11}
          spacing={5}
        />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · at the Do header’s 44px',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="Default 44px">
        <ActivityRings
          rings={dayProgressRings({
            habits: { completed: 3, expected: 5 },
            tasks: { completed: 1, expected: 4 },
          })}
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
        <ActivityRings
          rings={dayProgressRings({
            habits: { completed: 3, expected: 5 },
            tasks: { completed: 1, expected: 4 },
          })}
          diameter={density === 'compact' ? 44 : 72}
          lineWidth={density === 'compact' ? 6 : 9}
        />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {BothRings.render()}
      {TasksOnly.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
