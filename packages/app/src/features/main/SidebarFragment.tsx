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
 * **Row height sits between the two floors.** Canon's Mac sidebar uses
 * `minimumControlSide` (28 on a pointer desktop); the first web cut used the
 * 44pt iOS list floor, which read as a phone `List` in a 200px column. 36pt
 * is the denser desktop row without dropping to the 28pt pointer minimum.
 */
import { Plus, Search, Trash2, X } from 'lucide-react'
import { GlassPanel } from '../../design/system/glass/GlassPanel'
import { ICON_SIZE } from '../../design/system/icons/icons'
import { colorVar } from '../../design/system/tokens/roles'
import { cn } from '../../design/system/utils/cn'
import { TOUCH_CONTROL_SPACING, type DoSurfaceLayout } from './DoSurfaceLayout'
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

/**
 * Destination-row / search-field height. Between Mac's 28pt pointer minimum
 * and the 44pt iOS list floor — see the file header.
 */
export const SIDEBAR_ROW_HEIGHT = 36

/** iOS `.title` — 28pt bold. Canon's `.navigationTitle("Kro")` in this column. */
export const SIDEBAR_APP_TITLE_SIZE_PX = 28

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
        'relative z-10 mt-kro-small self-stretch shrink-0 overflow-y-auto text-kro-fore',
      )}
      style={{
        minWidth: `${SIDEBAR_MIN_WIDTH}px`,
        width: `${SIDEBAR_IDEAL_WIDTH}px`,
        gap: `${TOUCH_CONTROL_SPACING}px`,
        padding: `${TOUCH_CONTROL_SPACING}px`,
      }}
    >
      {/*
        Canon's `wideBody` puts the app's own title (`.navigationTitle("Kro")`)
        and the Add-Project button on the SIDEBAR's toolbar, gated on `lists`
        — not inside the Lists section. Which matters: the "+" is reachable
        before the first project exists, and that is the only way the section
        ever appears.
      */}
      <div className="flex items-center justify-between px-kro-small py-kro-tiny">
        <span
          data-testid="sidebar-app-title"
          className="font-bold tracking-tight text-kro-fore"
          style={{
            fontSize: `${SIDEBAR_APP_TITLE_SIZE_PX}px`,
            lineHeight: 1.1,
          }}
        >
          Kro
        </span>
        {canManageProjects && (
          <button
            type="button"
            aria-label="Add Project"
            onClick={onTapAddProject}
            className="rounded-kro-small text-kro-fore-secondary hover:text-kro-fore"
            style={{
              minWidth: `${SIDEBAR_ROW_HEIGHT}px`,
              minHeight: `${SIDEBAR_ROW_HEIGHT}px`,
            }}
          >
            <Plus size={ICON_SIZE.small} className="mx-auto" />
          </button>
        )}
      </div>

      <SidebarSearchField
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
  query,
  onChange,
  onSubmit,
}: {
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
      style={{ minHeight: `${SIDEBAR_ROW_HEIGHT}px` }}
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
        data-theme={isSelected ? 'dark' : undefined}
        className={cn(
          'flex flex-1 items-center gap-kro-small rounded-kro-small px-kro-small',
          'text-left text-sm',
          isSelected
            ? 'font-semibold'
            : 'text-kro-fore hover:bg-kro-absolute/25',
        )}
        style={{
          minHeight: `${SIDEBAR_ROW_HEIGHT}px`,
          // Same trick as TaskRow: `absolute` inside a forced dark scope is
          // black in both page schemes (the token flips to white in light).
          // `snow` is white in both, so the label stays white on that fill.
          backgroundColor: isSelected ? colorVar('absolute') : undefined,
          color: isSelected ? colorVar('snow') : undefined,
        }}
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
            minWidth: `${SIDEBAR_ROW_HEIGHT}px`,
            minHeight: `${SIDEBAR_ROW_HEIGHT}px`,
          }}
        >
          <Trash2 size={ICON_SIZE.small} className="mx-auto" />
        </button>
      )}
    </div>
  )
}

function NewProjectRow({
  title,
  onEdit,
  onCommit,
  onCancel,
}: {
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
      style={{ minHeight: `${SIDEBAR_ROW_HEIGHT}px` }}
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
          minWidth: `${SIDEBAR_ROW_HEIGHT}px`,
          minHeight: `${SIDEBAR_ROW_HEIGHT}px`,
        }}
      >
        <X size={ICON_SIZE.small} className="mx-auto" />
      </button>
    </form>
  )
}
