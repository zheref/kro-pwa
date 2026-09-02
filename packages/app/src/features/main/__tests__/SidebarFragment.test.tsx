/**
 * The sidebar's render tests, mirroring `SidebarFragment.stories.tsx` 1:1
 * (`RC-11`). Semantic queries only — never a DOM snapshot.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { doSurfaceLayout } from '../DoSurfaceLayout'
import {
  MainMocks,
  allOpenGates,
  desktopSurface,
  handheldSurface,
  projectMocks,
  statusQuoGates,
} from '../MainMocks'
import { sidebarSections } from '../NavigationSections'
import { SidebarFragment } from '../SidebarFragment'
import { DestinationKind } from '../SidebarDestination'

afterEach(cleanup)

const noop = () => {}

const renderSidebar = (
  overrides: Partial<Parameters<typeof SidebarFragment>[0]> = {},
) =>
  render(
    <SidebarFragment
      sections={sidebarSections({
        gates: statusQuoGates,
        isDevelopment: false,
        projects: [projectMocks.inbox, projectMocks.work],
        isAddingProject: false,
      })}
      selected={MainMocks.desktopLoaded.selected}
      layout={doSurfaceLayout(desktopSurface)}
      searchQuery=""
      isAddingProject={false}
      draftProjectTitle=""
      canManageProjects
      onSelectDestination={noop}
      onChangeSearchQuery={noop}
      onSubmitSearch={noop}
      onTapAddProject={noop}
      onEditDraftProjectTitle={noop}
      onCommitDraftProject={noop}
      onCancelDraftProject={noop}
      onDeleteProject={noop}
      {...overrides}
    />,
  )

describe('the shipping sidebar', () => {
  it("shows the three sections plus Lists, in canon's order", () => {
    renderSidebar()

    const headers = screen.getAllByRole('heading', { level: 2 })
    expect(headers.map((header) => header.textContent)).toEqual([
      'Workflow',
      'Settings',
      'Lists',
    ])
  })

  it('lands on Today and marks it as the current page', () => {
    renderSidebar()

    expect(
      screen
        .getByRole('button', { name: 'Today' })
        .getAttribute('aria-current'),
    ).toBe('page')
  })

  it('keeps the four staged-off destinations off screen', () => {
    renderSidebar()

    expect(screen.queryByRole('button', { name: 'Priority Matrix' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Habits' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Board' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Blueprints' })).toBeNull()
  })

  it('shows them all once every flag is open', () => {
    renderSidebar({
      sections: sidebarSections({
        gates: allOpenGates,
        isDevelopment: true,
        projects: [],
        isAddingProject: false,
      }),
    })

    expect(screen.getByRole('button', { name: 'Priority Matrix' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Habits' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Board' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Blueprints' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tweak' })).toBeTruthy()
  })

  it("uses canon's macOS row names, not the phone's", () => {
    renderSidebar()

    expect(screen.getByRole('button', { name: 'Today' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Jot Down' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Execute' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Adjust' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Do' })).toBeNull()
  })
})

describe('control sizing is denser than the iOS list floor', () => {
  it('draws 36px rows on a pointer desktop', () => {
    renderSidebar()

    expect(screen.getByRole('button', { name: 'Today' }).style.minHeight).toBe(
      '36px',
    )
  })

  it('keeps the same 36px rows when the sidebar is touch-driven', () => {
    renderSidebar({ layout: doSurfaceLayout(handheldSurface) })

    expect(screen.getByRole('button', { name: 'Today' }).style.minHeight).toBe(
      '36px',
    )
  })

  it('sizes the search field to the same 36px row', () => {
    renderSidebar()

    expect(screen.getByRole('search').style.minHeight).toBe('36px')
  })
})

describe('the selected row', () => {
  it('fills black with white type, not the accent wash', () => {
    renderSidebar()

    const today = screen.getByRole('button', { name: 'Today' })
    expect(today.getAttribute('data-theme')).toBe('dark')
    expect(today.style.backgroundColor).toBe('var(--kro-color-absolute)')
    expect(today.style.color).toBe('var(--kro-color-snow)')
  })

  it('leaves an unselected row on the page ink, with no fill', () => {
    renderSidebar()

    const jot = screen.getByRole('button', { name: 'Jot Down' })
    expect(jot.getAttribute('data-theme')).toBeNull()
    expect(jot.style.backgroundColor).toBe('')
  })
})

describe('the app title', () => {
  it('paints Kro at iOS title size, not a caption', () => {
    renderSidebar()

    const title = screen.getByTestId('sidebar-app-title')
    expect(title.textContent).toBe('Kro')
    expect(title.style.fontSize).toBe('28px')
  })
})

describe('the Lists section', () => {
  it('renders one row per project', () => {
    renderSidebar()

    expect(screen.getByRole('button', { name: 'Home' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Work' })).toBeTruthy()
  })

  it('offers a delete per row, named after the list it removes', async () => {
    const onDeleteProject = vi.fn()
    renderSidebar({ onDeleteProject })

    await userEvent.click(screen.getByRole('button', { name: 'Delete Home' }))

    expect(onDeleteProject).toHaveBeenCalledWith('p-1')
  })

  it('hides "+" and the deletes when the Lists flag is closed', () => {
    renderSidebar({ canManageProjects: false })

    expect(screen.queryByRole('button', { name: 'Add Project' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete Home' })).toBeNull()
  })

  it('shows the inline row with what has been typed so far', () => {
    renderSidebar({
      sections: sidebarSections({
        gates: statusQuoGates,
        isDevelopment: false,
        projects: [],
        isAddingProject: true,
      }),
      isAddingProject: true,
      draftProjectTitle: 'Groceries',
    })

    const field = screen.getByRole('textbox', {
      name: 'New project',
    }) as HTMLInputElement
    expect(field.value).toBe('Groceries')
  })

  it('cancels the inline row on Escape', async () => {
    const onCancelDraftProject = vi.fn()
    renderSidebar({
      sections: sidebarSections({
        gates: statusQuoGates,
        isDevelopment: false,
        projects: [],
        isAddingProject: true,
      }),
      isAddingProject: true,
      onCancelDraftProject,
    })

    await userEvent.type(
      screen.getByRole('textbox', { name: 'New project' }),
      '{Escape}',
    )

    expect(onCancelDraftProject).toHaveBeenCalled()
  })
})

describe('intent leaves as a callback, never a dispatch (RC-15)', () => {
  it('reports the destination a row was tapped for', async () => {
    const onSelectDestination = vi.fn()
    renderSidebar({ onSelectDestination })

    await userEvent.click(screen.getByRole('button', { name: 'Jot Down' }))

    expect(onSelectDestination).toHaveBeenCalledWith({
      kind: DestinationKind.inbox,
    })
  })

  it('reports the search query as it is typed, and again on submit', async () => {
    const onChangeSearchQuery = vi.fn()
    const onSubmitSearch = vi.fn()
    renderSidebar({ onChangeSearchQuery, onSubmitSearch })

    const field = screen.getByRole('searchbox', { name: 'Search' })
    await userEvent.type(field, 'tax{Enter}')

    expect(onChangeSearchQuery).toHaveBeenCalled()
    expect(onSubmitSearch).toHaveBeenCalledTimes(1)
  })
})

describe('the column inset', () => {
  it('sits the same distance from the top as the shell already sits from the bottom', () => {
    renderSidebar()

    expect(screen.getByTestId('shell-sidebar').className).toContain(
      'mt-kro-small',
    )
  })

  it('stretches in the chrome row instead of claiming 100% height, so the top margin does not overflow', () => {
    renderSidebar()

    const sidebar = screen.getByTestId('shell-sidebar')
    expect(sidebar.className).toContain('self-stretch')
    expect(sidebar.className).not.toContain('h-full')
  })

  it('does not add a matching bottom margin — the parent already pads the bottom', () => {
    renderSidebar()

    expect(screen.getByTestId('shell-sidebar').className).not.toContain(
      'mb-kro-small',
    )
  })
})
