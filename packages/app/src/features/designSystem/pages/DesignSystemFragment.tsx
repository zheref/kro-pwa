'use client'

/**
 * The Design System gallery — a Storybook-shaped explorer over the real
 * `design/**` stories (`RC-15`).
 *
 * Pure renderer: the catalog, the selected story id and the select callback
 * arrive as props. It never reads the store and never dispatches. The shell's
 * toolbar already prints the destination heading ("Design System"), so this
 * Fragment owns the inner sidebar and the canvas, not a second page title.
 *
 * The catalog column is a glass pane of fixed height; the tree scrolls
 * *inside* it. Scrolling the glass element itself would let the material grow
 * with the tree and clip at the viewport.
 */
import { useState } from 'react'
import { GlassPanel } from '../../../design/system/glass/GlassPanel'
import { ICON_SIZE, iconForSymbol } from '../../../design/system/icons/icons'
import { colorVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import { SIDEBAR_ROW_HEIGHT } from '../../main/SidebarFragment'
import {
  type CatalogGroup,
  type StoryCatalog,
  placementOfStory,
  storyOrDefault,
} from '../storyCatalog'

export interface DesignSystemFragmentProps {
  readonly catalog: StoryCatalog
  readonly selectedStoryId: string
  readonly onSelectStory: (storyId: string) => void
}

export function DesignSystemFragment({
  catalog,
  selectedStoryId,
  onSelectStory,
}: DesignSystemFragmentProps) {
  const selected = storyOrDefault(catalog, selectedStoryId)
  const selectedPlacement = placementOfStory(catalog, selected.id)
  const [expandedGroupIds, setExpandedGroupIds] = useState<readonly string[]>(
    () => [selectedPlacement.groupId],
  )

  const onToggleGroup = (groupId: string) => {
    setExpandedGroupIds((ids) =>
      ids.includes(groupId)
        ? ids.filter((id) => id !== groupId)
        : [...ids, groupId],
    )
  }

  return (
    <div
      data-testid="design-system-catalog"
      className="absolute inset-0 flex min-h-0 overflow-hidden"
    >
      <GlassPanel
        as="nav"
        kind="sidebar"
        aria-label="Component library"
        data-testid="design-system-nav"
        className="h-full w-[220px] shrink-0 self-stretch"
      >
        <div
          data-testid="design-system-nav-scroll"
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-kro-small py-kro-small"
        >
          {catalog.groups.map((group) => (
            <CatalogGroupSection
              key={group.id}
              group={group}
              isExpanded={expandedGroupIds.includes(group.id)}
              selectedStoryId={selected.id}
              onToggle={() => onToggleGroup(group.id)}
              onSelectStory={onSelectStory}
            />
          ))}
        </div>
      </GlassPanel>

      <GlassPanel
        kind="content"
        data-testid="design-system-canvas"
        className="h-full min-w-0 flex-1 self-stretch"
      >
        <header className="shrink-0 border-b border-kro-hairline px-kro-large py-kro-medium">
          <p className="text-kro-fore-secondary text-xs uppercase tracking-wide">
            {selected.id.split('/')[0]}
          </p>
          <h2
            data-testid="design-system-story-name"
            className="text-kro-fore text-lg font-semibold"
          >
            {selected.name}
          </h2>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {selected.render()}
        </div>
      </GlassPanel>
    </div>
  )
}

function CatalogGroupSection({
  group,
  isExpanded,
  selectedStoryId,
  onToggle,
  onSelectStory,
}: {
  readonly group: CatalogGroup
  readonly isExpanded: boolean
  readonly selectedStoryId: string
  readonly onToggle: () => void
  readonly onSelectStory: (storyId: string) => void
}) {
  const panelId = `design-system-group-${group.id}`
  const Chevron = iconForSymbol(isExpanded ? 'chevron.down' : 'chevron.right')

  return (
    <section className="mb-kro-tiny">
      <h2 className="m-0">
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center gap-kro-tiny rounded-kro-small px-kro-small py-kro-tiny text-left font-semibold text-kro-fore-secondary text-xs uppercase tracking-wide hover:bg-kro-absolute/25"
        >
          <Chevron size={ICON_SIZE.small} aria-hidden="true" />
          {group.title}
        </button>
      </h2>
      {isExpanded ? (
        <div id={panelId} role="region" aria-label={group.title}>
          {group.components.map((component) => (
            <div key={component.id} className="mt-kro-tiny">
              <h3 className="px-kro-small py-kro-tiny text-kro-fore text-xs font-semibold">
                {component.title}
              </h3>
              <ul className="flex list-none flex-col">
                {component.stories.map((story) => {
                  const isSelected = story.id === selectedStoryId
                  return (
                    <li key={story.id}>
                      <button
                        type="button"
                        aria-current={isSelected ? 'true' : undefined}
                        onClick={() => onSelectStory(story.id)}
                        data-theme={isSelected ? 'dark' : undefined}
                        className={cn(
                          'w-full truncate rounded-kro-small px-kro-small text-left text-sm',
                          isSelected
                            ? 'font-semibold'
                            : 'text-kro-fore hover:bg-kro-absolute/25',
                        )}
                        style={{
                          minHeight: `${SIDEBAR_ROW_HEIGHT}px`,
                          backgroundColor: isSelected
                            ? colorVar('absolute')
                            : undefined,
                          color: isSelected ? colorVar('snow') : undefined,
                        }}
                      >
                        {story.name}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
