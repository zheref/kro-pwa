'use client'

import { TasksPage } from '@kro/app'

interface Props {
  readonly listId: string
}

/** Client wrapper (`RC-39`): imports the Page, forwards props, nothing else. */
export function ListPageClient({ listId }: Props) {
  return <TasksPage selection={{ kind: 'list', listId, listTitle: null }} />
}
