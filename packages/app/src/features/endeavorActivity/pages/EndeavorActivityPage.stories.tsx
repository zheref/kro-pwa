/** The Page, loading for real against a seeded in-memory store (`RC-11`). */
import { activityEndeavorMocks } from '../EndeavorActivityMocks'
import { EndeavorActivityPage } from './EndeavorActivityPage'
import {
  ActivityHarness,
  activityStore,
} from './__tests__/endeavorActivityScenes'

export default {
  title: 'Endeavor Activity/Page',
  component: EndeavorActivityPage,
  parameters: { layout: 'fullscreen' },
}

export const TaskWithHistory = {
  render: () => (
    <ActivityHarness store={activityStore()}>
      <EndeavorActivityPage endeavorId={activityEndeavorMocks.many.id} />
    </ActivityHarness>
  ),
}

export const HabitWithHistory = {
  render: () => (
    <ActivityHarness store={activityStore()}>
      <EndeavorActivityPage endeavorId={activityEndeavorMocks.habit.id} />
    </ActivityHarness>
  ),
}

export const BehaviorNotSupported = {
  render: () => (
    <ActivityHarness store={activityStore()}>
      <EndeavorActivityPage endeavorId={activityEndeavorMocks.behavior.id} />
    </ActivityHarness>
  ),
}

export const MissingEndeavor = {
  render: () => (
    <ActivityHarness store={activityStore()}>
      <EndeavorActivityPage endeavorId="missing" />
    </ActivityHarness>
  ),
}
