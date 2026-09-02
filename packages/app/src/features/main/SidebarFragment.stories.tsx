import type { ReactNode } from 'react'
import { doSurfaceLayout } from './DoSurfaceLayout'
import {
  MainMocks,
  allOpenGates,
  desktopSurface,
  projectMocks,
  statusQuoGates,
  tabletSurface,
} from './MainMocks'
import { sidebarSections } from './NavigationSections'
import { SidebarFragment } from './SidebarFragment'

/**
 * The macOS sidebar, ported.
 *
 * Every story is built from `MainMocks` and the navigation model — never from
 * inline props — so the story set and the render tests cannot drift
 * (`RC-11`, `RC-31`).
 *
 * The two that matter for review are `ShippingBaseline` and `AllFlagsOpen`:
 * the difference between them is exactly the flag gating, and reading them
 * side by side is how "matrix, habits, board and blueprints are staged off"
 * is checked by eye.
 */
export default {
  title: 'Shell/Sidebar',
  component: SidebarFragment,
  parameters: { layout: 'fullscreen' },
}

const noop = () => {}

function Stage({
  theme = 'light',
  children,
}: {
  theme?: 'light' | 'dark'
  children: ReactNode
}) {
  return (
    <div
      data-theme={theme}
      style={{
        display: 'flex',
        minHeight: 520,
        background: 'var(--kro-color-back)',
      }}
    >
      {children}
    </div>
  )
}

const props = (
  overrides: Partial<Parameters<typeof SidebarFragment>[0]> = {},
) => ({
  sections: sidebarSections({
    gates: statusQuoGates,
    isDevelopment: false,
    projects: [projectMocks.inbox, projectMocks.work],
    isAddingProject: false,
  }),
  selected: MainMocks.desktopLoaded.selected,
  layout: doSurfaceLayout(desktopSurface),
  searchQuery: '',
  isAddingProject: false,
  draftProjectTitle: '',
  canManageProjects: true,
  onSelectDestination: noop,
  onChangeSearchQuery: noop,
  onSubmitSearch: noop,
  onTapAddProject: noop,
  onEditDraftProjectTitle: noop,
  onCommitDraftProject: noop,
  onCancelDraftProject: noop,
  onDeleteProject: noop,
  ...overrides,
})

/** What a user actually sees: four Workflow rows, Adjust, and two lists. */
export const ShippingBaseline = {
  render: () => (
    <Stage>
      <SidebarFragment {...props()} />
    </Stage>
  ),
}

/** A development build: every destination, Tweak included. */
export const AllFlagsOpen = {
  render: () => (
    <Stage>
      <SidebarFragment
        {...props({
          sections: sidebarSections({
            gates: allOpenGates,
            isDevelopment: true,
            projects: [
              projectMocks.inbox,
              projectMocks.work,
              projectMocks.unicode,
              projectMocks.long,
            ],
            isAddingProject: false,
          }),
        })}
      />
    </Stage>
  ),
}

/** The inline "New project…" row, mid-type. */
export const AddingAProject = {
  render: () => (
    <Stage>
      <SidebarFragment
        {...props({
          sections: sidebarSections({
            gates: statusQuoGates,
            isDevelopment: false,
            projects: [],
            isAddingProject: true,
          }),
          isAddingProject: true,
          draftProjectTitle: 'Groceries',
        })}
      />
    </Stage>
  ),
}

/**
 * The same sidebar on a touch tablet: still the 36px rows, with the table's
 * 8px gaps rather than the pointer 4.
 */
export const TouchSized = {
  render: () => (
    <Stage>
      <SidebarFragment {...props({ layout: doSurfaceLayout(tabletSurface) })} />
    </Stage>
  ),
}

/** Both schemes side by side — the tokens flip, the markup does not. */
export const BothSchemes = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <Stage theme="light">
        <SidebarFragment {...props()} />
      </Stage>
      <Stage theme="dark">
        <SidebarFragment {...props()} />
      </Stage>
    </div>
  ),
}
