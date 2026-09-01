'use client'

/**
 * The desktop sidebar — canon `MainScreen.macSidebar` (`RC-15`: domain-bound,
 * pure, dispatches nothing; every intent is a callback prop).
 *
 * Canon's column is a `List(selection:)` of `Section`s with an inline search
 * field above it, sized `navigationSplitViewColumnWidth(min: 180, ideal: 200)`.
 * Ported shape for shape:
 *
 *   · the search field (canon's `searchSection`), submitting on Enter;
 *   · the untitled section, rendered with no header (canon's `"default"`
 *     sentinel, which is `null` here);
 *   · each titled section with its header;
 *   · the Settings section pinned to the bottom (`shouldGoToBottom`);
 *   · the Lists section: one row per project, an inline "New project…" row,
 *     and a per-row delete.
 *
 * **The decision table drives the pixels.** Row height and the gap between
 * adjacent controls come from `layout.minimumControlSide` /
 * `minimumControlSpacing`, so a touch tablet gets 44/8 and a Mac 28/4 without
 * this component knowing which it is on.
 */
import { Plus, Search, Trash2, X } from 'lucide-react'
import { GlassPanel } from '../../design/system/glass/GlassPanel'
import { ICON_SIZE } from '../../design/system/icons/icons'
import { cn } from '../../design/system/utils/cn'
import type { DoSurfaceLayout } from './DoSurfaceLayout'
import type { NavigationSection } from './NavigationSections'
import {
  type SidebarDestination,
  destinationIcon,
  destinationId,
  destinationTitle,
  isSameDestination,
} from './SidebarDestination'

/** Canon's `navigationSplitViewColumnWidth(min: 180, ideal: 200)`. */
export const SIDEBAR_MIN_WIDTH = 180
export const SIDEBAR_IDEAL_WIDTH = 200

export interface SidebarFragmentProps {
  readonly sections: readonly NavigationSection[]
  readonly selected: SidebarDestination
  readonly layout: DoSurfaceLayout
  readonly searchQuery: string
  readonly isAddingProject: boolean
  readonly draftProjectTitle: string
  /** `lists` is open, so the "+" and the delete affordances are offerable. */
  readonly canManageProjects: boolean
  readonly onSelectDestination: (destination: SidebarDestination) => void
  readonly onChangeSearchQuery: (query: string) => void
  readonly onSubmitSearch: () => void
  readonly onTapAddProject: () => void
  readonly onEditDraftProjectTitle: (title: string) => void
  readonly onCommitDraftProject: () => void
  readonly onCancelDraftProject: () => void
  readonly onDeleteProject: (projectId: string) => void
}

