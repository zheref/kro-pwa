'use client'

/**
 * The Design System gallery — a Storybook-shaped explorer over the real
 * `design/**` stories (`RC-15`).
 *
 * Pure renderer: the catalog, the selected story id and the select callback
 * arrive as props. It never reads the store and never dispatches. The shell's
 * toolbar already prints the destination heading ("Design System"), so this
 * Fragment owns the inner sidebar and the canvas, not a second page title.
 */
import { GlassPanel } from '../../../design/system/glass/GlassPanel'
import { colorVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import { SIDEBAR_ROW_HEIGHT } from '../../main/SidebarFragment'
import { type StoryCatalog, storyOrDefault } from '../storyCatalog'

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

  return (
    <div
      data-testid="design-system-catalog"
      className="absolute inset-0 flex min-h-0"
    >
      <GlassPanel
        as="nav"
        kind="sidebar"
        aria-label="Component library"
        data-testid="design-system-nav"
        className="w-[220px] shrink-0 overflow-y-auto px-kro-small py-kro-small"
      >
        {catalog.groups.map((group) => (
          <section key={group.id} className="mb-kro-medium">
            <h2 className="px-kro-small font-semibold text-kro-fore-secondary text-xs uppercase tracking-wide">
              {group.title}
            </h2>
            {group.components.map((component) => (
              <div key={component.id} className="mt-kro-tiny">
                <h3 className="px-kro-small py-kro-tiny text-kro-fore text-xs font-semibold">
                  {component.title}
                </h3>
                <ul className="flex list-none flex-col">
                  {component.stories.map((story) => {
                    const isSelected = story.id === selected.id
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
          </section>
        ))}
      </GlassPanel>

      <GlassPanel
        kind="content"
        data-testid="design-system-canvas"
        className="min-w-0 flex-1 overflow-y-auto"
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
        <div className="min-h-0 flex-1">{selected.render()}</div>
      </GlassPanel>
    </div>
  )
}
