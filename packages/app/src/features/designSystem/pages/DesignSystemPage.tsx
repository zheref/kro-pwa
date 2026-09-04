'use client'

/**
 * `DesignSystemPage` — the `/storybook` destination's stateful container
 * (`RC-37`; implements `UZF-4`).
 *
 * The only artifact in this lane that calls `useAppDispatch`. There is no
 * slice: the catalog is a static module and the selected story is view-local,
 * the same way a tab control remembers which panel is open. Domain state
 * still lives in Redux; this is a developer gallery, not a product surface.
 *
 * Mounting still fires `onDestinationRouteMounted` so a pasted `/storybook`
 * link lights the sidebar row (`RC-17`, `RC-63`).
 */
import { useCallback, useEffect, useState } from 'react'
import { useAppDispatch } from '../../../library/hooks'
import { onDestinationRouteMounted } from '../../main/MainFeature'
import { DestinationKind } from '../../main/SidebarDestination'
import { STORY_CATALOG } from '../storyCatalog'
import { DesignSystemFragment } from './DesignSystemFragment'

export function DesignSystemPage() {
  const dispatch = useAppDispatch()
  const [selectedStoryId, setSelectedStoryId] = useState(
    STORY_CATALOG.defaultStoryId,
  )

  useEffect(() => {
    dispatch(
      onDestinationRouteMounted({
        destination: { kind: DestinationKind.designSystem },
      }),
    )
  }, [dispatch])

  const onSelectStory = useCallback((storyId: string) => {
    setSelectedStoryId(storyId)
  }, [])

  return (
    <DesignSystemFragment
      catalog={STORY_CATALOG}
      selectedStoryId={selectedStoryId}
      onSelectStory={onSelectStory}
    />
  )
}