export function SidebarFragment(props: SidebarFragmentProps) {
  const {
    sections,
    selected,
    layout,
    searchQuery,
    isAddingProject,
    draftProjectTitle,
    canManageProjects,
    onSelectDestination,
    onChangeSearchQuery,
    onSubmitSearch,
    onTapAddProject,
    onEditDraftProjectTitle,
    onCommitDraftProject,
    onCancelDraftProject,
    onDeleteProject,
  } = props

  return (
    <GlassPanel
      as="nav"
      kind="sidebar"
      aria-label="Sidebar"
      data-testid="shell-sidebar"
      className={cn(
        // `relative z-10` is load-bearing: the page field is an absolutely-
        // positioned decoration behind this column. Without a stacking context
        // here it would paint over the sidebar's own top rows.
        'relative z-10 h-full shrink-0 overflow-y-auto text-kro-fore',
      )}
      style={{
        minWidth: `${SIDEBAR_MIN_WIDTH}px`,
        width: `${SIDEBAR_IDEAL_WIDTH}px`,
        gap: `${layout.minimumControlSpacing}px`,
        padding: `${layout.minimumControlSpacing}px`,
      }}
    >
      {/*
        Canon's `wideBody` puts the app's own title (`.navigationTitle("Kro")`)
        and the Add-Project button on the SIDEBAR's toolbar, gated on `lists`
        — not inside the Lists section. Which matters: the "+" is reachable
        before the first project exists, and that is the only way the section
        ever appears.
      */}
      <div className="flex items-center justify-between px-kro-small">
        <span className="font-semibold text-kro-fore text-sm">Kro</span>
        {canManageProjects && (
          <button
            type="button"
            aria-label="Add Project"
            onClick={onTapAddProject}
            className="rounded-kro-small text-kro-fore-secondary hover:text-kro-fore"
            style={{
              minWidth: `${layout.minimumControlSide}px`,
              minHeight: `${layout.minimumControlSide}px`,
            }}
          >
            <Plus size={ICON_SIZE.small} className="mx-auto" />
          </button>
        )}
      </div>

      <SidebarSearchField
        layout={layout}
        query={searchQuery}
        onChange={onChangeSearchQuery}
        onSubmit={onSubmitSearch}
      />

      {/*
        Model order, exactly as canon's `macSidebar` renders it: the untitled
        section, Workflow, Settings, then Lists. `shouldGoToBottom` is ported
        on the model because canon carries it — but canon's own Mac sidebar is
        one `List` that renders its sections in order, so reordering here would
        be an invention rather than a port.
      */}
      {sections.map((section) => (
        <SidebarSection
          key={section.title ?? 'default'}
          section={section}
          selected={selected}
          layout={layout}
          canManageProjects={canManageProjects}
          isAddingProject={isAddingProject}
          draftProjectTitle={draftProjectTitle}
          onSelectDestination={onSelectDestination}
          onEditDraftProjectTitle={onEditDraftProjectTitle}
          onCommitDraftProject={onCommitDraftProject}
          onCancelDraftProject={onCancelDraftProject}
          onDeleteProject={onDeleteProject}
        />
      ))}
    </GlassPanel>
  )
}

function SidebarSearchField({
  layout,
  query,
  onChange,
  onSubmit,
}: {
  readonly layout: DoSurfaceLayout
  readonly query: string
  readonly onChange: (query: string) => void
  readonly onSubmit: () => void
}) {
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className={cn(
        'flex items-center gap-kro-small rounded-kro-field',
        'bg-kro-absolute/40 px-kro-small',
      )}
      style={{ minHeight: `${layout.minimumControlSide}px` }}
    >
      <Search
        size={ICON_SIZE.small}
        aria-hidden="true"
        className="shrink-0 text-kro-fore-secondary"
      />
      <input
        type="search"
        aria-label="Search"
        placeholder="Search"
        value={query}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'w-full bg-transparent text-sm text-kro-fore outline-none',
          'placeholder:text-kro-fore-secondary',
        )}
      />
    </form>
  )
}

function SidebarSection({
  section,
  selected,
  layout,
  canManageProjects,
  isAddingProject,
  draftProjectTitle,
  onSelectDestination,
  onEditDraftProjectTitle,
  onCommitDraftProject,
  onCancelDraftProject,
  onDeleteProject,
}: {
  readonly section: NavigationSection
  readonly selected: SidebarDestination
  readonly layout: DoSurfaceLayout
  readonly canManageProjects: boolean
  readonly isAddingProject: boolean
  readonly draftProjectTitle: string
  readonly onSelectDestination: (destination: SidebarDestination) => void
  readonly onEditDraftProjectTitle: (title: string) => void
  readonly onCommitDraftProject: () => void
  readonly onCancelDraftProject: () => void
  readonly onDeleteProject: (projectId: string) => void
}) {
  const isLists = section.title === 'Lists'

  return (
    <section
      aria-label={section.title ?? 'Navigation'}
      className="flex flex-col"
      style={{ gap: `${layout.minimumControlSpacing / 2}px` }}
    >
      {section.title !== null && (
        <h2 className="px-kro-small font-semibold text-kro-fore-secondary text-xs uppercase tracking-wide">
          {section.title}
        </h2>
      )}

      <ul className="flex list-none flex-col">
        {section.elements.map((element) => (
          <li key={destinationId(element.destination)}>
            <SidebarRow
              destination={element.destination}
              isSelected={isSameDestination(element.destination, selected)}
              layout={layout}
              onSelect={onSelectDestination}
              onDelete={
                isLists && canManageProjects ? onDeleteProject : undefined
              }
            />
          </li>
        ))}

        {isLists && isAddingProject && (
          <li>
            <NewProjectRow
              layout={layout}
              title={draftProjectTitle}
              onEdit={onEditDraftProjectTitle}
              onCommit={onCommitDraftProject}
              onCancel={onCancelDraftProject}
            />
          </li>
        )}
      </ul>
    </section>
  )
}

