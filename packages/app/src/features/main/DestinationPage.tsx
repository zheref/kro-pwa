'use client'

/**
 * One destination, mounted by its route file (`RC-37`).
 *
 * This is the swap point. Today it dispatches "the route for this destination
 * mounted" and renders the placeholder; when a feature child lands, its Page
 * replaces the placeholder call and *nothing in `apps/web` changes* — which is
 * the whole reason the route files were written here once rather than by each
 * child.
 *
 * The mount dispatch is what makes the URL the authority: a pasted link, a
 * back step and a forward step all arrive as a fresh mount, and the shell's
 * selection follows without any component reading a router (`RC-17`,
 * `RC-63`).
 */
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../library/hooks'
import { DestinationPlaceholderFragment } from './DestinationPlaceholderFragment'
import { onDestinationRouteMounted } from './MainFeature'
import { selectProjects } from './MainSelectors'
import {
  DestinationKind,
  type SidebarDestination,
} from './SidebarDestination'

export interface DestinationPageProps {
  /** Which destination this route is. */
  readonly kind: SidebarDestination['kind']
  /** Present only for `list` — the project the route names. */
  readonly listId?: string
}

export function DestinationPage({ kind, listId }: DestinationPageProps) {
  const dispatch = useAppDispatch()
  const projects = useAppSelector(selectProjects)

  const destination: SidebarDestination =
    kind === DestinationKind.list
      ? {
          kind: DestinationKind.list,
          listId: listId ?? '',
          // Until the projects load the row has no title to show. The id is
          // the identity; the title is presentation, and an empty one is
          // honest rather than a guessed name that then changes.
          listTitle:
            projects.find((project) => project.id === listId)?.title ?? '',
        }
      : { kind }

  const listTitle =
    destination.kind === DestinationKind.list ? destination.listTitle : null

  useEffect(() => {
    dispatch(onDestinationRouteMounted({ destination }))
    // Re-dispatched when the list's title arrives, so the sidebar highlight and
    // the heading agree; `destination` itself is rebuilt on every render, so
    // the identity fields are the dependencies rather than the object.
    // biome-ignore lint/correctness/useExhaustiveDependencies: the object is
    // derived; its identity fields (kind, listId, listTitle) are the real deps.
  }, [dispatch, kind, listId, listTitle])

  return <DestinationPlaceholderFragment destination={destination} />
}
