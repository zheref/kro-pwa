'use client'

import { TasksPage } from '@kro/app'

/** Client wrapper (`RC-39`): imports the Page, forwards props, nothing else. */
export function TasksPageClient() {
  return <TasksPage selection={{ kind: 'default' }} />
}