function SidebarRow({
  destination,
  isSelected,
  layout,
  onSelect,
  onDelete,
}: {
  readonly destination: SidebarDestination
  readonly isSelected: boolean
  readonly layout: DoSurfaceLayout
  readonly onSelect: (destination: SidebarDestination) => void
  readonly onDelete?: (projectId: string) => void
}) {
  const Icon = destinationIcon(destination)
  const title = destinationTitle(destination)

  return (
    <div
      className="group flex items-center"
      style={{ gap: `${layout.minimumControlSpacing}px` }}
    >
      <button
        type="button"
        aria-current={isSelected ? 'page' : undefined}
        onClick={() => onSelect(destination)}
        className={cn(
          'flex flex-1 items-center gap-kro-small rounded-kro-small px-kro-small',
          'text-left text-kro-fore text-sm',
          // Canon's macOS sidebar selection is a filled accent capsule with a
          // light label, not a tinted one. It also survives being drawn over
          // the header gradient, which a 15%-accent wash does not.
          isSelected
            ? 'bg-kro-accent font-semibold text-kro-on-accent'
            : 'hover:bg-kro-absolute/25',
        )}
        style={{ minHeight: `${layout.minimumControlSide}px` }}
      >
        <Icon size={ICON_SIZE.small} aria-hidden="true" className="shrink-0" />
        <span className="truncate">{title}</span>
      </button>

      {onDelete !== undefined && destination.kind === 'list' && (
        <button
          type="button"
          aria-label={`Delete ${title}`}
          onClick={() => onDelete(destination.listId)}
          className={cn(
            'rounded-kro-small text-kro-fore-secondary',
            'opacity-0 hover:text-kro-red focus-visible:opacity-100',
            'group-hover:opacity-100',
          )}
          style={{
            minWidth: `${layout.minimumControlSide}px`,
            minHeight: `${layout.minimumControlSide}px`,
          }}
        >
          <Trash2 size={ICON_SIZE.small} className="mx-auto" />
        </button>
      )}
    </div>
  )
}

function NewProjectRow({
  layout,
  title,
  onEdit,
  onCommit,
  onCancel,
}: {
  readonly layout: DoSurfaceLayout
  readonly title: string
  readonly onEdit: (title: string) => void
  readonly onCommit: () => void
  readonly onCancel: () => void
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onCommit()
      }}
      className="flex items-center gap-kro-small px-kro-small"
      style={{ minHeight: `${layout.minimumControlSide}px` }}
    >
      <input
        // biome-ignore lint/a11y/noAutofocus: the row exists only because the user just asked for it; focusing anywhere else makes them click twice to type a name
        autoFocus
        aria-label="New project"
        placeholder="New project…"
        value={title}
        onChange={(event) => onEdit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel()
        }}
        className={cn(
          'w-full rounded-kro-field bg-kro-absolute/40 px-kro-small py-kro-tiny',
          'text-kro-fore text-sm outline-none',
          'placeholder:text-kro-fore-secondary',
        )}
      />
      <button
        type="button"
        aria-label="Cancel new project"
        onClick={onCancel}
        className="rounded-kro-small text-kro-fore-secondary hover:text-kro-fore"
        style={{
          minWidth: `${layout.minimumControlSide}px`,
          minHeight: `${layout.minimumControlSide}px`,
        }}
      >
        <X size={ICON_SIZE.small} className="mx-auto" />
      </button>
    </form>
  )
}
