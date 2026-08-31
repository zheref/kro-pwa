/**
 * The navigation model against canon's `ElementsLocal.retrieve(filter:)`.
 *
 * The two gate sets under test are the two that ship: `statusQuoGates` (what a
 * user sees) and `allOpenGates` (what a development build sees). The
 * difference between them IS the flag-gating requirement — matrix, habits,
 * board and blueprints appear in one and not the other.
 */
import { describe, expect, it } from 'vitest'
import { allOpenGates, projectMocks, statusQuoGates } from '../MainMocks'
import {
  closedDestinationGates,
  flattenSections,
  initialElement,
  listDestination,
  searchDestination,
  sidebarSections,
  tabBarElements,
} from '../NavigationSections'
import { DestinationKind, destinationTitle } from '../SidebarDestination'

const titlesOf = (
  sections: ReturnType<typeof sidebarSections>,
  title: string | null,
): readonly string[] =>
  (sections.find((section) => section.title === title)?.elements ?? []).map(
    (element) => destinationTitle(element.destination),
  )

const desktop = (
  overrides: Partial<Parameters<typeof sidebarSections>[0]> = {},
) =>
  sidebarSections({
    gates: statusQuoGates,
    isDevelopment: false,
    projects: [],
    isAddingProject: false,
    ...overrides,
  })

describe('the sidebar — canon .macOS branch', () => {
  it('lands on My Day and offers All Tasks beside it', () => {
    expect(titlesOf(desktop(), null)).toEqual(['Today', 'All Tasks'])
  })

  it('marks My Day as the initial destination, and nothing else', () => {
    const initial = flattenSections(desktop()).filter(
      (element) => element.isInitial,
    )
    expect(initial).toHaveLength(1)
    expect(initial[0]?.destination.kind).toBe(DestinationKind.myDay)
    expect(initialElement(flattenSections(desktop()))?.destination.kind).toBe(
      DestinationKind.myDay,
    )
  })

  it('hides matrix, habits, board and blueprints at the shipping baseline', () => {
    const sections = desktop()
    expect(titlesOf(sections, 'Workflow')).toEqual([
      'Jot Down',
      'Plan',
      'Execute',
      'Earn',
    ])
    expect(titlesOf(sections, 'Settings')).toEqual(['Adjust'])
  })

  it('shows all seven Workflow rows once every flag is open', () => {
    const sections = desktop({ gates: allOpenGates })
    expect(titlesOf(sections, 'Workflow')).toEqual([
      'Jot Down',
      'Priority Matrix',
      'Plan',
      'Habits',
      'Execute',
      'Board',
      'Earn',
    ])
  })

  it('adds Tweak only in a development build', () => {
    expect(titlesOf(desktop({ gates: allOpenGates }), 'Settings')).toEqual([
      'Blueprints',
      'Adjust',
    ])
    expect(
      titlesOf(
        desktop({ gates: allOpenGates, isDevelopment: true }),
        'Settings',
      ),
    ).toEqual(['Blueprints', 'Adjust', 'Tweak'])
  })

  it('pins the Settings section to the bottom, and only that one', () => {
    const pinned = desktop().filter((section) => section.shouldGoToBottom)
    expect(pinned.map((section) => section.title)).toEqual(['Settings'])
  })

  it('leaves the first section untitled, as canon\'s "default" sentinel does', () => {
    expect(desktop()[0]?.title).toBeNull()
  })

  it('drops a section with no elements rather than rendering an empty header', () => {
    const sections = desktop({ gates: closedDestinationGates })
    expect(sections).toEqual([])
  })
})

describe('the Lists section', () => {
  it('stays away entirely while the flag is closed', () => {
    const sections = desktop({
      gates: { ...statusQuoGates, lists: false },
      projects: [projectMocks.inbox],
    })
    expect(sections.some((section) => section.title === 'Lists')).toBe(false)
  })

  it('stays away when the flag is open but there is nothing to show', () => {
    expect(desktop().some((section) => section.title === 'Lists')).toBe(false)
  })

  it('renders one row per project', () => {
    const sections = desktop({
      projects: [projectMocks.inbox, projectMocks.work],
    })
    expect(titlesOf(sections, 'Lists')).toEqual(['Home', 'Work'])
  })

  it('appears for the inline row alone, before any project exists', () => {
    const sections = desktop({ isAddingProject: true })
    expect(titlesOf(sections, 'Lists')).toEqual([])
    expect(sections.some((section) => section.title === 'Lists')).toBe(true)
  })

  it('turns a project into a destination keyed by its id', () => {
    expect(listDestination(projectMocks.work)).toEqual({
      kind: DestinationKind.list,
      listId: 'p-2',
      listTitle: 'Work',
    })
  })
})

describe('the tab bar — canon .iOS branch + phoneNavigationElements', () => {
  it('offers Plan, Do and Earn at the shipping baseline', () => {
    expect(
      tabBarElements(statusQuoGates).map((element) =>
        destinationTitle(element.destination),
      ),
    ).toEqual(['Plan', 'Today', 'Earn'])
  })

  it('never shows the standalone Priority Matrix, even with the flag open', () => {
    // Canon builds it into the iOS set and then filters it out in the Screen:
    // "iPhone tabs deliberately exclude the legacy Priority Matrix entry."
    expect(
      tabBarElements(allOpenGates).some(
        (element) => element.destination.kind === DestinationKind.matrix,
      ),
    ).toBe(false)
  })

  it('marks Do as the initial tab', () => {
    const initial = tabBarElements(statusQuoGates).filter(
      (element) => element.isInitial,
    )
    expect(initial).toHaveLength(1)
    expect(initial[0]?.destination.kind).toBe(DestinationKind.myDay)
  })

  it('still lands on My Day when `now` is closed but `tasks` is open', () => {
    // Canon's else-branch installs `.today` — same title, same heading.
    const elements = tabBarElements({ ...statusQuoGates, now: false })
    expect(
      elements.find((element) => element.isInitial)?.destination.kind,
    ).toBe(DestinationKind.myDay)
  })

  it('has no tabs at all when every gate is closed', () => {
    expect(tabBarElements(closedDestinationGates)).toEqual([])
  })

  it('keeps Search out of the tab list — it is a role, not a destination row', () => {
    expect(
      tabBarElements(allOpenGates).some(
        (element) => element.destination.kind === DestinationKind.search,
      ),
    ).toBe(false)
    expect(searchDestination.kind).toBe(DestinationKind.search)
  })
})
