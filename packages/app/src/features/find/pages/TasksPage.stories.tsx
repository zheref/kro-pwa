/**
 * All Tasks, mounted on a real store (`RC-11`).
 *
 * The three destinations one Page serves — `/tasks`, a Lists destination, and a
 * seeded search — plus the empty case, all fetching through the real Producer
 * over a seeded database.
 */
import { Stage } from '../../../design/endeavor/storyStage'
import { allFindEndeavorMocks, nineOpenTasks } from '../FindMocks'
import { TasksPage } from './TasksPage'
import { Harness, makeSeededStore } from './__tests__/pagesHarness'

export default {
  title: 'Find/All Tasks page',
  component: TasksPage,
  parameters: { layout: 'fullscreen' },
}

/** `/tasks` — the default vista, nine tasks in one status, clipped to seven. */
export const AllTasks = {
  render: () => (
    <Stage width={430}>
      <Harness store={makeSeededStore({ endeavors: nineOpenTasks })}>
        <TasksPage selection={{ kind: 'default' }} input="touch" locale="en-US" />
      </Harness>
    </Stage>
  ),
}

/** A Lists destination — the same surface over `tasksForList(id)`. */
export const ListDestination = {
  render: () => (
    <Stage width={900}>
      <Harness store={makeSeededStore({ endeavors: allFindEndeavorMocks })}>
        <TasksPage
          selection={{ kind: 'list', listId: 'proj-1', listTitle: 'Household' }}
          input="pointer"
          locale="en-US"
        />
      </Harness>
    </Stage>
  ),
}

/** A seeded search — `tasksForSearch(query)`, with its own saved lens. */
export const SeededSearch = {
  render: () => (
    <Stage width={430}>
      <Harness store={makeSeededStore({ endeavors: allFindEndeavorMocks })}>
        <TasksPage
          selection={{ kind: 'search', query: 'report' }}
          input="touch"
          locale="en-US"
        />
      </Harness>
    </Stage>
  ),
}

/** Nothing stored yet. */
export const Empty = {
  render: () => (
    <Stage width={430}>
      <Harness store={makeSeededStore()}>
        <TasksPage selection={{ kind: 'default' }} input="touch" locale="en-US" />
      </Harness>
    </Stage>
  ),
}
