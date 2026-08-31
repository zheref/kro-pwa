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
import { EarnPage } from '../earn/pages/EarnPage'
import { DestinationPlaceholderFragment } from './DestinationPlaceholderFragment'
import { onDestinationRouteMounted } from './MainFeature'
import { selectProjects } from './MainSelectors'
import {
  DestinationKind,
  type SidebarDestination,
} from './SidebarDestination'

export type DestinationPageProps =
  | {
      /** Which destination this route is. */
      readonly kind: Exclude<SidebarDestination['kind'], 'list'>
    }
  | {
      readonly kind: typeof DestinationKind.list
      /** The project the route names — required by the type, not by luck. */
      readonly listId: string
    }

export function DestinationPage(props: DestinationPageProps) {
  const dispatch = useAppDispatch()
  const projects = useAppSelector(selectProjects)
  const { kind } = props
  const listId = props.kind === DestinationKind.list ? props.listId : null

  const destination: SidebarDestination =
    props.kind === DestinationKind.list
      ? {
          kind: DestinationKind.list,
          listId: props.listId,
          // Until the projects load the row has no title to show. The id is
          // the identity; the title is presentation, and an empty one is
          // honest rather than a guessed name that then changes.
          listTitle:
            projects.find((project) => project.id === listId)?.title ?? '',
        }
      : { kind: props.kind }

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

  // The swap point (this file's own header): a landing feature child replaces
  // the placeholder call for its one destination kind. `#28` is the first.
  if (destination.kind === DestinationKind.earn) {
    return <EarnPage />
  }

  return <DestinationPlaceholderFragment destination={destination} />
}
