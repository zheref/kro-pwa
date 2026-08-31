import { DestinationPageClient } from '../../DestinationPageClient'

/**
 * `/lists/<id>` — one project from the sidebar's Lists section.
 *
 * The only destination with a route parameter, and the only reason this file
 * differs from its thirteen siblings: it resolves `params` (a Promise in
 * Next 15) and forwards the id as a plain prop. Still passive — no hook, no
 * store read (`RC-38`).
 */
export default async function ListRoute({
  params,
}: {
  params: Promise<{ listId: string }>
}) {
  const { listId } = await params
  return <DestinationPageClient kind="list" listId={listId} />
}
