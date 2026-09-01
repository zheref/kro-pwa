'use client'

/**
 * What a destination renders until its feature child replaces it (`RC-15`).
 *
 * Deliberately thin: the heading canon gives that destination, one line of
 * empty-state copy, and nothing else. It exists so the shell is navigable and
 * reviewable end to end before Do, Plan, Earn and the rest land — and so that
 * replacing it is deleting one call, not unpicking a layout.
 *
 * The heading is canon's `heading`, not its `title`: the sidebar row reads
 * "Today" and the content reads "My Day"; the row reads "Jot Down" and the
 * content reads "Inbox". Getting that pair right here is what proves the port
 * kept both strings.
 */
import { ICON_SIZE } from '../../design/system/icons/icons'
import { PageFieldEmpty } from '../../design/system/gradient/OnGradient'
import {
  type SidebarDestination,
  destinationHeading,
  destinationIcon,
} from './SidebarDestination'

export interface DestinationPlaceholderFragmentProps {
  readonly destination: SidebarDestination
  /** The one-line explanation under the heading. */
  readonly description?: string
}

export function DestinationPlaceholderFragment({
  destination,
  description,
}: DestinationPlaceholderFragmentProps) {
  const Icon = destinationIcon(destination)
  const heading = destinationHeading(destination)

  return (
    <PageFieldEmpty
      as="section"
      aria-labelledby="destination-placeholder-heading"
      data-testid="destination-placeholder"
      titleId="destination-placeholder-heading"
      title={heading}
      description={description ?? `${heading} is not built yet.`}
      icon={
        <Icon
          size={ICON_SIZE.large}
          aria-hidden="true"
          className="kro-on-gradient"
        />
      }
    />
  )
}
