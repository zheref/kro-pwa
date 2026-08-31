import { ListPageClient } from './ListPageClient'

/**
 * `/lists/<id>` — one project from the sidebar's Lists section.
 *
 * The only destination with a route parameter, and the only reason this file
 * differs from its thirteen siblings: it resolves `params` (a Promise in
 * Next 15) and forwards the id as a plain prop. Still passive — no hook, no
 * store read (`RC-38`).
 *
 * Its content is the All Tasks surface over the `tasksForList(id)` vista, which
 * is what a list destination *is* after the vista migration: the same grouped
 * list, scoped by one `lists` term in the query.
 */
export default async function ListRoute({
  params,
}: {
  params: Promise<{ listId: string }>
}) {
  const { listId } = await params
  return <ListPageClient listId={listId} />
}
