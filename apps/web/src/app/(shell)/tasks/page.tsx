import { TasksPageClient } from './TasksPageClient'

/**
 * `/tasks` — the All Tasks destination.
 *
 * A passive Server Component (`RC-38`): it renders the client wrapper and
 * nothing else. The surface lives in `packages/app`; the `tasksDefault` vista
 * is the selection this route names.
 */
export default function TasksRoute() {
  return <TasksPageClient />
}
