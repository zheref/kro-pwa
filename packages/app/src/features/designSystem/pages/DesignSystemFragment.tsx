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
 * with the tree and clip at the viewport. The canvas is not glass: stories
 * sit on the destination page field (`DetailBackdrop`), the same surface
 * My Day and Plan paint on.
 */
import { useState } from 'react'
import {
  GalleryAppearanceProvider,
  type GalleryScheme,
} from '../../../design/storybook/galleryAppearance'
import { GalleryAppearanceToolbar } from '../../../design/storybook/GalleryAppearanceToolbar'
import { StoryKindBadge } from '../../../design/storybook/StoryKindBadge'
import { STORY_KINDS } from '../../../design/storybook/storyKind'
import { GlassPanel } from '../../../design/system/glass/GlassPanel'
import { ROW_HIGHLIGHT } from '../../../design/system/rowHighlight'
import { OnGradient } from '../../../design/system/gradient/OnGradient'
import { ICON_SIZE, iconForSymbol } from '../../../design/system/icons/icons'
import type { AppPaletteId } from '../../../design/system/tokens/appPalette'
import { colorVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import {
  type CatalogComponent,
  type CatalogGroup,
  type StoryCatalog,
  componentOfStory,
  placementOfStory,
  storyOrDefault,
} from '../storyCatalog'

/** Compact explorer rows — denser than the product sidebar's 36px. */
export const CATALOG_STORY_ROW_HEIGHT = 24

export interface DesignSystemFragmentProps {
  readonly catalog: StoryCatalog
  readonly selectedStoryId: string
  readonly onSelectStory: (storyId: string) => void
  readonly scheme: GalleryScheme
  readonly palette: AppPaletteId
  readonly onSelectScheme: (scheme: GalleryScheme) => void
  readonly onSelectPalette: (palette: AppPaletteId) => void
}

export function DesignSystemFragment({
  catalog,
  selectedStoryId,
  onSelectStory,
  scheme,
  palette,
  onSelectScheme,
  onSelectPalette,
}: DesignSystemFragmentProps) {
  const selected = storyOrDefault(catalog, selectedStoryId)
  const selectedPlacement = placementOfStory(catalog, selected.id)
  const selectedComponent = componentOfStory(catalog, selected.id)
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
    <GalleryAppearanceProvider appearance={{ scheme, palette }}>
      <div
        data-testid="design-system-catalog"
        data-theme={scheme}
        data-palette={palette}
        className="absolute inset-0 flex min-h-0 gap-kro-small overflow-hidden"
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

        <section
          data-testid="design-system-canvas"
          className="flex h-full min-h-0 min-w-0 flex-1 flex-col self-stretch"
        >
          <header className="flex shrink-0 items-start justify-between gap-kro-medium px-kro-medium py-kro-medium">
            <div className="min-w-0">
              <OnGradient
                as="p"
                className="m-0 font-semibold text-[13px] uppercase tracking-wide"
              >
                {selectedPlacement.groupId}
              </OnGradient>
              <OnGradient
                as="h2"
                data-testid="design-system-story-name"
                className="m-0 font-semibold text-lg"
              >
                {selectedComponent?.title ?? selected.name}
              </OnGradient>
            </div>
            <GalleryAppearanceToolbar
              scheme={scheme}
              palette={palette}
              onSelectScheme={onSelectScheme}
              onSelectPalette={onSelectPalette}
            />
          </header>
          <div
            key={`${scheme}-${palette}`}
            className="min-h-0 flex-1 overflow-y-auto"
          >
            {selected.render()}
          </div>
        </section>
      </div>
    </GalleryAppearanceProvider>
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
          className={cn(
            'flex w-full items-center gap-kro-tiny rounded-kro-small px-kro-small py-kro-tiny text-left font-semibold text-kro-fore-secondary text-xs uppercase tracking-wide',
            ROW_HIGHLIGHT,
          )}
        >
          <Chevron size={ICON_SIZE.small} aria-hidden="true" />
          {group.title}
        </button>
      </h2>
      {isExpanded ? (
        <div id={panelId} role="region" aria-label={group.title}>
          {group.components.map((component) => (
            <CatalogComponentRow
              key={component.id}
              component={component}
              selectedStoryId={selectedStoryId}
              onSelectStory={onSelectStory}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function CatalogComponentRow({
  component,
  selectedStoryId,
  onSelectStory,
}: {
  readonly component: CatalogComponent
  readonly selectedStoryId: string
  readonly onSelectStory: (storyId: string) => void
}) {
  const story = component.stories[0]
  if (story === undefined) return null
  const isSelected = component.stories.some(
    (candidate) => candidate.id === selectedStoryId,
  )
  const badge = STORY_KINDS[component.kind].badge

  return (
    <button
      type="button"
      aria-current={isSelected ? 'true' : undefined}
      aria-label={`${component.title} (${badge})`}
      onClick={() => onSelectStory(story.id)}
      data-theme={isSelected ? 'dark' : undefined}
      className={cn(
        'mt-px flex w-full items-center justify-between gap-kro-tiny rounded-kro-small px-kro-small text-left text-[11px] leading-tight',
        isSelected
          ? 'border border-transparent font-semibold'
          : cn('text-kro-fore', ROW_HIGHLIGHT),
      )}
      style={{
        minHeight: `${CATALOG_STORY_ROW_HEIGHT}px`,
        backgroundColor: isSelected ? colorVar('absolute') : undefined,
        color: isSelected ? colorVar('snow') : undefined,
      }}
    >
      <span className="min-w-0 truncate">{component.title}</span>
      <StoryKindBadge kind={component.kind} />
    </button>
  )
}
