/**
 * Selectors against a hand-built root state, never a live store (`RC-55`).
 *
 * This is where "the shell matches canon's table cell-for-cell" is checked
 * through the store rather than through a browser: the surface goes in, the
 * shell shape and the control ownership come out.
 */
import { describe, expect, it } from 'vitest'
import type { RootState } from '../../../library/store'
import { initialAuthState } from '../../auth/AuthState'
import { initialPlatformState } from '../../platform/PlatformFeature'
import { initialSessionState } from '../../session/SessionState'
import { initialCaptureState } from '../../capture/CaptureFeature'
import { initialDoState } from '../../do/DoFeature'
import { initialEarnState } from '../../earn/EarnFeature'
import { initialEndeavorDetailState } from '../../endeavorDetail/EndeavorDetailState'
import { initialFindState } from '../../find/FindState'
import { initialGreetingState } from '../../greeting/GreetingFeature'
import { initialPlanState } from '../../plan/PlanState'
import { initialTriageState } from '../../triage/TriageFeature'
import type { MainState } from '../MainFeature'
import { MainMocks, handheldSurface, projectMocks } from '../MainMocks'
import {
  selectCanManageProjects,
  selectIsSelectionReachable,
  selectLayout,
  selectPendingShellRoute,
  selectSelectedHeading,
  selectSelectedTitle,
  selectShellOwnsProfileControls,
  selectShellShape,
  selectSidebarSections,
  selectTabBarElements,
} from '../MainSelectors'
import { DestinationKind } from '../SidebarDestination'

const rootWith = (main: MainState): RootState => ({
  greeting: initialGreetingState,
  // Present only because `RootState` names every registered slice; this suite
  // asserts on the shell alone, except where it composes capture's intent.
  do: initialDoState,
  capture: initialCaptureState,
  triage: initialTriageState,
  plan: initialPlanState,
  find: initialFindState,
  endeavorDetail: initialEndeavorDetailState,
  earn: initialEarnState,
  auth: initialAuthState,
  platform: initialPlatformState,
  session: initialSessionState,
  main,
})

describe('the shell shape', () => {
  it('gives a pointer-driven desktop window the sidebar', () => {
    expect(selectShellShape(rootWith(MainMocks.desktopLoaded))).toBe('sidebar')
  })

  it('gives a phone-width window the tab bar', () => {
    expect(selectShellShape(rootWith(MainMocks.handheldLoaded))).toBe('tabBar')
  })

  it('follows the surface across a crossing without any other state changing', () => {
    const narrowed = { ...MainMocks.desktopOnPlan, surface: handheldSurface }
    expect(selectShellShape(rootWith(narrowed))).toBe('tabBar')
    expect(selectSelectedTitle(rootWith(narrowed))).toBe('Plan')
  })
})

describe('control ownership — canon\'s table, read through the store', () => {
  it('gives the destination surface no Profile control on a handheld', () => {
    // Canon: the handheld installs Profile once at the tab's own chrome, so
    // the destination must not add a second one.
    expect(
      selectShellOwnsProfileControls(rootWith(MainMocks.handheldLoaded)),
    ).toBe(false)
  })

  it('gives it one on a sidebar-shaped surface', () => {
    expect(
      selectShellOwnsProfileControls(rootWith(MainMocks.desktopLoaded)),
    ).toBe(true)
  })

  it('drops the control minimums from 44 to 28 only on a pointer surface', () => {
    expect(selectLayout(rootWith(MainMocks.desktopLoaded)).minimumControlSide)
      .toBe(28)
    expect(selectLayout(rootWith(MainMocks.handheldLoaded)).minimumControlSide)
      .toBe(44)
  })
})

describe('the navigation model', () => {
  it('builds the shipping sidebar from the slice\'s gates', () => {
    const sections = selectSidebarSections(rootWith(MainMocks.desktopLoaded))
    expect(sections.map((section) => section.title)).toEqual([
      null,
      'Workflow',
      'Settings',
      'Lists',
    ])
  })

  it('builds no sections at all before the flags resolve', () => {
    expect(selectSidebarSections(rootWith(MainMocks.idle))).toEqual([])
  })

  it('builds the three phone tabs from the same gates', () => {
    expect(
      selectTabBarElements(rootWith(MainMocks.handheldLoaded)).map(
        (element) => element.destination.kind,
      ),
    ).toEqual([
      DestinationKind.plan,
      DestinationKind.myDay,
      DestinationKind.earn,
    ])
  })

  it('offers project management only while the Lists flag is open', () => {
    expect(selectCanManageProjects(rootWith(MainMocks.desktopLoaded))).toBe(
      true,
    )
    expect(selectCanManageProjects(rootWith(MainMocks.idle))).toBe(false)
  })
})

describe('the selection', () => {
  it('names the row "Today" and the content "My Day"', () => {
    const root = rootWith(MainMocks.desktopLoaded)
    expect(selectSelectedTitle(root)).toBe('Today')
    expect(selectSelectedHeading(root)).toBe('My Day')
  })

  it('reports a selection that the current gates still render', () => {
    expect(
      selectIsSelectionReachable(rootWith(MainMocks.desktopLoaded)),
    ).toBe(true)
  })

  it('reports an unreachable selection when a flag closed under it', () => {
    const onBoard = {
      ...MainMocks.desktopLoaded,
      selected: { kind: DestinationKind.board },
    } as const
    expect(selectIsSelectionReachable(rootWith(onBoard))).toBe(false)
  })

  it('reports a selected project as reachable while its row exists', () => {
    const onList = {
      ...MainMocks.desktopLoaded,
      selected: {
        kind: DestinationKind.list,
        listId: projectMocks.work.id,
        listTitle: projectMocks.work.title,
      },
    } as const
    expect(selectIsSelectionReachable(rootWith(onList))).toBe(true)
  })
})

describe('selectPendingShellRoute — the one cross-slice read (RC-20)', () => {
  it('reports nothing while the capture slice has no intent', () => {
    expect(selectPendingShellRoute(rootWith(MainMocks.desktopLoaded))).toBeNull()
  })

  it('reshapes a Plan intent into shell terms, payload intact', () => {
    const decidedAt = new Date('2026-08-31T09:00:00.000Z')
    const root = {
      ...rootWith(MainMocks.desktopLoaded),
      capture: {
        ...initialCaptureState,
        navigation: {
          route: {
            kind: 'plan' as const,
            day: new Date('2026-08-31T00:00:00.000Z'),
            scrollTarget: new Date('2026-08-31T09:30:00.000Z'),
            endeavorId: 'e-1',
            highlight: true,
            listMode: true,
          },
          decidedAt,
          deliverAfterMs: 500,
        },
      },
    }

    const pending = selectPendingShellRoute(root)
    expect(pending?.context.destination.kind).toBe(DestinationKind.plan)
    expect(pending?.context.highlight).toBe(true)
    expect(pending?.context.listMode).toBe(true)
    expect(pending?.deliverAtMs).toBe(decidedAt.getTime() + 500)
  })

  it('reshapes an Inbox intent with no day and no highlight', () => {
    const root = {
      ...rootWith(MainMocks.desktopLoaded),
      capture: {
        ...initialCaptureState,
        navigation: {
          route: { kind: 'inbox' as const, endeavorId: 'e-2' },
          decidedAt: new Date('2026-08-31T09:00:00.000Z'),
          deliverAfterMs: 0,
        },
      },
    }

    const pending = selectPendingShellRoute(root)
    expect(pending?.context.destination.kind).toBe(DestinationKind.inbox)
    expect(pending?.context.day).toBeNull()
    expect(pending?.context.highlight).toBe(false)
  })
})
